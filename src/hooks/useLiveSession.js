/**
 * useLiveSession — Gemini Multimodal Live API hook.
 *
 * Dual-Model Bridge Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  LA VOCE  — gemini-2.5-flash-native-audio-preview-12-2025      │
 * │  Real-time WebSocket audio. Fast, conversational.              │
 * │  Per domande semplici risponde direttamente.                   │
 * │  Per domande complesse → chiama delegaRagionamentoStrategico() │
 * └────────────────────────┬────────────────────────────────────────┘
 *                          │ function call
 *                          ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  IL CERVELLO — gemini-3-pro-preview (Cloud Function)           │
 * │  Deep reasoning, Google Search, full Firestore context,        │
 * │  HITL tools. Returns a terse voice-ready synthesis.            │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * SDK internals:
 * - model.connect()          → LiveSession (WebSocket)
 * - startAudioConversation() → AudioWorklet 16kHz mic + 24kHz PCM playback
 * - Fan-out proxy            → same serverMessages fed to audio runner AND
 *                              transcript extractor loop
 */

import { useRef, useState, useCallback } from 'react';
import { getAI, GoogleAIBackend, getLiveGenerativeModel, startAudioConversation } from 'firebase/ai';
import { getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

// ── Constants ────────────────────────────────────────────────────────────────

// La Voce: fast real-time audio model
const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

// System prompt for La Voce: minimal intelligence, maximum delegation
const SYSTEM_INSTRUCTION_VOCE = `Sei "La Voce" — l'interfaccia vocale veloce del Shadow CoS di Quinta OS.
Il tuo unico compito è essere un intermediario vocale naturale tra l'utente e il sistema.

## REGOLA FONDAMENTALE — DELEGAZIONE OBBLIGATORIA
Per QUALSIASI domanda che riguardi:
- Analisi di dossier, OKR, decisioni, segnali di rischio
- Situazione operativa, priorità, team
- Consigli strategici o raccomandazioni
- Dati o informazioni sul sistema
- Qualunque richiesta operativa o di ragionamento complesso

DEVI IMMEDIATAMENTE chiamare il tool \`delegaRagionamentoStrategico\` passando la richiesta dell'utente ESATTA come parametro \`query\`. NON rispondere da solo. NON improvvisare analisi.

## QUANDO RISPONDERE DIRETTAMENTE (casi eccezionali)
Solo per scambi puramente conversazionali: "ciao", "grazie", "arrivederci", "come stai", domande sul tuo funzionamento.

## STILE
- Lingua: italiano sempre.
- Se stai delegando, di' brevemente: "Un momento, consulto il sistema..." poi aspetta la risposta.
- Quando ricevi la sintesi dal tool, leggila ad alta voce in modo naturale e fluido.
- Zero markdown, zero elenchi — solo parlato naturale.`;

// Tool declaration: La Voce can call this to delegate to Gemini 3 Pro
const BRIDGE_TOOL = {
    functionDeclarations: [{
        name: 'delegaRagionamentoStrategico',
        description: 'Delega una domanda operativa o strategica complessa al motore di ragionamento avanzato (Gemini 3 Pro) che ha accesso al database completo, Google Search e agli strumenti HITL. Usa questo tool per QUALSIASI domanda che richieda analisi, dati o ragionamento — non rispondere mai da solo a queste domande.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'La domanda o richiesta esatta dell\'utente, da passare al motore di ragionamento avanzato.',
                },
            },
            required: ['query'],
        },
    }],
};

// ── Fan-out proxy for serverMessages ─────────────────────────────────────────
// The audio runner from startAudioConversation() exclusively consumes the
// session's serverMessages async generator. We proxy it to broadcast to two
// independent consumers: the audio runner + our transcript/tool-call observer.

function createFanoutProxy(originalGenerator) {
    const queues = [[], []];
    const resolvers = [null, null];
    let done = false;

    (async () => {
        try {
            for await (const value of originalGenerator) {
                for (let i = 0; i < 2; i++) {
                    queues[i].push({ value, done: false });
                    if (resolvers[i]) { const r = resolvers[i]; resolvers[i] = null; r(); }
                }
            }
        } catch (_) {
            // generator closed
        } finally {
            done = true;
            for (let i = 0; i < 2; i++) {
                queues[i].push({ value: undefined, done: true });
                if (resolvers[i]) { const r = resolvers[i]; resolvers[i] = null; r(); }
            }
        }
    })();

    function makeConsumer(idx) {
        return {
            [Symbol.asyncIterator]() { return this; },
            async next() {
                while (queues[idx].length === 0 && !done) {
                    await new Promise(r => { resolvers[idx] = r; });
                }
                return queues[idx].length > 0 ? queues[idx].shift() : { value: undefined, done: true };
            },
        };
    }

    return [makeConsumer(0), makeConsumer(1)];
}

// ── Volume analyzer ───────────────────────────────────────────────────────────

