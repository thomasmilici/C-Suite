import React, { useState, useEffect } from 'react';
import { Shield, Users, QrCode, Clipboard, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InviteService } from '../services/inviteService';
import { collection, getDocs, orderBy, query, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const Admin = () => {
    const navigate = useNavigate();
    const [activeToken, setActiveToken] = useState(null);
    const [loadingToken, setLoadingToken] = useState(false);
    const [roster, setRoster] = useState([]);
    const [loadingRoster, setLoadingRoster] = useState(true);

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
            // Optimistic update or refetch
            setRoster(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (e) {
            console.error("Error changing role:", e);
            alert("Failed to update role");
        }
    };

    return (
        <div className="min-h-screen bg-black p-8 text-white font-mono selection:bg-red-900/30">
            <header className="flex justify-between items-center mb-12 border-b border-zinc-800 pb-6">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Invite System */}
                <div className="border border-zinc-800 bg-zinc-950 p-6 rounded-xl shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full pointer-events-none" />

                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-zinc-300">
                        <QrCode className="w-5 h-5 text-red-500" /> ACCESS CONTROL
                    </h2>

                    <div className="bg-zinc-900/50 p-6 rounded-lg text-center mb-6 border border-zinc-800 border-dashed relative">
                        <p className="text-[10px] text-zinc-500 mb-2 uppercase tracking-widest">ACTIVE INVITE TOKEN</p>
                        {activeToken ? (
                            <div className="flex flex-col items-center gap-2">
                                <p className="text-3xl font-bold text-white tracking-widest font-mono">{activeToken}</p>
                                <button onClick={copyToClipboard} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mt-2">
                                    <Clipboard className="w-3 h-3" /> COPY INVITE LINK
                                </button>
                            </div>
                        ) : (
                            <p className="text-zinc-600 italic">No active token generated</p>
                        )}
                    </div>

                    <button
                        onClick={handleGenerateToken}
                        disabled={loadingToken}
                        className="w-full bg-white hover:bg-zinc-200 text-black py-4 font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loadingToken ? "GENERATING..." : "GENERATE NEW TOKEN"}
                    </button>
                    <p className="text-[10px] text-zinc-600 mt-3 text-center">Token valid for 24h. One-time use.</p>
                </div>

                {/* Team Roster */}
                <div className="border border-zinc-800 bg-zinc-950 p-6 rounded-xl shadow-lg flex flex-col h-[500px]">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-zinc-300">
                        <Users className="w-5 h-5 text-blue-500" /> ROSTER MANAGEMENT
                    </h2>

                    {loadingRoster ? (
                        <div className="flex-grow flex items-center justify-center text-zinc-500 animate-pulse">
                            SCANNING DATABASE...
                        </div>
                    ) : (
                        <div className="flex-grow overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
                            {roster.map(user => (
                                <div key={user.uid} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800/50 rounded hover:border-zinc-700 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {user.photoURL ? (
                                            <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full grayscale opacity-70" />
                                        ) : (
                                            <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-xs">
                                                {user.displayName?.charAt(0) || "U"}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-bold text-zinc-200">{user.displayName}</p>
                                            <p className="text-[10px] text-zinc-500">{user.email}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => toggleRole(user.id, user.role)}
                                        className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 transition-colors ${user.role === 'ADMIN'
                                                ? 'border-red-900/50 bg-red-900/10 text-red-500 hover:bg-red-900/20'
                                                : 'border-blue-900/50 bg-blue-900/10 text-blue-500 hover:bg-blue-900/20'
                                            }`}
                                        title="Click to toggle Role"
                                    >
                                        {user.role || 'MEMBER'}
                                        {user.role === 'ADMIN' ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
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
