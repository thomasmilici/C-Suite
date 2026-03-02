import React, { useState, useEffect } from 'react';
import { useMission } from '../../context/MissionContext';
import { updateMission } from '../../services/missionService';
import { StatusPill } from '../ui/StatusPill';

export function TileSteeringFocus() {
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
                <StatusPill status={isSaving ? "Saving..." : "Active"} color={isSaving ? "amber" : "blue"} />
            </div>

            <div className="flex-1 flex flex-col gap-3">
                <p className="text-xs text-zinc-400 mb-2">Max 3 priorità operative per la giornata in corso.</p>

                {focuses.map((focus, index) => (
                    <div key={index} className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-lg p-2 focus-within:border-blue-500/50 transition-colors">
                        <span className="text-zinc-500 text-xs font-mono ml-1">{index + 1}.</span>
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
                ))}
            </div>

            <div className="mt-auto pt-4 flex justify-end">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest hidden group-hover:block transition-opacity">
                    {isSaving ? "Syncing..." : "Auto-saved on blur"}
                </p>
            </div>
        </div>
    );
}
