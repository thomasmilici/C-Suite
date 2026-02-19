import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, Plus, Pencil, Trash2, Link2, Unlink,
    Target, Layers, Save, X, CheckCheck, Star
} from 'lucide-react';
import {
    subscribeStrategicThemes, createStrategicTheme, updateStrategicTheme,
    deleteStrategicTheme, linkEventToTheme, unlinkEventFromTheme,
    THEME_COLORS, THEME_STATUS_OPTIONS, emptyTheme
} from '../services/strategicThemeService';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { getAuth } from 'firebase/auth';

// ── Status badge ───────────────────────────────────────────────────────────────
const STATUS_STYLE = {
    active: 'border-emerald-800/60 bg-emerald-950/20 text-emerald-400',
    paused: 'border-amber-800/60 bg-amber-950/20 text-amber-400',
    completed: 'border-blue-800/60 bg-blue-950/20 text-blue-400',
    archived: 'border-zinc-700 bg-zinc-900 text-zinc-500',
};

// ── Theme Form Modal ───────────────────────────────────────────────────────────
function ThemeModal({ theme, onSave, onClose }) {
    const [form, setForm] = useState(theme || emptyTheme(null));
    const [saving, setSaving] = useState(false);

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const handleSave = async () => {
        if (!form.title.trim()) return;
        setSaving(true);
        try { await onSave(form); onClose(); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="bg-[#0d0d14] border border-white/[0.08] rounded-2xl w-full max-w-lg p-6 space-y-4"
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-mono font-bold text-white">
                        {theme?.id ? 'Modifica Tema' : 'Nuovo Tema Strategico'}
                    </h3>
                    <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                </div>

                {/* Title */}
                <div>
                    <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">Nome tema *</label>
                    <input value={form.title} onChange={e => set('title', e.target.value)}
                        placeholder="es. Trasformazione digitale..."
                        className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 transition-all font-mono" />
                </div>

                {/* Description */}
                <div>
                    <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">Descrizione</label>
                    <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}
                        placeholder="Obiettivo strategico e contesto..."
                        className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 transition-all resize-none font-mono" />
                </div>

                {/* Horizon + Status + Owner */}
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">Orizzonte</label>
                        <input value={form.horizon} onChange={e => set('horizon', e.target.value)}
                            placeholder="2025"
                            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/40 transition-all font-mono" />
                    </div>
                    <div>
                        <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">Stato</label>
                        <select value={form.status} onChange={e => set('status', e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none transition-all font-mono">
                            {THEME_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">Sponsor</label>
                        <input value={form.owner} onChange={e => set('owner', e.target.value)}
                            placeholder="es. CEO"
                            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 transition-all font-mono" />
                    </div>
                </div>

                {/* Color picker */}
                <div>
                    <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-2">Colore badge</label>
                    <div className="flex gap-2 flex-wrap">
                        {THEME_COLORS.map(c => (
                            <button key={c} onClick={() => set('color', c)}
                                className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 py-2.5 border border-white/[0.07] rounded-xl text-xs font-mono text-zinc-500 hover:text-white transition-all">Annulla</button>
                    <button onClick={handleSave} disabled={!form.title.trim() || saving}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40">
                        {saving ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                            : <Save className="w-3.5 h-3.5" />}
                        {saving ? 'Salvo...' : 'Salva'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ── Link Events Panel ──────────────────────────────────────────────────────────
function LinkEventsPanel({ theme, events, uid, onClose }) {
    const linked = theme.event_ids || [];

    const toggle = async (eventId) => {
        if (linked.includes(eventId)) {
            await unlinkEventFromTheme(theme.id, eventId, uid);
        } else {
            await linkEventToTheme(theme.id, eventId, uid);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="bg-[#0d0d14] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-mono font-bold text-white">Collega Dossier</h3>
                        <p className="text-[10px] text-zinc-600 mt-0.5">Tema: <span style={{ color: theme.color }}>{theme.title}</span></p>
                    </div>
                    <button onClick={onClose} className="text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {events.length === 0 ? (
                        <p className="text-xs text-zinc-600 py-4 text-center">Nessun dossier attivo.</p>
                    ) : events.map(ev => {
                        const isLinked = linked.includes(ev.id);
                        return (
                            <button key={ev.id} onClick={() => toggle(ev.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                                    ${isLinked ? 'border-emerald-800/50 bg-emerald-950/20' : 'border-white/[0.06] hover:border-white/[0.12]'}`}>
                                {isLinked ? <Link2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> : <Unlink className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />}
                                <span className={`text-sm truncate ${isLinked ? 'text-emerald-300' : 'text-zinc-400'}`}>{ev.title}</span>
                                <span className="ml-auto text-[9px] text-zinc-700 uppercase flex-shrink-0">{ev.status}</span>
                            </button>
                        );
                    })}
                </div>
                <button onClick={onClose} className="w-full py-2.5 border border-white/[0.07] rounded-xl text-xs font-mono text-zinc-500 hover:text-white transition-all">Fatto</button>
            </motion.div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export const StrategicThemesPage = ({ user }) => {
    const uid = user?.uid;
    const [themes, setThemes] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalTheme, setModalTheme] = useState(null); // null = closed, {} = new, theme = edit
    const [linkPanel, setLinkPanel] = useState(null);   // theme to link events

    useEffect(() => {
        const unsub = subscribeStrategicThemes(data => { setThemes(data); setLoading(false); });
        return () => unsub();
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'events'), orderBy('updatedAt', 'desc'));
        return onSnapshot(q, snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, []);

    const handleSave = async (form) => {
        if (form.id) {
            await updateStrategicTheme(form.id, form, uid);
        } else {
            await createStrategicTheme(form, uid);
        }
    };

    const handleDelete = async (themeId) => {
        if (!window.confirm('Eliminare questo tema strategico?')) return;
        await deleteStrategicTheme(themeId);
    };

    if (loading) return (
        <div className="min-h-screen bg-[#050508] flex items-center justify-center text-zinc-600 font-mono text-xs animate-pulse">
            LOADING STRATEGIC THEMES...
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050508] text-white font-mono pb-20">

            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#050508]/90 backdrop-blur-md border-b border-white/[0.06]">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <Link to="/dashboard" className="flex items-center gap-1.5 text-zinc-600 hover:text-white transition-colors text-xs">
                        <ChevronLeft className="w-4 h-4" /> Dashboard
                    </Link>
                    <div className="text-center">
                        <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Strategic Themes</div>
                        <div className="text-sm font-bold text-zinc-300">{themes.filter(t => t.status === 'active').length} attivi · {themes.length} totali</div>
                    </div>
                    <button onClick={() => setModalTheme({})}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono rounded-xl transition-all">
                        <Plus className="w-3.5 h-3.5" /> Nuovo Tema
                    </button>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-3">
                {themes.length === 0 ? (
                    <div className="text-center py-24 text-zinc-700">
                        <Star className="w-10 h-10 mx-auto mb-4 opacity-20" />
                        <p className="text-sm">Nessun tema strategico ancora.</p>
                        <button onClick={() => setModalTheme({})}
                            className="mt-4 px-4 py-2 border border-indigo-800/60 text-indigo-400 text-xs rounded-xl hover:bg-indigo-950/30 transition-all">
                            Crea il primo tema
                        </button>
                    </div>
                ) : (
                    <AnimatePresence>
                        {themes.map(theme => {
                            const linkedEvents = events.filter(e => (theme.event_ids || []).includes(e.id));
                            return (
                                <motion.div key={theme.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 hover:border-white/[0.12] transition-all">
                                    <div className="flex items-start gap-4">
                                        {/* Color dot */}
                                        <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: theme.color }} />

                                        {/* Main content */}
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h3 className="text-base font-bold text-white">{theme.title}</h3>
                                                <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${STATUS_STYLE[theme.status] || STATUS_STYLE.archived}`}>
                                                    {theme.status}
                                                </span>
                                                <span className="text-[9px] text-zinc-600 border border-white/[0.07] px-1.5 py-0.5 rounded-full">{theme.horizon}</span>
                                                {theme.owner && <span className="text-[9px] text-zinc-500">Sponsor: {theme.owner}</span>}
                                            </div>
                                            {theme.description && (
                                                <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{theme.description}</p>
                                            )}

                                            {/* Linked dossiers */}
                                            {linkedEvents.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-3">
                                                    {linkedEvents.map(ev => (
                                                        <Link key={ev.id} to={`/progetto/${ev.id}`}
                                                            className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] transition-all"
                                                            style={{ borderColor: theme.color + '40', color: theme.color, backgroundColor: theme.color + '10' }}>
                                                            <Layers className="w-3 h-3" />
                                                            {ev.title}
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <button onClick={() => setLinkPanel(theme)}
                                                className="p-2 text-zinc-600 hover:text-teal-400 border border-white/[0.07] hover:border-teal-800/50 rounded-lg transition-all"
                                                title="Collega dossier">
                                                <Link2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => setModalTheme(theme)}
                                                className="p-2 text-zinc-600 hover:text-indigo-400 border border-white/[0.07] hover:border-indigo-800/50 rounded-lg transition-all"
                                                title="Modifica">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleDelete(theme.id)}
                                                className="p-2 text-zinc-600 hover:text-red-400 border border-white/[0.07] hover:border-red-900/50 rounded-lg transition-all"
                                                title="Elimina">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {modalTheme !== null && (
                    <ThemeModal
                        theme={modalTheme?.id ? modalTheme : null}
                        onSave={handleSave}
                        onClose={() => setModalTheme(null)}
                    />
                )}
                {linkPanel && (
                    <LinkEventsPanel
                        theme={linkPanel}
                        events={events}
                        uid={uid}
                        onClose={() => setLinkPanel(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
