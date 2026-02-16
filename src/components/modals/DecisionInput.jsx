import React, { useState } from 'react';
import { X, BookOpen, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

export const DecisionInput = ({ onClose }) => {
    const [title, setTitle] = useState("");
    const [context, setContext] = useState("");
    const [outcome, setOutcome] = useState("approved"); // approved, pending, rejected
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!title.trim()) return;
        setLoading(true);
        try {
            await addDoc(collection(db, "decisions"), {
                title,
                context,
                outcome,
                createdAt: serverTimestamp(),
            });
            onClose();
        } catch (e) {
            console.error("Error saving decision:", e);
        } finally {
            setLoading(false);
        }
    };

    const outcomeConfig = {
        approved: { label: 'APPROVED', colors: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' },
        pending: { label: 'PENDING', colors: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' },
        rejected: { label: 'REJECTED', colors: 'bg-red-500/20 text-red-300 border-red-500/50' },
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0a0a0f]/90 backdrop-blur-2xl border border-white/[0.08] w-full max-w-md p-7 rounded-2xl relative z-10
                    shadow-[0_24px_64px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.07)]"
            >
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-white font-mono tracking-wide flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-400" /> LOG DECISION
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-zinc-500 mb-2 font-mono uppercase tracking-wider">Decision Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white focus:border-white/30 focus:bg-white/[0.06] focus:outline-none transition-all placeholder:text-zinc-600 font-mono text-sm"
                            placeholder="e.g., Q2 Hiring Plan approved"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-zinc-500 mb-2 font-mono uppercase tracking-wider">Context (optional)</label>
                        <textarea
                            value={context}
                            onChange={e => setContext(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white focus:border-white/30 focus:bg-white/[0.06] focus:outline-none transition-all h-24 resize-none placeholder:text-zinc-600 font-mono text-xs"
                            placeholder="Rationale, stakeholders, constraints..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-zinc-500 mb-2 font-mono uppercase tracking-wider">Outcome</label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(outcomeConfig).map(([key, cfg]) => (
                                <button
                                    key={key}
                                    onClick={() => setOutcome(key)}
                                    className={`p-2.5 rounded-xl border text-xs font-bold tracking-wider transition-all ${
                                        outcome === key ? cfg.colors : 'bg-white/[0.03] border-white/[0.07] text-zinc-500 hover:border-white/15 hover:text-zinc-300'
                                    }`}
                                >
                                    {cfg.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button
                        onClick={handleSave}
                        disabled={loading || !title.trim()}
                        className="w-full p-3 bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/25 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-mono"
                    >
                        {loading ? "LOGGING..." : (
                            <>
                                <Send className="w-4 h-4" /> LOG DECISION
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
