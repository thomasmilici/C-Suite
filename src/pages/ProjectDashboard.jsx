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
import { LogOut, Shield, ArrowLeft, Sparkles, Archive, Folder } from 'lucide-react';
import { AppCredits } from '../components/ui/AppCredits';

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

  // Fetch event metadata
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

  // Check admin role
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
        <p className="text-xs text-zinc-600 font-mono animate-pulse tracking-widest">
          APERTURA DOSSIER...
        </p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center gap-4">
        <Folder className="w-10 h-10 text-zinc-700" />
        <p className="text-sm text-zinc--500 font-mono">Dossier non trovato o accesso negato.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Torna alla Centrale Operativa
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040508] p-4 md:p-6 font-sans selection:bg-zinc-300 relative text-gray-200">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-10">
        <div className="absolute inset-0 bg [radial-gradient(ellipse_at_20%_20%,rgba(99,102,241,0.07),0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(20,184,166,0.05),0%,transparent_60%)]" />
      </div>

      {/* Header */}
      <header className="max-w-screen-2xl mx-auto mb-6 flex justify-between items-center border-b border-white/5 pb-4 sticky top-0 z-20 bg-[#040508]/70 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {/* Back button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] flex items-center justify-center text-zinc-400 hover:text-white transition-colors flex-shrink-0"
            title="Torna alla Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-mono font-bold tracking-tighter text-white leading-none truncate max-w-[220px] md:max-w-none">
              {event?.title}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                Dossier • {event?.status === 'active' ? 'Attivo' : event?.status}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <button
            onClick={() => setShowArchive(true)}
            className="hidden sm:flex touch-target items-center gap-1.5 text-zinc-400 hover:text-indigo-300 border border-white/[0.07] hover:border-indigo-500/30 bg-white/[0.02] hover:bg-indigo-500/5 px-3 py-1.5 rounded-lg transition-all backdrop-blur-sm"
          >
            <Archive className="w-3 h-3" />
            <span>Archivio</span>
          </button>
          {isAdmin && (
            <button onClick={() => navigate('/admin')} className="touch-target text-red-400 hover:text-red-300 flex items-center gap-1.5 border border-red-900/50 bg-red-900/10 px-3 py-1.5 rounded-lg transition-colors backdrop-blur-sm">
              <Shield className="w-3 h-3" /> ADMIN
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

      {/* Project description badge */}
      {event?.description && (
        <div className="max-w-screen-2xl mx-auto mb-4">
          <p className="text-xs text-zinc-500 font-mono px-1">{event.description}</p>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto pb-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* ROW 1 */}
          <div className="glass-tile rounded-2xl min-h-[280px]">
            <TileCompass isAdmin={isAdmin} onOpenModal={(okr) => { setSelectedOKR(okr || null); setShowOKRModal(true); }} eventId={eventId} />
          </div>

          <div className="glass-tile rounded-2xl min-h-[280px]">
            <TilePulse eventId={eventId} />
          </div>

          <div className="glass-tile rounded-2xl min-h-[280px]">
            <TileTeam isAdmin={isAdmin} eventId={eventId} />
          </div>

          {/* ROW 2 */}
          <div className="glass-tile md:col-span-2 rounded-2xl min-h-[320px]">
            <TileRadar isAdmin={isAdmin} onOpenModal={() => setShowSignalModal(true)} eventId={eventId} />
          </div>

          <div className="glass-tile rounded-2xl min-h-[320px] relative overflow-hidden">
            <TileIntelligence adminName={user?.displayName} eventId={eventId} />
          </div>

          {/* ROW 3 */}
          <div className="glass-tile md:col-span-2 rounded-2xl min-h-[340px]">
            <BriefingRoom isAdmin={isAdmin} eventId={eventId} />
          </div>

          <div className="glass-tile rounded-2xl min-h-[340px]">
            <TileDecisionLog isAdmin={isAdmin} adminName={user?.displayName} eventId={eventId} />
          </div>

        </div>
      </main>

      {/* Shadow CoS AI FAB */}
      <button
        onClick={() => setShowNeural(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 hover:border-white/40 text-white rounded-full shadow-[0_0_30px_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.5)] hover:shadow-[0_0_40px_rgba(255,255,255,0.18)] flex items-center justify-center z-50 transition-all duration-300 hover:scale-110 active:scale-95"
      >
        <Sparkles className="w-5 h-5" />
      </button>

      {showNeural && setShowNeural(false)} />}
      {showSignalModal && createPortal(
        <SignalInput onClose={() => setShowSignalModal(false)} />,
        document.body
      )}
      {showOKRModal && createPortal(
        <OKRManager onClose={() => setShowOKRModal(false)} existingOKR={selectedOKR} />,
        document.body
      )}
      {showArchive && createPortal(
        <ReportsArchiveModal
          onClose={() => setShowArchive(false)}
          adminName={user?.displayName}
          onOpenReport={() => {}}
        />,
        document.body
      )}

      {/* Footer Credits */}
      <AppCredits />
    </div>
  );
};
