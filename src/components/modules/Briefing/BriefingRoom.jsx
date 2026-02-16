import React from 'react';
import { FileText, ArrowRight } from 'lucide-react';

export const BriefingRoom = () => {
    return (
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.07] p-7 rounded-2xl h-full relative overflow-hidden flex flex-col
            shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="absolute top-0 right-0 p-6 opacity-30 pointer-events-none">
                <FileText className="w-28 h-28 text-zinc-700 rotate-12" />
            </div>

            <h2 className="text-zinc-400 text-xs uppercase tracking-widest mb-5 font-mono z-10 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-blue-400" /> The Briefing Room
            </h2>

            <div className="flex-grow z-10">
                <div className="text-3xl font-mono text-white mb-1 tracking-tighter">DECISION LOG</div>
                <p className="text-zinc-500 text-xs mb-6 font-mono">Last entry: Today, 09:30 AM</p>

                <div className="space-y-3 font-mono">
                    <div className="bg-white/[0.02] backdrop-blur-sm p-4 rounded-xl border border-white/[0.05] border-l-2 border-l-emerald-500 text-xs text-zinc-300">
                        <span className="text-emerald-400 font-bold block mb-1 tracking-wider">APPROVED</span>
                        Q2 Hiring Plan for Engineering Team
                    </div>
                    <div className="bg-white/[0.02] backdrop-blur-sm p-4 rounded-xl border border-white/[0.05] border-l-2 border-l-yellow-500 text-xs text-zinc-300">
                        <span className="text-yellow-400 font-bold block mb-1 tracking-wider">PENDING</span>
                        Vendor Selection for Cloud Infrastructure
                    </div>
                </div>
            </div>

            <div className="mt-auto z-10 flex justify-end">
                <button className="text-xs text-zinc-400 hover:text-white flex items-center gap-2 hover:gap-3 transition-all font-mono uppercase">
                    Open Archive <ArrowRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};
