import React, { useState, useEffect } from 'react';
import { Trophy, ChevronUp, ChevronDown, Activity } from 'lucide-react';
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
        <div className="h-full flex flex-col p-6 relative">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" /> Active Agents
                </h3>
                <Activity className="w-4 h-4 text-green-500 animate-pulse" />
            </div>

            <div className="flex-grow space-y-3 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
                <AnimatePresence>
                    {team.map((member) => (
                        <motion.div
                            layout
                            key={member.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800 rounded hover:border-zinc-600 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-mono w-4 ${member.rank === 1 ? 'text-yellow-400' : 'text-zinc-600'}`}>
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
                                    {member.rank_score}
                                </span>
                                <div className="flex items-center text-[10px] text-green-500">
                                    <ChevronUp className="w-3 h-3" />
                                    <span>2.4%</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Decorative Background Element */}
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-zinc-800/10 to-transparent rounded-tl-full pointer-events-none" />
        </div>
    );
};
