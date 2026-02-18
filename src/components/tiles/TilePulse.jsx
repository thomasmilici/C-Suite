import React, { useState, useEffect } from 'react';
import { Target, Lock, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import { format } from 'date-fns';

export const TilePulse = ({ eventId }) => {
  const [items, setItems] = useState([]);
  const [input, setInput] = useState('');
  const today = new Date().toISOString().split('T')[0];

  // Scoped doc: se eventId esiste usa "eventId_today", altrimenti usa solo "today" (global)
  const docKey = eventId ? `${eventId}_${today}` : today;
  const pulseRef = doc(db, 'daily_pulse', docKey);

  useEffect(() => {
    const unsub = onSnapshot(pulseRef, (docSnap) => {
      if (docSnap.exists()) setItems(docSnap.data().focus_items || []);
      else setItems([]);
    });
    return () => unsub();
  }, [docKey]);

  const addItem = async (e) => {
    if (e.key === 'Enter' && input.trim() && items.length < 3) {
      const newItem = { id: Date.now(), text: input, completed: false };
      if (items.length === 0) await setDoc(pulseRef, { date: today, eventId: eventId || null, focus_items: [newItem] });
      else await updateDoc(pulseRef, { focus_items: arrayUnion(newItem) });
      setInput('');
    }
  };

  const toggleItem = async (item) => {
    const updated = items.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i);
    await updateDoc(pulseRef, { focus_items: updated });
  };

  const deleteItem = async (e, item) => {
    e.stopPropagation();
    const updated = items.filter(i => i.id !== item.id);
    await updateDoc(pulseRef, { focus_items: updated });
  };

  const isLocked = items.length >= 3;
  const allDone = items.length > 0 && items.every(i => i.completed);

  return (
    <div className="h-full flex flex-col p-7 relative overflow-hidden">
      {/* Subtle top highlight line */}
      <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="flex items-center justify-between mb-6 z-10">
        <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-teal-400" /> Daily Pulse
        </h3>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              allDone
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                : 'text-zinc-400 border-white/5 bg-white/[0.03]'
            }`}>
              {items.filter(i => i.completed).length}/{items.length}
            </span>
          )}
          <span className="text-[10px] text-zinc-500 font-mono px-2 py-1 border border-white/5 bg-white/[0.03] rounded-lg">
            {format(new Date(), 'dd MMM')}
          </span>
        </div>
      </div>

      <div className="space-y-2.5 flex-grow z-10">
        <AnimatePresence>
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              whileHover={{ scale: 1.01 }}
              transition={{ type: 'spring', damping: 15 }}
              onClick={() => toggleItem(item)}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all group ${
                item.completed
                  ? 'bg-white/[0.02] border-white/[0.04] opacity-60'
                  : 'bg-white/[0.03] border-white/[0.07] hover:border-teal-500/20 hover:bg-teal-500/[0.03]'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                item.completed ? 'border-teal-400 bg-teal-400/20' : 'border-zinc-600 group-hover:border-teal-500/50'
              }`}>
                {item.completed && <Check className="w-2.5 h-2.5 text-teal-300" />}
              </div>
              <span className={`flex-grow text-sm font-mono transition-all ${
                item.completed ? 'line-through text-zinc-600' : 'text-zinc-200'
              }`}>
                {item.text}
              </span>
              <button
                onClick={(e) => deleteItem(e, item)}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-4 z-10">
        {isLocked ? (
          <div className="flex items-center gap-2 text-zinc-600 text-xs font-mono py-2">
            <Lock className="w-3 h-3" /> Focus locked — max 3 target attivi
          </div>
        ) : (
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={addItem}
            placeholder="Aggiungi altre target..."
            className="w-full bg-transparent border-b border-white/[0.06] pb-2 text-sm text-zinc-300 placeholder-zinc-700 font-mono focus:outline-none focus:border-teal-500/30 transition-colors"
          />
        )}
      </div>
    </div>
  );
};
