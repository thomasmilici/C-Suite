import React from 'react';
import { Shield, User, LogOut } from 'lucide-react';
import { AuthService } from '../../services/authService';
import { useNavigate } from 'react-router-dom';

export const AppHeader = ({ user, isAdmin, commandBarSlot }) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await AuthService.logout();
        navigate('/login');
    };

    return (
        <header className="sticky top-0 z-30 w-full border-b border-white/5 bg-[#050508]/80 backdrop-blur-xl">
            <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-3">

                {/* Brand / Status */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <img
                        src="/logo.png"
                        alt="C-Suite OS"
                        className="w-8 h-8 rounded-xl object-contain"
                    />
                    <div className="hidden sm:block">
                        <h1 className="text-sm font-mono font-bold tracking-tighter text-white leading-none">
                            C-Suite <span className="text-zinc-600">OS</span>
                        </h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
                                Execution Layer • Active
                            </span>
                        </div>
                    </div>
                </div>

                {/* CommandBar slot — center of header, takes remaining space */}
                {commandBarSlot && (
                    <div className="flex-1 flex items-center justify-center">
                        {commandBarSlot}
                    </div>
                )}

                {/* Right Actions */}
                <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
                    {/* User Profile / Admin Badge */}
                    <div className="hidden sm:flex items-center gap-2 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                        <div className="w-5 h-5 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                            {isAdmin ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                            {user?.displayName || 'User'}
                        </span>
                    </div>

                    {/* Admin Action */}
                    {isAdmin && (
                        <button
                            onClick={() => navigate('/admin')}
                            className="hidden md:flex items-center gap-1.5 text-[10px] font-mono text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest"
                        >
                            <Shield className="w-3 h-3" />
                            Admin
                        </button>
                    )}

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="p-2 text-zinc-500 hover:text-white transition-colors"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </header>
    );
};
