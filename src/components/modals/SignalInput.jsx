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
                className="bg-zinc-950 border border-zinc-800 w-full max-w-md p-6 rounded-2xl relative z-10 shadow-2xl"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-white font-mono tracking-wide flex items-center gap-2">
                        <Radio className="w-5 h-5 text-zinc-400" /> LOG NEW SIGNAL
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1 font-mono uppercase">Signal Description (Weak or Strong)</label>
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-white focus:border-white focus:outline-none transition-colors h-32 resize-none"
                            placeholder="e.g., Supply chain jitter delayed shipping by 2 days..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-zinc-500 mb-2 font-mono uppercase">Risk Level</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['low', 'medium', 'high'].map((l) => (
                                <button
                                    key={l}
                                    onClick={() => setLevel(l)}
                                    className={`p-2 rounded border uppercase text-xs font-bold transition-all ${level === l
                                            ? l === 'high' ? 'bg-red-500 text-black border-red-500'
                                                : l === 'medium' ? 'bg-yellow-500 text-black border-yellow-500'
                                                    : 'bg-blue-500 text-black border-blue-500'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'
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
                        className="w-full p-3 bg-white hover:bg-zinc-200 text-black rounded font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
