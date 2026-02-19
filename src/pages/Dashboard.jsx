import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { LogOut, Shield, Sparkles, Archive, CalendarDays, LayoutList, Layers, Users, Wrench } from 'lucide-react';
import { todayId } from '../services/dailyPlanService';
import { currentWeekId, formatWeekId } from '../services/weeklyPlanService';
import { AppCredits } from '../components/ui/AppCredits';
import { TileCompass } from '../components/tiles/TileCompass';
import { TilePulse } from '../components/tiles/TilePulse';
import { TileTeam } from '../components/tiles/TileTeam';
import { TileRadar } from '../components/tiles/TileRadar';
import { TileIntelligence, ReportsArchiveModal } from '../components/tiles/TileIntelligence';
import { TileDecisionLog } from '../components/tiles/TileDecisionLog';
import { GlassTile } from '../components/ui/GlassTile';
import { ContextHeader } from '../components/ui/ContextHeader';
import { NeuralInterface } from '../components/modules/Intelligence/NeuralInterface';
import { ProactiveAlerts } from '../components/modules/Intelligence/ProactiveAlerts';
import { BriefingRoom } from '../components/modules/Briefing/BriefingRoom';
import { OKRManager } from '../components/modals/OKRManager';
import { SignalInput } from '../components/modals/SignalInput';
import { EventsList } from '../components/EventsList';
import { subscribeToActiveEvents } from '../services/eventService';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Circular health gauge for header
const HealthGauge = ({ score }) => {
    const size = 36;
    const radius = 14;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 70 ? '#34d399' : score >= 40 ? '#fbbf24' : '#f87171';
    const label = score >= 70 ? 'OPTIMAL' : score >= 40 ? 'ATTENZIONE' : 'CRITICO';
    return (
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-white/[0.07] bg-white/[0.02] rounded-lg backdrop-blur-sm" title={`Health: ${score}% — ${label}`}>
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">HEALTH</span>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
                <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle"
                    fill={color} fontSize={8} fontFamily="monospace" fontWeight="700"
                    transform={`rotate(90,${size / 2},${size / 2})`}>
                    {score}
                </text>
            </svg>
            <span className="text-[10px] font-mono" style={{ color }}>{label}</span>
        </div>
    );
};

