import React, { useState, useEffect } from 'react';
import { Radar, Radio, Plus } from 'lucide-react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';

export const TileRadar = ({ isAdmin, onOpenModal }) => {
    const [signals, setSignals] = useState([]);

    useEffect(() => {
        const q = query(collection(db, "signals"), orderBy("createdAt", "desc"), limit(6));
        const unsub = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                setSignals(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        });
        return () => unsub();
    }, []);

    return (
        <div className="h-full flex flex-col p-7 relative overflow-hidden">
            {/* Subtle top highlight line */}
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="flex items-center justify-between mb-5 relative z-10">
                <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Radar className="w-3.5 h-3.5 text-emerald-400" /> Risk Radar
                </h3>
                {isAdmin && (
                    <button
                        onClick={onOpenModal}
                        className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/10 hover:border-white/20 z-20 relative"
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                )}
            </div>

            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/5">
                {signals.length > 0 ? signals.map((signal) => (
                    <div key={signal.id} className="border border-white/[0.06] bg-white/[0.02] p-4 rounded-xl flex flex-col justify-between hover:bg-white/[0.05] hover:border-white/[0.1] transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <Radio className={`w-4 h-4 ${signal.level === 'high' ? 'text-red-400 animate-pulse' : 'text-zinc-600'}`} />
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                signal.level === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                signal.level === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                                {signal.level}
                            </span>
                        </div>
                        <p className="text-xs text-zinc-300 font-mono leading-relaxed line-clamp-3">
                            {signal.text}
                        </p>
                    </div>
                )) : (
                    <div className="col-span-3 flex items-center justify-center text-zinc-700 text-xs font-mono h-20 border border-white/[0.04] border-dashed rounded-xl">
                        NO SIGNALS DETECTED
                    </div>
                )}
            </div>

            {/* Radar Sweep */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="w-[200%] h-[200%] absolute -top-1/2 -left-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,#22c55e_360deg)] animate-spin-slow rounded-full opacity-[0.03]" />
            </div>

        </div>
    );
};
