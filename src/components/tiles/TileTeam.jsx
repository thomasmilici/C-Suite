import React, { useState, useEffect } from 'react';
import { Trophy, Activity, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

export const TileTeam = ({ isAdmin = false }) => {
    const [team, setTeam] = useState([]);
    const [recalcLoading, setRecalcLoading] = useState(false);
    const [recalcMsg, setRecalcMsg] = useState(null);

    const handleRecalcScores = async () => {
        setRecalcLoading(true);
        setRecalcMsg(null);
        try {
            const functions = getFunctions();
            const trigger = httpsCallable(functions, 'triggerRankScores');
            await trigger();
            setRecalcMsg({ type: 'ok', text: 'Score aggiornati!' });
        } catch (err) {
            console.error('triggerRankScores error:', err);
            setRecalcMsg({ type: 'err', text: 'Errore nel ricalcolo.' });
        } finally {
            setRecalcLoading(false);
            setTimeout(() => setRecalcMsg(null), 3000);
        }
    };

    useEffect(() => {
        const q = query(collection(db, "users"), orderBy("rank_score", "desc"), limit(5));
        const unsub = onSnapshot(q, (snapshot) => {
            setTeam(snapshot.docs.map((doc, idx) => ({
                id: doc.id,
                rank: idx + 1,
                ...doc.data()
            })));
        });
        return () => unsub();
    }, []);

    const rankColors = ['text-yellow-400', 'text-zinc-300', 'text-amber-600', 'text-zinc-500', 'text-zinc-600'];

    return (
        <div className="h-full flex flex-col p-7 relative">
            {/* Subtle top highlight line */}
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-yellow-400" /> Active Agents
                </h3>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <button
                            onClick={handleRecalcScores}
                            disabled={recalcLoading}
                            title="Ricalcola Score"
                            className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 hover:text-indigo-300 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3 h-3 ${recalcLoading ? 'animate-spin' : ''}`} />
                            {recalcLoading ? 'Calcolo…' : 'Ricalcola'}
                        </button>
                    )}
                    {recalcMsg && (
                        <span className={`text-[10px] font-mono ${recalcMsg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {recalcMsg.text}
                        </span>
                    )}
                    <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                </div>
            </div>

            <div className="flex-grow space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/5">
                <AnimatePresence>
                    {team.length > 0 ? team.map((member) => (
                        <motion.div
                            layout
                            key={member.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.05)' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:border-white/[0.12] transition-colors group cursor-default"
                        >
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-mono w-5 text-center font-bold ${rankColors[member.rank - 1] ?? 'text-zinc-600'}`}>
                                    {member.rank < 10 ? `0${member.rank}` : member.rank}
                                </span>
                                <div className="flex flex-col">
                                    {/* BUG-04: zinc-200 → white on hover, role zinc-500 (WCAG pass) */}
                                    <span className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">
                                        {member.displayName}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                                        {member.role || 'Operative'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col items-end">
                                <span className="text-sm font-mono font-bold text-white">
                                    {member.rank_score > 0 ? member.rank_score : '—'}
                                </span>
                                {/* BUG-04: zinc-600 → zinc-500 */}
                                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">score</span>
                            </div>
                        </motion.div>
                    )) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center gap-2 py-10">
                            <Trophy className="w-7 h-7 text-zinc-700" />
                            <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Nessun agente attivo</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-yellow-500/[0.03] to-transparent rounded-tl-full pointer-events-none" />
        </div>
    );
};
