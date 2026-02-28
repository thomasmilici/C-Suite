import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { CheckCircle, XCircle, Zap, Loader2, Clock } from 'lucide-react';

/**
 * AiPendingActionTile — Human-in-the-Loop approval tile.
 *
 * Listens in real-time to `pending_ai_actions` (status == "pending").
 * Shows each proposed action with ✅ Esegui / ❌ Scarta buttons.
 * Calls executeApprovedAction / rejectPendingAction Cloud Functions.
 * Hidden when no pending actions exist (zero layout footprint).
 *
 * Props:
 *   contextId?  — optional dossier ID to filter actions (shows only relevant ones)
 */

const TOOL_COLORS = {
    createRiskSignal:        'border-red-500/20 bg-red-500/5 text-red-300',
    updateRiskSignal:        'border-amber-500/20 bg-amber-500/5 text-amber-300',
    createOKR:               'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
    updateOKR:               'border-amber-500/20 bg-amber-500/5 text-amber-300',
    updateDailyPulse:        'border-yellow-500/20 bg-yellow-500/5 text-yellow-300',
    logDecision:             'border-blue-500/20 bg-blue-500/5 text-blue-300',
    updateDailyFocus:        'border-yellow-500/20 bg-yellow-500/5 text-yellow-300',
    addWeeklyOutcome:        'border-purple-500/20 bg-purple-500/5 text-purple-300',
    addWeeklyStakeholderMove:'border-pink-500/20 bg-pink-500/5 text-pink-300',
    createStrategicTheme:    'border-indigo-500/20 bg-indigo-500/5 text-indigo-300',
    addStakeholder:          'border-teal-500/20 bg-teal-500/5 text-teal-300',
    addMeeting:              'border-orange-500/20 bg-orange-500/5 text-orange-300',
};

const TOOL_LABELS = {
    createRiskSignal:        'Segnale di Rischio',
    updateRiskSignal:        'Aggiornamento Segnale',
    createOKR:               'Nuovo OKR',
    updateOKR:               'Aggiornamento OKR',
    updateDailyPulse:        'Daily Pulse',
    logDecision:             'Decisione',
    updateDailyFocus:        'Daily Focus',
    addWeeklyOutcome:        'Outcome Settimanale',
    addWeeklyStakeholderMove:'Mossa Stakeholder',
    createStrategicTheme:    'Tema Strategico',
    addStakeholder:          'Nuovo Stakeholder',
    addMeeting:              'Meeting',
};

const PendingActionCard = ({ action, onApproved, onRejected }) => {
    const [executing, setExecuting] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState(null);

    const colorClass = TOOL_COLORS[action.proposedAction] || 'border-white/10 bg-white/5 text-zinc-300';
    const label = TOOL_LABELS[action.proposedAction] || action.proposedAction;

    const handleApprove = async () => {
        setExecuting(true);
        setError(null);
        try {
            const fn = httpsCallable(functions, 'executeApprovedAction');
            const result = await fn({ pendingId: action.id });
            if (result.data?.data?.success) {
                setDone(true);
                setTimeout(() => onApproved(action.id), 600);
            } else {
                setError(result.data?.error || 'Errore durante l\'esecuzione.');
            }
        } catch (e) {
            setError(e.message || 'Errore di rete.');
        } finally {
            setExecuting(false);
        }
    };

    const handleReject = async () => {
        setRejecting(true);
        try {
            const fn = httpsCallable(functions, 'rejectPendingAction');
            await fn({ pendingId: action.id });
            setDone(true);
            setTimeout(() => onRejected(action.id), 400);
        } catch (e) {
            setError(e.message);
        } finally {
            setRejecting(false);
        }
    };

    const createdAt = action.createdAt?.toDate?.();
    const timeAgo = createdAt
        ? new Intl.RelativeTimeFormat('it', { numeric: 'auto' }).format(
            Math.round((createdAt - Date.now()) / 60000), 'minute'
          )
        : null;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: done ? 0.4 : 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className={`flex items-start gap-3 p-3.5 rounded-xl border ${colorClass} transition-opacity`}
        >
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
                <Zap className="w-3.5 h-3.5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
                    <span className="text-[9px] font-mono uppercase tracking-widest opacity-60">{label}</span>
                    {/* Semantic routing badge */}
                    {action.actionIntent === 'UPDATE' ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 uppercase tracking-wider">
                            {action.linkedEntityTitle ? `Collegato a: ${action.linkedEntityTitle.slice(0, 30)}` : 'Aggiornamento'}
                        </span>
                    ) : action.actionIntent === 'NEW_ENTITY' ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 uppercase tracking-wider">
                            Nuova Iniziativa
                        </span>
                    ) : null}
                    {timeAgo && (
                        <span className="text-[9px] font-mono text-zinc-600 flex items-center gap-0.5 ml-auto">
                            <Clock className="w-2.5 h-2.5" />{timeAgo}
                        </span>
                    )}
                </div>
                <p className="text-sm leading-snug text-white/90">{action.summary}</p>

                {/* Error */}
                {error && (
                    <p className="text-[10px] text-red-400 mt-1.5 font-mono">{error}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-2.5">
                    <button
                        onClick={handleApprove}
                        disabled={executing || rejecting || done}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-emerald-500/20 hover:text-emerald-300 text-xs font-mono transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {executing
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <CheckCircle className="w-3 h-3 text-emerald-400" />
                        }
                        {executing ? 'Esecuzione...' : 'Esegui'}
                    </button>
                    <button
                        onClick={handleReject}
                        disabled={executing || rejecting || done}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-red-500/10 hover:text-red-300 text-xs font-mono text-zinc-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {rejecting
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <XCircle className="w-3 h-3" />
                        }
                        Scarta
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export const AiPendingActionTile = ({ contextId = null }) => {
    const [pendingActions, setPendingActions] = useState([]);
    const [resolvedIds, setResolvedIds] = useState(new Set());

    // Real-time listener on pending_ai_actions
    useEffect(() => {
        const base = collection(db, 'pending_ai_actions');
        // Listen to all pending actions; filter by contextId client-side
        // (Firestore requires composite index for != + where, this avoids that)
        const q = query(base, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));

        const unsub = onSnapshot(q, (snap) => {
            const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Context isolation: if inside a dossier, show only relevant actions
            const filtered = contextId
                ? all.filter(a => !a.contextId || a.contextId === contextId)
                : all;
            setPendingActions(filtered);
        }, (err) => {
            // If insufficient permissions (non-COS user), silently hide the tile
            console.warn('[AiPendingActionTile] Permission denied:', err.code);
            setPendingActions([]);
        });

        return () => unsub();
    }, [contextId]);

    const handleResolved = (id) => {
        setResolvedIds(prev => new Set([...prev, id]));
        // Remove from list after animation
        setTimeout(() => {
            setPendingActions(prev => prev.filter(a => a.id !== id));
            setResolvedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        }, 700);
    };

    // Hide tile completely when nothing pending
    if (pendingActions.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="col-span-full mb-2"
        >
            <div className="glass-tile rounded-2xl border border-white/[0.07] p-4">
                {/* Tile Header */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                            Azioni Proposte — Shadow CoS
                        </span>
                    </div>
                    <span className="ml-auto text-[9px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                        {pendingActions.length} in attesa
                    </span>
                </div>

                {/* Action Cards */}
                <div className="flex flex-col gap-2">
                    <AnimatePresence mode="popLayout">
                        {pendingActions.map(action => (
                            <PendingActionCard
                                key={action.id}
                                action={action}
                                onApproved={handleResolved}
                                onRejected={handleResolved}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};
