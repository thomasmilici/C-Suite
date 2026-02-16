import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { LogOut, Shield, Sparkles } from 'lucide-react';
import { TileCompass } from '../components/tiles/TileCompass';
import { TilePulse } from '../components/tiles/TilePulse';
import { TileTeam } from '../components/tiles/TileTeam';
import { TileRadar } from '../components/tiles/TileRadar';
import { NeuralInterface } from '../components/modules/Intelligence/NeuralInterface';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const Dashboard = ({ user }) => {
    const navigate = useNavigate();
    const [isAdmin, setIsAdmin] = useState(false);
    const [showNeural, setShowNeural] = useState(false);

    useEffect(() => {
        const checkRole = async () => {
            if (user) {
                const snap = await getDoc(doc(db, "users", user.uid));
                if (snap.exists() && snap.data().role === 'ADMIN') {
                    setIsAdmin(true);
                }
            }
        };
        checkRole();
    }, [user]);

    const handleLogout = async () => {
        await AuthService.logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[#050508] p-4 md:p-6 font-sans selection:bg-zinc-800 relative text-gray-200 overflow-x-hidden">
            {/* Background Decor */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(99,102,241,0.07)_0%,transparent_60%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(20,184,166,0.05)_0%,transparent_60%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.02)_0%,transparent_50%)]" />
            </div>

            {/* Header */}
            <header className="max-w-screen-2xl mx-auto mb-6 flex justify-between items-center border-b border-white/5 pb-4 sticky top-0 z-20 bg-[#050508]/70 backdrop-blur-xl">
                <div>
                    <h1 className="text-xl font-mono font-bold tracking-tighter text-white">
                        QUINTA <span className="text-zinc-600">OS</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                            Execution Layer • Active
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-6 text-xs font-mono">
                    {isAdmin && (
                        <button onClick={() => navigate('/admin')} className="text-red-400 hover:text-red-300 flex items-center gap-1.5 border border-red-900/50 bg-red-900/10 px-3 py-1.5 rounded-lg transition-colors backdrop-blur-sm">
                            <Shield className="w-3 h-3" /> ADMIN
                        </button>
                    )}
                    <div className="text-zinc-500 hidden sm:block">
                        OP: <span className="text-white uppercase">{user?.displayName || 'Unknown'}</span>
                    </div>
                    <button onClick={handleLogout} className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Main Bento Grid */}
            <main className="max-w-screen-2xl mx-auto pb-24 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[minmax(320px,auto)]">

                    {/* Tile 1: Compass */}
                    <div className="md:col-span-2 md:row-span-1 rounded-2xl overflow-hidden
                        bg-white/[0.03] backdrop-blur-2xl
                        border border-white/[0.07]
                        shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]
                        hover:border-white/[0.13] hover:bg-white/[0.05] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]
                        transition-all duration-300">
                        <TileCompass isAdmin={isAdmin} />
                    </div>

                    {/* Tile 3: Team (Right, Tall) */}
                    <div className="md:col-span-1 md:row-span-2 rounded-2xl overflow-hidden flex flex-col
                        bg-white/[0.03] backdrop-blur-2xl
                        border border-white/[0.07]
                        shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]
                        hover:border-white/[0.13] hover:bg-white/[0.05] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]
                        transition-all duration-300">
                        <TileTeam />
                    </div>

                    {/* Tile 2: Pulse */}
                    <div className="md:col-span-2 md:row-span-1 rounded-2xl overflow-hidden
                        bg-white/[0.03] backdrop-blur-2xl
                        border border-white/[0.07]
                        shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]
                        hover:border-white/[0.13] hover:bg-white/[0.05] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]
                        transition-all duration-300">
                        <TilePulse />
                    </div>

                    {/* Tile 4: Radar (Full Width) */}
                    <div className="md:col-span-3 rounded-2xl overflow-hidden min-h-[300px]
                        bg-white/[0.03] backdrop-blur-2xl
                        border border-white/[0.07]
                        shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]
                        hover:border-white/[0.13] hover:bg-white/[0.05] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]
                        transition-all duration-300">
                        <TileRadar isAdmin={isAdmin} />
                    </div>

                </div>
            </main>

            {/* Shadow CoS AI FAB */}
            <button
                onClick={() => setShowNeural(true)}
                className="fixed bottom-8 right-8 w-14 h-14
                    bg-white/10 hover:bg-white/20 backdrop-blur-xl
                    border border-white/20 hover:border-white/40
                    text-white rounded-full
                    shadow-[0_0_30px_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.5)]
                    hover:shadow-[0_0_40px_rgba(255,255,255,0.18)]
                    flex items-center justify-center z-50
                    transition-all duration-300 hover:scale-110 active:scale-95"
            >
                <Sparkles className="w-6 h-6" />
            </button>

            {showNeural && <NeuralInterface onClose={() => setShowNeural(false)} />}

        </div>
    );
};
