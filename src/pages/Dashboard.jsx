import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { LogOut } from 'lucide-react';
import { TileCompass } from '../components/tiles/TileCompass';
import { TilePulse } from '../components/tiles/TilePulse';
import { TileTeam } from '../components/tiles/TileTeam';
import { TileRadar } from '../components/tiles/TileRadar';
import { NeuralInterface } from '../components/modules/Intelligence/NeuralInterface';

export const Dashboard = ({ user }) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await AuthService.logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-black p-4 md:p-8 font-sans selection:bg-zinc-800 relative text-gray-200">
            {/* Header */}
            <header className="max-w-7xl mx-auto mb-6 flex justify-between items-center border-b border-zinc-900 pb-4">
                <div>
                    <h1 className="text-xl font-mono font-bold tracking-tighter text-white">
                        QUINTA <span className="text-zinc-600">OS</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                            System Online • v4.0.0
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-6 text-xs font-mono">
                    <div className="text-zinc-500">
                        OPERATOR: <span className="text-white uppercase border-b border-zinc-800 pb-0.5">{user?.displayName || 'Unknown'}</span>
                    </div>
                    <button onClick={handleLogout} className="text-red-900 hover:text-red-500 transition-colors flex items-center gap-2 group">
                        <span className="hidden md:inline group-hover:underline">TERMINATE SESSION</span>
                        <LogOut className="w-3 h-3" />
                    </button>
                </div>
            </header>

            {/* Main Bento Grid */}
            <main className="max-w-7xl mx-auto pb-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[250px]">

                    {/* Tile 1: Compass (Top-Left, Wide) -> Span 2 */}
                    <div className="md:col-span-2 md:row-span-1 bg-zinc-950/30 backdrop-blur-md border border-zinc-800/60 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors">
                        <TileCompass />
                    </div>

                    {/* Tile 3: Team (Right, Tall) -> Span 1, Row 2 */}
                    <div className="md:col-span-1 md:row-span-2 bg-zinc-950/30 backdrop-blur-md border border-zinc-800/60 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors">
                        <TileTeam />
                    </div>

                    {/* Tile 2: Pulse (Middle, Square-ish) -> Span 2 */}
                    <div className="md:col-span-2 md:row-span-1 bg-zinc-950/30 backdrop-blur-md border border-zinc-800/60 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors">
                        <TilePulse />
                    </div>

                    {/* Tile 4: Radar (Bottom, Wide) -> Span 3 */}
                    <div className="md:col-span-3 md:row-span-1 bg-zinc-950/30 backdrop-blur-md border border-zinc-800/60 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors">
                        <TileRadar />
                    </div>

                </div>
            </main>

            {/* Shadow CoS AI Overlay */}
            <NeuralInterface />

            {/* Background Decor */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(20,20,20,1)_0%,rgba(0,0,0,1)_100%)]" />
        </div>
    );
};
