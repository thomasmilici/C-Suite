import React, { useState, useEffect } from 'react';
import { Radar, Radio, Plus } from 'lucide-react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { SignalInput } from '../modals/SignalInput';

export const TileRadar = ({ isAdmin }) => {
    const [signals, setSignals] = useState([]);
    const [showModal, setShowModal] = useState(false);

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
        <div className="h-full flex flex-col p-6 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Radar className="w-4 h-4" /> Risk Radar
                </h3>
                {isAdmin && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="p-1 bg-white hover:bg-zinc-200 text-black rounded transition-colors z-20 relative"
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                )}
            </div>

            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
                {signals.length > 0 ? signals.map((signal) => (
                    <div key={signal.id} className="border border-zinc-800 bg-zinc-900/20 p-4 rounded flex flex-col justify-between hover:bg-zinc-900/40 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <Radio className={`w-4 h-4 ${signal.level === 'high' ? 'text-red-500 animate-pulse' : 'text-zinc-600'}`} />
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${signal.level === 'high' ? 'bg-red-900/30 text-red-400' :
                                    signal.level === 'medium' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-blue-900/30 text-blue-400'
                                }`}>
                                {signal.level}
                            </span>
                        </div>
                        <p className="text-xs text-zinc-300 font-mono leading-relaxed line-clamp-3">
                            {signal.text}
                        </p>
                    </div>
                )) : (
                    <div className="col-span-3 flex items-center justify-center text-zinc-700 text-xs font-mono h-20 border border-zinc-800 border-dashed rounded">
                        NO SIGNALS DETECTED
                    </div>
                )}
            </div>

            {/* Radar Sweep Effect */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-10">
                <div className="w-[200%] h-[200%] absolute -top-1/2 -left-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,#22c55e_360deg)] animate-spin-slow rounded-full opacity-20" />
            </div>

            {showModal && <SignalInput onClose={() => setShowModal(false)} />}
        </div>
    );
};
