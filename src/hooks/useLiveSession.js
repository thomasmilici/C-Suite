/**
 * useLiveSession — Gemini Multimodal Live API hook.
 *
 * Manages a real-time bidirectional audio session with Gemini via
 * the Firebase AI Logic SDK (firebase/ai). Replaces browser STT/TTS.
 *
 * Architecture:
 * - model.connect()            → LiveSession (WebSocket)
 * - startAudioConversation()   → handles mic (AudioWorklet 16kHz) + playback (24kHz PCM)
 * - Fan-out proxy              → intercepts serverMessages before the audio runner
 *                                consumes them, so transcripts can be extracted
 *
 * Exports:
 *   { isConnected, isListening, isSpeaking, transcript, volume,
 *     startSession, endSession }
 */

import { useRef, useState, useCallback } from 'react';
import { getAI, GoogleAIBackend, getLiveGenerativeModel, startAudioConversation } from 'firebase/ai';
import { getApp } from 'firebase/app';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';

// ── Constants ────────────────────────────────────────────────────────────────

const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

const SYSTEM_INSTRUCTION = `Sei l'assistente vocale operativo del "Shadow CoS" di Quinta OS — un analista strategico AI a supporto del Chief of Staff umano.

## STILE VOCALE
- Rispondi SEMPRE in italiano.
- Sii conciso e diretto: le risposte vocali devono essere brevi (max 3-4 frasi).
- Non usare elenchi puntati, tabelle o markdown: parla naturalmente.
- Zero intro verbose ("Certo!", "Assolutamente!") — vai subito al punto.
- Tono: assertivo, professionale, operativo.

## CAPACITÀ
Puoi aiutare con: analisi rapide, briefing situazionali, consigli strategici, prioritizzazione attività, valutazione rischi.
Per azioni operative che richiedono scrittura nel sistema (registrare decisioni, risk signal, ecc.) suggerisci di usare la chat testuale per la revisione HITL.

## LIMITI
Non puoi eseguire azioni operative durante la sessione vocale — solo analisi e consulenza.
Non inventare dati che non conosci.`;

// ── Fan-out proxy for serverMessages ─────────────────────────────────────────
// The audio runner from startAudioConversation() exclusively consumes the
// session's serverMessages async generator. To also extract transcripts, we
// replace serverMessages with a broadcasting proxy that feeds two queues:
// one for the audio runner, one for our transcript loop.

function createFanoutProxy(originalGenerator) {
    // Two independent queues + resolvers for blocking reads
    const queues = [[], []];
    const resolvers = [null, null];

    let done = false;

    // Pump the original generator in the background
    (async () => {
        try {
            for await (const value of originalGenerator) {
                for (let i = 0; i < 2; i++) {
                    queues[i].push({ value, done: false });
                    if (resolvers[i]) {
                        const res = resolvers[i];
                        resolvers[i] = null;
                        res();
                    }
                }
            }
        } catch (_) {
            // Generator closed or errored — signal done to both consumers
        } finally {
            done = true;
            for (let i = 0; i < 2; i++) {
                queues[i].push({ value: undefined, done: true });
                if (resolvers[i]) {
                    const res = resolvers[i];
                    resolvers[i] = null;
                    res();
                }
            }
        }
    })();

    function makeConsumer(idx) {
        return {
            [Symbol.asyncIterator]() { return this; },
            async next() {
                while (queues[idx].length === 0 && !done) {
                    await new Promise(res => { resolvers[idx] = res; });
                }
                if (queues[idx].length > 0) {
                    return queues[idx].shift();
                }
                return { value: undefined, done: true };
            }
        };
    }

    return [makeConsumer(0), makeConsumer(1)];
}

// ── Volume analyzer via AnalyserNode ─────────────────────────────────────────

