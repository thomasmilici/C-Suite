import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, Target, Calendar, Users, AlertTriangle, Megaphone,
    BookOpen, Layers, Plus, Trash2, CheckCheck, Radio
} from 'lucide-react';
import {
    subscribeWeeklyPlan, getOrCreateWeeklyPlan, patchWeeklyPlan, finalizeWeeklyPlan,
    currentWeekId, shiftWeekId, formatWeekId, weekIdToMonday,
    emptyKeyMoment, emptyStakeholderMove, emptyRiskSignal, emptyNarrative
} from '../services/weeklyPlanService';
import { todayId } from '../services/dailyPlanService';

// ── Helpers ───────────────────────────────────────────────────────────────────

const useDebounce = (fn, delay) => {
    const timer = useRef(null);
    return useCallback((...args) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => fn(...args), delay);
    }, [fn, delay]);
};

const MAX_OUTCOMES = 3;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TONE_OPTIONS = [
    { value: 'urgency', label: '🔴 Urgenza', desc: 'Mobilitazione rapida' },
    { value: 'reassurance', label: '🟢 Rassicurazione', desc: 'Stabilizzazione' },
    { value: 'alignment', label: '🔵 Allineamento', desc: 'Costruzione consenso' },
];
const CHANNEL_OPTIONS = ['All-hands', 'Newsletter CEO', 'Board Update', 'Leadership Team', 'Slack', 'Email diretto', 'Meeting 1:1'];

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, iconColor = 'text-indigo-400', title, badge, accent, children, collapsible = false }) {
    const [open, setOpen] = useState(true);
    return (
        <div className={`bg-white/[0.03] border rounded-2xl overflow-hidden ${accent || 'border-white/[0.07]'}`}>
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
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
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

export const WeeklyPage = ({ user }) => {
    const { weekId: paramWeekId } = useParams();
    const navigate = useNavigate();
    const uid = user?.uid;

    const weekId = paramWeekId || currentWeekId();
    const isCurrentWeek = weekId === currentWeekId();
    const displayWeek = formatWeekId(weekId);
    const mondayDateId = weekIdToMonday(weekId);

    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState(null);

    useEffect(() => {
        setLoading(true);
        getOrCreateWeeklyPlan(weekId, uid).then(() => setLoading(false));
        const unsub = subscribeWeeklyPlan(weekId, data => {
            setPlan(data);
            setLoading(false);
        });
        return () => unsub();
    }, [weekId, uid]);

    const autoSave = useCallback(async (patch) => {
        if (!uid) return;
        setSaving(true);
        try {
            await patchWeeklyPlan(weekId, patch, uid);
            setSavedAt(new Date());
        } finally { setSaving(false); }
    }, [weekId, uid]);

    const debouncedSave = useDebounce(autoSave, 800);

    // ── Updater helpers ─────────────────────────────────────────────────────

    const updateField = (field, value) => {
        setPlan(p => ({ ...p, [field]: value }));
        debouncedSave({ [field]: value });
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

    // ── Outcomes (max 3 strings) ────────────────────────────────────────────
    const updateOutcome = (idx, value) => {
        const arr = [...(plan?.outcomes || [])];
        arr[idx] = value;
        updateField('outcomes', arr);
    };
    const addOutcome = () => {
        if ((plan?.outcomes || []).length >= MAX_OUTCOMES) return;
        updateField('outcomes', [...(plan?.outcomes || []), '']);
    };
    const removeOutcome = (idx) => {
        const arr = (plan?.outcomes || []).filter((_, i) => i !== idx);
        updateField('outcomes', arr);
    };

    // ── Narrative (structural component) ────────────────────────────────────
    const updateNarrative = (key, value) => {
        const updated = { ...(plan?.narrative || emptyNarrative()), [key]: value };
        setPlan(p => ({ ...p, narrative: updated }));
        debouncedSave({ narrative: updated });
    };

    const toggleChannel = (ch) => {
        const current = plan?.narrative?.channels || [];
        const updated = current.includes(ch) ? current.filter(c => c !== ch) : [...current, ch];
        updateNarrative('channels', updated);
    };

    const handleFinalize = async () => {
        if (!window.confirm('Finalizzare la settimana? Lo stato diventerà "Finalized".')) return;
        await finalizeWeeklyPlan(weekId, plan?.debrief || '', uid);
    };

    const nav_week = (dir) => navigate(`/steering/weekly/${shiftWeekId(weekId, dir)}`);

    if (loading) return (
        <div className="min-h-screen bg-[#050508] flex items-center justify-center text-zinc-600 font-mono text-xs animate-pulse">
            LOADING WEEKLY WORKSPACE...
        </div>
    );

    const outcomes = plan?.outcomes || [];
    const narrative = plan?.narrative || emptyNarrative();

    return (
        <div className="min-h-screen bg-[#050508] text-white font-mono selection:bg-indigo-900/30 pb-20">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-40 bg-[#050508]/90 backdrop-blur-md border-b border-white/[0.06]">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
                    <Link to="/dashboard" className="flex items-center gap-1.5 text-zinc-600 hover:text-white transition-colors text-xs">
                        <ChevronLeft className="w-4 h-4" /> Dashboard
                    </Link>

                    <div className="flex items-center gap-3">
                        <button onClick={() => nav_week(-1)} className="text-zinc-600 hover:text-white transition-colors p-1">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="text-center">
                            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Weekly Overview</div>
                            <div className={`text-sm font-bold ${isCurrentWeek ? 'text-indigo-400' : 'text-zinc-300'}`}>
                                {displayWeek} {isCurrentWeek && <span className="text-[9px] text-indigo-500 ml-1">· QUESTA SETTIMANA</span>}
                            </div>
                        </div>
                        <button onClick={() => nav_week(+1)} className="text-zinc-600 hover:text-white transition-colors p-1">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

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
                        <Link to={`/steering/daily/${todayId()}`}
                            className="text-[9px] text-zinc-600 hover:text-zinc-300 border border-white/[0.07] px-2 py-1 rounded-lg transition-all">
                            Daily
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">

                {/* ── 1. Outcome Strategici (max 3) ─────────────────────── */}
                <SectionCard icon={Target} iconColor="text-emerald-400" title="Outcome Strategici" badge={`${outcomes.length}/${MAX_OUTCOMES}`}>
                    <p className="text-[10px] text-zinc-600 italic mb-3">
                        Cosa deve essere vero alla fine di questa settimana per considerarla un successo?
                    </p>
                    <div className="space-y-2">
                        <AnimatePresence>
                            {outcomes.map((text, idx) => (
                                <motion.div key={idx} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-zinc-600 w-4 flex-shrink-0">{idx + 1}.</span>
                                    <input
                                        type="text"
                                        value={text}
                                        onChange={e => updateOutcome(idx, e.target.value)}
                                        placeholder={`Outcome ${idx + 1}...`}
                                        className="flex-grow bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/40 transition-all"
                                    />
                                    <RemoveButton onClick={() => removeOutcome(idx)} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {outcomes.length < MAX_OUTCOMES && (
                            <AddButton onClick={addOutcome} label="Aggiungi outcome" />
                        )}
                    </div>
                </SectionCard>

                {/* ── 2. Momenti Chiave (Lun–Ven) ───────────────────────── */}
                <SectionCard icon={Calendar} iconColor="text-blue-400" title="Momenti Chiave di Regia" badge={plan?.key_moments?.length || 0} collapsible>
                    <div className="space-y-3">
                        <AnimatePresence>
                            {(plan?.key_moments || []).map((item) => (
                                <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                                    <select value={item.day}
                                        onChange={e => updateItem('key_moments', item.id, 'day', e.target.value)}
                                        className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2.5 text-xs text-zinc-300 focus:outline-none flex-shrink-0 w-16">
                                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <Link to={`/steering/daily/${shiftDayId(mondayDateId, DAYS.indexOf(item.day))}`}
                                        className="text-[9px] text-zinc-700 hover:text-indigo-400 transition-colors mt-3 flex-shrink-0" title="Apri Daily">
                                        ↗
                                    </Link>
                                    <div className="flex-grow grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[9px] text-zinc-600 uppercase tracking-wider block mb-1">Evento</label>
                                            <TextInput value={item.event} onChange={v => updateItem('key_moments', item.id, 'event', v)} placeholder="Nome evento / momento..." />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-zinc-600 uppercase tracking-wider block mb-1">Scopo</label>
                                            <TextInput value={item.goal} onChange={v => updateItem('key_moments', item.id, 'goal', v)} placeholder="Obiettivo strategico..." />
                                        </div>
                                    </div>
                                    <RemoveButton onClick={() => removeItem('key_moments', item.id)} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        <AddButton onClick={addItem('key_moments', emptyKeyMoment)} label="Aggiungi momento chiave" />
                    </div>
                </SectionCard>

                {/* ── 3. Mosse Stakeholder ──────────────────────────────── */}
                <SectionCard icon={Users} iconColor="text-teal-400" title="Mosse Stakeholder" badge={plan?.stakeholder_moves?.length || 0} collapsible>
                    <div className="space-y-3">
                        <AnimatePresence>
                            {(plan?.stakeholder_moves || []).map((item) => (
                                <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-3">
                                    <div className="flex items-start gap-2">
                                        <div className="flex-grow">
                                            <label className="text-[9px] text-zinc-600 uppercase tracking-wider block mb-1">Stakeholder</label>
                                            <TextInput value={item.stakeholder} onChange={v => updateItem('stakeholder_moves', item.id, 'stakeholder', v)} placeholder="Nome o ruolo..." />
                                        </div>
                                        <RemoveButton onClick={() => removeItem('stakeholder_moves', item.id)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[9px] text-zinc-600 uppercase tracking-wider block mb-1">Perché ora</label>
                                            <TextInput value={item.why_now} onChange={v => updateItem('stakeholder_moves', item.id, 'why_now', v)} placeholder="Timing critico perché..." multiline />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-zinc-600 uppercase tracking-wider block mb-1">Mossa concreta</label>
                                            <TextInput value={item.concrete_move} onChange={v => updateItem('stakeholder_moves', item.id, 'concrete_move', v)} placeholder="1:1 martedì, portare..." multiline />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        <AddButton onClick={addItem('stakeholder_moves', emptyStakeholderMove)} label="Aggiungi mossa stakeholder" />
                    </div>
                </SectionCard>

                {/* ── 4. Rischi / Segnali Deboli ────────────────────────── */}
                <SectionCard icon={Radio} iconColor="text-amber-400" title="Rischi / Segnali Deboli" badge={plan?.risks_signals?.length || 0} collapsible>
                    <div className="space-y-3">
                        <AnimatePresence>
                            {(plan?.risks_signals || []).map((item) => (
                                <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                                    <div className="flex-grow grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[9px] text-zinc-600 uppercase tracking-wider block mb-1">Segnale</label>
                                            <TextInput value={item.signal} onChange={v => updateItem('risks_signals', item.id, 'signal', v)} placeholder="Segnale debole / rischio..." />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-zinc-600 uppercase tracking-wider block mb-1">Area di impatto</label>
                                            <TextInput value={item.impact_area} onChange={v => updateItem('risks_signals', item.id, 'impact_area', v)} placeholder="es. Mercato, Organizzazione..." />
                                        </div>
                                    </div>
                                    <RemoveButton onClick={() => removeItem('risks_signals', item.id)} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        <AddButton onClick={addItem('risks_signals', emptyRiskSignal)} label="Aggiungi segnale" />
                    </div>
                </SectionCard>

                {/* ── 5. NARRATIVA & MESSAGGI CHIAVE ─────────────────────
                     Componente STRUTTURALE — card dedicata di primo livello.
                     Il playbook la tratta come leva di regia, non nota accessoria. */}
                <div className="bg-white/[0.03] border border-indigo-500/20 rounded-2xl overflow-hidden ring-1 ring-indigo-500/10">
                    <div className="px-5 py-4 border-b border-indigo-500/10 flex items-center gap-2.5">
                        <Megaphone className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-indigo-300">
                            Narrativa & Messaggi Chiave
                        </h2>
                        <span className="text-[9px] font-mono text-indigo-700 border border-indigo-900/60 px-1.5 py-0.5 rounded-full ml-auto">
                            Leva di Regia
                        </span>
                    </div>
                    <div className="px-5 pb-5 pt-4 space-y-5">

                        {/* Messaggio chiave */}
                        <div>
                            <label className="text-[10px] text-indigo-400/70 uppercase tracking-widest block mb-2 font-bold">
                                Messaggio Chiave della Settimana
                            </label>
                            <textarea
                                rows={3}
                                value={narrative.key_message}
                                onChange={e => updateNarrative('key_message', e.target.value)}
                                placeholder="Il messaggio univoco che deve passare questa settimana a tutta la C-suite..."
                                className="w-full bg-indigo-950/20 border border-indigo-500/20 rounded-xl px-4 py-3 text-sm text-zinc-200
                                    placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-950/30
                                    transition-all resize-none font-mono"
                            />
                        </div>

                        {/* Audience + Tone */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] text-indigo-400/70 uppercase tracking-widest block mb-2 font-bold">
                                    A chi è indirizzato
                                </label>
                                <input
                                    type="text"
                                    value={narrative.audience}
                                    onChange={e => updateNarrative('audience', e.target.value)}
                                    placeholder="es. Board + Leadership Team"
                                    className="w-full bg-indigo-950/20 border border-indigo-500/20 rounded-xl px-3 py-2.5 text-sm text-zinc-200
                                        placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-indigo-400/70 uppercase tracking-widest block mb-2 font-bold">
                                    Tono narrativo
                                </label>
                                <div className="space-y-1.5">
                                    {TONE_OPTIONS.map(({ value, label, desc }) => (
                                        <button key={value} onClick={() => updateNarrative('tone', value)}
                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all text-xs
                                                ${narrative.tone === value
                                                    ? 'border-indigo-500/50 bg-indigo-900/30 text-indigo-200'
                                                    : 'border-white/[0.06] text-zinc-500 hover:border-white/[0.12] hover:text-zinc-300'}`}>
                                            <span>{label}</span>
                                            <span className="text-[9px] text-zinc-600 ml-auto">{desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Canali */}
                        <div>
                            <label className="text-[10px] text-indigo-400/70 uppercase tracking-widest block mb-2 font-bold">
                                Canali di Comunicazione
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {CHANNEL_OPTIONS.map(ch => {
                                    const active = (narrative.channels || []).includes(ch);
                                    return (
                                        <button key={ch} onClick={() => toggleChannel(ch)}
                                            className={`px-3 py-1.5 rounded-full border text-[11px] font-mono transition-all
                                                ${active
                                                    ? 'border-indigo-500/60 bg-indigo-900/40 text-indigo-300'
                                                    : 'border-white/[0.08] text-zinc-600 hover:border-indigo-500/30 hover:text-zinc-300'}`}>
                                            {active && <span className="mr-1">✓</span>}{ch}
                                        </button>
                                    );
                                })}
                            </div>
                            {(narrative.channels || []).length > 0 && (
                                <p className="text-[10px] text-indigo-600 mt-2 font-mono">
                                    {narrative.channels.length} canale{narrative.channels.length > 1 ? 'i' : ''} selezionato{narrative.channels.length > 1 ? 'i' : ''}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── 6. Debrief Fine Settimana ─────────────────────────── */}
                <SectionCard icon={BookOpen} iconColor="text-purple-400" title="Debrief Fine Settimana">
                    <p className="text-[10px] text-zinc-600 italic mb-3">
                        Cosa ha funzionato? Cosa ho imparato? Spunti per la retrospettiva.
                    </p>
                    <TextInput
                        value={plan?.debrief || ''}
                        onChange={v => updateField('debrief', v)}
                        placeholder="Note di debrief settimanale..."
                        multiline
                    />
                    {plan?.status !== 'finalized' && (
                        <button onClick={handleFinalize}
                            disabled={!plan?.debrief?.trim()}
                            className="mt-4 w-full flex items-center justify-center gap-2 py-3 border border-emerald-900/50 bg-emerald-950/20
                                text-emerald-400 text-xs font-mono rounded-xl hover:bg-emerald-950/40 transition-all
                                disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-widest">
                            <CheckCheck className="w-4 h-4" />
                            Finalizza Settimana
                        </button>
                    )}
                    {plan?.status === 'finalized' && (
                        <div className="mt-3 text-center">
                            <span className="text-[10px] text-emerald-600 font-mono">✓ Settimana finalizzata</span>
                        </div>
                    )}
                </SectionCard>

            </div>
        </div>
    );
};

// Helper: shift a date ISO string by N days (used for key moments day links)
function shiftDayId(baseDateId, days) {
    if (!baseDateId) return baseDateId;
    const d = new Date(baseDateId + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}
