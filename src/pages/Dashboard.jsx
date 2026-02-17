import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { LogOut, Shield, Sparkles } from 'lucide-react';
import { TileCompass } from '../components/tiles/TileCompass';
import { TilePulse } from '../components/tiles/TilePulse';
import { TileTeam } from '../components/tiles/TileTeam';
import { TileRadar } from '../components/tiles/TileRadar';
import { TileIntelligence } from '../components/tiles/TileIntelligence';
import { NeuralInterface } from '../components/modules/Intelligence/NeuralInterface';
import { ProactiveAlerts } from '../components/modules/Intelligence/ProactiveAlerts';
import { BriefingRoom } from '../components/modules/Briefing/BriefingRoom';
import { OKRManager } from '../components/modals/OKRManager';
import { SignalInput } from '../components/modals/SignalInput';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const Dashboard = ({ user }) => {
    const navigate = useNavigate();
    const [isAdmin, setIsAdmin] = useState(false);
    const [showNeural, setShowNeural] = useState(false);
    const [showSignalModal, setShowSignalModal] = useState(false);
    const [showOKRModal, setShowOKRModal] = useState(false);
    const [selectedOKR, setSelectedOKR] = useState(null);
    const [okrs, setOkrs] = useState([]);
    const [signals, setSignals] = useState([]);

    useEffect(() => {
        const checkRole = async () => {
            if (user) {
                const snap = await getDoc(doc(db, "users", user.uid));
                if (snap.exists() && snap.data().role === 'ADMIN') {
                    setIsAdmin(true);
                }
            }
        };
        checkRole();
    }, [user]);

    // Fetch OKRs e signals per il termometro
    useEffect(() => {
        const unsubOkrs = onSnapshot(collection(db, 'okrs'), snap => {
            setOkrs(snap.docs.map(d => d.data()));
        });
        const unsubSignals = onSnapshot(collection(db, 'signals'), snap => {
            setSignals(snap.docs.map(d => d.data()));
        });
        return () => { unsubOkrs(); unsubSignals(); };
    }, []);

    // Calcola health score (0-100) basato su OKR e segnali
    const healthScore = useMemo(() => {
        if (okrs.length === 0 && signals.length === 0) return null;
        let score = 100;
        // Penalizza OKR a rischio o con progress bassa
        okrs.forEach(okr => {
            if (okr.status === 'risk') score -= 15;
            else if ((okr.progress || 0) < 30) score -= 10;
        });
        // Penalizza segnali HIGH
        const highSignals = signals.filter(s => s.level === 'high').length;
        const medSignals = signals.filter(s => s.level === 'medium').length;
        score -= highSignals * 12;
        score -= medSignals * 4;
        return Math.max(0, Math.min(100, score));
    }, [okrs, signals]);

    const handleLogout = async () => {
        await AuthService.logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[#050508] p-4 md:p-6 font-sans selection:bg-zinc-800 relative text-gray-200">
            {/* Background Decor */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(99,102,241,0.07)_0%,transparent_60%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(20,184,166,0.05)_0%,transparent_60%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.02)_0%,transparent_50%)]" />
            </div>

            {/* Header */}
            <header className="max-w-screen-2xl mx-auto mb-6 flex justify-between items-center border-b border-white/5 pb-4 sticky top-0 z-20 bg-[#050508]/70 backdrop-blur-xl">
                <div>
                    <h1 className="text-xl font-mono font-bold tracking-tighter text-white">
                        QUINTA <span className="text-zinc-600">OS</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                            Execution Layer • Active
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                    {/* Termometro salute strategica — solo admin */}
                    {isAdmin && healthScore !== null && (
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-white/[0.07] bg-white/[0.02] rounded-lg backdrop-blur-sm">
                            <span className="text-[10px] text-zinc-600 uppercase tracking-widest">HEALTH</span>
                            <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-1000"
                                    style={{
                                        width: `${healthScore}%`,
                                        background: healthScore >= 70
                                            ? 'linear-gradient(90deg, #10b981, #34d399)'
                                            : healthScore >= 40
                                            ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                            : 'linear-gradient(90deg, #ef4444, #f87171)'
                                    }}
                                />
                            </div>
                            <span className={`text-[11px] font-bold font-mono ${healthScore >= 70 ? 'text-emerald-400' : healthScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {healthScore}%
                            </span>
                        </div>
                    )}
                    {isAdmin && (
                        <button onClick={() => navigate('/admin')} className="text-red-400 hover:text-red-300 flex items-center gap-1.5 border border-red-900/50 bg-red-900/10 px-3 py-1.5 rounded-lg transition-colors backdrop-blur-sm">
                            <Shield className="w-3 h-3" /> ADMIN
                        </button>
                    )}
                    <div className="text-zinc-500 hidden sm:block">
                        OP: <span className="text-white uppercase">{user?.displayName || 'Unknown'}</span>
                    </div>
                    <button onClick={handleLogout} className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-screen-2xl mx-auto pb-24 relative z-10">

                {/* Proactive Alerts */}
                <ProactiveAlerts />

                {/* Bento Grid — 3 colonne */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* ROW 1: Compass (1col) | Pulse (1col) | Team (1col) */}
                    <div className="rounded-2xl min-h-[280px]
                        bg-white/[0.03] border border-white/[0.07]
                        shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]
                        hover:border-white/[0.13] hover:bg-white/[0.05] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]
                        transition-all duration-300">
                        <TileCompass isAdmin={isAdmin} onOpenModal={(okr) => { setSelectedOKR(okr || null); setShowOKRModal(true); }} />
                    </div>

                    <div className="rounded-2xl min-h-[280px]
                        bg-white/[0.03] border border-white/[0.07]
                        shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]
                        hover:border-white/[0.13] hover:bg-white/[0.05] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]
                        transition-all duration-300">
                        <TilePulse />
                    </div>

                    <div className="rounded-2xl min-h-[280px]
                        bg-white/[0.03] border border-white/[0.07]
                        shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]
                        hover:border-white/[0.13] hover:bg-white/[0.05] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]
                        transition-all duration-300">
                        <TileTeam />
                    </div>

                    {/* ROW 2: Radar (2col) | Intelligence Reports (1col) */}
                    <div className="md:col-span-2 rounded-2xl min-h-[320px]
                        bg-white/[0.03] border border-white/[0.07]
                        shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]
                        hover:border-white/[0.13] hover:bg-white/[0.05] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]
                        transition-all duration-300">
                        <TileRadar isAdmin={isAdmin} onOpenModal={() => setShowSignalModal(true)} />
                    </div>

                    <div className="rounded-2xl min-h-[320px] relative overflow-hidden
                        bg-white/[0.03] border border-white/[0.07]
                        shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]
                        hover:border-white/[0.13] hover:bg-white/[0.05] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]
                        transition-all duration-300">
                        <TileIntelligence adminName={user?.displayName} />
                    </div>

                    {/* ROW 3: Briefing Room (full width) */}
                    <div className="md:col-span-3 rounded-2xl min-h-[340px]
                        bg-white/[0.03] border border-white/[0.07]
                        shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]
                        hover:border-white/[0.13] hover:bg-white/[0.05] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]
                        transition-all duration-300">
                        <BriefingRoom isAdmin={isAdmin} />
                    </div>

                </div>
            </main>

            {/* Shadow CoS AI FAB */}
            <button
                onClick={() => setShowNeural(true)}
                className="fixed bottom-8 right-8 w-14 h-14
                    bg-white/10 hover:bg-white/20 backdrop-blur-xl
                    border border-white/20 hover:border-white/40
                    text-white rounded-full
                    shadow-[0_0_30px_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.5)]
                    hover:shadow-[0_0_40px_rgba(255,255,255,0.18)]
                    flex items-center justify-center z-50
                    transition-all duration-300 hover:scale-110 active:scale-95"
            >
                <Sparkles className="w-6 h-6" />
            </button>

            {showNeural && <NeuralInterface onClose={() => setShowNeural(false)} />}
            {showSignalModal && createPortal(<SignalInput onClose={() => setShowSignalModal(false)} />, document.body)}
            {showOKRModal && createPortal(<OKRManager onClose={() => setShowOKRModal(false)} existingOKR={selectedOKR} />, document.body)}

        </div>
    );
};
