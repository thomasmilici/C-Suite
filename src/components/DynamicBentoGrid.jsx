import React from 'react';
import { useMission } from '../context/MissionContext';
import { ShadowCosSphere } from './ui/ShadowCosSphere';
import { OnboardingTaskTile } from './tiles/OnboardingTaskTile';
import { TileCompass } from './tiles/TileCompass';
import { TilePulse } from './tiles/TilePulse';
import { TileRadar } from './tiles/TileRadar';
import { TileIntelligence } from './tiles/TileIntelligence';
import { TileDecisionLog } from './tiles/TileDecisionLog';
import { TileSteeringFocus } from './tiles/TileSteeringFocus';
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
    TileSteeringFocus: ({ props }) => <TileSteeringFocus {...props} />,
    AiPendingActionTop: ({ props }) => <AiPendingActionTile position="top" {...props} />,
    AiPendingActionBot: ({ props }) => <AiPendingActionTile position="bottom" {...props} />,
    ProactiveAlerts: ({ props }) => <ProactiveAlerts {...props} />,
    BriefingRoom: ({ props }) => <BriefingRoom {...props} />,
};

// Fixed positions in the bento grid (0-indexed, center = position 4 in a 3×3 = always the sphere)
// Layout is: [TL, TC, TR, ML, *CENTER*, MR, BL, BC, BR]
// We expose 4 positions: 0,1,2,3 (before center) and 4,5,6,7 (after center) for up to 8 tiles
const FALLBACK_LAYOUT = ['TileRadar', 'AiPendingActionTop', 'TileSteeringFocus', 'TileCompass', 'TilePulse', 'TileDecisionLog', 'BriefingRoom'];

const cardClass = "bg-[#161b2b] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_8px_20px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden flex flex-col w-full h-full";

function TileWrapper({ tileKey, tileProps, innerClass = "p-6" }) {
    const Tile = TILE_REGISTRY[tileKey];
    if (!Tile) {
        return (
            <div className={`${cardClass} items-center justify-center`}>
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">{tileKey}</p>
            </div>
        );
    }
    return (
        <div className={cardClass}>
            <div className={`flex-1 overflow-y-auto thin-scroll relative ${innerClass}`}>
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

    // OPERATIONAL STATE: PromptPal Layout Match
    // Griglia fissa a 4 colonne e 2 righe.
    // Il gap della griglia è "gap-6" = 24px (12px per lato verso il centro).
    // La Sfera animata (anello cyan) ha raggio visivo 96px.
    // L'alone della sfera completa a raggio 120px. 
    // Per far coincidere perfettamente spazio visivo e clip, il raggio della maschera sarà 120px.
    // Posizioni dei centri calcolate matematicamente per combaciare coi 24px di gap.

    const radius = 120;
    const offset = 12; // Metà di gap-6 (24px)

    // Top Card: Taglio centrato orizzontalmente, sfonda il basso di 12px (offset)
    const hudTopMask = `radial-gradient(circle at 50% calc(100% + ${offset}px), transparent ${radius}px, black ${radius + 1}px)`;

    // Bot Left Card (Col 2): Taglio in alto a destra. Centro del taglio è fuori dalla card a destra di 12px e sopra di 12px.
    const hudBottomLeftMask = `radial-gradient(circle at calc(100% + ${offset}px) -${offset}px, transparent ${radius}px, black ${radius + 1}px)`;

    // Bot Right Card (Col 3): Taglio in alto a sinistra. Centro del taglio è fuori dalla card a sinistra di 12px e sopra di 12px.
    const hudBottomRightMask = `radial-gradient(circle at -${offset}px -${offset}px, transparent ${radius}px, black ${radius + 1}px)`;

    return (
        <div className="w-full max-w-[1600px] mx-auto h-[calc(100vh-80px)] p-6 bg-[#0d111c] grid grid-cols-4 grid-rows-2 gap-6 relative">

            {/* LA SFERA AI AL CENTRO ASSOLUTO (Sopra tutto) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none w-[240px] h-[240px] flex items-center justify-center bg-transparent">
                <ShadowCosSphere isSpeaking={isSpeaking} />
            </div>

            {/* --- RIGA 1 --- */}

            {/* Colonna 1: Top Left */}
            <div className="col-start-1 col-span-1 row-start-1 h-full min-h-0">
                <TileWrapper tileKey="AiPendingActionTop" tileProps={tileProps} />
            </div>

            {/* Colonna 2+3: Top Center (Larga) - Tagliata in basso per la sfera */}
            <div
                className="col-start-2 col-span-2 row-start-1 h-full min-h-0"
                style={{
                    WebkitMaskImage: hudTopMask,
                    maskImage: hudTopMask,
                }}
            >
                <TileWrapper tileKey="BriefingRoom" tileProps={tileProps} innerClass={`p-6 pb-[120px]`} />
            </div>

            {/* Colonna 4: Top Right */}
            <div className="col-start-4 col-span-1 row-start-1 h-full min-h-0">
                <TileWrapper tileKey="TileRadar" tileProps={tileProps} />
            </div>


            {/* --- RIGA 2 --- */}

            {/* Colonna 1: Bottom Left */}
            <div className="col-start-1 col-span-1 row-start-2 h-full min-h-0">
                <TileWrapper tileKey="TileSteeringFocus" tileProps={tileProps} />
            </div>

            {/* Colonna 2: Bottom Center-Left - Tagliata in alto a destra */}
            <div
                className="col-start-2 col-span-1 row-start-2 h-full min-h-0"
                style={{
                    WebkitMaskImage: hudBottomLeftMask,
                    maskImage: hudBottomLeftMask,
                }}
            >
                <TileWrapper tileKey="TilePulse" tileProps={tileProps} innerClass="p-6 pt-[120px]" />
            </div>

            {/* Colonna 3: Bottom Center-Right - Tagliata in alto a sinistra */}
            <div
                className="col-start-3 col-span-1 row-start-2 h-full min-h-0"
                style={{
                    WebkitMaskImage: hudBottomRightMask,
                    maskImage: hudBottomRightMask,
                }}
            >
                <TileWrapper tileKey="TileDecisionLog" tileProps={tileProps} innerClass="p-6 pt-[120px]" />
            </div>

            {/* Colonna 4: Bottom Right */}
            <div className="col-start-4 col-span-1 row-start-2 h-full min-h-0">
                <TileWrapper tileKey="TileCompass" tileProps={tileProps} />
            </div>

        </div>
    );
}
