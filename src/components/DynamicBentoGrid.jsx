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

    // OPERATIONAL STATE: 3-Column Bento (PromptPal style)
    // Griglia fissa a 3 colonne, senza auto-flow e posizionamento denso staccato.
    // Ogni colonna ha flex-col e gap-6 per impilare blocchi ad altezza piena.

    return (
        <div className="w-full max-w-[1600px] mx-auto h-[calc(100vh-80px)] p-6 bg-[#0d111c] grid grid-cols-3 gap-6 relative">

            {/* COLONNA 1 (Sinistra) */}
            <div className="col-span-1 flex flex-col gap-6 h-full">
                {/* Hitl / Pending Actions (in cima) */}
                <div className="flex-1 min-h-0 flex flex-col">
                    <TileWrapper tileKey="AiPendingActionTop" tileProps={tileProps} />
                </div>
                {/* Decision Log (in basso) */}
                <div className="flex-1 min-h-0 flex flex-col">
                    <TileWrapper tileKey="TileDecisionLog" tileProps={tileProps} />
                </div>
            </div>

            {/* COLONNA 2 (Hero / Centro) */}
            {/* Questa colonna abbraccia la sfera al centro ("Hug Effect") */}
            <div className="col-span-1 flex flex-col gap-0 h-full relative items-center justify-between">

                {/* HUD Top: Steering Focus */}
                {/* Usa mask-image per tagliare il bordo inferiore a mezzaluna per far spazio alla sfera */}
                <div
                    className="w-full flex-1 min-h-0 flex flex-col pb-[120px]"
                    style={{
                        WebkitMaskImage: 'radial-gradient(circle at 50% calc(100% + 10px), transparent 130px, black 132px)',
                        maskImage: 'radial-gradient(circle at 50% calc(100% + 10px), transparent 130px, black 132px)',
                    }}
                >
                    <TileWrapper tileKey="TileSteeringFocus" tileProps={tileProps} />
                </div>

                {/* La Sfera Assoluta e Centrata */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none w-[240px] h-[240px] flex items-center justify-center bg-transparent">
                    <ShadowCosSphere isSpeaking={isSpeaking} />
                </div>

                {/* HUD Bottom: Pulse o Insight */}
                {/* Usa mask-image per tagliare il bordo superiore a mezzaluna inversa */}
                <div
                    className="w-full flex-1 min-h-0 flex flex-col pt-[120px]"
                    style={{
                        WebkitMaskImage: 'radial-gradient(circle at 50% -10px, transparent 130px, black 132px)',
                        maskImage: 'radial-gradient(circle at 50% -10px, transparent 130px, black 132px)',
                    }}
                >
                    <TileWrapper tileKey="TilePulse" tileProps={tileProps} />
                </div>

            </div>

            {/* COLONNA 3 (Destra) */}
            <div className="col-span-1 flex flex-col gap-6 h-full">
                {/* Radar (in cima) */}
                <div className="flex-1 min-h-0 flex flex-col">
                    <TileWrapper tileKey="TileRadar" tileProps={tileProps} />
                </div>
                {/* Strategic Themes o Briefing Room (in basso) */}
                <div className="flex-1 min-h-0 flex flex-col">
                    <TileWrapper tileKey="BriefingRoom" tileProps={tileProps} />
                </div>
            </div>

        </div>
    );
}
