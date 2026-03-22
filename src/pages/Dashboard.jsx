import React, { useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AiStateContext, MissionContext } from '../components/layout/AppShell';
import { DynamicBentoGrid } from '../components/DynamicBentoGrid';
import { OKRManager } from '../components/modals/OKRManager';
import { SignalInput } from '../components/modals/SignalInput';
import { ReportsArchiveModal } from '../components/tiles/TileIntelligence';
import { AiPendingActionTile } from '../components/AiPendingActionTile';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const Dashboard = ({ user }) => {
  const { isSpeaking } = useContext(AiStateContext);
  const { activeMissionId } = useContext(MissionContext);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSignalModal, setShowSignalModal] = useState(false);
  const [showOKRModal, setShowOKRModal] = useState(false);
  const [selectedOKR, setSelectedOKR] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const [signals, setSignals] = useState([]);

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
    const unsub = onSnapshot(collection(db, 'signals'), snap => {
      setSignals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const hasHighSignals = signals.some(s => s.level === 'high');

  return (
    <>
      {/* MOBILE AI-FIRST VIEW: Visibile solo su smartphone/tablet piccoli */}
      <div className="lg:hidden flex flex-col items-center justify-center min-h-[calc(100vh-140px)] w-full relative px-4 pt-12 pb-24">
         <div className="text-center mb-8 animate-fade-in-up">
            <h1 className="text-2xl font-bold text-white tracking-tight">Shadow CoS</h1>
            <p className="text-sm text-cyan-400 mt-2 font-mono uppercase tracking-widest">In ascolto operativo</p>
         </div>

         {/* Azioni in Sospeso (Human-in-the-Loop) */}
         <div className="w-full max-w-md mt-16 z-20">
            <AiPendingActionTile position="bottom" />
         </div>
      </div>

      {/* DESKTOP X-MATRIX GRID: Visibile dai 1024px in su */}
      <div className="hidden lg:block w-full relative">
        <DynamicBentoGrid
          user={user}
          isAdmin={isAdmin}
          isSpeaking={isSpeaking}
          hasHighSignals={hasHighSignals}
          onOpenSignal={() => setShowSignalModal(true)}
          onOpenOKR={(okr) => { setSelectedOKR(okr || null); setShowOKRModal(true); }}
        />
      </div>

      {/* Portals */}
      {showSignalModal && createPortal(
        <SignalInput onClose={() => setShowSignalModal(false)} />,
        document.body
      )}
      {showOKRModal && createPortal(
        <OKRManager onClose={() => setShowOKRModal(false)} existingOKR={selectedOKR} />,
        document.body
      )}
      {showArchive && createPortal(
        <ReportsArchiveModal onClose={() => setShowArchive(false)} adminName={user?.displayName} onOpenReport={() => { }} />,
        document.body
      )}
    </>
  );
};
