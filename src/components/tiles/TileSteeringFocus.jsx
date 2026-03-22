import React, { useState, useEffect } from 'react';
import { useMission } from '../../context/MissionContext';
import { updateMission } from '../../services/missionService';
import { StatusPill } from '../ui/StatusPill';
import { checkCorrelation } from '../../utils/correlations';

export function TileSteeringFocus({ activeStrategyNode, setActiveStrategyNode, extras }) {
    const { mission, activeMissionId } = useMission();
    const [focuses, setFocuses] = useState(['', '', '']);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize from mission data
    useEffect(() => {
        if (mission?.daily_focus) {
            const dbFocuses = Array.isArray(mission.daily_focus) ? mission.daily_focus : [];
            // Ensure exactly 3 slots
            const padded = [...dbFocuses, '', '', ''].slice(0, 3);
            setFocuses(padded);
        } else {
            setFocuses(['', '', '']);
        }
    }, [mission?.daily_focus]);

    const handleFocusChange = (index, value) => {
        const newFocuses = [...focuses];
        newFocuses[index] = value;
        setFocuses(newFocuses);
    };

    const handleSave = async () => {
        if (!activeMissionId) return;
        setIsSaving(true);
        try {
            // Trim empty strings before saving, but keep the array length flexible
            const cleanFocuses = focuses.map(f => f.trim());
            await updateMission(activeMissionId, { daily_focus: cleanFocuses });
        } catch (error) {
            console.error("Failed to save daily focuses", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e) => {
        // Save on Enter
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                    <h3 className="text-sm font-semibold tracking-wide text-white">Daily Steering Focus</h3>
                </div>
                <div className="flex items-center gap-2">
                    {extras?.accountability?.[0] && (
                        <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full border border-white/10" title="Accountability Owner">
                            <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[9px] font-bold border border-indigo-500/50">
                                {extras.accountability[0].ownerName ? extras.accountability[0].ownerName.charAt(0).toUpperCase() : '?'}
                            </div>
                        </div>
                    )}
                    <StatusPill status={isSaving ? "Saving..." : "Active"} color={isSaving ? "amber" : "blue"} />
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-3">
                <p className="text-xs text-zinc-400 mb-2">Max 3 priorità operative per la giornata in corso.</p>

                {focuses.map((focus, index) => {
                    const myId = focus || `empty_${index}`;
                    const isFocused = activeStrategyNode?.id === myId && activeStrategyNode?.type === 'priority';
                    const isRelated = checkCorrelation(myId, 'priority', activeStrategyNode);
                    const isUnrelated = activeStrategyNode && !isFocused && !isRelated;

                    return (
                        <div 
                            key={index} 
                            onMouseEnter={() => focus && setActiveStrategyNode?.({ id: focus, type: 'priority' })}
                            onMouseLeave={() => focus && setActiveStrategyNode?.(null)}
                            className={`flex flex-col gap-2 rounded-lg p-2 transition-all duration-300 ${isUnrelated ? 'opacity-30 grayscale' : 'opacity-100'} ${isFocused ? 'bg-blue-900/20 ring-1 ring-blue-500/50' : 'bg-white/5 border border-white/5'} ${isRelated ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] border border-blue-400/30 bg-blue-500/5' : ''}`}
                        >
                            <div className="flex items-center gap-3 w-full">
                                <span className={`text-xs font-mono ml-1 transition-colors ${isRelated ? 'text-blue-400' : 'text-zinc-500'}`}>
                                    {isRelated ? '●' : `${index + 1}.`}
                                </span>
                                <input
                                    type="text"
                                    value={focus}
                                    onChange={(e) => handleFocusChange(index, e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={handleSave}
                                    placeholder={`Focus prioritario ${index + 1}...`}
                                    className="bg-transparent border-none outline-none text-sm text-zinc-200 placeholder:text-zinc-600 w-full flex-1"
                                    disabled={isSaving}
                                />
                            </div>
                            
                            {/* Inline Actions (Human in the loop) */}
                            {isFocused && (
                                <div className="mt-1 pl-6 pr-2 animate-fade-in flex items-center justify-between">
                                    <span className="text-[10px] text-blue-300/80 font-mono">⚡ AI Pattern Detect: High Leverage</span>
                                    <div className="flex gap-2">
                                        <button className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white text-[9px] uppercase tracking-wider font-bold rounded shadow-[0_0_8px_rgba(37,99,235,0.4)] transition-colors">Go</button>
                                        <button className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[9px] uppercase tracking-wider font-bold rounded transition-colors">No-Go</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-auto pt-4 flex justify-end">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest hidden group-hover:block transition-opacity">
                    {isSaving ? "Syncing..." : "Auto-saved on blur"}
                </p>
            </div>
        </div>
    );
}
