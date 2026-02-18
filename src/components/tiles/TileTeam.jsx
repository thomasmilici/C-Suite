import React, { useState, useEffect } from 'react';
import { Trophy, Activity, RefreshCw, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, onSnapshot, orderBy, limit, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Quando viene passato un evento con teamMembers, mostriamo solo quei membri
// risolvendone i profili dalla collection "users".
// In assenza di evento (Dashboard globale) mostriamo top-5 per rank_score.

export const TileTeam = ({ isAdmin = false, event }) => {
  const [team, setTeam] = useState([]);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [recalcMsg, setRecalcMsg] = useState(null);

  const handleRecalcScores = async () => {
    setRecalcLoading(true);
    setRecalcMsg(null);
    try {
      const functions = getFunctions();
      const trigger = httpsCallable(functions, 'triggerRankScores');
      await trigger();
      setRecalcMsg({ type: 'ok', text: 'Score aggiornati!' });
    } catch (err) {
      console.error('triggerRankScores error:', err);
      setRecalcMsg({ type: 'err', text: 'Errore nel ricalcolo.' });
    } finally {
      setRecalcLoading(false);
      setTimeout(() => setRecalcMsg(null), 3000);
    }
  };

  useEffect(() => {
    // MODALITA' EVENTO: risolvi i profili dei teamMembers
    if (event?.teamMembers?.length > 0) {
      const uids = event.teamMembers.slice(0, 5);
      Promise.all(
        uids.map(uid =>
          getDoc(doc(db, 'users', uid)).then(snap =>
            snap.exists() ? { id: snap.id, rank: 1, ...snap.data() } : null
          )
        )
      ).then(results => {
        setTeam(results.filter(Boolean).map((m, idx) => ({ ...m, rank: idx + 1 })));
      });
      return; // nessun unsub necessario per getDoc
    }

    // MODALITA' GLOBALE: top-5 per rank_score
    const q = query(collection(db, 'users'), orderBy('rank_score', 'desc'), limit(5));
    const unsub = onSnapshot(q, (snapshot) => {
      setTeam(snapshot.docs.map((doc, idx) => ({
        id: doc.id,
        rank: idx + 1,
        ...doc.data()
      })));
    });
    return () => unsub();
  }, [event?.id, event?.teamMembers?.join(',')]);

  const rankColors = ['text-yellow-400', 'text-zinc-300', 'text-amber-600', 'text-zinc-500', 'text-zinc-600'];
  const isEventMode = !!(event?.teamMembers?.length > 0);

  return (
    <div className="h-full flex flex-col p-7 relative">
      {/* Subtle top highlight line */}
      <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          {isEventMode ? 'Active Agents' : 'Active Agents'}
        </h3>
        <div className="flex items-center gap-2">
          {recalcMsg && (
            <span className={`text-[10px] font-mono ${
              recalcMsg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {recalcMsg.text}
            </span>
          )}
          <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          {isAdmin && !isEventMode && (
            <button
              onClick={handleRecalcScores}
              disabled={recalcLoading}
              title="Ricalcola score"
              className="flex items-center gap-1.5 text-zinc-400 uppercase text-[10px] font-mono hover:text-indigo-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${recalcLoading ? 'animate-spin' : ''}`} />
              {recalcLoading ? 'Calcolo...' : 'Ricalcola'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-grow space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/5">
        <AnimatePresence>
          {team.length > 0 ? team.map((member) => (
            <motion.div
              key={member.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all group"
            >
              {/* Rank badge */}
              <div className={`w-5 h-5 flex-shrink-0 text-[10px] font-mono font-bold flex items-center justify-center ${
                rankColors[member.rank - 1] || 'text-zinc-600'
              }`}>
                {String(member.rank).padStart(2, '0')}
              </div>

              {/* Avatar */}
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-mono text-zinc-300">
                  {(member.displayName || member.email || '?')[0].toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div className="flex-grow min-w-0">
                <p className="text-xs font-mono text-zinc-200 truncate">
                  {member.displayName || member.email || member.id}
                </p>
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wide">
                  {member.role || 'MEMBER'}
                </p>
              </div>

              {/* Score o status */}
              <div className="text-right flex-shrink-0">
                {isEventMode ? (
                  <span className="text-[9px] font-mono text-emerald-600 uppercase">—</span>
                ) : (
                  <span className="text-[10px] font-mono text-zinc-600">
                    {member.rank_score != null ? member.rank_score : '—'}
                  </span>
                )}
                <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-wide">
                  {isEventMode ? '' : 'SCORE'}
                </p>
              </div>
            </motion.div>
          )) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Users className="w-5 h-5 text-zinc-700" />
              <p className="text-[10px] font-mono text-zinc-700">
                {isEventMode ? 'Nessun membro assegnato.' : 'Nessun agente attivo.'}
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
