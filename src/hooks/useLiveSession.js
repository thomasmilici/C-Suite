/**
 * useLiveSession — Gemini Multimodal Live API hook.
 *
 * Dual-Model Bridge Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  LA VOCE  — gemini-2.5-flash-native-audio (Native WebSocket)   │
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
 * SECURITY: No API key is ever exposed to the browser.
 * The master key lives in Firebase secrets (server-side only).
 * The client obtains a short-lived ephemeral token (5 min TTL)
 * via the getGeminiLiveToken Cloud Function, which verifies auth
 * before issuing it. Token is single-use and model-locked.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';

// ── Constants ────────────────────────────────────────────────────────────────
const LIVE_MODEL = 'models/gemini-2.5-flash-native-audio-preview-12-2025';

// System prompt for La Voce
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
- Se stai delegando, devi dire SOLO ED ESCLUSIVAMENTE una breve frase di cortesia (es. "Un momento, consulto il sistema...") e poi eseguire IMMEDITAMENTE la function call. ATTENDI IN SILENZIO la risposta del tool senza generare altri ragionamenti.
- Quando ricevi la sintesi dal tool, leggila ad alta voce in modo naturale e fluido.
- Zero markdown, zero elenchi — solo parlato naturale.`;

// ── WebSocket Utilities ──────────────────────────────────────────────────────

// Convert PCM Float32 to Int16
function floatTo16BitPCM(input) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
}

// Convert Int16 PCM (from base64) to Float32
function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// Encode to base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useLiveSession({ onTextMessage, onError } = {}) {
    const [isConnected, setIsConnected] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [volume, setVolume] = useState(0);

    const wsRef = useRef(null);
    const streamRef = useRef(null);
    const audioContextRef = useRef(null);
    const processorRef = useRef(null);
    const analyserRef = useRef(null);
    const nextPlayTimeRef = useRef(0);
    const reconnectAttemptsRef = useRef(0);
    const MAX_RECONNECT = 2;

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

    // ── sendSetup ────────────────────────────────────────────────────────────
    const sendSetup = (ws, systemInstructionText) => {
        const setupMessage = {
            setup: {
                model: LIVE_MODEL,
                generationConfig: {
                    responseModalities: ["AUDIO"]
                },
                systemInstruction: {
                    parts: [{ text: systemInstructionText }]
                },
                tools: [{
                    functionDeclarations: [{
                        name: 'delegaRagionamentoStrategico',
                        description: 'Delega una domanda operativa...',
                        parameters: {
                            type: 'OBJECT',
                            properties: {
                                query: { type: 'STRING' }
                            },
                            required: ['query']
                        }
                    }]
                }]
            }
        };
        ws.send(JSON.stringify(setupMessage));
    };

    // ── startSession ──────────────────────────────────────────────────────────
    const startSession = useCallback(async (contextId = null) => {
        console.log('[useLiveSession] Starting native WebSocket session...');
        try {
            // 1. Get ephemeral token + displayName (master key stays server-side)
            let ephemeralToken;
            let firstName = 'Operatore';
            try {
                const getToken = httpsCallable(functions, 'getGeminiLiveToken');
                const result = await getToken({});
                ephemeralToken = result.data?.token;
                if (!ephemeralToken) throw new Error('Token vuoto nella risposta.');
                // displayName comes from the Cloud Function (authoritative, from Firebase Auth)
                const displayName = result.data?.displayName;
                if (displayName) {
                    firstName = displayName.split(' ')[0];
                } else {
                    // Fallback to client-side auth user
                    const user = auth.currentUser;
                    if (user?.displayName) firstName = user.displayName.split(' ')[0];
                }
                console.log(`[useLiveSession] Ephemeral token obtained. User: ${firstName}`);
            } catch (tokenErr) {
                console.error('[useLiveSession] Token fetch failed:', tokenErr);
                onError?.('Impossibile ottenere il token di sessione. Riprova.');
                return;
            }

            const today = new Date().toLocaleDateString('it-IT');
            const lastSession = localStorage.getItem('lastLiveSessionDate');
            const isFirstContact = lastSession !== today;

            if (isFirstContact) {
                localStorage.setItem('lastLiveSessionDate', today);
            }

            const dynamicPrompt = `${SYSTEM_INSTRUCTION_VOCE}

## IDENTITÀ UTENTE E SALUTO
Ti rivolgerai all'utente chiamandolo per nome: ${firstName}.
${isFirstContact ? "Se è il primo contatto della giornata, inizia con un saluto amichevole e personalizzato (es: 'Ciao " + firstName + ", bentornato. Pronto per gestire la giornata?')." : "Non è il vostro primo contatto oggi. Sii diretto senza ripetere i saluti iniziali."}
Mantieni un tono amichevole, meno robotico e più simile a un partner strategico.`;

            // 2. Setup Audio Recording (16kHz PCM)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
            streamRef.current = stream;

            const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = audioCtx;

            const source = audioCtx.createMediaStreamSource(stream);

            // Setup volume analyzer
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Setup processor for capturing PCM
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(audioCtx.destination);
            processorRef.current = processor;

            // Volume meter loop
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateVolume = () => {
                if (!analyserRef.current) return;
                analyser.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((S, v) => S + v, 0) / dataArray.length;
                setVolume(avg / 255);
                requestAnimationFrame(updateVolume);
            };
            updateVolume();

            // 3. Connect WebSocket — key served from auth-gated Cloud Function, never in bundle
            const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${ephemeralToken}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[useLiveSession] WebSocket connected');
                setIsConnected(true);
                reconnectAttemptsRef.current = 0;
                sendSetup(ws, dynamicPrompt);

                // Se è la prima volta, mandiamo un evento di "user" invisibile nel WebSocket 
                // così La Voce ci risponde con il saluto.
                if (isFirstContact) {
                    const greetingTriggerMsg = {
                        clientContent: {
                            turns: [{
                                role: "user",
                                parts: [{ text: "Ciao, mi sono appena connesso per iniziare la giornata." }]
                            }],
                            turnComplete: true
                        }
                    };
                    ws.send(JSON.stringify(greetingTriggerMsg));
                }

                // Start sending audio chunks
                processor.onaudioprocess = (e) => {
                    if (ws.readyState === window.WebSocket.OPEN) {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcm16 = floatTo16BitPCM(inputData);
                        const base64Audio = arrayBufferToBase64(pcm16.buffer);
                        // Send realtime input
                        const msg = {
                            realtimeInput: {
                                mediaChunks: [{
                                    mimeType: "audio/pcm;rate=16000",
                                    data: base64Audio
                                }]
                            }
                        };
                        ws.send(JSON.stringify(msg));
                    }
                };
            };

            ws.onmessage = async (event) => {
                let data;
                if (event.data instanceof Blob) {
                    const text = await event.data.text();
                    data = JSON.parse(text);
                } else {
                    data = JSON.parse(event.data);
                }

                // Handle server content
                if (data.serverContent) {
                    const sc = data.serverContent;

                    // Turn completion
                    if (sc.turnComplete) {
                        setIsSpeaking(false);
                    }

                    // Content parts
                    if (sc.modelTurn && sc.modelTurn.parts) {
                        for (const part of sc.modelTurn.parts) {

                            // Audio Response (Playback) - Gemini plays back at 24kHz
                            if (part.inlineData && part.inlineData.data) {
                                setIsSpeaking(true);
                                playAudio(part.inlineData.data);
                            }

                            // Text Response (Transcript)
                            if (part.text) {
                                setTranscript(part.text);
                                onTextMessage?.(part.text);
                            }

                            // Tool Call (The Bridge)
                            if (part.functionCall) {
                                const call = part.functionCall;
                                if (call.name === 'delegaRagionamentoStrategico') {
                                    setIsSpeaking(false);
                                    const query = call.args?.query || '';
                                    console.log(`[useLiveSession] Bridge: delegating to Gemini 3 Pro — "${query.slice(0, 80)}"`);

                                    const sintesi = await callBridge(query, contextId);
                                    console.log("[Bridge] Risposta ricevuta da Gemini 3 Pro:", sintesi);
                                    onTextMessage?.(sintesi);

                                    // Return tool response according to API spec correctly passing functionCall ID and expected response format
                                    const toolResponseMsg = {
                                        toolResponse: {
                                            functionResponses: [{
                                                id: call.id,
                                                name: call.name,
                                                response: { output: sintesi }
                                            }]
                                        }
                                    };
                                    if (ws.readyState === window.WebSocket.OPEN) {
                                        ws.send(JSON.stringify(toolResponseMsg));
                                    }
                                }
                            }
                        }
                    }
                }
            };

            ws.onclose = (event) => {
                console.log('[useLiveSession] WebSocket closed:', event.code, event.reason);
                if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT) {
                    reconnectAttemptsRef.current += 1;
                    console.log(`[useLiveSession] Reconnecting... Attempt ${reconnectAttemptsRef.current}`);
                    // Clean reconnect logic
                    _cleanup(false);
                    setTimeout(() => startSession(contextId), 1000);
                } else {
                    _cleanup(true);
                    if (event.code !== 1000) {
                        onError?.('Connessione WebSocket persa. Riprova più tardi.');
                    }
                }
            };

            ws.onerror = (error) => {
                console.error('[useLiveSession] WebSocket error:', error);
            };

        } catch (e) {
            console.error('[useLiveSession] startSession error:', e);
            onError?.(e.message || 'Errore durante l\'avvio della sessione.');
            _cleanup(true);
        }
    }, [callBridge, onTextMessage, onError]);

    // ── Audio Playback (24kHz PCM from Gemini) ───────────────────────────────
    const playAudio = (base64Data) => {
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;

        try {
            const arrayBuffer = base64ToArrayBuffer(base64Data);
            const int16 = new Int16Array(arrayBuffer);
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) {
                float32[i] = int16[i] / 32768.0;
            }

            const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
            audioBuffer.getChannelData(0).set(float32);

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);

            // Scheduling sequentially
            if (nextPlayTimeRef.current < ctx.currentTime) {
                nextPlayTimeRef.current = ctx.currentTime;
            }
            source.start(nextPlayTimeRef.current);
            nextPlayTimeRef.current += audioBuffer.duration;
        } catch (e) {
            console.error('[useLiveSession] Audio playback error:', e);
        }
    };


    // ── endSession ────────────────────────────────────────────────────────────
    const endSession = useCallback(() => {
        console.log('[useLiveSession] User ended session');
        reconnectAttemptsRef.current = MAX_RECONNECT; // prevent reconnect
        _cleanup(true);
    }, []);

    // ── cleanup ───────────────────────────────────────────────────────────────
    function _cleanup(fullReset = true) {
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current.onaudioprocess = null;
            processorRef.current = null;
        }
        if (analyserRef.current) {
            analyserRef.current.disconnect();
            analyserRef.current = null;
        }
        if (audioContextRef.current) {
            void audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (wsRef.current) {
            // Unbind handlers so we don't trigger anything on close if we're cleaning up
            wsRef.current.onclose = null;
            wsRef.current.onerror = null;
            wsRef.current.onmessage = null;
            wsRef.current.onopen = null;
            wsRef.current.close(1000);
            wsRef.current = null;
        }

        if (fullReset) {
            setIsConnected(false);
            setIsSpeaking(false);
            setVolume(0);
            setTranscript('');
            nextPlayTimeRef.current = 0;
            reconnectAttemptsRef.current = 0;
        }
    }

    return { isConnected, isSpeaking, transcript, volume, startSession, endSession };
}
