import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, X, Sparkles, Volume2, VolumeX } from 'lucide-react';

/**
 * CommandBar — Voice-First Copilot input component.
 *
 * Features:
 * - Text input with send on Enter
 * - STT via Web Speech API (SpeechRecognition)
 * - TTS toggle: reads AI responses aloud via speechSynthesis
 * - Context-aware: reads current URL to determine contextId
 * - Emits onSend(text, contextId) for parent to call askShadowCoS
 */

// ── STT HELPERS ───────────────────────────────────────────────────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const hasSpeech = !!SpeechRecognition;

// ── TTS HELPERS ───────────────────────────────────────────────────────────────
export function speakText(text, { lang = 'it-IT', rate = 1, onEnd } = {}) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    if (onEnd) utterance.onend = onEnd;
    window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
}

// ── CONTEXT RESOLVER ──────────────────────────────────────────────────────────
// Reads the current URL to determine dossier context.
// /progetto/:id  →  contextId = :id
// /dashboard     →  contextId = null (global)
function resolveContextId(pathname) {
    const match = pathname.match(/\/progetto\/([^/]+)/);
    return match ? match[1] : null;
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export const CommandBar = ({ onSend, isProcessing = false, ttsEnabled, onTtsToggle }) => {
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [sttError, setSttError] = useState(null);
    const inputRef = useRef(null);
    const recognitionRef = useRef(null);

    const contextId = resolveContextId(window.location.pathname);
    const contextLabel = contextId ? 'Dossier' : 'Portfolio';

    // ── STT Setup ─────────────────────────────────────────────────────────────
    const startListening = useCallback(() => {
        if (!hasSpeech) {
            setSttError('Speech recognition non supportato in questo browser.');
            return;
        }
        if (isListening) {
            recognitionRef.current?.stop();
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'it-IT';
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;

        recognition.onstart = () => {
            setIsListening(true);
            setSttError(null);
            stopSpeaking(); // Stop TTS when user starts speaking
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(r => r[0].transcript)
                .join('');
            setInput(transcript);
        };

        recognition.onerror = (event) => {
            setSttError(`Errore: ${event.error}`);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    }, [isListening]);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            recognitionRef.current?.stop();
            stopSpeaking();
        };
    }, []);

    // ── Send Handler ──────────────────────────────────────────────────────────
    const handleSend = useCallback(() => {
        const text = input.trim();
        if (!text || isProcessing) return;
        stopListening();
        onSend(text, contextId);
        setInput('');
        inputRef.current?.focus();
    }, [input, isProcessing, contextId, onSend, stopListening]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        if (e.key === 'Escape') {
            setInput('');
            stopListening();
        }
    };

    return (
        <div className="flex-1 max-w-2xl mx-4 relative">
            {/* Main input container */}
            <div className={`
                flex items-center gap-2 px-3 py-1.5
                bg-white/[0.04] border rounded-xl
                transition-all duration-200
                ${isListening
                    ? 'border-indigo-500/60 bg-indigo-500/5 shadow-[0_0_0_3px_rgba(99,102,241,0.15)]'
                    : 'border-white/[0.08] hover:border-white/[0.15] focus-within:border-indigo-500/40 focus-within:bg-white/[0.06]'
                }
            `}>
                {/* Context badge */}
                <span className="hidden sm:flex items-center gap-1 text-[9px] font-mono text-zinc-600 uppercase tracking-widest whitespace-nowrap flex-shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${contextId ? 'bg-indigo-400' : 'bg-zinc-600'}`} />
                    {contextLabel}
                </span>
                <div className="hidden sm:block w-px h-3 bg-white/[0.06]" />

                {/* Text input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? 'In ascolto...' : 'Chiedi al Shadow CoS...'}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none font-mono min-w-0 py-1"
                    disabled={isProcessing}
                />

                {/* Processing indicator */}
                {isProcessing && (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin flex-shrink-0" />
                )}

                {/* Clear */}
                <AnimatePresence>
                    {input && !isProcessing && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={() => setInput('')}
                            className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0"
                        >
                            <X className="w-3 h-3" />
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* TTS toggle */}
                <button
                    onClick={onTtsToggle}
                    title={ttsEnabled ? 'Disattiva voce AI' : 'Attiva voce AI'}
                    className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                        ttsEnabled
                            ? 'text-indigo-400 hover:text-indigo-300'
                            : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                >
                    {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                {/* Voice/Send button */}
                {input.trim() ? (
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleSend}
                        disabled={isProcessing}
                        className="flex-shrink-0 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Send className="w-3.5 h-3.5" />
                    </motion.button>
                ) : (
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={startListening}
                        disabled={!hasSpeech || isProcessing}
                        title={hasSpeech ? (isListening ? 'Ferma ascolto' : 'Parla') : 'STT non supportato'}
                        className={`flex-shrink-0 p-1.5 rounded-lg transition-all disabled:opacity-40 ${
                            isListening
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                        }`}
                    >
                        {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </motion.button>
                )}
            </div>

            {/* STT error tooltip */}
            <AnimatePresence>
                {sttError && (
                    <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-full mt-1 left-0 text-[10px] text-red-400 font-mono"
                    >
                        {sttError}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
};
