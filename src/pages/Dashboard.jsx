import React from 'react';
import { BentoGrid, BentoGridItem } from '../components/ui/BentoGrid';
import { FocusLock } from '../components/modules/Pulse/FocusLock';
import { RadarGraph } from '../components/modules/Radar/RadarGraph';
import { TeamRanking } from '../components/modules/Team/TeamRanking';
import { Compass } from '../components/modules/Compass/Compass';
import { BriefingRoom } from '../components/modules/Briefing/BriefingRoom';
import { AccessQR } from '../components/modules/Team/AccessQR';
import { NeuralInterface } from '../components/modules/Intelligence/NeuralInterface';
import { LogOut } from 'lucide-react';
import { AuthService } from '../services/authService';
import { useNavigate } from 'react-router-dom';

// Mock data for Radar
const radarData = {
    nodes: [
        { id: 'CEO', group: 1, color: '#FFFFFF' },
        { id: 'CTO', group: 1, color: '#E0E0E0' },
        { id: 'CFO', group: 1, color: '#E0E0E0' },
        { id: 'CMO', group: 1, color: '#E0E0E0' },
        { id: 'Board', group: 2, color: '#FF0000' },
        { id: 'Investors', group: 2, color: '#FF0000' },
        { id: 'Key Client A', group: 3, color: '#00FF00' },
    ],
    links: [
        { source: 'CEO', target: 'CTO' },
        { source: 'CEO', target: 'CFO' },
        { source: 'CEO', target: 'CMO' },
        { source: 'CEO', target: 'Board' },
        { source: 'CFO', target: 'Investors' },
        { source: 'CMO', target: 'Key Client A' },
    ]
};

export const Dashboard = ({ user }) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await AuthService.logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-black p-4 md:p-8 font-sans selection:bg-zinc-800 relative">
            <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center border-b border-zinc-900 pb-4">
                <div>
                    <h1 className="text-xl font-mono font-bold tracking-tighter text-white">
                        QUINTA <span className="text-gray-600">OS</span>
                    </h1>
                    <p className="text-xs text-gray-500 font-mono mt-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        SYSTEM ONLINE • v.3.0.0
                    </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="text-gray-600">Operator: <span className="text-white uppercase">{user?.displayName || 'Unknown'}</span></div>
                    <button onClick={handleLogout} className="text-red-500 hover:text-red-400 transition-colors flex items-center gap-1">
                        <LogOut className="w-3 h-3" /> Logout
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto pb-12">
                <BentoGrid className="md:auto-rows-[22rem]">
                    {/* The Compass - Strategy */}
                    <BentoGridItem
                        title="The Compass"
                        description="Strategic Alignment & OKR Tracking"
                        header={<Compass />}
                        className="md:col-span-1"
                    />

                    {/* The Pulse - Daily Ops */}
                    <BentoGridItem
                        title="The Pulse"
                        description="Daily Focus & Priority Lock"
                        header={<FocusLock />}
                        className="md:col-span-1"
                    />

                    {/* The Radar - Stakeholders */}
                    <BentoGridItem
                        title="The Radar"
                        description="Stakeholder Intelligence Network"
                        header={<RadarGraph data={radarData} />}
                        className="md:col-span-1"
                    />

                    {/* The Briefing Room - Outcomes */}
                    <BentoGridItem
                        title="Briefing Room"
                        description="Decision Logs & Outcomes"
                        header={<BriefingRoom />}
                        className="md:col-span-1"
                    />

                    {/* Team Ranking - Gamified Leadership */}
                    <BentoGridItem
                        title="Tactical Team"
                        description="Live Agent Performance Ranking"
                        header={<TeamRanking />}
                        className="md:col-span-1"
                    />

                    {/* Access QR - Onboarding */}
                    <BentoGridItem
                        title="Access Protocol"
                        description="Secure Onboarding & Auth Token"
                        header={<AccessQR />}
                        className="md:col-span-1"
                    />
                </BentoGrid>
            </main>

            {/* Shadow CoS AI */}
            <NeuralInterface />
        </div>
    );
};
