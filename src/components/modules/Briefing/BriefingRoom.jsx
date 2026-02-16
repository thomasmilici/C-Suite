import React from 'react';
import { FileText, ArrowRight } from 'lucide-react';

export const BriefingRoom = () => {
    return (
        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl h-full relative overflow-hidden group flex flex-col">
            <div className="absolute top-0 right-0 p-4 opacity-50">
                <FileText className="w-24 h-24 text-zinc-900 rotate-12" />
            </div>

            <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-4 font-mono z-10">The Briefing Room</h2>

            <div className="flex-grow z-10">
                <div className="text-3xl font-mono text-white mb-1 tracking-tighter">DECISION LOG</div>
                <p className="text-gray-500 text-xs mb-6 font-mono">Last entry: Today, 09:30 AM</p>

                <div className="space-y-3 font-mono">
                    <div className="bg-black/80 backdrop-blur-sm p-3 rounded border-l-2 border-green-500 text-xs text-gray-300">
                        <span className="text-green-500 font-bold block mb-1">APPROVED</span>
                        Q2 Hiring Plan for Engineering Team
                    </div>
                    <div className="bg-black/80 backdrop-blur-sm p-3 rounded border-l-2 border-yellow-500 text-xs text-gray-300">
                        <span className="text-yellow-500 font-bold block mb-1">PENDING</span>
                        Vendor Selection for Cloud Infrastructure
                    </div>
                </div>
            </div>

            <div className="mt-auto z-10 flex justify-end">
                <button className="text-xs text-white flex items-center gap-2 hover:gap-3 transition-all font-mono uppercase">
                    Open Archive <ArrowRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};