export const Dashboard = ({ user }) => {
    const navigate = useNavigate();
    const [isAdmin, setIsAdmin] = useState(false);
    const [showNeural, setShowNeural] = useState(false);
    const [showArchive, setShowArchive] = useState(false);
    const [showSignalModal, setShowSignalModal] = useState(false);
    const [showOKRModal, setShowOKRModal] = useState(false);
    const [selectedOKR, setSelectedOKR] = useState(null);
    const [okrs, setOkrs] = useState([]);
    const [signals, setSignals] = useState([]);
    const [events, setEvents] = useState([]);
    const [alertCount, setAlertCount] = useState(0);

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

    // Fetch OKRs, signals, events
    useEffect(() => {
        const unsubOkrs = onSnapshot(collection(db, 'okrs'), snap => {
            setOkrs(snap.docs.map(d => d.data()));
        });
        const unsubSignals = onSnapshot(collection(db, 'signals'), snap => {
            setSignals(snap.docs.map(d => d.data()));
        });
        const unsubEvents = subscribeToActiveEvents(
            (data) => setEvents(data),
            (err) => console.error('[Dashboard] events error:', err)
        );
        return () => { unsubOkrs(); unsubSignals(); unsubEvents(); };
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
        <div className="min-h-screen bg-[#050508] p-3 sm:p-4 md:p-6 font-sans selection:bg-zinc-800 relative text-gray-200 overflow-x-hidden">
            {/* Background Decor */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(99,102,241,0.07)_0%,transparent_60%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(20,184,166,0.05)_0%,transparent_60%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.02)_0%,transparent_50%)]" />
            </div>

            {/* Header */}
            <header className="max-w-screen-2xl mx-auto mb-4 sm:mb-6 flex justify-between items-center border-b border-white/5 pb-3 sm:pb-4 sticky top-0 z-20 bg-[#050508]/80 backdrop-blur-xl">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <img
                        src="/logo.png"
                        alt="C-Suite OS"
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain flex-shrink-0"
                    />
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-xl font-mono font-bold tracking-tighter text-white leading-none">
                            C-Suite <span className="text-zinc-600">OS</span>
                        </h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0"></div>
                            <p className="text-[9px] sm:text-[10px] text-zinc-500 font-mono uppercase tracking-wider truncate">
                                Execution Layer • Active
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-3 text-xs font-mono flex-shrink-0">
                    {/* Health gauge — solo admin, solo md+ */}
                    {isAdmin && healthScore !== null && (
                        <HealthGauge score={healthScore} />
                    )}
                    {/* Archivio Reports — icona su mobile, testo su sm+ */}
                    <button
                        onClick={() => setShowArchive(true)}
                        className="touch-target flex items-center gap-1.5 text-zinc-400 hover:text-indigo-300 border border-white/[0.07] hover:border-indigo-500/30 bg-white/[0.02] hover:bg-indigo-500/5 px-2 sm:px-3 py-1.5 rounded-lg transition-all backdrop-blur-sm"
                    >
                        <Archive className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                        <span className="hidden sm:inline">Archivio</span>
                    </button>
                    {isAdmin && (
                        <button onClick={() => navigate('/admin')} className="touch-target text-red-400 hover:text-red-300 flex items-center gap-1 sm:gap-1.5 border border-red-900/50 bg-red-900/10 px-2 sm:px-3 py-1.5 rounded-lg transition-colors backdrop-blur-sm">
                            <Shield className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                            <span className="hidden sm:inline">ADMIN</span>
                        </button>
                    )}
                    <div className="text-zinc-500 hidden md:block">
                        OP: <span className="text-white uppercase">{user?.displayName || 'Unknown'}</span>
                    </div>
                    <button onClick={handleLogout} className="touch-target text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* ── Portfolio Cockpit Nav ─────────────────────────────────── */}
            <div className="max-w-screen-2xl mx-auto mb-5">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] text-zinc-700 uppercase tracking-widest mr-1 hidden sm:block">WORKSPACES</span>

                    <Link to={`/steering/daily/${todayId()}`}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-950/30 border border-indigo-800/40 rounded-xl
                            text-indigo-300 hover:bg-indigo-950/60 hover:border-indigo-600/50 transition-all text-xs font-mono group">
                        <CalendarDays className="w-3.5 h-3.5 text-indigo-500 group-hover:text-indigo-300 transition-colors" />
                        <span className="hidden sm:inline">Daily Steering</span>
                        <span className="sm:hidden">Daily</span>
                    </Link>

                    <Link to={`/steering/weekly/${currentWeekId()}`}
                        className="flex items-center gap-1.5 px-3 py-2 bg-purple-950/20 border border-purple-800/30 rounded-xl
                            text-purple-300 hover:bg-purple-950/50 hover:border-purple-600/40 transition-all text-xs font-mono group">
                        <LayoutList className="w-3.5 h-3.5 text-purple-500 group-hover:text-purple-300 transition-colors" />
                        <span className="hidden sm:inline">Weekly Overview</span>
                        <span className="sm:hidden">Weekly</span>
                        <span className="text-[9px] text-purple-800 hidden lg:inline ml-0.5">· {formatWeekId(currentWeekId())}</span>
                    </Link>

                    <Link to="/themes"
                        className="flex items-center gap-1.5 px-3 py-2 bg-teal-950/20 border border-teal-800/30 rounded-xl
                            text-teal-300 hover:bg-teal-950/50 hover:border-teal-600/40 transition-all text-xs font-mono group">
                        <Layers className="w-3.5 h-3.5 text-teal-500 group-hover:text-teal-300 transition-colors" />
                        <span className="hidden sm:inline">Temi Strategici</span>
                        <span className="sm:hidden">Temi</span>
                    </Link>

                    <Link to="/stakeholder"
                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-950/20 border border-amber-800/30 rounded-xl
                            text-amber-300 hover:bg-amber-950/50 hover:border-amber-600/40 transition-all text-xs font-mono group">
                        <Users className="w-3.5 h-3.5 text-amber-500 group-hover:text-amber-300 transition-colors" />
                        <span className="hidden sm:inline">Stakeholder Hub</span>
                        <span className="sm:hidden">Stakeholder</span>
                    </Link>

                    <Link to="/toolbox"
                        className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900/50 border border-zinc-700/50 rounded-xl
                            text-zinc-400 hover:bg-zinc-900 hover:border-zinc-600 transition-all text-xs font-mono group">
                        <Wrench className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                        <span>Toolbox</span>
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-screen-2xl mx-auto pb-24 relative z-10">

                {/* Portfolio Context Header */}
                <div className="px-3 sm:px-0">
                    <ContextHeader
                        context="PORTFOLIO"
                        title="Cockpit Operativo"
                        subtitle={<span className="text-sm text-zinc-400 font-mono">Panoramica strategica e operativa</span>}
                    />
                </div>

                {/* Proactive Alerts - High Priority */}
                <ProactiveAlerts onAlertsChange={(count) => setAlertCount(count)} />

                {/* Active Dossiers (Projects) */}
                <div className="mb-8">
                    <EventsList isAdmin={isAdmin} currentUser={user} />
                </div>

                {/* Mobile-First Grid: 1 col (mobile) -> 2 col (md) -> 3 col (lg) -> 4 col (2xl) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-6">

                    {/* 1. Daily Briefing (Global) - Priority on Mobile */}
                    <GlassTile className="md:col-span-2 lg:col-span-2 min-h-[340px]" padding="p-0">
                        <BriefingRoom isAdmin={isAdmin} />
                    </GlassTile>

                    {/* 2. Decision Log - Quick Actions */}
                    <GlassTile className="min-h-[340px]" padding="p-0">
                        <TileDecisionLog isAdmin={isAdmin} adminName={user?.displayName} />
                    </GlassTile>

                    {/* 3. Risk Radar - Strategic Overview */}
                    <GlassTile className="md:col-span-2 lg:col-span-1 min-h-[320px]" padding="p-0">
                        <TileRadar isAdmin={isAdmin} onOpenModal={() => setShowSignalModal(true)} />
                    </GlassTile>

                    {/* 4. Pulse Compass - OKRs */}
                    <GlassTile className="min-h-[280px]">
                        <TileCompass isAdmin={isAdmin} onOpenModal={(okr) => { setSelectedOKR(okr || null); setShowOKRModal(true); }} />
                    </GlassTile>

                    {/* 5. Team Status */}
                    <GlassTile className="min-h-[280px]">
                        <TileTeam isAdmin={isAdmin} />
                    </GlassTile>

                    {/* 6. System Pulse (Health) */}
                    <GlassTile className="min-h-[280px]">
                        <TilePulse />
                    </GlassTile>

                    {/* 7. Intelligence Reports - Full Width on Mobile, compact on Desktop */}
                    <GlassTile className="md:col-span-2 lg:col-span-1 2xl:col-span-1 min-h-[320px] relative overflow-hidden" padding="p-0">
                        <TileIntelligence adminName={user?.displayName} />
                    </GlassTile>

                </div>
            </main>

            {/* Shadow CoS AI FAB */}
            <button
                onClick={() => { setShowNeural(true); setAlertCount(0); }}
                className="fixed bottom-5 right-4 sm:bottom-8 sm:right-8 w-12 h-12 sm:w-14 sm:h-14
                    bg-white/10 hover:bg-white/20 backdrop-blur-xl
                    border border-white/20 hover:border-white/40
                    text-white rounded-full
                    shadow-[0_0_30px_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.5)]
                    hover:shadow-[0_0_40px_rgba(255,255,255,0.18)]
                    flex items-center justify-center z-50
                    transition-all duration-300 hover:scale-110 active:scale-95 relative"
            >
                <Sparkles className="w-6 h-6" />
                {alertCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-pulse">
                        {alertCount > 9 ? '9+' : alertCount}
                    </span>
                )}
            </button>

            {showNeural && <NeuralInterface onClose={() => setShowNeural(false)} events={events} isAdmin={isAdmin} />}
            {showSignalModal && createPortal(<SignalInput onClose={() => setShowSignalModal(false)} />, document.body)}
            {showOKRModal && createPortal(<OKRManager onClose={() => setShowOKRModal(false)} existingOKR={selectedOKR} />, document.body)}
            {showArchive && createPortal(
                <ReportsArchiveModal
                    onClose={() => setShowArchive(false)}
                    adminName={user?.displayName}
                    onOpenReport={() => { }}
                />,
                document.body
            )}

            {/* Footer Credits */}
            <footer className="fixed bottom-4 left-6 z-30">
                <AppCredits />
            </footer>

        </div>
    );
};
