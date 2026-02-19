import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, Zap, Plus, BookOpen, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../firebase';
import { collection, query, onSnapshot, orderBy, limit, doc, deleteDoc, getDoc, setDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import ReactMarkdown from 'react-markdown';
import { createPortal } from 'react-dom';
import { DecisionInput } from '../../modals/DecisionInput';
import EventHealthBar from '../../ui/EventHealthBar';
import EventTimeline from '../../ui/EventTimeline';

const getBriefingDocKey = (eventId) => {
  const date = new Date().toISOString().split('T')[0];
  return eventId ? `${eventId}_${date}` : date;
};

/**
 * Maps event data to EventTimeline phases array.
 * Falls back to a sensible default if event has no phases.
 */
const buildPhasesFromEvent = (event) => {
  if (!event) return null;
  if (event.phases && Array.isArray(event.phases)) return event.phases;

  // Auto-generate from phase field
  const ALL_PHASES = [
    { id: 'briefing', label: 'Briefing Iniziale' },
    { id: 'analysis', label: 'Analisi Rischi' },
    { id: 'planning', label: 'Pianificazione' },
    { id: 'execution', label: 'Esecuzione' },
    { id: 'review', label: 'Review Finale' },
  ];
  const currentPhase = event.phase || 'planning';
  const currentIdx = ALL_PHASES.findIndex(p => p.id === currentPhase);

  return ALL_PHASES.map((p, idx) => ({
    ...p,
    status: idx < currentIdx ? 'completed' : idx === currentIdx ? 'active' : 'pending',
  }));
};

export const BriefingRoom = ({ isAdmin, eventId, event }) => {
  const [briefing, setBriefing] = useState(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [briefingError, setBriefingError] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [showDecisionModal, setShowDecisionModal] = useState(false);

  const briefingDocKey = getBriefingDocKey(eventId);
  const phases = buildPhasesFromEvent(event);

  // Load decisions from Firestore (scoped to eventId if present)
  useEffect(() => {
    const base = collection(db, 'decisions');
    const q = eventId
      ? query(base, where('eventId', '==', eventId), orderBy('savedAt', 'desc'), limit(10))
      : query(base, orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      setDecisions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [eventId]);

  // Load cached briefing for today (scoped to eventId if present)
  useEffect(() => {
    const loadCachedBriefing = async () => {
      try {
        const snap = await getDoc(doc(db, 'briefings', briefingDocKey));
        if (snap.exists() && snap.data().content) {
          setBriefing(snap.data().content);
        } else {
          setBriefing(null);
        }
      } catch (e) {
        // No cached briefing, that's fine
      }
    };
    loadCachedBriefing();
  }, [briefingDocKey]);

  const handleGenerate = async () => {
    setLoadingBriefing(true);
    setBriefingError(null);
    try {
      const generateBriefing = httpsCallable(functions, 'generateDailyBriefing');
      const result = await generateBriefing({ eventId: eventId || null });
      if (result.data?.data) {
        const content = result.data.data;
        setBriefing(content);
        // Cache in Firestore (scoped)
        await setDoc(doc(db, 'briefings', briefingDocKey), {
          content,
          generatedAt: serverTimestamp(),
          date: briefingDocKey,
          ...(eventId && { eventId }),
        });
      } else {
        setBriefingError('Generation failed. Check function logs.');
      }
    } catch (e) {
      console.error('Briefing error:', e);
      setBriefingError(e.message || 'Connection failed.');
    } finally {
      setLoadingBriefing(false);
    }
  };

  const handleDeleteDecision = async (id) => {
    if (!window.confirm('Delete this decision entry?')) return;
    try {
      await deleteDoc(doc(db, 'decisions', id));
    } catch (e) {
      console.error('Error deleting decision:', e);
    }
  };

  const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const outcomeStyle = {
    approved: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    pending: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    rejected: 'text-red-400 border-red-500/30 bg-red-500/10',
  };

  return (
    <div className="h-full flex flex-col gap-0 overflow-hidden">
      {/* Event Health Bar — shown only when event context available */}
      {event && (
        <div className="px-4 sm:px-7 pt-4 pb-0">
          <EventHealthBar event={event} />
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row gap-0 px-4 sm:px-7 pb-4 sm:pb-7 pt-4 min-h-0 overflow-hidden">
        {/* Left: AI Briefing */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-3 sm:mb-5 gap-2">
            <div className="min-w-0">
              <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" /> Daily Briefing
              </h3>
              <p className="text-[10px] font-mono text-zinc-700 mt-0.5 truncate">{today}</p>
            </div>
            {isAdmin && (
              <button
                onClick={handleGenerate}
                disabled={loadingBriefing}
                className="flex-shrink-0 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-[10px] font-mono text-indigo-300 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/15 rounded-lg transition-all disabled:opacity-50"
              >
                {loadingBriefing ? (
                  <><RefreshCw className="w-3 h-3 animate-spin" /><span className="hidden sm:inline"> Generando...</span></>
                ) : (
                  <><Zap className="w-3 h-3" /><span className="hidden sm:inline"> Genera Briefing</span><span className="sm:hidden">Genera</span></>
                )}
              </button>
            )}
          </div>
          <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 text-xs text-zinc-300 font-mono max-h-48 md:max-h-none">
            {loadingBriefing && (
              <p className="text-zinc-600 animate-pulse">GENERATING BRIEFING...</p>
            )}
            {!loadingBriefing && briefingError && (
              <p className="text-red-400">{briefingError}</p>
            )}
            {!loadingBriefing && !briefingError && briefing && (
              <ReactMarkdown className="prose prose-invert prose-sm max-w-none">{briefing}</ReactMarkdown>
            )}
            {!loadingBriefing && !briefingError && !briefing && (
              <div className="flex flex-col items-center justify-center gap-3 py-6 sm:py-8 text-center">
                <FileText className="w-6 h-6 text-zinc-700" />
                <p className="text-zinc-600">Nessun briefing oggi</p>
                <p className="text-[9px] text-zinc-700">L'AI analizzerà OKR, segnali e decisioni recenti</p>
                {isAdmin && (
                  <button
                    onClick={handleGenerate}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-white bg-indigo-600/80 hover:bg-indigo-500/80 rounded-xl transition-all"
                  >
                    <Zap className="w-3 h-3" /> Genera Briefing
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Divider — vertical on desktop, horizontal on mobile */}
        <div className="hidden md:block w-px bg-white/[0.05] self-stretch" />
        <div className="block md:hidden h-px bg-white/[0.05] my-2" />

        {/* Right: Decision Log + Timeline */}
        <div className="md:w-64 flex-shrink-0 flex flex-col gap-4">
          {/* Decision Log */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Decision Log
              </h3>
              {isAdmin && (
                <button
                  onClick={() => setShowDecisionModal(true)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/10 hover:border-white/20"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 space-y-2 max-h-40 md:max-h-none">
              {decisions.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-[10px] font-mono text-zinc-700">Nessuna decisione</p>
                  {isAdmin && (
                    <button
                      onClick={() => setShowDecisionModal(true)}
                      className="mt-2 text-[10px] font-mono text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      + Prima decisione
                    </button>
                  )}
                </div>
              )}
              {decisions.length > 0 ? decisions.map(decision => (
                <div
                  key={decision.id}
                  className="flex items-start justify-between gap-2 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl group hover:border-white/10 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${outcomeStyle[decision.outcome || 'pending']
                      }`}>
                      {decision.outcome || 'pending'}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteDecision(decision.id)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-400 transition-all flex-shrink-0 ml-1"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                    <p className="text-xs font-mono text-zinc-300 mt-1 leading-snug">{decision.title || decision.decision}</p>
                    {decision.context && (
                      <p className="text-[9px] text-zinc-600 mt-1 line-clamp-2">{decision.context}</p>
                    )}
                    {decision.createdAt && (
                      <p className="text-[9px] text-zinc-700 mt-1">
                        {decision.createdAt.toDate?.().toLocaleDateString('it-IT') || ''}
                      </p>
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-[9px] font-mono text-zinc-800 uppercase tracking-widest text-center py-4">NO DECISIONS LOGGED</p>
              )}
            </div>
          </div>

          {/* Event Timeline — shown only when event context available */}
          {phases && (
            <div className="flex-shrink-0">
              <EventTimeline phases={phases} compact={true} />
            </div>
          )}
        </div>
      </div>

      {showDecisionModal && createPortal(
        <DecisionInput onClose={() => setShowDecisionModal(false)} />,
        document.body
      )}
    </div>
  );
};
