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

    // OPERATIONAL STATE: Bento Grid with sphere anchored at center
    return (
        <div className="w-full max-w-[1600px] mx-auto h-[calc(100vh-80px)] p-6 bg-[#0d111c] flex flex-col gap-4">
            {/* TOP ROW */}
            <div className="flex gap-4" style={{ height: '45%' }}>
                {topTiles[0] && (
                    <div className="flex-1">
                        <TileWrapper tileKey={topTiles[0]} tileProps={tileProps} />
                    </div>
                )}
                <div className="flex-1">
                    {/* THE TOP CENTER CARD with cutout */}
                    <div
                        className={`${cardClass} p-6 pb-[140px] w-full h-full`}
                        style={{
                            WebkitMaskImage: 'radial-gradient(circle at 50% calc(100% + 8px), transparent 135px, black 136px)',
                            maskImage: 'radial-gradient(circle at 50% calc(100% + 8px), transparent 135px, black 136px)',
                        }}
                    >
                        {topTiles[1] ? <TileWrapper tileKey={topTiles[1]} tileProps={tileProps} /> : null}
                    </div>
                </div>
                {topTiles[2] && (
                    <div className="flex-1">
                        <TileWrapper tileKey={topTiles[2]} tileProps={tileProps} />
                    </div>
                )}
            </div>

            {/* MIDDLE ROW — Sphere + side tiles */}
            <div className="relative flex gap-4" style={{ height: '10%' }}>
                {/* Sphere absolutely centered across the two rows */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none w-[240px] h-[240px] flex items-center justify-center">
                    <ShadowCosSphere isSpeaking={isSpeaking} />
                </div>
                {leftTile && <div className="flex-1"><TileWrapper tileKey={leftTile} tileProps={tileProps} /></div>}
                {/* Spacer for sphere */}
                <div style={{ width: 240, flexShrink: 0 }} />
                {rightTile && <div className="flex-1"><TileWrapper tileKey={rightTile} tileProps={tileProps} /></div>}
            </div>

            {/* BOTTOM ROW */}
            <div className="flex gap-4" style={{ height: '45%' }}>
                {botTiles[0] && (
                    <div className="flex-1">
                        <TileWrapper tileKey={botTiles[0]} tileProps={tileProps} />
                    </div>
                )}
                {/* Bottom center — two cards with cutouts */}
                <div className="flex-1 flex gap-4">
                    <div
                        className={`${cardClass} p-6 pt-[140px] flex-1 h-full`}
                        style={{
                            WebkitMaskImage: 'radial-gradient(circle at calc(100% + 8px) -8px, transparent 135px, black 136px)',
                            maskImage: 'radial-gradient(circle at calc(100% + 8px) -8px, transparent 135px, black 136px)',
                        }}
                    >
                        {botTiles[1] ? <TileWrapper tileKey={botTiles[1]} tileProps={tileProps} /> : null}
                    </div>
                    <div
                        className={`${cardClass} p-6 pt-[140px] flex-1 h-full`}
                        style={{
                            WebkitMaskImage: 'radial-gradient(circle at -8px -8px, transparent 135px, black 136px)',
                            maskImage: 'radial-gradient(circle at -8px -8px, transparent 135px, black 136px)',
                        }}
                    >
                        {botTiles[2] ? <TileWrapper tileKey={botTiles[2]} tileProps={tileProps} /> : null}
                    </div>
                </div>
                {botTiles[3] && (
                    <div className="flex-1">
                        <TileWrapper tileKey={botTiles[3]} tileProps={tileProps} />
                    </div>
                )}
            </div>
        </div>
    );
}
