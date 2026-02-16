import React, { useState, useEffect } from 'react';
import { Target, Lock, Check } from 'lucide-react';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase';
import { format } from 'date-fns';

export const TilePulse = () => {
    const [items, setItems] = useState([]);
    const [input, setInput] = useState("");
    const today = new Date().toISOString().split('T')[0];
    const pulseRef = doc(db, "daily_pulse", today);

    useEffect(() => {
        const unsub = onSnapshot(pulseRef, (doc) => {
            if (doc.exists()) setItems(doc.data().focus_items || []);
            else setItems([]);
        });
        return () => unsub();
    }, [today]);

    const addItem = async (e) => {
        if (e.key === 'Enter' && input.trim() && items.length < 3) {
            const newItem = { id: Date.now(), text: input, completed: false };
            if (items.length === 0) await setDoc(pulseRef, { date: today, focus_items: [newItem] });
            else await updateDoc(pulseRef, { focus_items: arrayUnion(newItem) });
            setInput("");
        }
    };

    const toggleItem = async (item) => {
        const updated = items.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i);
        // Optimistic update handled by snapshot, but local state can be jittery, so we trust snapshot mostly.
        await updateDoc(pulseRef, { focus_items: updated });
    };

    const isLocked = items.length >= 3;

    return (
        <div className="h-full flex flex-col p-7 relative overflow-hidden">
            {/* Subtle top highlight line */}
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="flex items-center justify-between mb-6 z-10">
                <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-teal-400" /> Daily Pulse
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono px-2 py-1 border border-white/5 bg-white/[0.03] rounded-lg">
                    {format(new Date(), 'dd MMM')}
                </span>
            </div>

            <div className="space-y-3 flex-grow z-10">
                {items.map(item => (
                    <div
                        key={item.id}
                        className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all cursor-pointer"
                        onClick={() => toggleItem(item)}
                    >
                        <div className={`w-5 h-5 border rounded-md flex items-center justify-center transition-all flex-shrink-0 ${item.completed ? 'bg-emerald-500/80 border-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'border-white/20 group-hover:border-white/40'}`}>
                            {item.completed && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-sm font-mono truncate transition-colors ${item.completed ? 'text-zinc-600 line-through' : 'text-zinc-200 group-hover:text-white'}`}>
                            {item.text}
                        </span>
                    </div>
                ))}

                {items.length < 3 && (
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={addItem}
                        placeholder="Add Focus Target..."
                        className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl text-sm font-mono text-zinc-400 focus:outline-none focus:border-white/20 focus:bg-white/[0.04] py-3 px-3 placeholder:text-zinc-700 transition-all"
                    />
                )}
            </div>

            {isLocked && (
                <div className="absolute -bottom-8 -right-8 pointer-events-none opacity-[0.04]">
                    <Lock className="w-40 h-40 text-white" />
                </div>
            )}

            {isLocked && !items.every(i => i.completed) && (
                <div className="absolute bottom-5 left-7 text-[10px] text-red-400 font-mono flex items-center gap-1.5 animate-pulse z-10">
                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                    SYSTEM LOCKED: EXECUTE TARGETS
                </div>
            )}
        </div>
    );
};
