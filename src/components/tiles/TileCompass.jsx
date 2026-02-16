import React, { useState, useEffect } from 'react';
import { Compass, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { OKRManager } from '../modals/OKRManager';

export const TileCompass = ({ isAdmin }) => {
    const [okrs, setOkrs] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedOKR, setSelectedOKR] = useState(null);

    useEffect(() => {
        const q = query(collection(db, "okrs"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setOkrs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscrbe();
    }, []);

    const handleEdit = (okr) => {
        if (!isAdmin) return;
        setSelectedOKR(okr);
        setShowModal(true);
    };

    const handleAdd = (e) => {
        e.stopPropagation();
        setSelectedOKR(null);
        setShowModal(true);
    }

    return (
        <div className="h-full flex flex-col p-7 relative">
            {/* Subtle top highlight line */}
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-indigo-400" /> Strategic Themes
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 font-mono px-2 py-1 border border-white/5 bg-white/[0.03] rounded-lg backdrop-blur-sm">
                        Q1 2026
                    </span>
                    {isAdmin && (
                        <button
                            onClick={handleAdd}
                            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/10 hover:border-white/20 backdrop-blur-sm"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-5 flex-grow overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/5">
                {okrs.length > 0 ? okrs.map((okr, index) => (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={okr.id}
                        className={`group ${isAdmin ? 'cursor-pointer hover:bg-white/[0.04] p-3 rounded-xl -mx-3 transition-all' : 'py-1'}`}
                        onClick={() => handleEdit(okr)}
                    >
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-sm text-zinc-200 font-mono truncate w-3/4 group-hover:text-white transition-colors">{okr.title}</span>
                            <span className={`text-xs font-bold font-mono ${okr.status === 'risk' ? 'text-red-400' : 'text-emerald-400'}`}>
                                {okr.progress}%
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 overflow-hidden rounded-full">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${okr.progress}%` }}
                                transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
                                className={`h-full rounded-full ${okr.status === 'risk' ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`}
                            />
                        </div>
                    </motion.div>
                )) : (
                    <div className="h-full flex items-center justify-center text-zinc-700 text-xs font-mono tracking-widest">
                        NO ACTIVE STRATEGIES
                    </div>
                )}
            </div>

            {showModal && <OKRManager onClose={() => setShowModal(false)} existingOKR={selectedOKR} />}
        </div>
    );
};
