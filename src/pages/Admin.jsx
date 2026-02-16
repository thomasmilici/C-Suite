import React, { useState, useEffect } from 'react';
import {
    Shield, Users, QrCode, Clipboard, ArrowUpCircle, ArrowDownCircle,
    Radio, Compass, Trash2, ChevronDown, ChevronUp, Plus, Check,
    Clock, RefreshCw, X, Infinity as InfinityIcon
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { InviteService } from '../services/inviteService';
import { collection, getDocs, orderBy, query, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';

const INVITE_TYPES = [
    {
        key: 'one-shot',
        label: 'One-Shot',
        Icon: Clock,
        color: 'text-yellow-400',
        border: 'border-yellow-500/30',
        bg: 'bg-yellow-500/10',
        desc: '1 uso • 24h',
    },
    {
        key: 'periodic',
        label: 'Periodico',
        Icon: RefreshCw,
        color: 'text-blue-400',
        border: 'border-blue-500/30',
        bg: 'bg-blue-500/10',
        desc: 'N usi • N giorni',
    },
    {
        key: 'permanent',
        label: 'Definitivo',
        Icon: InfinityIcon,
        color: 'text-emerald-400',
        border: 'border-emerald-500/30',
        bg: 'bg-emerald-500/10',
        desc: 'Illimitato',
    },
];

export const Admin = () => {
    const navigate = useNavigate();

    // Invite state
    const [inviteType, setInviteType] = useState('one-shot');
    const [inviteLabel, setInviteLabel] = useState('');
    const [periodicDays, setPeriodicDays] = useState(7);
    const [periodicUses, setPeriodicUses] = useState(10);
    const [activeToken, setActiveToken] = useState(null);
    const [activeTokenUrl, setActiveTokenUrl] = useState(null);
    const [loadingToken, setLoadingToken] = useState(false);
    const [copied, setCopied] = useState(false);

    // Roster
    const [roster, setRoster] = useState([]);
    const [loadingRoster, setLoadingRoster] = useState(true);

    // Data management
    const [signals, setSignals] = useState([]);
    const [okrs, setOkrs] = useState([]);
    const [expandedSection, setExpandedSection] = useState(null);

    const fetchRoster = async () => {
        try {
            const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            setRoster(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("Error fetching roster:", e);
        } finally {
            setLoadingRoster(false);
        }
    };

    useEffect(() => {
        fetchRoster();
        const unsubSignals = onSnapshot(query(collection(db, "signals"), orderBy("createdAt", "desc")), snap =>
            setSignals(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubOKRs = onSnapshot(query(collection(db, "okrs"), orderBy("createdAt", "desc")), snap =>
            setOkrs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => { unsubSignals(); unsubOKRs(); };
    }, []);

    const handleGenerateToken = async () => {
        setLoadingToken(true);
        setCopied(false);
        setActiveToken(null);
        try {
            const options = {
                label: inviteLabel.trim() || null,
                ...(inviteType === 'periodic' ? { days: periodicDays, maxUses: periodicUses } : {}),
            };
            const token = await InviteService.generateInvite(inviteType, options);
            const url = `${window.location.origin}/join/${token}`;
            setActiveToken(token);
            setActiveTokenUrl(url);
        } catch (e) {
            console.error("Error generating token:", e);
        } finally {
            setLoadingToken(false);
        }
    };

    const copyLink = () => {
        if (activeTokenUrl) {
            navigator.clipboard.writeText(activeTokenUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const toggleRole = async (userId, currentRole) => {
        if (!window.confirm(`Cambia ruolo? Attuale: ${currentRole || 'MEMBER'}`)) return;
        const newRole = currentRole === 'ADMIN' ? 'member' : 'ADMIN';
        try {
            await updateDoc(doc(db, "users", userId), { role: newRole });
            setRoster(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (e) {
            console.error("Error changing role:", e);
        }
    };

    const deleteSignal = async (id) => {
        if (!window.confirm("Eliminare questo segnale?")) return;
        await deleteDoc(doc(db, "signals", id));
    };

    const deleteOKR = async (id) => {
        if (!window.confirm("Eliminare questo OKR?")) return;
        await deleteDoc(doc(db, "okrs", id));
    };

    const signalLevelColor = { high: 'text-red-400', medium: 'text-yellow-400', low: 'text-blue-400' };
    const selectedType = INVITE_TYPES.find(t => t.key === inviteType);

    return (
        <div className="min-h-screen bg-[#050508] p-6 md:p-8 text-white font-mono selection:bg-red-900/30">

            {/* Header */}
            <header className="flex justify-between items-center mb-8 border-b border-white/[0.06] pb-5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-red-900/20 border border-red-900/50 rounded-lg flex items-center justify-center">
                        <Shield className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-widest text-red-400">ADMIN CONSOLE</h1>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Quinta OS — Restricted Access</p>
                    </div>
                </div>
                <button onClick={() => navigate('/dashboard')}
                    className="text-zinc-500 hover:text-white border border-white/[0.07] px-4 py-2 rounded-xl hover:bg-white/[0.05] transition-all text-xs">
                    ← Dashboard
                </button>
            </header>

            <div className="max-w-screen-xl mx-auto space-y-5">

                {/* Row 1: Invite Generator + Team Roster */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {/* === INVITE GENERATOR === */}
                    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                        <h2 className="text-[10px] font-bold mb-5 flex items-center gap-2 text-zinc-400 uppercase tracking-widest">
                            <QrCode className="w-3.5 h-3.5 text-red-400" /> Invite Generator
                        </h2>

                        {/* Type selector */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {INVITE_TYPES.map(({ key, label, Icon, color, border, bg, desc }) => {
                                const selected = inviteType === key;
                                return (
                                    <button key={key} onClick={() => { setInviteType(key); setActiveToken(null); }}
                                        className={`p-3 rounded-xl border text-center transition-all ${selected
                                            ? `${border} ${bg} ${color}`
                                            : 'border-white/[0.07] bg-white/[0.02] text-zinc-500 hover:border-white/15 hover:text-zinc-300'}`}>
                                        <Icon className="w-3.5 h-3.5 mx-auto mb-1.5" />
                                        <div className="text-[10px] font-bold uppercase tracking-wider">{label}</div>
                                        <div className="text-[9px] mt-0.5 opacity-70">{desc}</div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Periodic options */}
                        <AnimatePresence>
                            {inviteType === 'periodic' && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                    className="grid grid-cols-2 gap-3 mb-4 overflow-hidden">
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 mb-1.5 uppercase tracking-wider">Validità (giorni)</label>
                                        <input type="number" min="1" max="365" value={periodicDays}
                                            onChange={e => setPeriodicDays(Number(e.target.value))}
                                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-white/30 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 mb-1.5 uppercase tracking-wider">Max utilizzi</label>
                                        <input type="number" min="1" max="1000" value={periodicUses}
                                            onChange={e => setPeriodicUses(Number(e.target.value))}
                                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-white/30 transition-all" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Label */}
                        <div className="mb-4">
                            <label className="block text-[10px] text-zinc-500 mb-1.5 uppercase tracking-wider">Etichetta (opzionale)</label>
                            <input type="text" value={inviteLabel} onChange={e => setInviteLabel(e.target.value)}
                                placeholder="es. Evento Milano, Partner ABC..."
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-white/30 transition-all placeholder:text-zinc-700" />
                        </div>

                        {/* Generate button */}
                        <button onClick={handleGenerateToken} disabled={loadingToken}
                            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/25 rounded-xl font-bold transition-all text-xs uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2">
                            {loadingToken
                                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generazione...</>
                                : <><Plus className="w-3.5 h-3.5" /> Genera Invite</>}
                        </button>

                        {/* Token result + QR */}
                        <AnimatePresence>
                            {activeToken && (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className="mt-5 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl flex gap-4 items-start">
                                    {/* QR code */}
                                    <div className="bg-white p-2.5 rounded-xl flex-shrink-0">
                                        <QRCodeSVG value={activeTokenUrl} size={90} level="H" />
                                    </div>
                                    {/* Info */}
                                    <div className="flex-grow min-w-0">
                                        <div className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${selectedType?.color}`}>
                                            {selectedType?.label}{inviteLabel ? ` — ${inviteLabel}` : ''}
                                        </div>
                                        <div className="text-xl font-bold text-white tracking-widest mb-2">{activeToken}</div>
                                        <button onClick={copyLink}
                                            className={`flex items-center gap-1.5 text-xs transition-all ${copied ? 'text-emerald-400' : 'text-zinc-500 hover:text-white'}`}>
                                            {copied
                                                ? <><Check className="w-3 h-3" /> Copiato!</>
                                                : <><Clipboard className="w-3 h-3" /> Copia link invite</>}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* === TEAM ROSTER === */}
                    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col" style={{ maxHeight: '520px' }}>
                        <h2 className="text-[10px] font-bold mb-5 flex items-center gap-2 text-zinc-400 uppercase tracking-widest">
                            <Users className="w-3.5 h-3.5 text-blue-400" /> Team Roster
                            <span className="text-zinc-600 font-normal ml-1">({roster.length})</span>
                        </h2>

                        {loadingRoster ? (
                            <div className="flex-grow flex items-center justify-center text-zinc-600 animate-pulse text-xs">
                                SCANNING DATABASE...
                            </div>
                        ) : (
                            <div className="flex-grow overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/5">
                                {roster.length === 0 && (
                                    <p className="text-zinc-700 text-xs text-center py-8">Nessun utente registrato</p>
                                )}
                                {roster.map(user => (
                                    <div key={user.uid || user.id}
                                        className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:border-white/[0.1] transition-all">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {user.photoURL ? (
                                                <img src={user.photoURL} alt={user.displayName}
                                                    className="w-7 h-7 rounded-full grayscale opacity-60 flex-shrink-0" />
                                            ) : (
                                                <div className="w-7 h-7 bg-white/[0.05] rounded-full flex items-center justify-center text-xs flex-shrink-0">
                                                    {user.displayName?.charAt(0) || "U"}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-zinc-200 truncate">{user.displayName}</p>
                                                <p className="text-[10px] text-zinc-600 truncate">{user.email}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => toggleRole(user.id, user.role)}
                                            className={`ml-3 flex-shrink-0 text-[10px] px-2 py-1 rounded-lg border flex items-center gap-1 transition-all ${user.role === 'ADMIN'
                                                ? 'border-red-900/50 bg-red-900/10 text-red-400 hover:bg-red-900/20'
                                                : 'border-blue-900/50 bg-blue-900/10 text-blue-400 hover:bg-blue-900/20'}`}>
                                            {user.role || 'MEMBER'}
                                            {user.role === 'ADMIN' ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Row 2: Data management (accordion) */}
                <div className="space-y-3">

                    {/* Signals */}
                    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
                        <button onClick={() => setExpandedSection(expandedSection === 'signals' ? null : 'signals')}
                            className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                            <h2 className="text-[10px] font-bold flex items-center gap-2 text-zinc-400 uppercase tracking-widest">
                                <Radio className="w-3.5 h-3.5 text-emerald-400" /> Risk Signals
                                <span className="text-zinc-600 font-normal">({signals.length})</span>
                            </h2>
                            {expandedSection === 'signals' ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'signals' && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                    <div className="px-5 pb-5 space-y-2 border-t border-white/[0.05]">
                                        {signals.length === 0 ? (
                                            <p className="text-zinc-700 text-xs py-4 text-center">Nessun segnale nel database</p>
                                        ) : signals.map(signal => (
                                            <div key={signal.id} className="flex items-start justify-between p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:border-white/[0.1] transition-all group">
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-[10px] font-bold uppercase ${signalLevelColor[signal.level] || 'text-zinc-400'}`}>{signal.level}</span>
                                                        {signal.createdAt && <span className="text-[10px] text-zinc-700">{signal.createdAt.toDate?.().toLocaleDateString('it-IT') || ''}</span>}
                                                    </div>
                                                    <p className="text-xs text-zinc-300 truncate">{signal.text}</p>
                                                </div>
                                                <button onClick={() => deleteSignal(signal.id)}
                                                    className="ml-3 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all flex-shrink-0">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* OKRs */}
                    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
                        <button onClick={() => setExpandedSection(expandedSection === 'okrs' ? null : 'okrs')}
                            className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                            <h2 className="text-[10px] font-bold flex items-center gap-2 text-zinc-400 uppercase tracking-widest">
                                <Compass className="w-3.5 h-3.5 text-indigo-400" /> Strategic Themes (OKR)
                                <span className="text-zinc-600 font-normal">({okrs.length})</span>
                            </h2>
                            {expandedSection === 'okrs' ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'okrs' && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                    <div className="px-5 pb-5 space-y-2 border-t border-white/[0.05]">
                                        {okrs.length === 0 ? (
                                            <p className="text-zinc-700 text-xs py-4 text-center">Nessun OKR nel database</p>
                                        ) : okrs.map(okr => (
                                            <div key={okr.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:border-white/[0.1] transition-all group">
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex items-center gap-3 mb-1.5">
                                                        <span className={`text-[10px] font-bold uppercase ${okr.status === 'risk' ? 'text-red-400' : 'text-emerald-400'}`}>{okr.status || 'on-track'}</span>
                                                        <span className="text-xs text-zinc-300 truncate">{okr.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-grow h-1 bg-white/[0.05] rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${okr.status === 'risk' ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                                style={{ width: `${okr.progress || 0}%` }} />
                                                        </div>
                                                        <span className="text-[10px] text-zinc-500 flex-shrink-0">{okr.progress || 0}%</span>
                                                        {okr.keyResults?.length > 0 && (
                                                            <span className="text-[10px] text-zinc-600 flex-shrink-0">
                                                                {okr.keyResults.filter(kr => kr.completed).length}/{okr.keyResults.length} KR
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button onClick={() => deleteOKR(okr.id)}
                                                    className="ml-3 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all flex-shrink-0">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            </div>
        </div>
    );
};
