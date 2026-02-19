import React, { useEffect } from 'react';
import { Sparkles, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AiFab = ({ onClick, isProcessing = false, unreadCount = 0 }) => {

    // Keyboard shortcut: Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                onClick?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClick]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed z-40 hidden md:flex flex-col items-end gap-2"
            style={{
                bottom: 'calc(24px + env(safe-area-inset-bottom))',
                // KEYLINE ANCHOR STRATEGY (C1):
                // Anchor to the max-width container (1536px/2xl usually, but let's assume 1536px for 2xl).
                // If screen > 1536px, right = (100vw - 1536px) / 2 + 24px
                // If screen <= 1536px, right = 24px
                right: 'max(24px, calc((100vw - 1536px) / 2 + 24px))',
            }}
        >
            <motion.button
                onClick={onClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                    group relative flex items-center gap-3 pr-6 pl-5 py-4
                    bg-white/10 backdrop-blur-xl border border-white/10
                    shadow-[0_8px_32px_rgba(0,0,0,0.5)]
                    rounded-full
                    hover:bg-white/15 hover:border-white/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]
                    transition-all duration-300
                `}
                aria-label="Open AI Assistant (Ctrl+K)"
            >
                {/* Visual Glow */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative">
                    {isProcessing ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Sparkles className="w-6 h-6 text-indigo-400 group-hover:text-white transition-colors" />
                    )}

                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#050508]" />
                    )}
                </div>

                <div className="flex flex-col items-start">
                    <span className="text-sm font-bold text-white tracking-wide">AI Assistant</span>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                        <Command className="w-3 h-3" /> K
                    </span>
                </div>

            </motion.button>
        </motion.div>
    );
};