function createVolumeAnalyzer(audioContext, sourceNode, onVolume) {
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    sourceNode.connect(analyser);

    let rafId = null;
    const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        onVolume(avg / 255); // normalize 0–1
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

    const sessionRef = useRef(null);       // LiveSession
    const controllerRef = useRef(null);    // { stop } from startAudioConversation
    const stopVolumeRef = useRef(null);    // cleanup volume analyzer

    // ── startSession ──────────────────────────────────────────────────────────
    const startSession = useCallback(async () => {
        try {
            // 1. Initialize firebase/ai with Google AI backend
            const app = getApp();
            const ai = getAI(app, { backend: new GoogleAIBackend() });

            // 2. Build the Live model
            const model = getLiveGenerativeModel(ai, {
                model: LIVE_MODEL,
                systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                generationConfig: {
                    responseModalities: ['AUDIO'],
                    // Enable transcription of both input (user speech) and output (model speech)
                    // These are extracted from generationConfig into the setup message by the SDK
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
            });

            // 3. Connect (opens WebSocket, sends setup message)
            const session = await model.connect();
            sessionRef.current = session;

            // 4. Fan-out serverMessages so both the audio runner and our
            //    transcript loop can consume messages independently
            const [audioConsumer, transcriptConsumer] = createFanoutProxy(session.serverMessages);
            // Replace the session's serverMessages with the audio consumer;
            // startAudioConversation will read from this one.
            session.serverMessages = audioConsumer;

            // 5. Start transcript extraction loop (reads from transcriptConsumer)
            //    Runs in background — no await
            (async () => {
                try {
                    for await (const message of transcriptConsumer) {
                        if (!message || typeof message !== 'object') continue;

                        // serverContent carries both audio (for the runner) and text (transcripts)
                        if ('serverContent' in message) {
                            const sc = message.serverContent;

                            // inputTranscription = user speech text
                            if (sc?.inputTranscription?.text) {
                                const text = sc.inputTranscription.text;
                                setTranscript(text);
                            }

                            // outputTranscription = model speech text (AI response in text form)
                            if (sc?.outputTranscription?.text) {
                                const text = sc.outputTranscription.text;
                                setTranscript(text);
                                onTextMessage?.(text);
                            }

                            // Detect model speaking / done
                            if (sc?.modelTurn?.parts?.length > 0) {
                                setIsSpeaking(true);
                            }
                            if (sc?.turnComplete) {
                                setIsSpeaking(false);
                            }
                        }
                    }
                } catch (_) {
                    // transcript loop ended — session closed
                }
            })();

            // 6. Start audio conversation (mic + playback, AudioWorklet)
            //    Must be called from a user gesture context.
            //    We capture the AudioContext created internally by intercepting
            //    getUserMedia to attach our AnalyserNode for volume.
            //
            //    Monkey-patch getUserMedia temporarily to intercept the MediaStream
            const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
            navigator.mediaDevices.getUserMedia = async (constraints) => {
                const stream = await origGetUserMedia(constraints);
                // Restore immediately
                navigator.mediaDevices.getUserMedia = origGetUserMedia;

                // We'll attach the analyser after startAudioConversation has
                // created its AudioContext — but we don't have access to it.
                // Instead, create a SEPARATE AudioContext just for volume analysis.
                try {
                    const volCtx = new AudioContext();
                    const volSource = volCtx.createMediaStreamSource(stream);
                    const stopVol = createVolumeAnalyzer(volCtx, volSource, setVolume);
                    stopVolumeRef.current = () => {
                        stopVol();
                        volSource.disconnect();
                        void volCtx.close();
                    };
                } catch (_) {
                    // volume analysis is optional — ignore errors
                }

                return stream;
            };

            const controller = await startAudioConversation(session, {
                functionCallingHandler: async (functionCalls) => {
                    // During Live mode, tool calls create pending_ai_actions in Firestore
                    // so HITL still works (user reviews in AiPendingActionTile)
                    const auth = getAuth();
                    const uid = auth.currentUser?.uid;
                    if (!uid || !functionCalls?.length) return {};

                    const call = functionCalls[0];
                    try {
                        await addDoc(collection(db, 'pending_ai_actions'), {
                            functionName: call.name,
                            args: call.args || {},
                            uid,
                            source: 'live_voice',
                            status: 'pending',
                            createdAt: serverTimestamp(),
                        });
                    } catch (e) {
                        console.warn('[useLiveSession] Failed to create pending action:', e);
                    }

                    // Return empty response to keep the session going
                    return {
                        id: call.id,
                        name: call.name,
                        response: { output: 'Action queued for human review.' },
                    };
                },
            });

            controllerRef.current = controller;
            setIsConnected(true);
            setTranscript('');

        } catch (e) {
            // Mic permission denied (DOMException) or SDK error (AIError)
            const msg = e?.message || 'Errore sessione Live';
            if (e?.name === 'NotAllowedError') {
                onError?.('Permesso microfono negato. Concedi l\'accesso nelle impostazioni del browser.');
            } else if (e?.name === 'NotFoundError') {
                onError?.('Nessun microfono trovato. Connetti un dispositivo audio.');
            } else {
                onError?.(`Errore Live: ${msg}`);
            }
            console.error('[useLiveSession] startSession error:', e);
            // Cleanup partial state
            _cleanup();
        }
    }, [onTextMessage, onError]);

    // ── endSession ────────────────────────────────────────────────────────────
    const endSession = useCallback(() => {
        _cleanup();
    }, []);

    // ── internal cleanup ──────────────────────────────────────────────────────
    function _cleanup() {
        // Stop audio conversation (stops mic + playback + AudioWorklet)
        try { controllerRef.current?.stop?.(); } catch (_) {}
        controllerRef.current = null;

        // Stop volume analyzer
        try { stopVolumeRef.current?.(); } catch (_) {}
        stopVolumeRef.current = null;

        // Close WebSocket session
        try { sessionRef.current?.close?.(); } catch (_) {}
        sessionRef.current = null;

        setIsConnected(false);
        setIsSpeaking(false);
        setVolume(0);
        setTranscript('');
    }

    return {
        isConnected,
        isSpeaking,
        transcript,
        volume,
        startSession,
        endSession,
    };
}
