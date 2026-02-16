import React from 'react';
import { Shield, Users, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Admin = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-black p-8 text-white font-mono">
            <header className="flex justify-between items-center mb-12 border-b border-zinc-800 pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-900/20 border border-red-900/50 rounded flex items-center justify-center">
                        <Shield className="w-5 h-5 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-widest">ADMIN CONSOLE</h1>
                </div>
                <button onClick={() => navigate('/dashboard')} className="text-zinc-500 hover:text-white transition-colors">
                    EXIT TO DASHBOARD
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Invite System */}
                <div className="border border-zinc-800 bg-zinc-950 p-6 rounded-xl">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-zinc-400">
                        <QrCode className="w-5 h-5" /> ACCESS CONTROL
                    </h2>
                    <div className="bg-zinc-900 p-4 rounded text-center mb-4 border border-zinc-800 border-dashed">
                        <p className="text-xs text-zinc-500 mb-2">ACTIVE INVITE TOKEN</p>
                        <p className="text-xl font-bold text-white tracking-widest">GENESIS-TOKEN-001</p>
                    </div>
                    <button className="w-full bg-white text-black py-3 font-bold rounded hover:bg-gray-200 transition-colors">
                        GENERATE NEW TOKEN
                    </button>
                </div>

                {/* Team Roster */}
                <div className="border border-zinc-800 bg-zinc-950 p-6 rounded-xl">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-zinc-400">
                        <Users className="w-5 h-5" /> ROSTER MANAGEMENT
                    </h2>
                    <p className="text-zinc-600 text-sm italic">
                        User management module loaded. Listing active operatives...
                    </p>
                    {/* List would go here */}
                </div>
            </div>
        </div>
    );
};
