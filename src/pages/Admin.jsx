import React, { useState, useEffect } from 'react';
import { Shield, Users, QrCode, Clipboard, ArrowUpCircle, ArrowDownCircle, Radio, Compass, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InviteService } from '../services/inviteService';
import { collection, getDocs, orderBy, query, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const Admin = () => {
    const navigate = useNavigate();
    const [activeToken, setActiveToken] = useState(null);
    const [loadingToken, setLoadingToken] = useState(false);
    const [roster, setRoster] = useState([]);
    const [loadingRoster, setLoadingRoster] = useState(true);
    const [signals, setSignals] = useState([]);
    const [okrs, setOkrs] = useState([]);
    const [expandedSection, setExpandedSection] = useState(null); // 'signals' | 'okrs' | null

    const fetchRoster = async () => {
        try {
            const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            setRoster(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching roster:", error);
        } finally {
            setLoadingRoster(false);
        }
    };

    useEffect(() => {
        fetchRoster();

        const unsubSignals = onSnapshot(
            query(collection(db, "signals"), orderBy("createdAt", "desc")),
            snap => setSignals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        const unsubOKRs = onSnapshot(
            query(collection(db, "okrs"), orderBy("createdAt", "desc")),
            snap => setOkrs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );

        return () => { unsubSignals(); unsubOKRs(); };
    }, []);

    const handleGenerateToken = async () => {
        setLoadingToken(true);
        try {
            const token = await InviteService.generateInvite();
            setActiveToken(token);
        } catch (error) {
            console.error("Error generating token:", error);
        } finally {
            setLoadingToken(false);
        }
    };

    const copyToClipboard = () => {
        if (activeToken) {
            const url = `${window.location.origin}/join/${activeToken}`;
            navigator.clipboard.writeText(url);
            alert("Invite URL copied to clipboard!");
        }
    };

    const toggleRole = async (userId, currentRole) => {
        if (!window.confirm(`Change role for this user? Current: ${currentRole || 'MEMBER'}`)) return;
        const newRole = currentRole === 'ADMIN' ? 'member' : 'ADMIN';
        try {
            await updateDoc(doc(db, "users", userId), { role: newRole });
            setRoster(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (e) {
            console.error("Error changing role:", e);
        }
    };

    const deleteSignal = async (id) => {
        if (!window.confirm("Delete this signal?")) return;
        await deleteDoc(doc(db, "signals", id));
    };

    const deleteOKR = async (id) => {
        if (!window.confirm("Delete this OKR?")) return;
        await deleteDoc(doc(db, "okrs", id));
    };

    const signalLevelColor = { high: 'text-red-400', medium: 'text-yellow-400', low: 'text-blue-400' };

    return (
        <div className="min-h-screen bg-black p-8 text-white font-mono selection:bg-red-900/30">
            <header className="flex justify-between items-center mb-10 border-b border-zinc-800 pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-900/20 border border-red-900/50 rounded flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                        <Shield className="w-5 h-5 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-widest text-red-500">ADMIN CONSOLE</h1>
                </div>
                <button onClick={() => navigate('/dashboard')} className="text-zinc-500 hover:text-white transition-colors border border-zinc-800 px-4 py-2 rounded hover:bg-zinc-900">
                    EXIT TO DASHBOARD
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Invite System */}
                <div className="border border-zinc-800 bg-zinc-950 p-6 rounded-xl shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full pointer-events-none" />
                    <h2 className="text-sm font-bold mb-5 flex items-center gap-2 text-zinc-300">
                        <QrCode className="w-4 h-4 text-red-500" /> ACCESS CONTROL
                    </h2>
                    <div className="bg-zinc-900/50 p-5 rounded-lg text-center mb-5 border border-zinc-800 border-dashed">
                        <p className="text-[10px] text-zinc-500 mb-2 uppercase tracking-widest">ACTIVE INVITE TOKEN</p>
                        {activeToken ? (
                            <div className="flex flex-col items-center gap-2">
                                <p className="text-2xl font-bold text-white tracking-widest">{activeToken}</p>
                                <button onClick={copyToClipboard} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mt-1">
                                    <Clipboard className="w-3 h-3" /> COPY INVITE LINK
                                </button>
                            </div>
                        ) : (
                            <p className="text-zinc-600 italic text-sm">No active token</p>
                        )}
                    </div>
                    <button onClick={handleGenerateToken} disabled={loadingToken}
                        className="w-full bg-white hover:bg-zinc-200 text-black py-3 font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                        {loadingToken ? "GENERATING..." : "GENERATE NEW TOKEN"}
                    </button>
                    <p className="text-[10px] text-zinc-600 mt-2 text-center">Token valid for 24h. One-time use.</p>
                </div>

                {/* Team Roster */}
                <div className="border border-zinc-800 bg-zinc-950 p-6 rounded-xl shadow-lg flex flex-col" style={{ maxHeight: '380px' }}>
                    <h2 className="text-sm font-bold mb-5 flex items-center gap-2 text-zinc-300">
                        <Users className="w-4 h-4 text-blue-500" /> ROSTER MANAGEMENT
                    </h2>
                    {loadingRoster ? (
                        <div className="flex-grow flex items-center justify-center text-zinc-500 animate-pulse text-sm">
                            SCANNING DATABASE...
                        </div>
                    ) : (
                        <div className="flex-grow overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                            {roster.map(user => (
                                <div key={user.uid || user.id} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800/50 rounded hover:border-zinc-700 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {user.photoURL ? (
                                            <img src={user.photoURL} alt={user.displayName} className="w-7 h-7 rounded-full grayscale opacity-70" />
                                        ) : (
                                            <div className="w-7 h-7 bg-zinc-800 rounded-full flex items-center justify-center text-xs">
                                                {user.displayName?.charAt(0) || "U"}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-bold text-zinc-200">{user.displayName}</p>
                                            <p className="text-[10px] text-zinc-500">{user.email}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => toggleRole(user.id, user.role)}
                                        className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 transition-colors ${user.role === 'ADMIN'
                                            ? 'border-red-900/50 bg-red-900/10 text-red-500 hover:bg-red-900/20'
                                            : 'border-blue-900/50 bg-blue-900/10 text-blue-500 hover:bg-blue-900/20'}`}>
                                        {user.role || 'MEMBER'}
                                        {user.role === 'ADMIN' ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Data Management */}
            <div className="space-y-3">

                {/* Signals */}
                <div className="border border-zinc-800 bg-zinc-950 rounded-xl overflow-hidden">
                    <button
                        onClick={() => setExpandedSection(expandedSection === 'signals' ? null : 'signals')}
                        className="w-full flex items-center justify-between p-5 hover:bg-zinc-900/50 transition-colors"
                    >
                        <h2 className="text-sm font-bold flex items-center gap-2 text-zinc-300">
                            <Radio className="w-4 h-4 text-emerald-500" />
                            RISK SIGNALS
                            <span className="text-[10px] text-zinc-600 font-normal ml-1">({signals.length})</span>
                        </h2>
                        {expandedSection === 'signals' ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
                    </button>

                    {expandedSection === 'signals' && (
                        <div className="px-5 pb-5 space-y-2 border-t border-zinc-800/50">
                            {signals.length === 0 ? (
                                <p className="text-zinc-600 text-xs py-4 text-center">No signals in database</p>
                            ) : signals.map(signal => (
                                <div key={signal.id} className="flex items-start justify-between p-3 bg-zinc-900/50 border border-zinc-800/50 rounded hover:border-zinc-700 transition-colors group">
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold uppercase ${signalLevelColor[signal.level] || 'text-zinc-400'}`}>
                                                {signal.level}
                                            </span>
                                            {signal.createdAt && (
                                                <span className="text-[10px] text-zinc-700">
                                                    {signal.createdAt.toDate?.().toLocaleDateString('it-IT') || ''}
                                                </span>
                                            )}
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
                    )}
                </div>

                {/* OKRs */}
                <div className="border border-zinc-800 bg-zinc-950 rounded-xl overflow-hidden">
                    <button
                        onClick={() => setExpandedSection(expandedSection === 'okrs' ? null : 'okrs')}
                        className="w-full flex items-center justify-between p-5 hover:bg-zinc-900/50 transition-colors"
                    >
                        <h2 className="text-sm font-bold flex items-center gap-2 text-zinc-300">
                            <Compass className="w-4 h-4 text-indigo-400" />
                            STRATEGIC THEMES (OKR)
                            <span className="text-[10px] text-zinc-600 font-normal ml-1">({okrs.length})</span>
                        </h2>
                        {expandedSection === 'okrs' ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
                    </button>

                    {expandedSection === 'okrs' && (
                        <div className="px-5 pb-5 space-y-2 border-t border-zinc-800/50">
                            {okrs.length === 0 ? (
                                <p className="text-zinc-600 text-xs py-4 text-center">No OKRs in database</p>
                            ) : okrs.map(okr => (
                                <div key={okr.id} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800/50 rounded hover:border-zinc-700 transition-colors group">
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[10px] font-bold uppercase ${okr.status === 'risk' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {okr.status || 'on-track'}
                                            </span>
                                            <span className="text-xs text-zinc-300 truncate">{okr.title}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <div className="flex-grow h-1 bg-zinc-800 rounded-full overflow-hidden">
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
                    )}
                </div>

            </div>
        </div>
    );
};
