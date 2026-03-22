import React, { useState, useEffect, useRef } from 'react';
import { Shield, User, LogOut, ChevronDown, Settings, RefreshCcw } from 'lucide-react';
import { AuthService } from '../../services/authService';
import { useNavigate, Link } from 'react-router-dom';
import { MissionContext } from './AppShell';
import { MissionContext } from './AppShell';
import { subscribeMissions, updateMission } from '../../services/missionService';
export const AppHeader = ({ user, isAdmin, commandBarSlot }) => {
    const navigate = useNavigate();
    const { activeMissionId, setActiveMissionId } = React.useContext(MissionContext);
    const [missions, setMissions] = useState([]);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        return subscribeMissions(data => {
            setMissions(data);
            if (data.length > 0 && activeMissionId === 'default_mission') {
                setActiveMissionId(data[0].id);
            }
        });
    }, [activeMissionId, setActiveMissionId]);

    const handleLogout = async () => {
        await AuthService.logout();
        navigate('/login');
    };

    return (
        <header className="sticky top-0 z-30 w-full border-b border-white/5 bg-[#050508]/80 backdrop-blur-xl">
            <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-3">

                {/* Brand / Status — cliccabile per tornare al Cockpit */}
                <Link
                    to="/dashboard"
                    title="Torna al Cockpit"
                    className="flex items-center gap-3 flex-shrink-0 hover:opacity-80 transition-opacity"
                >
                    <img
                        src="/logo.png"
                        alt="C-Suite OS"
                        className="w-8 h-8 rounded-xl object-contain"
                    />
                    <div className="hidden sm:block text-left">
                        <h1 className="text-sm font-mono font-bold tracking-tighter text-white leading-none">
                            C-Suite <span className="text-zinc-600">OS</span>
                        </h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
                                Sistema Attivo
                            </span>
                        </div>
                    </div>
                </Link>

                {/* CommandBar slot — center of header, takes remaining space */}
                {commandBarSlot && (
                    <div className="flex-1 flex items-center justify-center">
                        {commandBarSlot}
                    </div>
                )}

                {/* Right Actions */}
                <div className="flex items-center gap-3 flex-shrink-0 ml-auto">

                    {/* Mission Selector */}
                    {missions.length > 0 && (
                        <div className="hidden md:flex items-center relative">
                            <select
                                value={activeMissionId}
                                onChange={(e) => setActiveMissionId(e.target.value)}
                                className="appearance-none bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] text-white text-[10px] font-mono rounded-lg px-3 py-1.5 pr-8 transition-colors outline-none cursor-pointer max-w-[150px] truncate"
                            >
                                {missions.map(m => (
                                    <option key={m.id} value={m.id} className="bg-[#050508] text-white">
                                        Mission: {m.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3 h-3 text-zinc-400 absolute right-2.5 pointer-events-none" />
                        </div>
                    )}

                    {/* User Profile Dropdown */}
                    <div className="relative" ref={menuRef}>
                        <button 
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="hidden sm:flex items-center gap-2 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-colors"
                        >
                            <div className="w-5 h-5 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                {isAdmin ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            </div>
                            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                                {user?.displayName || 'User'}
                            </span>
                            <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {showUserMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-[#0a0a0f] border border-white/10 rounded-xl shadow-2xl py-1 z-50 overflow-hidden">
                                <div className="px-3 py-2 border-b border-white/5 mb-1">
                                    <p className="text-xs font-semibold text-white truncate">{user?.displayName || 'Utente'}</p>
                                    <p className="text-[10px] text-zinc-500 font-mono truncate">{user?.email}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowUserMenu(false);
                                        // Placeholder for settings navigation
                                        console.log("Navigating to settings...");
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                    Impostazioni
                                </button>
                                <button
                                    onClick={async () => {
                                        setShowUserMenu(false);
                                        if (activeMissionId) {
                                            await updateMission(activeMissionId, { isSetupComplete: false });
                                        }
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                                >
                                    <RefreshCcw className="w-3.5 h-3.5" />
                                    Ricalibra Mandato
                                </button>
                                <div className="h-px bg-white/5 my-1" />
                                <button
                                    onClick={() => {
                                        setShowUserMenu(false);
                                        handleLogout();
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};
