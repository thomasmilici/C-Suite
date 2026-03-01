import React, { useEffect, useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import { TileCompass } from '../components/tiles/TileCompass';
import { TilePulse } from '../components/tiles/TilePulse';
import { TileRadar } from '../components/tiles/TileRadar';
import { TileIntelligence, ReportsArchiveModal } from '../components/tiles/TileIntelligence';
import { TileDecisionLog } from '../components/tiles/TileDecisionLog';
import { ShadowCosSphere } from '../components/ui/ShadowCosSphere';
import { ProactiveAlerts } from '../components/modules/Intelligence/ProactiveAlerts';
import { BriefingRoom } from '../components/modules/Briefing/BriefingRoom';
import { OKRManager } from '../components/modals/OKRManager';
import { SignalInput } from '../components/modals/SignalInput';
import { EventsList } from '../components/EventsList';
import { AiPendingActionTile } from '../components/AiPendingActionTile';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { AiStateContext } from '../components/layout/AppShell';
import { db } from '../firebase';

export const Dashboard = ({ user }) => {
  const { isThinking, isSpeaking, isLiveActive, volume } = useContext(AiStateContext);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showSignalModal, setShowSignalModal] = useState(false);
  const [showOKRModal, setShowOKRModal] = useState(false);
  const [selectedOKR, setSelectedOKR] = useState(null);
  const [signals, setSignals] = useState([]);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const checkRole = async () => {
      if (user) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists() && snap.data().role === 'ADMIN') setIsAdmin(true);
      }
    };
    checkRole();
  }, [user]);

  useEffect(() => {
    const unsubSignals = onSnapshot(collection(db, 'signals'), snap => {
      setSignals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubSignals(); };
  }, []);

  const hasHighSignals = signals.some(s => s.level === 'high');

  // Stile condiviso per l'effetto 3D / Dark Neumorphism
  const cardStyleClass = "bg-[#161b2b] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_8px_20px_rgba(0,0,0,0.5)]";

  return (
    <>
      <div className="w-full max-w-[1600px] mx-auto min-h-[calc(100vh-80px)] p-6 grid grid-cols-[320px_1fr_320px] items-start gap-6 bg-[#0d111c]">

        {/* 1. COLONNA SINISTRA */}
        <div className="flex flex-col gap-6 text-gray-200 w-full">
          <div className={`rounded-2xl p-4 ${cardStyleClass}`}>
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-3 shrink-0">Dossier Attivi</p>
            <div className="max-h-64 overflow-y-auto thin-scroll">
              <EventsList isAdmin={isAdmin} currentUser={user} />
            </div>
          </div>

          <div className={`rounded-2xl p-4 ${cardStyleClass}`}>
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2 shrink-0">System Alerts</p>
            <div className="max-h-48 overflow-y-auto thin-scroll">
              <ProactiveAlerts onAlertsChange={(count) => setAlertCount(count)} />
            </div>
          </div>

          <div className={`rounded-2xl flex flex-col ${cardStyleClass}`}>
            <div className="p-4">
              <BriefingRoom isAdmin={isAdmin} />
            </div>
          </div>
          <div className={`rounded-2xl flex flex-col ${cardStyleClass}`}>
            <div className="p-4">
              <TileDecisionLog isAdmin={isAdmin} />
            </div>
          </div>
        </div>

        {/* 2. COLONNA CENTRALE - SPACCATURA MATEMATICA 50/50 */}
        <div className="relative flex flex-col w-full h-[calc(100vh-128px)] min-h-[600px] text-gray-200 sticky top-6">

          {/* LA SFERA (Assoluta, centrata esattamente sulla spaccatura) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none w-[240px] h-[240px] flex items-center justify-center">
            <ShadowCosSphere isSpeaking={isSpeaking || isLiveActive} isThinking={isThinking} volume={volume} />
          </div>

          {/* METÀ SUPERIORE: ESATTAMENTE 50% */}
          <div className="h-[50%] w-full flex flex-col">
            <div
              className={`${cardStyleClass} rounded-t-2xl w-full h-full p-6 pb-[140px] flex flex-col overflow-hidden`}
              style={{
                WebkitMaskImage: 'radial-gradient(circle at 50% calc(100% + 8px), transparent 135px, black 136px)',
                maskImage: 'radial-gradient(circle at 50% calc(100% + 8px), transparent 135px, black 136px)'
              }}
            >
              <div className="flex items-center gap-1.5 mb-3 shrink-0">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500" />
                </span>
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                  Azioni Proposte
                </span>
              </div>
              <div className="flex-1 overflow-y-auto thin-scroll">
                <AiPendingActionTile position="top" />
              </div>
            </div>
          </div>

          {/* METÀ INFERIORE: ESATTAMENTE 50% */}
          <div className="h-[50%] w-full flex gap-4">
            <div
              className={`${cardStyleClass} rounded-bl-2xl rounded-br-lg flex-1 h-full p-6 pt-[140px] flex flex-col overflow-hidden`}
              style={{
                WebkitMaskImage: 'radial-gradient(circle at calc(100% + 8px) -8px, transparent 135px, black 136px)',
                maskImage: 'radial-gradient(circle at calc(100% + 8px) -8px, transparent 135px, black 136px)'
              }}
            >
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2 shrink-0">Priorità</p>
              <div className="flex-1 overflow-y-auto thin-scroll">
                <AiPendingActionTile position="bottom" />
              </div>
            </div>

            <div
              className={`${cardStyleClass} rounded-br-2xl rounded-bl-lg flex-1 h-full p-6 pt-[140px] flex flex-col overflow-hidden`}
              style={{
                WebkitMaskImage: 'radial-gradient(circle at -8px -8px, transparent 135px, black 136px)',
                maskImage: 'radial-gradient(circle at -8px -8px, transparent 135px, black 136px)'
              }}
            >
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2 shrink-0">Daily Pulse</p>
              <div className="flex-1 overflow-y-auto thin-scroll">
                <TilePulse />
              </div>
            </div>
          </div>

        </div>

        {/* 3. COLONNA DESTRA */}
        <div className="flex flex-col gap-6 text-gray-200 w-full">
          <div className={`rounded-2xl flex flex-col ${cardStyleClass}`}>
            <div className="p-4">
              <TileCompass isAdmin={isAdmin} onOpenModal={(okr) => { setSelectedOKR(okr || null); setShowOKRModal(true); }} />
            </div>
          </div>
          <div className={`rounded-2xl flex flex-col ${cardStyleClass} ${hasHighSignals ? ' ring-1 ring-red-500/30' : ''}`}>
            <div className="p-4">
              <TileRadar isAdmin={isAdmin} onOpenModal={() => setShowSignalModal(true)} />
            </div>
          </div>
          <div className={`rounded-2xl flex flex-col ${cardStyleClass}`}>
            <div className="p-4">
              <TileIntelligence adminName={user?.displayName} />
            </div>
          </div>
        </div>

      </div>

      {/* Portals */}
      {showSignalModal && createPortal(<SignalInput onClose={() => setShowSignalModal(false)} />, document.body)}
      {showOKRModal && createPortal(<OKRManager onClose={() => setShowOKRModal(false)} existingOKR={selectedOKR} />, document.body)}
      {showArchive && createPortal(
        <ReportsArchiveModal onClose={() => setShowArchive(false)} adminName={user?.displayName} onOpenReport={() => { }} />,
        document.body
      )}
    </>
  );
};
