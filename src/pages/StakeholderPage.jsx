import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, Plus, Pencil, Trash2, Users, CalendarDays,
    X, Save, CheckCheck, Layers, Mail
} from 'lucide-react';
import {
    subscribeStakeholders, subscribeMeetings,
    createStakeholder, updateStakeholder, deleteStakeholder,
    createMeeting, updateMeeting, deleteMeeting,
    INFLUENCE_OPTIONS, ALIGNMENT_OPTIONS, ALIGNMENT_STYLE, MEETING_STATUS,
    emptyStakeholder, emptyMeeting
} from '../services/meetingService';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';

// ── Stakeholder Form ──────────────────────────────────────────────────────────
function StakeholderModal({ item, onSave, onClose }) {
    const [form, setForm] = useState(item || emptyStakeholder(null));
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try { await onSave(form); onClose(); } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="bg-[#0d0d14] border border-white/[0.08] rounded-2xl w-full max-w-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-mono font-bold text-white">{item?.id ? 'Modifica Stakeholder' : 'Nuovo Stakeholder'}</h3>
                    <button onClick={onClose} className="text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {[['name', 'Nome *', ''], ['role', 'Ruolo', 'es. CFO'], ['organization', 'Organizzazione', ''], ['email', 'Email', '']].map(([k, label, ph]) => (
                        <div key={k} className={k === 'name' ? 'col-span-2' : ''}>
                            <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">{label}</label>
                            <input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
                                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 transition-all font-mono" />
                        </div>
                    ))}
                    <div>
                        <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">Influenza</label>
                        <select value={form.influence} onChange={e => set('influence', e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none font-mono">
                            {INFLUENCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">Allineamento</label>
                        <select value={form.alignment} onChange={e => set('alignment', e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none font-mono">
                            {ALIGNMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">Note relazione</label>
                        <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Contesto, leve, storia relazione..."
                            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 transition-all resize-none font-mono" />
                    </div>
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 py-2.5 border border-white/[0.07] rounded-xl text-xs font-mono text-zinc-500 hover:text-white transition-all">Annulla</button>
                    <button onClick={handleSave} disabled={!form.name.trim() || saving}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40">
                        <Save className="w-3.5 h-3.5" />{saving ? 'Salvo...' : 'Salva'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ── Meeting Form ───────────────────────────────────────────────────────────────
function MeetingModal({ item, stakeholders, events, onSave, onClose }) {
    const [form, setForm] = useState(item || emptyMeeting(null));
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const toggleParticipant = (id) => {
        const cur = form.participants || [];
        set('participants', cur.includes(id) ? cur.filter(p => p !== id) : [...cur, id]);
    };

    const handleSave = async () => {
        if (!form.title.trim()) return;
        setSaving(true);
        try { await onSave(form); onClose(); } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="bg-[#0d0d14] border border-white/[0.08] rounded-2xl w-full max-w-xl p-6 space-y-4 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-mono font-bold text-white">{item?.id ? 'Modifica Meeting' : 'Nuovo Meeting'}</h3>
                    <button onClick={onClose} className="text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div>
                    <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">Titolo *</label>
                    <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="es. Board Review Q1"
                        className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 transition-all font-mono" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                        <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">Data</label>
                        <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/40 transition-all" />
                    </div>
                    <div>
                        <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">Ora</label>
                        <input type="time" value={form.time} onChange={e => set('time', e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/40 transition-all" />
                    </div>
                </div>
                <div>
                    <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">Obiettivo strategico</label>
                    <input value={form.objective} onChange={e => set('objective', e.target.value)} placeholder="Scopo di questo meeting..."
                        className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 transition-all font-mono" />
                </div>
                {stakeholders.length > 0 && (
                    <div>
                        <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-2">Partecipanti</label>
                        <div className="flex flex-wrap gap-1.5">
                            {stakeholders.map(s => {
                                const sel = (form.participants || []).includes(s.id);
                                return (
                                    <button key={s.id} onClick={() => toggleParticipant(s.id)}
                                        className={`px-2.5 py-1.5 rounded-full border text-[11px] font-mono transition-all
                                            ${sel ? 'border-indigo-600/60 bg-indigo-900/30 text-indigo-300' : 'border-white/[0.08] text-zinc-600 hover:text-zinc-300'}`}>
                                        {sel && '✓ '}{s.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
                {[['agenda', 'Agenda', 'Punti all\'ordine del giorno...'], ['notes', 'Note meeting', ''], ['outcome', 'Outcome / Decisione', '']].map(([k, label, ph]) => (
                    <div key={k}>
                        <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">{label}</label>
                        <textarea rows={2} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
                            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 transition-all resize-none font-mono" />
                    </div>
                ))}
                <div>
                    <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">Stato</label>
                    <select value={form.status} onChange={e => set('status', e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none font-mono">
                        {MEETING_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 py-2.5 border border-white/[0.07] rounded-xl text-xs font-mono text-zinc-500 hover:text-white transition-all">Annulla</button>
                    <button onClick={handleSave} disabled={!form.title.trim() || saving}
                        className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-600 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40">
                        <Save className="w-3.5 h-3.5" />{saving ? 'Salvo...' : 'Salva'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export const StakeholderPage = ({ user }) => {
    const uid = user?.uid;
    const [tab, setTab] = useState('stakeholders'); // 'stakeholders' | 'meetings'
    const [stakeholders, setStakeholders] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const [events, setEvents] = useState([]);
    const [modal, setModal] = useState(null); // { type: 'stakeholder'|'meeting', item }

    useEffect(() => {
        const u1 = subscribeStakeholders(setStakeholders);
        const u2 = subscribeMeetings(setMeetings);
        const q = query(collection(db, 'events'));
        const u3 = onSnapshot(q, snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => { u1(); u2(); u3(); };
    }, []);

    const handleSaveStakeholder = async (form) => {
        if (form.id) await updateStakeholder(form.id, form, uid);
        else await createStakeholder(form, uid);
    };
    const handleSaveMeeting = async (form) => {
        if (form.id) await updateMeeting(form.id, form, uid);
        else await createMeeting(form, uid);
    };

    const upcomingMeetings = meetings.filter(m => m.status === 'scheduled').sort((a, b) => a.date > b.date ? 1 : -1);
    const pastMeetings = meetings.filter(m => m.status !== 'scheduled').sort((a, b) => a.date < b.date ? 1 : -1);

    return (
        <div className="min-h-screen bg-[#050508] text-white font-mono pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#050508]/90 backdrop-blur-md border-b border-white/[0.06]">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <Link to="/dashboard" className="flex items-center gap-1.5 text-zinc-600 hover:text-white transition-colors text-xs">
                        <ChevronLeft className="w-4 h-4" /> Dashboard
                    </Link>
                    <div className="flex gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1">
                        {[['stakeholders', 'Stakeholder'], ['meetings', 'Meeting']].map(([t, label]) => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all
                                    ${tab === t ? 'bg-white/[0.08] text-white' : 'text-zinc-600 hover:text-zinc-300'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setModal({ type: tab === 'stakeholders' ? 'stakeholder' : 'meeting', item: null })}
                        className="flex items-center gap-1.5 px-3 py-2 bg-teal-700 hover:bg-teal-600 text-white text-xs font-mono rounded-xl transition-all">
                        <Plus className="w-3.5 h-3.5" />
                        {tab === 'stakeholders' ? 'Nuovo' : 'Nuovo Meeting'}
                    </button>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                {/* ── Stakeholders tab ─────────────────────────────────── */}
                {tab === 'stakeholders' && (
                    <div className="space-y-3">
                        {stakeholders.length === 0 ? (
                            <div className="text-center py-24 text-zinc-700">
                                <Users className="w-10 h-10 mx-auto mb-4 opacity-20" />
                                <p className="text-sm">Nessuno stakeholder registrato.</p>
                            </div>
                        ) : stakeholders.map(s => (
                            <motion.div key={s.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 hover:border-white/[0.12] transition-all">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-sm font-bold text-zinc-300 flex-shrink-0">
                                        {s.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-sm text-white">{s.name}</span>
                                            {s.role && <span className="text-xs text-zinc-500">{s.role}</span>}
                                            {s.organization && <span className="text-[10px] text-zinc-600 border border-white/[0.07] px-1.5 py-0.5 rounded-full">{s.organization}</span>}
                                            <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${ALIGNMENT_STYLE[s.alignment] || ALIGNMENT_STYLE.Unknown}`}>
                                                {s.alignment}
                                            </span>
                                            <span className="text-[9px] text-zinc-600">Influence: {s.influence}</span>
                                        </div>
                                        {s.notes && <p className="text-xs text-zinc-600 mt-1 truncate">{s.notes}</p>}
                                        {s.email && (
                                            <a href={`mailto:${s.email}`} className="text-[10px] text-indigo-500 hover:underline flex items-center gap-1 mt-1">
                                                <Mail className="w-3 h-3" />{s.email}
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex gap-1.5 flex-shrink-0">
                                        <button onClick={() => setModal({ type: 'stakeholder', item: s })}
                                            className="p-2 text-zinc-600 hover:text-indigo-400 border border-white/[0.07] rounded-lg transition-all">
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={async () => { if (window.confirm('Eliminare?')) await deleteStakeholder(s.id); }}
                                            className="p-2 text-zinc-600 hover:text-red-400 border border-white/[0.07] rounded-lg transition-all">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* ── Meetings tab ──────────────────────────────────────── */}
                {tab === 'meetings' && (
                    <div className="space-y-5">
                        {upcomingMeetings.length > 0 && (
                            <div>
                                <h3 className="text-[10px] text-zinc-600 uppercase tracking-widest mb-3">Prossimi</h3>
                                <div className="space-y-3">
                                    {upcomingMeetings.map(m => <MeetingCard key={m.id} m={m} stakeholders={stakeholders} onEdit={() => setModal({ type: 'meeting', item: m })} />)}
                                </div>
                            </div>
                        )}
                        {pastMeetings.length > 0 && (
                            <div>
                                <h3 className="text-[10px] text-zinc-600 uppercase tracking-widest mb-3">Passati</h3>
                                <div className="space-y-3">
                                    {pastMeetings.map(m => <MeetingCard key={m.id} m={m} stakeholders={stakeholders} onEdit={() => setModal({ type: 'meeting', item: m })} />)}
                                </div>
                            </div>
                        )}
                        {meetings.length === 0 && (
                            <div className="text-center py-24 text-zinc-700">
                                <CalendarDays className="w-10 h-10 mx-auto mb-4 opacity-20" />
                                <p className="text-sm">Nessun meeting registrato.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {modal?.type === 'stakeholder' && (
                    <StakeholderModal item={modal.item} onSave={handleSaveStakeholder} onClose={() => setModal(null)} />
                )}
                {modal?.type === 'meeting' && (
                    <MeetingModal item={modal.item} stakeholders={stakeholders} events={events}
                        onSave={handleSaveMeeting} onClose={() => setModal(null)} />
                )}
            </AnimatePresence>
        </div>
    );
};

const MEETING_STATUS_STYLE = {
    scheduled: 'border-indigo-800/50 text-indigo-400',
    completed: 'border-emerald-800/50 text-emerald-400',
    cancelled: 'border-zinc-700 text-zinc-500',
};

function MeetingCard({ m, stakeholders, onEdit }) {
    const partNames = (m.participants || []).map(id => stakeholders.find(s => s.id === id)?.name || id).join(', ');
    return (
        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 hover:border-white/[0.12] transition-all">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white">{m.title}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${MEETING_STATUS_STYLE[m.status]}`}>{m.status}</span>
                    </div>
                    {(m.date || m.time) && (
                        <p className="text-xs text-zinc-500 mt-0.5">{m.date} {m.time && `· ${m.time}`}</p>
                    )}
                    {m.objective && <p className="text-xs text-zinc-600 mt-1 italic truncate">"{m.objective}"</p>}
                    {partNames && <p className="text-[10px] text-zinc-700 mt-1">Partecipanti: {partNames}</p>}
                    {m.outcome && <p className="text-[11px] text-emerald-600 mt-2 border border-emerald-900/40 bg-emerald-950/10 rounded-lg px-2 py-1">✓ {m.outcome}</p>}
                </div>
                <button onClick={onEdit} className="p-2 text-zinc-600 hover:text-indigo-400 border border-white/[0.07] rounded-lg transition-all flex-shrink-0">
                    <Pencil className="w-3.5 h-3.5" />
                </button>
            </div>
        </motion.div>
    );
}
