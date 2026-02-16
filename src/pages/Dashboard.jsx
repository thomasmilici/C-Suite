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
        <div className="min-h-screen bg-black p-4 md:p-8 font-sans selection:bg-zinc-800 relative text-gray-200 overflow-x-hidden">
            {/* Background Decor */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(20,20,20,1)_0%,rgba(0,0,0,1)_100%)]" />

            {/* Header */}
            <header className="max-w-7xl mx-auto mb-6 flex justify-between items-center border-b border-zinc-900 pb-4 backdrop-blur-sm sticky top-0 z-20 bg-black/50">
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
                        <button onClick={() => navigate('/admin')} className="text-red-500 hover:text-red-400 flex items-center gap-1 border border-red-900/50 bg-red-900/10 px-2 py-1 rounded transition-colors">
                            <Shield className="w-3 h-3" /> ADMIN
                        </button>
                    )}
                    <div className="text-zinc-500 hidden sm:block">
                        OP: <span className="text-white uppercase border-b border-zinc-800 pb-0.5">{user?.displayName || 'Unknown'}</span>
                    </div>
                    <button onClick={handleLogout} className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 group">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Main Bento Grid */}
            <main className="max-w-7xl mx-auto pb-24 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">

                    {/* Tile 1: Compass (Top-Left, Wide) -> Strategy & OKRs */}
                    <div className="md:col-span-2 md:row-span-1 bg-zinc-950/40 backdrop-blur-md border border-zinc-800/60 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors shadow-lg">
                        <TileCompass />
                    </div>

                    {/* Tile 3: Team (Right, Tall) -> Leaderboard */}
                    <div className="md:col-span-1 md:row-span-2 bg-zinc-950/40 backdrop-blur-md border border-zinc-800/60 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors shadow-lg flex flex-col">
                        <TileTeam />
                    </div>

                    {/* Tile 2: Pulse (Middle, Square-ish) -> Focus */}
                    <div className="md:col-span-2 md:row-span-1 bg-zinc-950/40 backdrop-blur-md border border-zinc-800/60 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors shadow-lg">
                        <TilePulse />
                    </div>

                    {/* Tile 4: Radar (Bottom, Wide) -> Signals */}
                    <div className="md:col-span-3 md:row-span-1 bg-zinc-950/40 backdrop-blur-md border border-zinc-800/60 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors shadow-lg min-h-[220px]">
                        <TileRadar />
                    </div>

                </div>
            </main>

            {/* Shadow CoS AI Overlay Toggle (FAB) */}
            <button
                onClick={() => setShowNeural(true)}
                className="fixed bottom-8 right-8 w-14 h-14 bg-zinc-100 hover:bg-white text-black rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center z-50 transition-transform hover:scale-110 active:scale-95"
            >
                <Sparkles className="w-6 h-6" />
            </button>

            {/* Neural Interface Overlay */}
            {showNeural && <NeuralInterface onClose={() => setShowNeural(false)} />}

        </div>
    );
};
