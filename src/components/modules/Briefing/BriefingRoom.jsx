import React, { useState } from 'react';
import { FileText, RefreshCw, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../firebase';
import ReactMarkdown from 'react-markdown';

export const BriefingRoom = () => {
    const [briefing, setBriefing] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [generated, setGenerated] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        try {
            const generateBriefing = httpsCallable(functions, 'generateDailyBriefing');
            const result = await generateBriefing({});
            if (result.data?.data) {
                setBriefing(result.data.data);
                setGenerated(true);
            } else {
                setError("Briefing generation failed. Check function logs.");
            }
        } catch (e) {
            console.error("Briefing error:", e);
            setError(e.message || "Connection failed.");
        } finally {
            setLoading(false);
        }
    };

    const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="h-full flex flex-col p-7 relative overflow-hidden">
            {/* Subtle top highlight line */}
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Background icon */}
            <div className="absolute top-0 right-0 p-6 opacity-[0.04] pointer-events-none select-none">
                <FileText className="w-32 h-32 text-white rotate-12" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-5 relative z-10">
                <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-400" /> Briefing Room
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600 font-mono capitalize">{today}</span>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/10 hover:border-white/20 disabled:opacity-40"
                        title="Generate briefing"
                    >
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-white/5">
                <AnimatePresence mode="wait">
                    {loading && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col items-center justify-center gap-3"
                        >
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-blue-400 animate-pulse" />
                                <span className="text-xs font-mono text-zinc-400 animate-pulse">GENERATING BRIEFING...</span>
                            </div>
                            <div className="flex gap-1">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {!loading && error && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-mono"
                        >
                            {error}
                        </motion.div>
                    )}

                    {!loading && !error && briefing && (
                        <motion.div
                            key="briefing"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="prose prose-invert prose-sm max-w-none font-mono
                                prose-headings:text-zinc-300 prose-headings:text-xs prose-headings:uppercase prose-headings:tracking-widest prose-headings:font-bold prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0
                                prose-p:text-zinc-400 prose-p:text-xs prose-p:leading-relaxed
                                prose-li:text-zinc-400 prose-li:text-xs prose-li:leading-relaxed
                                prose-strong:text-zinc-200"
                        >
                            <ReactMarkdown>{briefing}</ReactMarkdown>
                        </motion.div>
                    )}

                    {!loading && !error && !briefing && (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col items-center justify-center gap-4 text-center"
                        >
                            <div className="w-12 h-12 rounded-full border border-white/[0.06] bg-white/[0.02] flex items-center justify-center">
                                <FileText className="w-5 h-5 text-zinc-600" />
                            </div>
                            <div>
                                <p className="text-zinc-500 text-xs font-mono mb-1">NO BRIEFING GENERATED</p>
                                <p className="text-zinc-700 text-[10px] font-mono">Press refresh to generate today's briefing</p>
                            </div>
                            <button
                                onClick={handleGenerate}
                                className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2"
                            >
                                <Zap className="w-3 h-3" /> GENERATE BRIEFING
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
