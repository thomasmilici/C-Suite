import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Sparkles, Phone, PhoneOff } from 'lucide-react';

/**
 * CommandBar — Voice-First Copilot input component.
 *
 * Features:
 * - Text input with send on Enter
 * - Live button: toggles Gemini Multimodal Live voice session (managed by parent)
 * - Context-aware: reads current URL to determine contextId
 * - Emits onSend(text, contextId) for parent to call askShadowCoS
 *
 * Props:
 *   onSend          — fn(text, contextId)
 *   isProcessing    — bool (text mode thinking)
 *   isLiveActive    — bool (Live voice session running)
 *   onLiveToggle    — fn() (start/stop Live session)
 */

// ── CONTEXT RESOLVER ──────────────────────────────────────────────────────────
// /progetto/:id  →  contextId = :id
// /dashboard     →  contextId = null (global)
function resolveContextId(pathname) {
    const match = pathname.match(/\/progetto\/([^/]+)/);
    return match ? match[1] : null;
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export const CommandBar = ({ onSend, isProcessing = false, isLiveActive = false, onLiveToggle }) => {
    const [input, setInput] = useState('');
    const inputRef = useRef(null);

    const contextId = resolveContextId(window.location.pathname);
    const contextLabel = contextId ? 'Dossier' : 'Portfolio';

    // ── Send Handler ──────────────────────────────────────────────────────────
    const handleSend = useCallback(() => {
        const text = input.trim();
        if (!text || isProcessing || isLiveActive) return;
        onSend(text, contextId);
        setInput('');
        inputRef.current?.focus();
    }, [input, isProcessing, isLiveActive, contextId, onSend]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        if (e.key === 'Escape') {
            setInput('');
        }
    };

    return (
        <div className="flex-1 max-w-2xl mx-4 relative">
            {/* Main input container */}
            <div className={`
                flex items-center gap-2 px-3 py-1.5
                bg-white/[0.04] border rounded-xl
                transition-all duration-200
                ${isLiveActive
                    ? 'border-red-500/40 bg-red-500/5 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
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
                    placeholder={isLiveActive ? 'Sessione Live attiva — parla liberamente...' : 'Chiedi al Shadow CoS...'}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none font-mono min-w-0 py-1"
                    disabled={isProcessing || isLiveActive}
                />

                {/* Processing indicator (text mode) */}
                {isProcessing && !isLiveActive && (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin flex-shrink-0" />
                )}

                {/* Clear input button */}
                <AnimatePresence>
                    {input && !isProcessing && !isLiveActive && (
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

                {/* Send button (text mode only, when there's input) */}
                {input.trim() && !isLiveActive && (
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleSend}
                        disabled={isProcessing}
                        className="flex-shrink-0 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Send className="w-3.5 h-3.5" />
                    </motion.button>
                )}

                {/* Live voice toggle button */}
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onLiveToggle}
                    title={isLiveActive ? 'Termina sessione Live' : 'Avvia sessione vocale Live (Gemini)'}
                    className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${
                        isLiveActive
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                            : 'text-zinc-500 hover:text-indigo-400 hover:bg-white/5'
                    }`}
                >
                    {isLiveActive
                        ? <PhoneOff className="w-3.5 h-3.5" />
                        : <Phone className="w-3.5 h-3.5" />
                    }
                </motion.button>
            </div>
        </div>
    );
};
