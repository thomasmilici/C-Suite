import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BrainCircuit, Sparkles, Trash2, PhoneOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AudioWaveform } from './ui/AudioWaveform';
import SphereAI from './SphereAI';

/**
 * CopilotDialogue — Slide-in panel for Shadow CoS conversational output.
 *
 * Desktop: fixed right drawer (w-[420px]), slides in from right.
 * Mobile:  bottom sheet (h-[70vh]), slides up from bottom.
 *
 * Props:
 *   messages    — array of { id, type: 'user'|'ai'|'system', text }
 *   isOpen      — boolean
 *   isThinking  — boolean
 *   onClose     — fn
 *   onClear     — fn
 *   isLiveActive — boolean (Gemini Live session running)
 *   transcript  — string (live transcript from useLiveSession)
 *   volume      — number 0–1 (mic volume for waveform)
 *   isSpeaking  — boolean (Gemini is producing audio)
 *   onEndLive   — fn (stop the Live session)
 */

export const CopilotDialogue = ({
    messages = [],
    isOpen,
    isThinking,
    onClose,
    onClear,
    isLiveActive = false,
    transcript = '',
    volume = 0,
    isSpeaking = false,
    onEndLive,
}) => {
    const scrollRef = useRef(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isThinking, transcript]);

    const prevThinking = useRef(isThinking);
    const [isSpeakingText, setIsSpeakingText] = useState(false);

    useEffect(() => {
        if (prevThinking.current && !isThinking) {
            setIsSpeakingText(true);
            const t = setTimeout(() => setIsSpeakingText(false), 2000);
            return () => clearTimeout(t);
        }
        prevThinking.current = isThinking;
    }, [isThinking]);

    let sphereState = 'idle';
    if (isThinking) sphereState = 'thinking';
    else if (isSpeaking || isSpeakingText) sphereState = 'speaking';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop — mobile only */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        key="panel"
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                        className={`
                            fixed z-50 flex flex-col overflow-hidden
                            bg-zinc-950 border-l border-white/[0.07]
                            shadow-2xl shadow-black/60
                            /* Desktop */
                            right-0 top-14 bottom-0 w-[420px]
                            /* Mobile override */
                            max-md:w-full max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:h-[72vh]
                            max-md:border-l-0 max-md:border-t max-md:rounded-t-2xl
                        `}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] flex-shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                    <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-mono font-bold text-white tracking-wide">SHADOW CoS</p>
                                    <div className="flex items-center gap-1.5">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500" />
                                        </span>
                                        <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
                                            Neural Uplink Active
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {messages.length > 1 && !isLiveActive && (
                                    <button
                                        onClick={onClear}
                                        title="Cancella conversazione"
                                        className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Live Session Banner — shown when Live mode is active */}
                        {isLiveActive && (
                            <div className="flex-shrink-0 border-b border-red-500/20 bg-red-500/5 px-4 py-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                                        <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
                                            Live Session
                                        </span>
                                        <AudioWaveform volume={volume} isSpeaking={isSpeaking} />
                                    </div>
                                    <button
                                        onClick={onEndLive}
                                        title="Termina sessione Live"
                                        className="flex items-center gap-1 text-zinc-600 hover:text-red-400 text-[10px] font-mono transition-colors"
                                    >
                                        <PhoneOff className="w-3 h-3" />
                                        Fine
                                    </button>
                                </div>
                                {transcript && (
                                    <p className="text-[11px] text-zinc-500 italic mt-1 font-mono truncate">
                                        {transcript}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Messages */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-white/5"
                        >
                            {/* SphereAI in top of drawer */}
                            <div className="flex justify-center my-6">
                                <SphereAI size={80} state={sphereState} />
                            </div>
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                                    <Sparkles className="w-6 h-6 text-zinc-700" />
                                    <p className="text-xs text-zinc-600 font-mono">
                                        {isLiveActive
                                            ? 'Parla liberamente — la trascrizione apparirà qui'
                                            : 'Fai una domanda nella barra in alto'
                                        }
                                    </p>
                                </div>
                            )}

                            {messages.map((msg) => (
                                <div key={msg.id}>
                                    {msg.type === 'system' ? (
                                        <div className="flex justify-center">
                                            <span className="text-[10px] font-mono text-emerald-500/80 border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 rounded-lg">
                                                {msg.text}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`
                                                max-w-[88%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed
                                                ${msg.type === 'user'
                                                    ? 'bg-zinc-800/80 text-white rounded-tr-sm'
                                                    : 'bg-indigo-900/10 border border-indigo-500/10 text-zinc-300 rounded-tl-sm'
                                                }
                                            `}>
                                                {msg.type === 'ai' ? (
                                                    <ReactMarkdown className="prose prose-invert prose-sm max-w-none prose-p:text-zinc-300 prose-strong:text-white prose-headings:text-zinc-200 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                                                        {msg.text}
                                                    </ReactMarkdown>
                                                ) : (
                                                    <p className="font-mono text-xs">{msg.text}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Thinking indicator — text mode only, hidden during Live */}
                            {isThinking && !isLiveActive && (
                                <div className="flex justify-start">
                                    <div className="bg-indigo-900/10 border border-indigo-500/10 px-3.5 py-2.5 rounded-xl rounded-tl-sm flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                                        <span className="text-xs text-indigo-300 font-mono animate-pulse">
                                            Analisi in corso...
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
