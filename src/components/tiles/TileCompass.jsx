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
        <div className="h-full flex flex-col p-6 relative">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Compass className="w-4 h-4" /> Strategic Themes
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600 font-mono px-2 py-0.5 border border-zinc-800 rounded">
                        Q1 2026
                    </span>
                    {isAdmin && (
                        <button
                            onClick={handleAdd}
                            className="p-1 bg-white hover:bg-zinc-200 text-black rounded transition-colors"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-4 flex-grow overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
                {okrs.length > 0 ? okrs.map((okr, index) => (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={okr.id}
                        className={`group ${isAdmin ? 'cursor-pointer hover:bg-white/5 p-2 rounded -mx-2 transition-colors' : ''}`}
                        onClick={() => handleEdit(okr)}
                    >
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-sm text-zinc-300 font-mono truncate w-3/4">{okr.title}</span>
                            <span className={`text-xs font-bold font-mono ${okr.status === 'risk' ? 'text-red-400' : 'text-green-400'}`}>
                                {okr.progress}%
                            </span>
                        </div>
                        <div className="h-1 w-full bg-zinc-900 overflow-hidden rounded-full">
                            <div
                                className={`h-full ${okr.status === 'risk' ? 'bg-red-500' : 'bg-green-500'}`}
                                style={{ width: `${okr.progress}%` }}
                            />
                        </div>
                    </motion.div>
                )) : (
                    <div className="h-full flex items-center justify-center text-zinc-700 text-xs font-mono">
                        NO ACTIVE STRATEGIES
                    </div>
                )}
            </div>

            {showModal && <OKRManager onClose={() => setShowModal(false)} existingOKR={selectedOKR} />}
        </div>
    );
};