function createVolumeAnalyzer(audioContext, sourceNode, onVolume) {
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    sourceNode.connect(analyser);
    let rafId = null;
    const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        onVolume(avg / 255);
        rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
        if (rafId) cancelAnimationFrame(rafId);
        analyser.disconnect();
    };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useLiveSession({ onTextMessage, onError } = {}) {
    const [isConnected, setIsConnected] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [volume, setVolume] = useState(0);

    const sessionRef = useRef(null);
    const controllerRef = useRef(null);
    const stopVolumeRef = useRef(null);

    // Bridge call to Il Cervello (Gemini 3 Pro via Cloud Function)
    const callBridge = useCallback(async (query, contextId = null) => {
        try {
            const bridge = httpsCallable(functions, 'delegaRagionamentoStrategico');
            const result = await bridge({ query, contextId });
            return result.data?.sintesi || 'Analisi non disponibile.';
        } catch (e) {
            console.error('[useLiveSession] Bridge call failed:', e);
            return 'Il motore di ragionamento è temporaneamente non disponibile.';
        }
    }, []);

    // ── startSession ──────────────────────────────────────────────────────────
    const startSession = useCallback(async (contextId = null) => {
        try {
            const app = getApp();
            const ai = getAI(app, { backend: new GoogleAIBackend() });

            // Build La Voce model with Bridge tool declaration
            const model = getLiveGenerativeModel(ai, {
                model: LIVE_MODEL,
                systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION_VOCE }] },
                tools: [BRIDGE_TOOL],
                generationConfig: {
                    responseModalities: ['AUDIO'],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
            });

            const session = await model.connect();
            sessionRef.current = session;

            // Fan-out: audio runner gets consumer[0], our loop gets consumer[1]
            const [audioConsumer, observerConsumer] = createFanoutProxy(session.serverMessages);
            session.serverMessages = audioConsumer;

            // Observer loop: extracts transcripts from observerConsumer
            // (audio runner ignores text parts; we capture them here)
            (async () => {
                try {
                    for await (const message of observerConsumer) {
                        if (!message || typeof message !== 'object') continue;
                        if ('serverContent' in message) {
                            const sc = message.serverContent;
                            if (sc?.inputTranscription?.text) setTranscript(sc.inputTranscription.text);
                            if (sc?.outputTranscription?.text) {
                                setTranscript(sc.outputTranscription.text);
                                onTextMessage?.(sc.outputTranscription.text);
                            }
                            if (sc?.modelTurn?.parts?.length > 0) setIsSpeaking(true);
                            if (sc?.turnComplete) setIsSpeaking(false);
                        }
                    }
                } catch (_) {}
            })();

            // Temporarily intercept getUserMedia to attach our volume analyzer
            const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
            navigator.mediaDevices.getUserMedia = async (constraints) => {
                const stream = await origGetUserMedia(constraints);
                navigator.mediaDevices.getUserMedia = origGetUserMedia;
                try {
                    const volCtx = new AudioContext();
                    const volSource = volCtx.createMediaStreamSource(stream);
                    const stopVol = createVolumeAnalyzer(volCtx, volSource, setVolume);
                    stopVolumeRef.current = () => {
                        stopVol();
                        volSource.disconnect();
                        void volCtx.close();
                    };
                } catch (_) {}
                return stream;
            };

            // Start audio conversation with Bridge function calling handler
            const controller = await startAudioConversation(session, {
                functionCallingHandler: async (functionCalls) => {
                    if (!functionCalls?.length) return {};
                    const call = functionCalls[0];

                    if (call.name === 'delegaRagionamentoStrategico') {
                        const query = call.args?.query || '';
                        console.log(`[useLiveSession] Bridge: delegating to Gemini 3 Pro — "${query.slice(0, 80)}"`);

                        // Call Il Cervello via Cloud Function
                        const sintesi = await callBridge(query, contextId);

                        // Also surface the synthesis as a text message in the drawer
                        onTextMessage?.(sintesi);

                        // Return the synthesis to La Voce so it reads it aloud
                        return {
                            id: call.id,
                            name: call.name,
                            response: { sintesi },
                        };
                    }

                    // Unknown tool — return empty response to avoid stalling session
                    console.warn(`[useLiveSession] Unknown tool call: ${call.name}`);
                    return {
                        id: call.id,
                        name: call.name,
                        response: { output: 'Tool non riconosciuto.' },
                    };
                },
            });

            controllerRef.current = controller;
            setIsConnected(true);
            setTranscript('');

        } catch (e) {
            if (e?.name === 'NotAllowedError') {
                onError?.('Permesso microfono negato. Concedi l\'accesso nelle impostazioni del browser.');
            } else if (e?.name === 'NotFoundError') {
                onError?.('Nessun microfono trovato. Connetti un dispositivo audio.');
            } else {
                onError?.(`Errore Live: ${e?.message || 'Connessione fallita'}`);
            }
            console.error('[useLiveSession] startSession error:', e);
            _cleanup();
        }
    }, [onTextMessage, onError, callBridge]);

    // ── endSession ────────────────────────────────────────────────────────────
    const endSession = useCallback(() => {
        _cleanup();
    }, []);

    function _cleanup() {
        try { controllerRef.current?.stop?.(); } catch (_) {}
        controllerRef.current = null;
        try { stopVolumeRef.current?.(); } catch (_) {}
        stopVolumeRef.current = null;
        try { sessionRef.current?.close?.(); } catch (_) {}
        sessionRef.current = null;
        setIsConnected(false);
        setIsSpeaking(false);
        setVolume(0);
        setTranscript('');
    }

    return { isConnected, isSpeaking, transcript, volume, startSession, endSession };
}
