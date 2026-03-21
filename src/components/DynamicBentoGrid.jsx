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
import { mapStrategyToGrid } from '../utils/mapStrategyToGrid';

// ── TILE REGISTRY ──────────────────────────────────────────────────────────────
// Maps the string keys returned by mapStrategyToGrid to React components.
// Add new tiles here without touching the layout logic.
const TILE_REGISTRY = {
    TileRadar:           ({ props }) => <TileRadar {...props} />,
    TilePulse:           ({ props }) => <TilePulse {...props} />,
    TileCompass:         ({ props }) => <TileCompass {...props} />,
    TileDecisionLog:     ({ props }) => <TileDecisionLog {...props} />,
    TileIntelligence:    ({ props }) => <TileIntelligence {...props} />,
    TileSteeringFocus:   ({ props }) => <TileSteeringFocus {...props} />,
    AiPendingActionTop:  ({ props }) => <AiPendingActionTile position="top" {...props} />,
    AiPendingActionBot:  ({ props }) => <AiPendingActionTile position="bottom" {...props} />,
    ProactiveAlerts:     ({ props }) => <ProactiveAlerts {...props} />,
    BriefingRoom:        ({ props }) => <BriefingRoom {...props} />,
};

// ── SHARED CARD STYLE ──────────────────────────────────────────────────────────
const cardClass = "bg-[#161b2b] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_8px_20px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden flex flex-col w-full h-full";

// ── TILE WRAPPER ───────────────────────────────────────────────────────────────
// Renders a single tile inside its glass card shell.
// The parent grid slot class controls positioning — this component is position-agnostic.
function TileWrapper({ tileKey, tileProps, innerClass = "p-4" }) {
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

// ── DYNAMIC BENTO GRID ────────────────────────────────────────────────────────
// Renders the X-Matrix 4×4 grid layout.
//
// Grid architecture:
//   ┌──────┬──────────────────┬──────┐
//   │  A1  │   B1 (2-wide)   │  D1  │  ← Row 1
//   ├──────┼────────┬────────┤──────┤
//   │      │        │        │      │
//   │  A2  │  SFERA ZONE     │  D2  │  ← Rows 2+3 (B2 C2 B3 C3 reserved)
//   │      │        │        │      │
//   ├──────┼────────┴────────┤──────┤
//   │  A4  │   B4 (2-wide)   │  D4  │  ← Row 4
//   └──────┴──────────────────┴──────┘
//
// The Sphere occupies a REAL grid cell (B2→C3) — not position:absolute.
// This eliminates all cross-slot overlap and touch-event interception.
export function DynamicBentoGrid({ user, isAdmin, isSpeaking = false, onOpenSignal, onOpenOKR }) {
    const { mission, isSetupComplete } = useMission();
    const tileProps = { user, isAdmin, onOpenSignal, onOpenOKR };

    // ── ONBOARDING STATE ───────────────────────────────────────────────────────
    if (!isSetupComplete) {
        return (
            <div className="w-full max-w-[1600px] mx-auto h-[calc(100vh-80px)] p-6 bg-[#0d111c] grid grid-cols-3 grid-rows-2 gap-4">
                {/* Top Left placeholder */}
                <div className={`${cardClass} items-center justify-center opacity-20`}>
                    <div className="w-8 h-8 rounded-full border border-white/10" />
                </div>

                {/* Top Center — Onboarding CTA (spans 2 rows) */}
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

    // ── OPERATIONAL STATE — X-Matrix 4×4 Grid ─────────────────────────────────
    // mapStrategyToGrid returns tile descriptors with slot coords + cssClass.
    // The Sphere zone (B2+C2+B3+C3) is always injected separately and is inviolabile.
    const gridDescriptors = mapStrategyToGrid(mission);

    return (
        <div
            className="xmatrix-grid w-full max-w-[1600px] mx-auto bg-[#0d111c] p-4"
            style={{ height: 'calc(100vh - 80px)' }}
        >
            {/* ── THE SPHERE — owns its grid slot, no absolute positioning ── */}
            <div className="xmatrix-sphere-zone">
                <ShadowCosSphere isSpeaking={isSpeaking} />
            </div>

            {/* ── TILE SLOTS — driven by mapStrategyToGrid ─────────────────── */}
            {gridDescriptors.map(({ component, slot, cssClass }) => (
                <div key={slot} className={cssClass}>
                    <TileWrapper tileKey={component} tileProps={tileProps} />
                </div>
            ))}
        </div>
    );
}
