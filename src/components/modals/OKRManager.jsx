import React, { useState } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const OKRManager = ({ onClose, existingOKR = null }) => {
    const [title, setTitle] = useState(existingOKR?.title || "");
    const [status, setStatus] = useState(existingOKR?.status || "on-track"); // on-track, risk
    const [progress, setProgress] = useState(existingOKR?.progress || 0);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!title.trim()) return;
        setLoading(true);
        try {
            if (existingOKR) {
                await updateDoc(doc(db, "okrs", existingOKR.id), {
                    title, status, progress: Number(progress), updatedAt: serverTimestamp()
                });
            } else {
                await addDoc(collection(db, "okrs"), {
                    title, status, progress: Number(progress), createdAt: serverTimestamp()
                });
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
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-950 border border-zinc-800 w-full max-w-md p-6 rounded-2xl relative z-10 shadow-2xl"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-white font-mono tracking-wide">
                        {existingOKR ? "EDIT STRATEGY" : "NEW STRATEGY"}
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1 font-mono uppercase">Strategic Theme (Title)</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-white focus:border-white focus:outline-none transition-colors"
                            placeholder="e.g., Market Penetration Q3"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1 font-mono uppercase">Status</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-white focus:border-white focus:outline-none appearance-none"
                            >
                                <option value="on-track">On Track (Green)</option>
                                <option value="risk">At Risk (Red)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1 font-mono uppercase">Progress (%)</label>
                            <input
                                type="number"
                                min="0" max="100"
                                value={progress}
                                onChange={e => setProgress(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-white focus:border-white focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    {existingOKR && (
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="p-3 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded font-bold transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={loading || !title.trim()}
                        className="flex-grow p-3 bg-white hover:bg-zinc-200 text-black rounded font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
