import React, { useState, useEffect, useMemo } from 'react';
import { Radar as RadarIcon, Radio, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import {
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';

// --- Axis definitions with keyword matching ---
const AXES = [
    { key: 'Mercato',    keywords: ['mercato', 'market', 'concorren', 'competitor', 'cliente', 'vendite', 'ricavi', 'prezzo'] },
    { key: 'Tech',       keywords: ['tech', 'sistema', 'software', 'bug', 'server', 'api', 'deploy', 'database', 'infra'] },
    { key: 'Operativo',  keywords: ['operativ', 'supply', 'logistic', 'processo', 'produzion', 'ritardo', 'fornitore'] },
    { key: 'Team',       keywords: ['team', 'persona', 'hr', 'assunz', 'dipendent', 'cultura', 'burn', 'conflitt'] },
    { key: 'Finanziario',keywords: ['finanz', 'budget', 'costo', 'cost', 'cash', 'investiment', 'spesa', 'margin'] },
    { key: 'Compliance', keywords: ['legal', 'compliance', 'regolament', 'gdpr', 'normativ', 'audit', 'rischio'] },
];

const LEVEL_WEIGHT = { high: 3, medium: 2, low: 1 };
const MAX_SCORE = 9; // 3 signals × weight 3 = normalisation cap per axis

function classifySignal(text = '') {
    const lower = text.toLowerCase();
    for (const axis of AXES) {
        if (axis.keywords.some(kw => lower.includes(kw))) return axis.key;
    }
    return null; // unclassified → distributed equally
}

function buildRadarData(signals) {
    const scores = Object.fromEntries(AXES.map(a => [a.key, 0]));
    const unclassified = [];

    signals.forEach(s => {
        const axis = classifySignal(s.text);
        const w = LEVEL_WEIGHT[s.level] ?? 1;
        if (axis) {
            scores[axis] += w;
        } else {
            unclassified.push(w);
        }
    });

    // Distribute unclassified weight equally
    if (unclassified.length > 0) {
        const totalUnclassified = unclassified.reduce((a, b) => a + b, 0);
        const perAxis = totalUnclassified / AXES.length;
        AXES.forEach(a => { scores[a.key] += perAxis; });
    }

    return AXES.map(a => ({
        axis: a.key,
        value: Math.min(Math.round((scores[a.key] / MAX_SCORE) * 100), 100),
        raw: scores[a.key],
    }));
}

// --- Custom tooltip ---
const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
        const { axis, value, raw } = payload[0].payload;
        return (
            <div className="bg-[#0a0a0f]/95 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono shadow-xl">
                <p className="text-emerald-400 font-bold uppercase tracking-wider">{axis}</p>
                <p className="text-zinc-300 mt-0.5">Score: <span className="text-white font-bold">{value}</span><span className="text-zinc-500">/100</span></p>
                {raw > 0 && <p className="text-zinc-500">Peso segnali: {raw.toFixed(1)}</p>}
            </div>
        );
    }
    return null;
};

// --- Signal row (compact) ---
const SignalRow = ({ signal }) => {
    const levelCfg = {
        high:   { dot: 'bg-red-400',    text: 'text-red-400',    label: 'HIGH',   pulse: true },
        medium: { dot: 'bg-yellow-400', text: 'text-yellow-400', label: 'MED',    pulse: false },
        low:    { dot: 'bg-blue-400',   text: 'text-blue-400',   label: 'LOW',    pulse: false },
    };
    const cfg = levelCfg[signal.level] ?? levelCfg.low;
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2.5 py-2 border-b border-white/[0.04] last:border-0"
        >
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
            <p className="text-xs text-zinc-300 font-mono leading-relaxed flex-1 line-clamp-2">{signal.text}</p>
            <span className={`text-[9px] font-bold font-mono ${cfg.text} flex-shrink-0 mt-0.5`}>{cfg.label}</span>
        </motion.div>
    );
};

// --- Main tile ---
export const TileRadar = ({ isAdmin, onOpenModal }) => {
    const [signals, setSignals] = useState([]);

    useEffect(() => {
        const q = query(collection(db, "signals"), orderBy("createdAt", "desc"), limit(12));
        const unsub = onSnapshot(q, (snapshot) => {
            setSignals(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    const radarData = useMemo(() => buildRadarData(signals), [signals]);
    const hasSignals = signals.length > 0;
    const recentSignals = signals.slice(0, 4);

    // Compute overall threat level
    const maxVal = Math.max(...radarData.map(d => d.value), 0);
    const threatColor = maxVal >= 70 ? '#f87171' : maxVal >= 40 ? '#facc15' : '#34d399';

    return (
        <div className="h-full flex flex-col p-7 relative overflow-hidden">
            {/* Subtle top highlight line */}
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <RadarIcon className="w-3.5 h-3.5 text-emerald-400" /> Risk Radar
                </h3>
                <div className="flex items-center gap-3">
                    {hasSignals && (
                        <span className="text-[10px] font-mono" style={{ color: threatColor }}>
                            ● {maxVal >= 70 ? 'CRITICO' : maxVal >= 40 ? 'ATTENZIONE' : 'STABILE'}
                        </span>
                    )}
                    {isAdmin && (
                        <button
                            onClick={onOpenModal}
                            title="Aggiungi segnale"
                            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/10 hover:border-white/20 cursor-pointer"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {hasSignals ? (
                <div className="flex-grow flex flex-col gap-3 relative z-10 min-h-0">
                    {/* Radar Chart */}
                    <div className="flex-shrink-0" style={{ height: '200px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                                <PolarGrid
                                    stroke="rgba(255,255,255,0.06)"
                                    strokeDasharray="3 3"
                                />
                                <PolarAngleAxis
                                    dataKey="axis"
                                    tick={{
                                        fill: '#71717a',
                                        fontSize: 9,
                                        fontFamily: 'monospace',
                                        fontWeight: 700,
                                        letterSpacing: '0.05em',
                                    }}
                                    tickLine={false}
                                />
                                <Radar
                                    name="Risk"
                                    dataKey="value"
                                    stroke={threatColor}
                                    fill={threatColor}
                                    fillOpacity={0.12}
                                    strokeWidth={1.5}
                                    dot={{ r: 3, fill: threatColor, strokeWidth: 0 }}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={false} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Signal list */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 min-h-0">
                        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
                            Ultimi segnali
                        </p>
                        <AnimatePresence>
                            {recentSignals.map(s => <SignalRow key={s.id} signal={s} />)}
                        </AnimatePresence>
                    </div>
                </div>
            ) : (
                <div className="flex-grow flex flex-col items-center justify-center gap-3 relative z-10">
                    <RadarIcon className="w-8 h-8 text-zinc-700" />
                    <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest">No Signals Detected</p>
                    {isAdmin && (
                        <button
                            onClick={onOpenModal}
                            className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                            + Aggiungi primo segnale
                        </button>
                    )}
                </div>
            )}

            {/* Background radar sweep */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="w-[200%] h-[200%] absolute -top-1/2 -left-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,#22c55e_360deg)] animate-spin-slow rounded-full opacity-[0.02]" />
            </div>
        </div>
    );
};
