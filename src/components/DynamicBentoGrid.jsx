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
import { MissionSummaryTile } from './tiles/MissionSummaryTile';
import { mapStrategyToGrid } from '../utils/mapStrategyToGrid';

// ── TILE REGISTRY ──────────────────────────────────────────────────────────────
// Maps component keys (from mapStrategyToGrid) → React components.
// tileProps = { user, isAdmin, onOpenSignal, onOpenOKR }
// descriptor extras = { renderMode?, extras?, size? } forwarded to each tile.
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
    // Intelligent symmetry-fill: shows real mission data (vision/priorities/kpis/style)
    MissionSummaryTile:  ({ props }) => <MissionSummaryTile {...props} />,
    // Overload carousel: lists excess KPIs when kpis.length > 4
    // Rendered as a scrollable list; extras[] = overflow KPI strings
    KpiCarousel: ({ props }) => (
        <div className="flex flex-col gap-1 p-1 overflow-y-auto thin-scroll">
            <p className="text-[9px] font-mono text-emerald-400/60 uppercase tracking-widest mb-1 flex-shrink-0">
                KPI Supplementari
            </p>
            {(props?.extras || []).map((kpi, i) => (
                <div key={i} className="flex items-start gap-1.5 flex-shrink-0">
                    <div className="w-1 h-1 rounded-full bg-emerald-500/40 mt-1.5 flex-shrink-0" />
                    <span className="text-[10px] text-white/50 font-mono leading-tight">{kpi}</span>
                </div>
            ))}
            {(!props?.extras || props.extras.length === 0) && (
                <span className="text-[9px] font-mono text-zinc-600 italic">— nessun KPI aggiuntivo —</span>
            )}
        </div>
    ),
};

// ── SHARED CARD STYLE ──────────────────────────────────────────────────────────
const cardClass = "bg-[#161b2b] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_8px_20px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden flex flex-col w-full h-full";

// ── TILE WRAPPER ───────────────────────────────────────────────────────────────
// Renders a single tile inside its glass card shell.
// Forwards governance metadata (renderMode, extras) from the grid descriptor
// so tile components can adapt their internal rendering accordingly.
function TileWrapper({ tileKey, tileProps, innerClass = "p-4" }) {
    const Tile = TILE_REGISTRY[tileKey];
    if (!Tile) {
        // Unknown key fallback: show the key name as a debug label
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
// Renders the X-Matrix 4×4 grid layout driven by mapStrategyToGrid(mission).
//
// Data flow:
//   MissionContext.mission ──→ mapStrategyToGrid() ──→ gridDescriptors[]
//   Each descriptor: { component, slot, cssClass, size, renderMode?, extras? }
//   MissionContext uses onSnapshot → auto-refresh after onboarding completes.
//
//  ┌──────┬──────────────────┬──────┐
//  │  A1  │   B1/WEST(2×)   │  D1  │  ← Row 1
//  ├──────┼──────────────────┤──────┤
//  │  A2  │  🔮 SPHERE ZONE  │  D2  │  ← Rows 2+3 (inviolabile)
//  │  A3  │  (B2 C2 B3 C3)  │  D3  │
//  ├──────┼──────────────────┤──────┤
//  │  A4  │   B4/SOUTH(2×)  │  D4  │  ← Row 4
//  └──────┴──────────────────┴──────┘
export function DynamicBentoGrid({ user, isAdmin, isSpeaking = false, onOpenSignal, onOpenOKR }) {
    const { mission, isSetupComplete } = useMission();

    // tileProps passed to every tile — operational context, not layout
    const tileProps = { user, isAdmin, onOpenSignal, onOpenOKR };

    // ── ONBOARDING STATE ───────────────────────────────────────────────────────
    // isSetupComplete === false → show the calibration CTA instead of the grid
    if (!isSetupComplete) {
        return (
            <div className="w-full max-w-[1600px] mx-auto h-[calc(100vh-80px)] p-6 bg-[#0d111c] grid grid-cols-3 grid-rows-2 gap-4">
                {/* TL placeholder */}
                <div className={`${cardClass} items-center justify-center opacity-20`}>
                    <div className="w-8 h-8 rounded-full border border-white/10" />
                </div>

                {/* Center — Onboarding CTA (spans 2 rows) */}
                <div className="row-span-2 col-start-2 row-start-1">
                    <OnboardingTaskTile missionName={mission?.name} />
                </div>

                {/* TR placeholder */}
                <div className={`${cardClass} items-center justify-center opacity-20`}>
                    <div className="w-8 h-8 rounded-full border border-white/10" />
                </div>

                {/* BL placeholder */}
                <div className={`${cardClass} items-center justify-center opacity-20`}>
                    <div className="w-8 h-8 rounded-full border border-white/10" />
                </div>

                {/* BR placeholder */}
                <div className={`${cardClass} items-center justify-center opacity-20`}>
                    <div className="w-8 h-8 rounded-full border border-white/10" />
                </div>
            </div>
        );
    }

    // ── OPERATIONAL STATE — X-Matrix 4×4 Grid ─────────────────────────────────
    // gridDescriptors is recomputed every time MissionContext.mission changes.
    // After onboarding: mission now contains priorities, kpis, vision,
    // orchestrationStyle → mapStrategyToGrid returns real tile assignments.
    const gridDescriptors = mapStrategyToGrid(mission);

    return (
        <div
            className="xmatrix-grid w-full max-w-[1600px] mx-auto bg-[#0d111c] p-4"
            style={{ height: 'calc(100vh - 80px)' }}
        >
            {/* ── SPHERE — occupies real grid slot B2→C3, never overlaps ── */}
            <div className="xmatrix-sphere-zone">
                <ShadowCosSphere isSpeaking={isSpeaking} />
            </div>

            {/* ── TILES — each placed in its CSS grid slot by cssClass ─── */}
            {gridDescriptors.map(({ component, slot, cssClass, renderMode, extras }) => {
                // Merge governance metadata into tileProps so each tile can
                // adapt its internal rendering (e.g. stack mode, carousel).
                const mergedProps = {
                    ...tileProps,
                    ...(renderMode ? { renderMode } : {}),
                    ...(extras    ? { extras }    : {}),
                };
                return (
                    <div key={slot} className={cssClass}>
                        <TileWrapper
                            tileKey={component}
                            tileProps={mergedProps}
                        />
                    </div>
                );
            })}
        </div>
    );
}
