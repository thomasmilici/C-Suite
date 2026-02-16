import React, { useState } from 'react';
import { X, Radio, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

export const SignalInput = ({ onClose }) => {
    const [text, setText] = useState("");
    const [level, setLevel] = useState("low"); // low, medium, high
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!text.trim()) return;
        setLoading(true);
        try {
            await addDoc(collection(db, "signals"), {
                text,
                level,
                createdAt: serverTimestamp(),
                status: 'active'
            });
            onClose();
        } catch (e) {
            console.error("Error saving Signal:", e);
        } finally {
            setLoading(false);
        }
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
                        <Radio className="w-4 h-4 text-emerald-400" /> LOG NEW SIGNAL
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-zinc-500 mb-2 font-mono uppercase tracking-wider">Signal Description</label>
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white focus:border-white/30 focus:bg-white/[0.06] focus:outline-none transition-all h-32 resize-none placeholder:text-zinc-600"
                            placeholder="e.g., Supply chain jitter delayed shipping by 2 days..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-zinc-500 mb-2 font-mono uppercase tracking-wider">Risk Level</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['low', 'medium', 'high'].map((l) => (
                                <button
                                    key={l}
                                    onClick={() => setLevel(l)}
                                    className={`p-2.5 rounded-xl border uppercase text-xs font-bold tracking-wider transition-all ${level === l
                                            ? l === 'high' ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                                                : l === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
                                                    : 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                                            : 'bg-white/[0.03] border-white/[0.07] text-zinc-500 hover:border-white/15 hover:text-zinc-300'
                                        }`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button
                        onClick={handleSave}
                        disabled={loading || !text.trim()}
                        className="w-full p-3 bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/25 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? "TRANSMITTING..." : (
                            <>
                                <Send className="w-4 h-4" /> TRANSMIT SIGNAL
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
