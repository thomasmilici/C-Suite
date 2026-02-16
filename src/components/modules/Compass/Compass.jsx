import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, query, onSnapshot, addDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { Plus, Loader2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

export const Compass = () => {
    const [okrs, setOkrs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newOkr, setNewOkr] = useState({ title: '', status: 'active', progress: 0 });

    useEffect(() => {
        const q = query(collection(db, "okrs"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setOkrs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleAddOkr = async (e) => {
        e.preventDefault();
        if (!newOkr.title.trim()) return;

        await addDoc(collection(db, "okrs"), {
            ...newOkr,
            createdAt: serverTimestamp(),
            strategicAlignment: 'high'
        });
        setNewOkr({ title: '', status: 'active', progress: 0 });
        setIsAdding(false);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'text-green-400';
            case 'risk': return 'text-red-400 text-shadow-red';
            case 'done': return 'text-blue-400 line-through opacity-50';
            default: return 'text-gray-400';
        }
    };

    const getBarColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-500';
            case 'risk': return 'bg-red-500';
            case 'done': return 'bg-blue-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="bg-black border border-zinc-800 p-6 rounded-xl h-full flex flex-col relative group">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-gray-400 text-xs uppercase tracking-wider font-mono">The Compass (Strategy)</h2>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-zinc-600 hover:text-white transition-colors"
                >
                    <Plus className={cn("w-4 h-4 transition-transform", isAdding && "rotate-45")} />
                </button>
            </div>

            {loading ? (
                <div className="flex-grow flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-700" />
                </div>
            ) : (
                <div className="space-y-6 flex-grow overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
                    {isAdding && (
                        <form onSubmit={handleAddOkr} className="mb-4 bg-zinc-900/50 p-3 rounded border border-zinc-800 animate-in fade-in slide-in-from-top-2">
                            <input
                                autoFocus
                                type="text"
                                placeholder="New Strategic Theme..."
                                className="w-full bg-transparent text-sm text-white focus:outline-none placeholder:text-zinc-600 font-mono mb-2"
                                value={newOkr.title}
                                onChange={e => setNewOkr({ ...newOkr, title: e.target.value })}
                            />
                            <div className="flex justify-between items-start">
                                <select
                                    className="bg-zinc-950 text-xs text-zinc-400 border border-zinc-800 rounded p-1"
                                    value={newOkr.status}
                                    onChange={e => setNewOkr({ ...newOkr, status: e.target.value })}
                                >
                                    <option value="active">Active</option>
                                    <option value="risk">At Risk</option>
                                </select>
                                <button type="submit" className="text-xs bg-white text-black px-2 py-1 rounded font-bold">ADD</button>
                            </div>
                        </form>
                    )}

                    {okrs.map(okr => (
                        <div key={okr.id} className="group/item">
                            <div className="flex justify-between text-sm text-gray-200 mb-2 font-mono items-end">
                                <span className="truncate max-w-[70%]">{okr.title}</span>
                                <span className={cn("text-xs font-bold", getStatusColor(okr.status))}>
                                    {Math.round(okr.progress)}%
                                </span>
                            </div>
                            <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className={cn("h-1.5 rounded-full transition-all duration-1000", getBarColor(okr.status))}
                                    style={{ width: `${okr.progress}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}

                    {okrs.length === 0 && !isAdding && (
                        <div className="text-center text-zinc-700 text-xs font-mono py-8">
                            NO ACTIVE STRATEGIES.<br />SYSTEM IDLE.
                        </div>
                    )}
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-zinc-900">
                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <span className={cn("w-2 h-2 rounded-full animate-pulse", okrs.length > 0 ? "bg-green-500" : "bg-red-900")}></span>
                    Strategic Alignment: {okrs.length > 0 ? 'Active' : 'Offline'}
                </div>
            </div>
        </div>
    );
};
