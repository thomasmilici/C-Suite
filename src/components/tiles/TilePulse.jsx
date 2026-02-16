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
        <div className="h-full flex flex-col p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 z-10">
                <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Target className="w-4 h-4" /> Daily Pulse
                </h3>
                <span className="text-[10px] text-zinc-600 font-mono">
                    {format(new Date(), 'dd MMM')}
                </span>
            </div>

            <div className="space-y-2 flex-grow z-10">
                {items.map(item => (
                    <div key={item.id} className="group flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors cursor-pointer" onClick={() => toggleItem(item)}>
                        <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${item.completed ? 'bg-green-500 border-green-500' : 'border-zinc-700'}`}>
                            {item.completed && <Check className="w-3 h-3 text-black" />}
                        </div>
                        <span className={`text-sm font-mono truncate ${item.completed ? 'text-zinc-600 line-through' : 'text-zinc-200'}`}>
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
                        className="w-full bg-transparent border-b border-zinc-800 text-sm font-mono text-zinc-400 focus:outline-none focus:border-zinc-500 py-2 placeholder:text-zinc-700"
                    />
                )}
            </div>

            {/* Locked State Visual */}
            {isLocked && (
                <div className="absolute -bottom-6 -right-6 text-zinc-900 opacity-20 pointer-events-none">
                    <Lock className="w-32 h-32" />
                </div>
            )}

            {isLocked && !items.every(i => i.completed) && (
                <div className="absolute bottom-4 left-6 text-[10px] text-red-500 font-mono flex items-center gap-1 animate-pulse">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    SYSTEM LOCKED: EXECUTE TARGETS
                </div>
            )}
        </div>
    );
};
