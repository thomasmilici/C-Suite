import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, Zap, Plus, BookOpen, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../firebase';
import { collection, query, onSnapshot, orderBy, limit, doc, deleteDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import ReactMarkdown from 'react-markdown';
import { createPortal } from 'react-dom';
import { DecisionInput } from '../../modals/DecisionInput';

const BRIEFING_CACHE_DOC = () => new Date().toISOString().split('T')[0]; // "2026-02-16"

export const BriefingRoom = ({ isAdmin }) => {
    const [briefing, setBriefing] = useState(null);
    const [loadingBriefing, setLoadingBriefing] = useState(false);
    const [briefingError, setBriefingError] = useState(null);
    const [decisions, setDecisions] = useState([]);
    const [showDecisionModal, setShowDecisionModal] = useState(false);

    // Load decisions from Firestore
    useEffect(() => {
        const q = query(collection(db, "decisions"), orderBy("createdAt", "desc"), limit(10));
        const unsub = onSnapshot(q, (snap) => {
            setDecisions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    // Load cached briefing for today
    useEffect(() => {
        const loadCachedBriefing = async () => {
            try {
                const snap = await getDoc(doc(db, "briefings", BRIEFING_CACHE_DOC()));
                if (snap.exists() && snap.data().content) {
                    setBriefing(snap.data().content);
                }
            } catch (e) {
                // No cached briefing, that's fine
            }
        };
        loadCachedBriefing();
    }, []);

    const handleGenerate = async () => {
        setLoadingBriefing(true);
        setBriefingError(null);
        try {
            const generateBriefing = httpsCallable(functions, 'generateDailyBriefing');
            const result = await generateBriefing({});
            if (result.data?.data) {
                const content = result.data.data;
                setBriefing(content);
                // Cache in Firestore
                await setDoc(doc(db, "briefings", BRIEFING_CACHE_DOC()), {
                    content,
                    generatedAt: serverTimestamp(),
                    date: BRIEFING_CACHE_DOC(),
                });
            } else {
                setBriefingError("Generation failed. Check function logs.");
            }
        } catch (e) {
            console.error("Briefing error:", e);
            setBriefingError(e.message || "Connection failed.");
        } finally {
            setLoadingBriefing(false);
        }
    };

    const handleDeleteDecision = async (id) => {
        if (!window.confirm("Delete this decision entry?")) return;
        try {
            await deleteDoc(doc(db, "decisions", id));
        } catch (e) {
            console.error("Error deleting decision:", e);
        }
    };

    const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

    const outcomeStyle = {
        approved: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        pending: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
        rejected: 'text-red-400 border-red-500/30 bg-red-500/10',
    };

    return (
        <div className="h-full flex flex-col p-7 relative overflow-hidden">
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none select-none">
                <FileText className="w-32 h-32 text-white rotate-12" />
            </div>

            {/* Two-column layout */}
            <div className="flex gap-6 h-full relative z-10">

                {/* Left: AI Briefing */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-blue-400" /> Daily Briefing
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-600 font-mono capitalize">{today}</span>
                            <button
                                onClick={handleGenerate}
                                disabled={loadingBriefing}
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/10 hover:border-white/20 disabled:opacity-40"
                                title="Regenerate briefing"
                            >
                                <RefreshCw className={`w-3 h-3 ${loadingBriefing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-white/5">
                        <AnimatePresence mode="wait">
                            {loadingBriefing && (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="flex flex-col items-center justify-center gap-3 h-32">
                                    <Zap className="w-4 h-4 text-blue-400 animate-pulse" />
                                    <span className="text-xs font-mono text-zinc-500 animate-pulse">GENERATING BRIEFING...</span>
                                </motion.div>
                            )}
                            {!loadingBriefing && briefingError && (
                                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-mono">
                                    {briefingError}
                                </motion.div>
                            )}
                            {!loadingBriefing && !briefingError && briefing && (
                                <motion.div key="briefing" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className="prose prose-invert prose-sm max-w-none font-mono
                                        prose-headings:text-zinc-300 prose-headings:text-[10px] prose-headings:uppercase prose-headings:tracking-widest prose-headings:font-bold prose-headings:mb-2 prose-headings:mt-4
                                        first:prose-headings:mt-0 prose-p:text-zinc-400 prose-p:text-xs prose-p:leading-relaxed
                                        prose-li:text-zinc-400 prose-li:text-xs prose-strong:text-zinc-200">
                                    <ReactMarkdown>{briefing}</ReactMarkdown>
                                </motion.div>
                            )}
                            {!loadingBriefing && !briefingError && !briefing && (
                                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                                    <div className="relative">
                                        <FileText className="w-10 h-10 text-zinc-700" />
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center">
                                            <Zap className="w-1.5 h-1.5 text-blue-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-zinc-400 text-xs font-mono font-bold uppercase tracking-widest">Nessun briefing oggi</p>
                                        <p className="text-zinc-600 text-[10px] font-mono mt-1">L'AI analizzerà OKR, segnali e decisioni recenti</p>
                                    </div>
                                    <button onClick={handleGenerate}
                                        className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/40 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer">
                                        <Zap className="w-3 h-3" /> Genera Briefing
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-px bg-white/[0.05] flex-shrink-0" />

                {/* Right: Decision Log */}
                <div className="w-72 flex-shrink-0 flex flex-col">
                    <div className="flex items-center justify-between mb-5">
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

                    <div className="flex-grow overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-white/5">
                        {decisions.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center gap-3 py-8 text-center"
                            >
                                <BookOpen className="w-7 h-7 text-zinc-700" />
                                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Nessuna decisione</p>
                                {isAdmin && (
                                    <button
                                        onClick={() => setShowDecisionModal(true)}
                                        className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                                    >
                                        + Prima decisione
                                    </button>
                                )}
                            </motion.div>
                        )}
                        {decisions.length > 0 ? decisions.map(decision => (
                            <motion.div
                                key={decision.id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="group p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
                            >
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${outcomeStyle[decision.outcome] || outcomeStyle.pending}`}>
                                        {decision.outcome || 'pending'}
                                    </span>
                                    {isAdmin && (
                                        <button
                                            onClick={() => handleDeleteDecision(decision.id)}
                                            className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-400 transition-all flex-shrink-0"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-zinc-300 font-mono leading-snug">{decision.title}</p>
                                {decision.context && (
                                    <p className="text-[10px] text-zinc-600 font-mono mt-1 leading-snug line-clamp-2">{decision.context}</p>
                                )}
                                {decision.createdAt && (
                                    <p className="text-[9px] text-zinc-700 font-mono mt-1.5">
                                        {decision.createdAt.toDate?.().toLocaleDateString('it-IT') || ''}
                                    </p>
                                )}
                            </motion.div>
                        )) : (
                            <div className="flex items-center justify-center h-20 text-zinc-700 text-[10px] font-mono border border-white/[0.04] border-dashed rounded-xl">
                                NO DECISIONS LOGGED
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {showDecisionModal && createPortal(
                <DecisionInput onClose={() => setShowDecisionModal(false)} />,
                document.body
            )}
        </div>
    );
};
