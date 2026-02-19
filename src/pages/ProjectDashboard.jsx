import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { getEvent } from '../services/eventService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthService } from '../services/authService';
import { TileCompass } from '../components/tiles/TileCompass';
import { TilePulse } from '../components/tiles/TilePulse';
import { TileTeam } from '../components/tiles/TileTeam';
import { TileRadar } from '../components/tiles/TileRadar';
import { TileIntelligence, ReportsArchiveModal } from '../components/tiles/TileIntelligence';
import { TileDecisionLog } from '../components/tiles/TileDecisionLog';
import { NeuralInterface } from '../components/modules/Intelligence/NeuralInterface';
import { BriefingRoom } from '../components/modules/Briefing/BriefingRoom';
import { OKRManager } from '../components/modals/OKRManager';
import { SignalInput } from '../components/modals/SignalInput';
import { LogOut, Shield, ArrowLeft, Sparkles, Archive, Folder, Activity, Users, Clock } from 'lucide-react';
import { AppCredits } from '../components/ui/AppCredits';
import { GlassTile } from '../components/ui/GlassTile';
import { ContextHeader } from '../components/ui/ContextHeader';
import { StatusPill } from '../components/ui/StatusPill';

export const ProjectDashboard = ({ user }) => {
  const { id: eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [showNeural, setShowNeural] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showSignalModal, setShowSignalModal] = useState(false);
  const [showOKRModal, setShowOKRModal] = useState(false);
  const [selectedOKR, setSelectedOKR] = useState(null);

  useEffect(() => {
    if (!eventId) return;
    setLoadingEvent(true);
    getEvent(eventId).then(data => {
      if (!data) { setNotFound(true); }
      else { setEvent(data); }
      setLoadingEvent(false);
    }).catch(err => {
      console.error('[ProjectDashboard] getEvent error:', err);
      setNotFound(true);
      setLoadingEvent(false);
    });
  }, [eventId]);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists() && snap.data().role === 'ADMIN') setIsAdmin(true);
    });
  }, [user]);

  const handleLogout = async () => {
    await AuthService.logout();
    navigate('/login');
  };

  if (loadingEvent) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <p className="text-xs text-zinc-600 font-mono animate-pulse tracking-widest">APERTURA DOSSIER...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center gap-4">
        <Folder className="w-10 h-10 text-zinc-700" />
        <p className="text-sm text-zinc-500 font-mono">Dossier non trovato o accesso negato.</p>
        <button onClick={() => navigate('/dashboard')} className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Torna alla Centrale Operativa
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040508] p-3 sm:p-4 md:p-6 font-sans selection:bg-zinc-300 relative text-gray-200 overflow-x-hidden">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(99,102,241,0.07),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(20,184,166,0.05),transparent_60%)]" />
      </div>


      <main className="max-w-screen-2xl mx-auto pb-24 relative z-10">

        {/* Dossier Header & Context */}
        <div className="px-3 sm:px-0 mb-6">
          <ContextHeader
            context="DOSSIER"
            title={event?.title}
            backTo="/dashboard"
            subtitle={
              <div className="flex items-center gap-3">
                <StatusPill tone={event?.status === 'active' ? 'success' : 'neutral'}>
                  {event?.status === 'active' ? 'Attivo' : event?.status}
                </StatusPill>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
                  <Clock className="w-3 h-3" />
                  <span>Aggiornato: {new Date().toLocaleDateString('it-IT')}</span>
                </div>
              </div>
            }
          />

          {/* Dossier Summary Strip */}
          {event?.description && (
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                Mission Brief
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed font-sans">{event.description}</p>
            </div>
          )}
        </div>

        {/* Mobile-First Grid: 1 col (mobile) -> 2 col (md) -> 3 col (lg) -> 4 col (2xl) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-6">

          {/* 1. Briefing Room (Daily Actions) - Priority 1 */}
          <GlassTile className="md:col-span-2 lg:col-span-2 min-h-[340px]" padding="p-0">
            <BriefingRoom isAdmin={isAdmin} eventId={eventId} event={event} />
          </GlassTile>

          {/* 2. Risk Radar (Strategic Risks) - Priority 2 */}
          <GlassTile className="md:col-span-2 lg:col-span-1 min-h-[320px]" padding="p-0">
            <TileRadar isAdmin={isAdmin} onOpenModal={() => setShowSignalModal(true)} eventId={eventId} />
          </GlassTile>

          {/* 3. Decision Log (Record) - Priority 3 */}
          <GlassTile className="min-h-[340px]" padding="p-0">
            <TileDecisionLog isAdmin={isAdmin} adminName={user?.displayName} eventId={eventId} />
          </GlassTile>

          {/* 4. Compass (OKRs) */}
          <GlassTile className="min-h-[280px]">
            <TileCompass isAdmin={isAdmin} onOpenModal={(okr) => { setSelectedOKR(okr || null); setShowOKRModal(true); }} eventId={eventId} />
          </GlassTile>

          {/* 5. Team Status */}
          <GlassTile className="min-h-[280px]">
            <TileTeam isAdmin={isAdmin} event={event} />
          </GlassTile>

          {/* 6. System Pulse */}
          <GlassTile className="min-h-[280px]">
            <TilePulse eventId={eventId} />
          </GlassTile>

          {/* 7. Intelligence Reports - Full width on mobile/tablet */}
          <GlassTile className="md:col-span-2 lg:col-span-1 2xl:col-span-1 min-h-[320px] relative overflow-hidden" padding="p-0">
            <TileIntelligence adminName={user?.displayName} eventId={eventId} />
          </GlassTile>

        </div>
      </main>
      <button onClick={() => setShowNeural(true)} className="fixed bottom-5 right-4 sm:bottom-8 sm:right-8 w-12 h-12 sm:w-14 sm:h-14 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 hover:border-white/40 text-white rounded-full shadow-[0_0_30px_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.5)] hover:shadow-[0_0_40px_rgba(255,255,255,0.18)] flex items-center justify-center z-50 transition-all duration-300 hover:scale-110 active:scale-95">
        <Sparkles className="w-5 h-5" />
      </button>
      {showNeural && <NeuralInterface onClose={() => setShowNeural(false)} />}
      {showSignalModal && createPortal(<SignalInput onClose={() => setShowSignalModal(false)} />, document.body)}
      {showOKRModal && createPortal(<OKRManager onClose={() => setShowOKRModal(false)} existingOKR={selectedOKR} />, document.body)}
      {showArchive && createPortal(
        <ReportsArchiveModal onClose={() => setShowArchive(false)} adminName={user?.displayName} onOpenReport={() => { }} />,
        document.body
      )}
      <AppCredits />
    </div>
  );
};
