import React, { useState, useEffect } from 'react';
import { Compass, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebase';

// Circular SVG progress ring
const ProgressRing = ({ progress = 0, status = 'on-track', size = 36 }) => {
    const radius = (size - 6) / 2;
    const circumference = 2 * Math.PI * radius;
    const pct = Math.min(Math.max(progress, 0), 100);
    const offset = circumference - (pct / 100) * circumference;
    const color = status === 'risk' ? '#f87171' : pct >= 80 ? '#34d399' : '#6366f1';

    return (
        <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
            {/* Track */}
            <circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={3}
            />
            {/* Progress */}
            <motion.circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none"
                stroke={color}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
            />
            {/* Percentage text (rotated back) */}
            <text
                x={size / 2} y={size / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={color}
                fontSize={size < 40 ? 8 : 10}
                fontFamily="monospace"
                fontWeight="700"
                transform={`rotate(90, ${size / 2}, ${size / 2})`}
            >
                {pct}%
            </text>
        </svg>
    );
};

export const TileCompass = ({ isAdmin, onOpenModal, eventId }) => {
    const [okrs, setOkrs] = useState([]);

    useEffect(() => {
        const base = collection(db, "okrs");
        const q = eventId
            ? query(base, where("eventId", "==", eventId), orderBy("createdAt", "desc"))
            : query(base, orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setOkrs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [eventId]);

    const handleEdit = (okr) => { if (isAdmin) onOpenModal(okr); };
    const handleAdd = (e) => { e.stopPropagation(); onOpenModal(null); };

    // Overall health — average progress
    const avgProgress = okrs.length > 0
        ? Math.round(okrs.reduce((s, o) => s + (o.progress || 0), 0) / okrs.length)
        : 0;

    return (
        <div className="h-full flex flex-col p-7 relative">
            {/* Subtle top highlight line */}
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-indigo-400" /> Strategic Themes
                </h3>
                <div className="flex items-center gap-2">
                    {okrs.length > 0 && (
                        <span className="text-[10px] text-zinc-500 font-mono px-2 py-1 border border-white/5 bg-white/[0.03] rounded-lg">
                            Q1 2026 · Ø {avgProgress}%
                        </span>
                    )}
                    {isAdmin && (
                        <button
                            onClick={handleAdd}
                            title="Aggiungi OKR"
                            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/10 hover:border-white/20 cursor-pointer"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-3 flex-grow overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin scrollbar-thumb-white/5">
                <AnimatePresence>
                    {okrs.length > 0 ? okrs.map((okr, index) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            whileHover={{ scale: 1.01 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25, delay: index * 0.05 }}
                            key={okr.id}
                            className={`group flex items-center gap-4 p-3 rounded-xl border transition-colors
                                bg-white/[0.02] border-white/[0.05]
                                ${isAdmin ? 'cursor-pointer hover:bg-white/[0.05] hover:border-white/[0.12]' : ''}`}
                            onClick={() => handleEdit(okr)}
                        >
                            {/* Circular gauge */}
                            <ProgressRing progress={okr.progress} status={okr.status} size={40} />

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-zinc-200 font-mono truncate group-hover:text-white transition-colors leading-snug">
                                    {okr.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {okr.keyResults?.length > 0 && (
                                        <span className="text-[10px] font-mono text-zinc-600">
                                            {okr.keyResults.filter(kr => kr.completed).length}/{okr.keyResults.length} KR
                                        </span>
                                    )}
                                    {okr.status === 'risk' && (
                                        <span className="text-[9px] font-bold font-mono text-red-400 uppercase tracking-wider">
                                            ⚠ A rischio
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex flex-col items-center justify-center gap-3 py-10 text-center"
                        >
                            <Compass className="w-8 h-8 text-zinc-700" />
                            <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest">No Active Strategies</p>
                            {isAdmin && (
                                <button
                                    onClick={handleAdd}
                                    className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                                >
                                    + Crea primo OKR
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
