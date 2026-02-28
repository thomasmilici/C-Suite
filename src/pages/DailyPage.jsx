import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, Calendar, CheckCircle2, Circle, Plus, Trash2,
    Layers, Gavel, Users, AlertTriangle, ArrowRight, BookOpen, Sparkles,
    Lock, Unlock, Moon, Sun, Save, CheckCheck, X
} from 'lucide-react';
import {
    subscribeDailyPlan, getOrCreateDailyPlan, patchDailyPlan, finalizeDailyPlan,
    todayId, shiftDateId, formatDateId,
    emptyFocusItem, emptyDecisionItem, emptyStakeholderAction, emptyRiskIssue, emptyFollowup
} from '../services/dailyPlanService';
import { currentWeekId, dateToWeekId } from '../services/weeklyPlanService';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

// ── Helpers ───────────────────────────────────────────────────────────────────

const useDebounce = (fn, delay) => {
    const timer = useRef(null);
    return useCallback((...args) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => fn(...args), delay);
    }, [fn, delay]);
};

const MAX_FOCUS = 3;
const IMPACT_OPTIONS = ['High', 'Medium', 'Low'];

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, iconColor = 'text-indigo-400', title, badge, children, collapsible = false, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div
                className={`flex items-center justify-between px-5 py-4 ${collapsible ? 'cursor-pointer hover:bg-white/[0.02] transition-colors' : ''}`}
                onClick={collapsible ? () => setOpen(o => !o) : undefined}
            >
                <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
                    <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-300">{title}</h2>
                    {badge !== undefined && (
                        <span className="text-[9px] font-mono text-zinc-600 border border-white/[0.07] px-1.5 py-0.5 rounded-full">{badge}</span>
                    )}
                </div>
                {collapsible && (
                    <ChevronLeft className={`w-3.5 h-3.5 text-zinc-600 transition-transform ${open ? '-rotate-90' : ''}`} />
                )}
            </div>
            <AnimatePresence initial={false}>
                {(!collapsible || open) && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function TextInput({ value, onChange, placeholder, multiline = false, className = '' }) {
    const cls = `w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 
        placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.05] 
        transition-all resize-none font-mono ${className}`;
    if (multiline) return <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />;
    return <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />;
}

function AddButton({ onClick, label }) {
    return (
        <button onClick={onClick}
            className="w-full mt-3 flex items-center justify-center gap-2 py-2 border border-dashed border-white/[0.1] 
                rounded-xl text-[11px] font-mono text-zinc-600 hover:text-zinc-300 hover:border-white/[0.2] 
                hover:bg-white/[0.02] transition-all">
            <Plus className="w-3.5 h-3.5" /> {label}
        </button>
    );
}

function RemoveButton({ onClick }) {
    return (
        <button onClick={onClick} className="flex-shrink-0 text-zinc-700 hover:text-red-400 transition-colors ml-2 mt-0.5">
            <Trash2 className="w-3.5 h-3.5" />
        </button>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export const DailyPage = ({ user }) => {
    const { date } = useParams();
    const navigate = useNavigate();
    const uid = user?.uid;

    // Normalize date param: if missing or invalid, go to today
    const dateId = (() => {
        if (!date) return todayId();
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
        return todayId();
    })();

    const isToday = dateId === todayId();
    const displayDate = formatDateId(dateId);
    const weekId = dateToWeekId(dateId);

    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState(null);
    const [activeEvents, setActiveEvents] = useState([]);

    // Load plan and subscribe to real-time updates
    useEffect(() => {
        setLoading(true);
        getOrCreateDailyPlan(dateId, uid).then(() => setLoading(false));
        const unsub = subscribeDailyPlan(dateId, (data) => {
            setPlan(data);
            setLoading(false);
        });
        return () => unsub();
    }, [dateId, uid]);

    // Load active dossier list for selector
    useEffect(() => {
        const q = query(collection(db, 'events'), where('status', '!=', 'archived'), orderBy('status'), orderBy('updatedAt', 'desc'));
        return onSnapshot(q, snap => setActiveEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, []);

    // Auto-save helper
    const autoSave = useCallback(async (patch) => {
        if (!uid) return;
        setSaving(true);
        try {
            await patchDailyPlan(dateId, patch, uid);
            setSavedAt(new Date());
        } finally {
            setSaving(false);
        }
    }, [dateId, uid]);

    const debouncedSave = useDebounce(autoSave, 800);

    // ── Section updaters ────────────────────────────────────────────────────

    const updateFocus = (newFocus) => {
        setPlan(p => ({ ...p, focus: newFocus }));
        debouncedSave({ focus: newFocus });
    };

    const toggleFocus = (id) => {
        const updated = (plan?.focus || []).map(f => f.id === id ? { ...f, completed: !f.completed } : f);
        updateFocus(updated);
    };

    const addFocus = () => {
        if ((plan?.focus || []).length >= MAX_FOCUS) return;
        updateFocus([...(plan?.focus || []), emptyFocusItem()]);
    };

    const updateFocusText = (id, text) => {
        const updated = (plan?.focus || []).map(f => f.id === id ? { ...f, text } : f);
        updateFocus(updated);
    };

    const removeFocus = (id) => {
        updateFocus((plan?.focus || []).filter(f => f.id !== id));
    };

    const updateArrayField = (field, newArr) => {
        setPlan(p => ({ ...p, [field]: newArr }));
        debouncedSave({ [field]: newArr });
    };

    const addItem = (field, emptyFn) => () => updateArrayField(field, [...(plan?.[field] || []), emptyFn()]);
    const removeItem = (field, id) => updateArrayField(field, (plan?.[field] || []).filter(i => i.id !== id));
    const updateItem = (field, id, key, value) => {
        const updated = (plan?.[field] || []).map(i => i.id === id ? { ...i, [key]: value } : i);
        updateArrayField(field, updated);
    };

    const toggleDossier = (eventId) => {
        const current = plan?.dossier_ids || [];
        const updated = current.includes(eventId) ? current.filter(id => id !== eventId) : [...current, eventId];
        setPlan(p => ({ ...p, dossier_ids: updated }));
        debouncedSave({ dossier_ids: updated });
    };

    const updateReflection = (text) => {
        setPlan(p => ({ ...p, reflection: text }));
        debouncedSave({ reflection: text });
    };

    const handleFinalize = async () => {
        if (!window.confirm('Finalizzare la giornata? Lo stato diventerà "Finalized".')) return;
        await finalizeDailyPlan(dateId, plan?.reflection || '', uid);
    };

    const navigate_date = (dir) => navigate(`/steering/daily/${shiftDateId(dateId, dir)}`);

    if (loading) return (
        <div className="min-h-screen bg-[#050508] flex items-center justify-center text-zinc-600 font-mono text-xs animate-pulse">
            LOADING DAILY WORKSPACE...
        </div>
    );

    const focusItems = plan?.focus || [];
    const isLocked = focusItems.length >= MAX_FOCUS && !focusItems.some(f => f.completed);
    const completedFocus = focusItems.filter(f => f.completed).length;

    return (
        <div className="min-h-screen bg-[#050508] text-white font-mono selection:bg-indigo-900/30 pb-20">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-40 bg-[#050508]/90 backdrop-blur-md border-b border-white/[0.06]">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
                    {/* Back to dashboard */}
                    <Link to="/dashboard" className="flex items-center gap-1.5 text-zinc-600 hover:text-white transition-colors text-xs">
                        <ChevronLeft className="w-4 h-4" /> Dashboard
                    </Link>

                    {/* Date navigation */}
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate_date(-1)}
                            className="text-zinc-600 hover:text-white transition-colors p-1">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="text-center">
                            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Daily Steering</div>
                            <div className={`text-sm font-bold capitalize ${isToday ? 'text-indigo-400' : 'text-zinc-300'}`}>
                                {displayDate} {isToday && <span className="text-[9px] text-indigo-500 ml-1">· OGGI</span>}
                            </div>
                        </div>
                        <button onClick={() => navigate_date(+1)}
                            className="text-zinc-600 hover:text-white transition-colors p-1">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Status + actions */}
                    <div className="flex items-center gap-2">
                        {saving ? (
                            <span className="text-[9px] text-zinc-600 animate-pulse">saving...</span>
                        ) : savedAt ? (
                            <span className="text-[9px] text-zinc-700 flex items-center gap-1">
                                <CheckCheck className="w-3 h-3 text-emerald-700" /> saved
                            </span>
                        ) : null}
                        <span className={`text-[9px] px-2 py-1 rounded-full border font-bold uppercase tracking-widest
                            ${plan?.status === 'finalized' ? 'border-emerald-800 bg-emerald-900/20 text-emerald-500' :
                                plan?.status === 'closed' ? 'border-zinc-700 bg-zinc-900 text-zinc-500' :
                                    'border-indigo-900 bg-indigo-900/20 text-indigo-400'}`}>
                            {plan?.status || 'open'}
                        </span>
                        {/* Link to weekly planning */}
                        <Link to={`/steering/weekly/${weekId}`}
                            className="text-[9px] text-zinc-600 hover:text-zinc-300 border border-white/[0.07] px-2 py-1 rounded-lg transition-all">
                            W-View
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">

                {/* ── 1. Focus di Regia (max 3) ─────────────────────────── */}
                <SectionCard icon={Lock} iconColor="text-amber-400" title="Focus di Regia" badge={`${completedFocus}/${MAX_FOCUS}`}>
                    <div className="space-y-2">
                        <AnimatePresence>
                            {focusItems.map((item) => (
                                <motion.div key={item.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all
                                        ${item.completed ? 'border-emerald-900/40 bg-emerald-950/20' : 'border-white/[0.07] bg-white/[0.02]'}`}>
                                    <button onClick={() => toggleFocus(item.id)} className="flex-shrink-0">
                                        {item.completed
                                            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            : <Circle className="w-5 h-5 text-zinc-600 hover:text-zinc-400 transition-colors" />}
                                    </button>
                                    <input
                                        type="text"
                                        value={item.text}
                                        onChange={e => updateFocusText(item.id, e.target.value)}
                                        placeholder="Focus strategico..."
                                        className={`flex-grow bg-transparent text-sm focus:outline-none placeholder:text-zinc-700
                                            ${item.completed ? 'line-through text-zinc-600' : 'text-zinc-200'}`}
                                    />
                                    <RemoveButton onClick={() => removeFocus(item.id)} />
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {focusItems.length < MAX_FOCUS && (
                            <button onClick={addFocus}
                                className={`w-full flex items-center justify-center gap-2 py-2.5 border border-dashed rounded-xl 
                                    text-[11px] font-mono transition-all
                                    ${isLocked ? 'border-amber-900/40 text-amber-900/60 cursor-not-allowed' :
                                        'border-white/[0.1] text-zinc-600 hover:text-zinc-300 hover:border-white/[0.2] hover:bg-white/[0.02]'}`}
                                disabled={isLocked}>
                                <Plus className="w-3.5 h-3.5" />
                                {focusItems.length === 0 ? 'Aggiungi primo focus' : 'Aggiungi focus'}
                            </button>
                        )}
                        {isLocked && (
                            <p className="text-[10px] text-amber-700/70 text-center font-mono">
                                🔒 SYSTEM LOCKED — completa almeno un focus per sbloccare
                            </p>
                        )}
                    </div>
                </SectionCard>

                {/* ── 2. Dossier caldi ──────────────────────────────────── */}
                <SectionCard icon={Layers} iconColor="text-blue-400" title="Dossier per la C-Suite" badge={plan?.dossier_ids?.length || 0} collapsible defaultOpen={false}>
                    {activeEvents.length === 0 ? (
                        <p className="text-xs text-zinc-700 py-2">Nessun dossier attivo. <Link to="/dashboard" className="underline text-zinc-500">Creane uno</Link>.</p>
                    ) : (
                        <div className="space-y-2">
                            {activeEvents.map(ev => {
                                const hot = (plan?.dossier_ids || []).includes(ev.id);
                                return (
                                    <button key={ev.id} onClick={() => toggleDossier(ev.id)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                                            ${hot ? 'border-blue-800/50 bg-blue-950/20 text-blue-300' : 'border-white/[0.06] bg-transparent text-zinc-500 hover:border-white/[0.12] hover:text-zinc-300'}`}>
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${hot ? 'bg-blue-400' : 'bg-zinc-700'}`} />
                                        <span className="text-sm truncate">{ev.title}</span>
                                        <span className={`ml-auto text-[10px] uppercase tracking-wider flex-shrink-0 ${ev.status === 'active' ? 'text-emerald-600' : 'text-zinc-700'}`}>{ev.status}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </SectionCard>

                {/* ── 3. Decisioni da orchestrare ───────────────────────── */}
                <SectionCard icon={Gavel} iconColor="text-purple-400" title="Decisioni da Orchestrare" badge={plan?.decisions_to_orchestrate?.length || 0} collapsible defaultOpen={false}>
                    <div className="space-y-4">
                        <AnimatePresence>
                            {(plan?.decisions_to_orchestrate || []).map((item) => (
                                <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <TextInput value={item.decision} onChange={v => updateItem('decisions_to_orchestrate', item.id, 'decision', v)}
                                            placeholder="Decisione da orchestrare..." />
                                        <RemoveButton onClick={() => removeItem('decisions_to_orchestrate', item.id)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[9px] text-zinc-600 uppercase tracking-wider block mb-1">Sponsor / Owner</label>
                                            <TextInput value={item.owner} onChange={v => updateItem('decisions_to_orchestrate', item.id, 'owner', v)} placeholder="es. CFO, CEO..." />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-zinc-600 uppercase tracking-wider block mb-1">Deadline</label>
                                            <input type="date" value={item.deadline}
                                                onChange={e => updateItem('decisions_to_orchestrate', item.id, 'deadline', e.target.value)}
                                                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/40 transition-all" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-zinc-600 uppercase tracking-wider block mb-1">Passaggi politici / Alleanze</label>
                                        <TextInput value={item.political_steps} onChange={v => updateItem('decisions_to_orchestrate', item.id, 'political_steps', v)}
                                            placeholder="Alignment da costruire, chi coinvolgere prima..." multiline />
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        <AddButton onClick={addItem('decisions_to_orchestrate', emptyDecisionItem)} label="Aggiungi decisione" />
                    </div>
                </SectionCard>

                {/* ── 4. Stakeholder & Alliance Building ────────────────── */}
                <SectionCard icon={Users} iconColor="text-teal-400" title="Stakeholder & Alliance Building" badge={plan?.stakeholder_actions?.length || 0} collapsible defaultOpen={false}>
                    <div className="space-y-3">
                        <AnimatePresence>
                            {(plan?.stakeholder_actions || []).map((item) => (
                                <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="grid grid-cols-3 gap-2 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                                    <div>
                                        <label className="text-[9px] text-zinc-600 uppercase tracking-wider block mb-1">Nome</label>
                                        <TextInput value={item.name} onChange={v => updateItem('stakeholder_actions', item.id, 'name', v)} placeholder="es. Marco Rossi" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-zinc-600 uppercase tracking-wider block mb-1">Ruolo</label>
                                        <TextInput value={item.role} onChange={v => updateItem('stakeholder_actions', item.id, 'role', v)} placeholder="es. CTO" />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-grow">
                                            <label className="text-[9px] text-zinc-600 uppercase tracking-wider block mb-1">Obiettivo</label>
                                            <TextInput value={item.goal} onChange={v => updateItem('stakeholder_actions', item.id, 'goal', v)} placeholder="Buy-in su..." />
                                        </div>
                                        <RemoveButton onClick={() => removeItem('stakeholder_actions', item.id)} />
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        <AddButton onClick={addItem('stakeholder_actions', emptyStakeholderAction)} label="Aggiungi stakeholder" />
                    </div>
                </SectionCard>

                {/* ── 5. Rischi / Tensioni / Issue ──────────────────────── */}
                <SectionCard icon={AlertTriangle} iconColor="text-red-400" title="Rischi / Tensioni / Issue" badge={plan?.risks_issues?.length || 0} collapsible defaultOpen={false}>
                    <div className="space-y-3">
                        <AnimatePresence>
                            {(plan?.risks_issues || []).map((item) => (
                                <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className={`p-3 bg-white/[0.02] border rounded-xl space-y-2
                                        ${item.impact === 'High' ? 'border-red-900/40' : item.impact === 'Medium' ? 'border-amber-900/30' : 'border-white/[0.06]'}`}>
                                    <div className="flex items-start gap-2">
                                        <div className="flex-grow">
                                            <TextInput value={item.issue} onChange={v => updateItem('risks_issues', item.id, 'issue', v)} placeholder="Descrizione del rischio / tensione..." />
                                        </div>
                                        <select value={item.impact}
                                            onChange={e => updateItem('risks_issues', item.id, 'impact', e.target.value)}
                                            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2.5 text-xs text-zinc-300 focus:outline-none flex-shrink-0">
                                            {IMPACT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                        <RemoveButton onClick={() => removeItem('risks_issues', item.id)} />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-zinc-600 uppercase tracking-wider block mb-1">Chi coinvolgere</label>
                                        <TextInput value={item.involve} onChange={v => updateItem('risks_issues', item.id, 'involve', v)} placeholder="es. COO + Legal..." />
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        <AddButton onClick={addItem('risks_issues', emptyRiskIssue)} label="Aggiungi rischio / issue" />
                    </div>
                </SectionCard>

                {/* ── 6. Follow-up & Deleghe ────────────────────────────── */}
                <SectionCard icon={ArrowRight} iconColor="text-orange-400" title="Follow-up & Deleghe" badge={plan?.followups?.length || 0} collapsible defaultOpen={false}>
                    <div className="space-y-3">
                        <AnimatePresence>
                            {(plan?.followups || []).map((item) => (
                                <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="grid grid-cols-3 gap-2 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                                    <div>
                                        <label className="text-[9px] text-zinc-600 uppercase tracking-wider block mb-1">Azione</label>
                                        <TextInput value={item.action} onChange={v => updateItem('followups', item.id, 'action', v)} placeholder="Cosa fare..." />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-zinc-600 uppercase tracking-wider block mb-1">A chi</label>
                                        <TextInput value={item.to} onChange={v => updateItem('followups', item.id, 'to', v)} placeholder="Delegato a..." />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-grow">
                                            <label className="text-[9px] text-zinc-600 uppercase tracking-wider block mb-1">Entro</label>
                                            <input type="date" value={item.by}
                                                onChange={e => updateItem('followups', item.id, 'by', e.target.value)}
                                                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/40 transition-all" />
                                        </div>
                                        <RemoveButton onClick={() => removeItem('followups', item.id)} />
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        <AddButton onClick={addItem('followups', emptyFollowup)} label="Aggiungi follow-up / delega" />
                    </div>
                </SectionCard>

                {/* ── 7. Riflessione fine giornata ──────────────────────── */}
                <SectionCard icon={Moon} iconColor="text-indigo-400" title='Riflessione Fine Giornata'>
                    <p className="text-[10px] text-zinc-600 mb-3 italic">
                        "Cosa ho reso più semplice per la C-suite oggi?"
                    </p>
                    <TextInput
                        value={plan?.reflection || ''}
                        onChange={updateReflection}
                        placeholder="Scrivi la tua riflessione serale..."
                        multiline
                    />
                    {plan?.status !== 'finalized' && (
                        <button onClick={handleFinalize}
                            disabled={!plan?.reflection?.trim()}
                            className="mt-4 w-full flex items-center justify-center gap-2 py-3 border border-emerald-900/50 bg-emerald-950/20 
                                text-emerald-400 text-xs font-mono rounded-xl hover:bg-emerald-950/40 transition-all 
                                disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-widest">
                            <CheckCheck className="w-4 h-4" />
                            Finalizza Giornata
                        </button>
                    )}
                    {plan?.status === 'finalized' && (
                        <div className="mt-3 text-center">
                            <span className="text-[10px] text-emerald-600 font-mono">✓ Giornata finalizzata</span>
                        </div>
                    )}
                </SectionCard>

            </div>
        </div>
    );
};
