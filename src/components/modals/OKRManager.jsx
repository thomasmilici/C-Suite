import React, { useState } from 'react';
import { X, Save, Trash2, Plus, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const OKRManager = ({ onClose, existingOKR = null }) => {
    const [title, setTitle] = useState(existingOKR?.title || "");
    const [status, setStatus] = useState(existingOKR?.status || "on-track");
    const [progress, setProgress] = useState(existingOKR?.progress || 0);
    const [keyResults, setKeyResults] = useState(existingOKR?.keyResults || []);
    const [newKR, setNewKR] = useState("");
    const [loading, setLoading] = useState(false);

    const addKeyResult = () => {
        if (!newKR.trim()) return;
        setKeyResults(prev => [...prev, { id: Date.now(), text: newKR.trim(), completed: false }]);
        setNewKR("");
    };

    const toggleKR = (id) => {
        setKeyResults(prev => prev.map(kr => kr.id === id ? { ...kr, completed: !kr.completed } : kr));
    };

    const deleteKR = (id) => {
        setKeyResults(prev => prev.filter(kr => kr.id !== id));
    };

    const handleSave = async () => {
        if (!title.trim()) return;
        setLoading(true);
        try {
            const payload = {
                title,
                status,
                progress: Number(progress),
                keyResults,
                updatedAt: serverTimestamp()
            };
            if (existingOKR) {
                await updateDoc(doc(db, "okrs", existingOKR.id), payload);
            } else {
                await addDoc(collection(db, "okrs"), { ...payload, createdAt: serverTimestamp() });
            }
            onClose();
        } catch (e) {
            console.error("Error saving OKR:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!existingOKR || !window.confirm("Delete this Strategic Theme?")) return;
        setLoading(true);
        try {
            await deleteDoc(doc(db, "okrs", existingOKR.id));
            onClose();
        } catch (e) {
            console.error("Error deleting OKR:", e);
        }
    };

    const completedCount = keyResults.filter(kr => kr.completed).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0a0a0f]/90 backdrop-blur-2xl border border-white/[0.08] w-full max-w-md p-7 rounded-2xl relative z-10
                    shadow-[0_24px_64px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.07)] max-h-[90vh] overflow-y-auto"
            >
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-white font-mono tracking-wide">
                        {existingOKR ? "EDIT STRATEGY" : "NEW STRATEGY"}
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-xs text-zinc-500 mb-2 font-mono uppercase tracking-wider">Strategic Theme</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white focus:border-white/30 focus:bg-white/[0.06] focus:outline-none transition-all placeholder:text-zinc-600"
                            placeholder="e.g., Market Penetration Q1"
                        />
                    </div>

                    {/* Status + Progress */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-zinc-500 mb-2 font-mono uppercase tracking-wider">Status</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white focus:border-white/30 focus:outline-none appearance-none"
                            >
                                <option value="on-track">On Track</option>
                                <option value="risk">At Risk</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 mb-2 font-mono uppercase tracking-wider">Progress (%)</label>
                            <input
                                type="number"
                                min="0" max="100"
                                value={progress}
                                onChange={e => setProgress(e.target.value)}
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white focus:border-white/30 focus:outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Key Results */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-zinc-500 font-mono uppercase tracking-wider">Key Results</label>
                            {keyResults.length > 0 && (
                                <span className="text-[10px] font-mono text-zinc-600">
                                    {completedCount}/{keyResults.length} done
                                </span>
                            )}
                        </div>

                        {/* KR List */}
                        <div className="space-y-2 mb-3">
                            {keyResults.map(kr => (
                                <div key={kr.id} className="flex items-center gap-2 group">
                                    <button
                                        onClick={() => toggleKR(kr.id)}
                                        className={`w-5 h-5 flex-shrink-0 rounded-md border flex items-center justify-center transition-all ${
                                            kr.completed
                                                ? 'bg-emerald-500/80 border-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                                                : 'border-white/20 hover:border-white/40'
                                        }`}
                                    >
                                        {kr.completed && <Check className="w-2.5 h-2.5 text-white" />}
                                    </button>
                                    <span className={`flex-grow text-xs font-mono transition-colors ${
                                        kr.completed ? 'text-zinc-600 line-through' : 'text-zinc-300'
                                    }`}>
                                        {kr.text}
                                    </span>
                                    <button
                                        onClick={() => deleteKR(kr.id)}
                                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add KR input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newKR}
                                onChange={e => setNewKR(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addKeyResult()}
                                placeholder="Add key result..."
                                className="flex-grow bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5 text-white text-xs focus:border-white/30 focus:bg-white/[0.06] focus:outline-none transition-all placeholder:text-zinc-700 font-mono"
                            />
                            <button
                                onClick={addKeyResult}
                                disabled={!newKR.trim()}
                                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition-all disabled:opacity-30"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    {existingOKR && (
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all disabled:opacity-50"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={loading || !title.trim()}
                        className="flex-grow p-3 bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/25 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 backdrop-blur-sm font-mono"
                    >
                        {loading ? "SAVING..." : (
                            <>
                                <Save className="w-4 h-4" /> SAVE STRATEGY
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
