import React, { useState, useEffect } from 'react';
import { Trophy, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';

export const TileTeam = () => {
    const [team, setTeam] = useState([]);

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

    return (
        <div className="h-full flex flex-col p-7 relative">
            {/* Subtle top highlight line */}
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-yellow-400" /> Active Agents
                </h3>
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            </div>

            <div className="flex-grow space-y-2.5 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/5">
                <AnimatePresence>
                    {team.map((member) => (
                        <motion.div
                            layout
                            key={member.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.05] hover:border-white/[0.12] transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-mono w-5 text-center ${member.rank === 1 ? 'text-yellow-400' : 'text-zinc-600'}`}>
                                    {member.rank < 10 ? `0${member.rank}` : member.rank}
                                </span>
                                <div className="flex flex-col">
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
                                <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">score</span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-yellow-500/[0.03] to-transparent rounded-tl-full pointer-events-none" />
        </div>
    );
};
