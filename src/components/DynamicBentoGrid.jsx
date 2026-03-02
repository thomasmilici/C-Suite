import React from 'react';
import { useMission } from '../context/MissionContext';
import { ShadowCosSphere } from './ui/ShadowCosSphere';
import { OnboardingTaskTile } from './tiles/OnboardingTaskTile';
import { TileCompass } from './tiles/TileCompass';
import { TilePulse } from './tiles/TilePulse';
import { TileRadar } from './tiles/TileRadar';
import { TileIntelligence } from './tiles/TileIntelligence';
import { TileDecisionLog } from './tiles/TileDecisionLog';
import { AiPendingActionTile } from './AiPendingActionTile';
import { ProactiveAlerts } from './modules/Intelligence/ProactiveAlerts';
import { BriefingRoom } from './modules/Briefing/BriefingRoom';

// Registry: layoutPreferences string → React component
const TILE_REGISTRY = {
    TileRadar: ({ props }) => <TileRadar {...props} />,
    TilePulse: ({ props }) => <TilePulse {...props} />,
    TileCompass: ({ props }) => <TileCompass {...props} />,
    TileDecisionLog: ({ props }) => <TileDecisionLog {...props} />,
    TileIntelligence: ({ props }) => <TileIntelligence {...props} />,
    AiPendingActionTop: ({ props }) => <AiPendingActionTile position="top" {...props} />,
    AiPendingActionBot: ({ props }) => <AiPendingActionTile position="bottom" {...props} />,
    ProactiveAlerts: ({ props }) => <ProactiveAlerts {...props} />,
    BriefingRoom: ({ props }) => <BriefingRoom {...props} />,
};

// Fixed positions in the bento grid (0-indexed, center = position 4 in a 3×3 = always the sphere)
// Layout is: [TL, TC, TR, ML, *CENTER*, MR, BL, BC, BR]
// We expose 4 positions: 0,1,2,3 (before center) and 4,5,6,7 (after center) for up to 8 tiles
const FALLBACK_LAYOUT = ['TileRadar', 'AiPendingActionTop', 'TileCompass', 'TilePulse', 'TileDecisionLog', 'BriefingRoom'];

const cardClass = "bg-[#161b2b] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_8px_20px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden flex flex-col";

function TileWrapper({ tileKey, tileProps }) {
    const Tile = TILE_REGISTRY[tileKey];
    if (!Tile) {
        return (
            <div className={`${cardClass} items-center justify-center p-4`}>
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">{tileKey}</p>
            </div>
        );
    }
    return (
        <div className={`${cardClass} p-4`}>
            <div className="flex-1 overflow-y-auto thin-scroll">
                <Tile props={tileProps} />
            </div>
        </div>
    );
}

export function DynamicBentoGrid({ user, isAdmin, isSpeaking = false, onOpenSignal, onOpenOKR }) {
    const { mission, isSetupComplete } = useMission();

    // Build the 8-slot tile list (sphere always lives in center slot between these)
    const prefs = (mission?.layoutPreferences?.length > 0)
        ? mission.layoutPreferences
        : FALLBACK_LAYOUT;

    const topTiles = prefs.slice(0, 3);    // up to 3 tiles above sphere row
    const leftTile = prefs[3] || null;     // left of sphere
    const rightTile = prefs[4] || null;     // right of sphere
    const botTiles = prefs.slice(5, 8);   // up to 3 tiles below sphere row

    const tileProps = { user, isAdmin, onOpenSignal, onOpenOKR };

    if (!isSetupComplete) {
        // ONBOARDING STATE: Show OnboardingTaskTile prominently in the top-center
        return (
            <div className="w-full max-w-[1600px] mx-auto h-[calc(100vh-80px)] p-6 bg-[#0d111c] grid grid-cols-3 grid-rows-2 gap-4">
                {/* Top Left placeholder */}
                <div className={`${cardClass} items-center justify-center opacity-20`}>
                    <div className="w-8 h-8 rounded-full border border-white/10" />
                </div>

                {/* Top Center — Onboarding CTA */}
                <div className="row-span-2 col-start-2 row-start-1">
                    <OnboardingTaskTile missionName={mission?.name} />
                </div>

                {/* Top Right placeholder */}
                <div className={`${cardClass} items-center justify-center opacity-20`}>
                    <div className="w-8 h-8 rounded-full border border-white/10" />
                </div>

                {/* Bottom Left placeholder */}
                <div className={`${cardClass} items-center justify-center opacity-20`}>
                    <div className="w-8 h-8 rounded-full border border-white/10" />
                </div>

                {/* Bottom Right placeholder */}
                <div className={`${cardClass} items-center justify-center opacity-20`}>
                    <div className="w-8 h-8 rounded-full border border-white/10" />
                </div>
            </div>
        );
    }

    // OPERATIONAL STATE: Smartphone-style static Grid
    // The grid is a 3x3 layout. The center cell (grid-area: 2 / 2) is strictly reserved for the AI sphere.
    // We map up to 8 preferences to the 8 remaining outer slots.

    // Define the 8 available slots in a predictable order (e.g. reading order, skipping center)
    const slotMap = [
        { gridColumn: 1, gridRow: 1 }, // Slot 0: Top Left
        { gridColumn: 2, gridRow: 1 }, // Slot 1: Top Center
        { gridColumn: 3, gridRow: 1 }, // Slot 2: Top Right
        { gridColumn: 1, gridRow: 2 }, // Slot 3: Middle Left
        { gridColumn: 3, gridRow: 2 }, // Slot 4: Middle Right
        { gridColumn: 1, gridRow: 3 }, // Slot 5: Bottom Left
        { gridColumn: 2, gridRow: 3 }, // Slot 6: Bottom Center
        { gridColumn: 3, gridRow: 3 }, // Slot 7: Bottom Right
    ];

    return (
        <div className="w-full max-w-[1600px] mx-auto h-[calc(100vh-80px)] p-6 bg-[#0d111c] grid grid-cols-3 grid-rows-3 gap-4 relative">

            {/* 1. Map tiles strictly to their designated slots */}
            {slotMap.map((pos, index) => {
                const tileKey = prefs[index];
                if (!tileKey) return null; // Slot remains empty if no tile assigned

                return (
                    <div
                        key={`${tileKey}-${index}`}
                        className="w-full h-full flex flex-col"
                        style={{ gridColumn: pos.gridColumn, gridRow: pos.gridRow }}
                    >
                        <TileWrapper tileKey={tileKey} tileProps={tileProps} />
                    </div>
                );
            })}

            {/* 2. Absolute center slot reserved exclusively for the AI Sphere */}
            <div
                className="flex items-center justify-center relative w-full h-full pointer-events-none z-50"
                style={{ gridColumn: 2, gridRow: 2 }}
            >
                {/* Visual anchor / hole reserved for the sphere */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] flex items-center justify-center">
                    <ShadowCosSphere isSpeaking={isSpeaking} />
                </div>
            </div>

        </div>
    );
}
