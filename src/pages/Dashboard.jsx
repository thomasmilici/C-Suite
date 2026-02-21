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
import { ProactiveAlerts } from '../components/modules/Intelligence/ProactiveAlerts';
import { BriefingRoom } from '../components/modules/Briefing/BriefingRoom';
import { OKRManager } from '../components/modals/OKRManager';
import { SignalInput } from '../components/modals/SignalInput';
import { EventsList } from '../components/EventsList';
import { AiPendingActionTile } from '../components/AiPendingActionTile';
import { subscribeToActiveEvents } from '../services/eventService';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const Dashboard = ({ user }) => {
    const navigate = useNavigate();
    const [isAdmin, setIsAdmin] = useState(false);
    // const [showNeural, setShowNeural] = useState(false); // Moved to AppShell
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

            {/* Header and Nav moved to AppShell */}

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

                    {/* HITL: AI Pending Actions — shown only when AI proposes actions */}
                    <AiPendingActionTile />

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

            {/* NeuralInterface moved to AppShell */}
            {/* showNeural && <NeuralInterface onClose={() => setShowNeural(false)} events={events} isAdmin={isAdmin} /> */}
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



        </div>
    );
};
