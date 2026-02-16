import React from 'react';
import { Trophy } from 'lucide-react';
import { cn } from '../../../utils/cn';

const mockTeamData = [
    { id: 1, name: "Alex Chen", role: "Strat Analyst", quality: 4.8, speed: 4.5, accuracy: 4.9, points: 1250, rank: 1 },
    { id: 2, name: "Sarah Jones", role: "Ops Lead", quality: 4.6, speed: 4.8, accuracy: 4.5, points: 1180, rank: 2 },
    { id: 3, name: "Mike Ross", role: "Legal", quality: 4.9, speed: 4.2, accuracy: 4.7, points: 1150, rank: 3 },
    { id: 4, name: "Jessica P.", role: "PR", quality: 4.5, speed: 4.6, accuracy: 4.4, points: 1020, rank: 4 },
];

export const TeamRanking = () => {
    return (
        <div className="h-full w-full bg-black rounded-xl overflow-hidden border border-zinc-800 flex flex-col font-mono text-sm relative">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                <h2 className="text-gray-400 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" /> Tactical Team Leaderboard
                </h2>
                <span className="text-[10px] text-green-500 animate-pulse">● Live</span>
            </div>

            <div className="flex-grow overflow-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-zinc-800 text-gray-500 text-[10px] uppercase bg-zinc-900/30">
                            <th className="p-3 font-normal w-12 text-center">#</th>
                            <th className="p-3 font-normal">Agent</th>
                            <th className="p-3 font-normal text-right hidden sm:table-cell">Score</th>
                            <th className="p-3 font-normal text-center w-8" title="Quality">Q</th>
                            <th className="p-3 font-normal text-center w-8" title="Speed">S</th>
                            <th className="p-3 font-normal text-center w-8" title="Accuracy">A</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockTeamData.map((member, idx) => (
                            <tr key={member.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/40 transition-colors group">
                                <td className="p-3 text-center font-bold text-gray-400 group-hover:text-white transition-colors">
                                    {member.rank === 1 ? <Trophy className="w-3 h-3 mx-auto text-yellow-500" /> : member.rank}
                                </td>
                                <td className="p-2">
                                    <div className="font-bold text-gray-200 text-xs">{member.name}</div>
                                    <div className="text-[10px] text-gray-600 uppercase">{member.role}</div>
                                </td>
                                <td className="p-3 text-right font-mono text-green-400 hidden sm:table-cell">
                                    {member.points}
                                </td>
                                <td className="p-2 text-center align-middle">
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <div className={cn("w-1.5 h-1.5 rounded-full mb-1", member.quality >= 4.8 ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-yellow-500/50")}></div>
                                        <span className="text-[9px] text-zinc-500">{member.quality}</span>
                                    </div>
                                </td>
                                <td className="p-2 text-center align-middle">
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <div className={cn("w-1.5 h-1.5 rounded-full mb-1", member.speed >= 4.8 ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-yellow-500/50")}></div>
                                        <span className="text-[9px] text-zinc-500">{member.speed}</span>
                                    </div>
                                </td>
                                <td className="p-2 text-center align-middle">
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <div className={cn("w-1.5 h-1.5 rounded-full mb-1", member.accuracy >= 4.8 ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-yellow-500/50")}></div>
                                        <span className="text-[9px] text-zinc-500">{member.accuracy}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
