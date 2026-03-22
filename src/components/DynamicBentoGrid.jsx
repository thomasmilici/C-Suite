import React, { useRef, useState, useEffect } from 'react';
import { Zap, BarChart3 } from 'lucide-react';
import { useMission } from '../context/MissionContext';
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
const cardClass = "bg-[#060a14]/90 backdrop-blur-3xl border border-slate-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.02),_0_10px_40px_rgba(0,0,0,0.8)] rounded-[20px] overflow-hidden flex flex-col w-full h-full relative transition-all duration-300 group hover:border-cyan-900/40";

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

    const label = tileProps?.extras?.label;
    const type = tileProps?.extras?.type || ''; 
    const isPriority = type.startsWith('priority');
    const priorityPrefix = type === 'priority_nw' ? 'Daily Steering Focus' : type === 'priority_ne' ? 'Strategy Topics' : 'Focus';

    return (
        <div className={cardClass}>
            {label && (isPriority || type === 'kpi') && (
                <div className="shrink-0 pt-4 px-5 pb-1 flex items-center justify-between z-10">
                    <div className="min-w-0 pr-2">
                        <p className="text-[13px] font-sans font-semibold text-slate-100 truncate tracking-wide">
                            <span className="text-slate-500 font-normal mr-2">{isPriority ? `${priorityPrefix} —` : 'Target Metrico —'}</span>
                            {label}
                        </p>
                    </div>
                    {isPriority && (
                        <button className="shrink-0 px-2.5 py-1.5 bg-[#0a192f] border border-cyan-800/60 text-cyan-400 text-[9px] uppercase font-mono tracking-widest rounded flex items-center gap-1.5 hover:bg-cyan-950 transition-colors shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                            <span className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee] animate-pulse"></span>
                            Execute
                        </button>
                    )}
                </div>
            )}
            <div className={`flex-1 overflow-y-auto no-scrollbar relative ${innerClass}`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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

    const tileProps = { user, isAdmin, onOpenSignal, onOpenOKR };

    // ── HOSHIN KANRI CORRELATION LINES (FASE 4) ───────────────────────────────
    const gridRef = useRef(null);
    const [svgLines, setSvgLines] = useState([]);

    useEffect(() => {
        if (!isSetupComplete || !gridRef.current) return;
        
        const updateLines = () => {
            const container = gridRef.current;
            const rect = container.getBoundingClientRect();
            const newLines = [];

            const getCenter = (cssClass) => {
                const el = container.querySelector(`.${cssClass}`);
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return {
                    x: r.left - rect.left + r.width / 2,
                    y: r.top - rect.top + r.height / 2,
                    left: r.left - rect.left,
                    right: r.right - rect.left,
                    top: r.top - rect.top,
                    bottom: r.bottom - rect.top
                };
            };

            const drawLine = (start, end, color) => {
                if (!start || !end) return;
                // Curva Bezier orizzontale morbida per simulare circuiti X-Matrix
                const midX = start.x + (end.x - start.x) / 2;
                const path = `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
                newLines.push({ path, endX: end.x, endY: end.y, startX: start.x, startY: start.y, color });
            };

            // Dati Nord (Priorità B1) ai layer West (Obj A1) ed Est (KPI D1)
            const nord = getCenter('xmatrix-slot-B1');
            const ovest1 = getCenter('xmatrix-slot-A1');
            const est1 = getCenter('xmatrix-slot-D1');
            
            if (nord && ovest1) drawLine({ x: nord.left + 50, y: nord.y }, { x: ovest1.right - 10, y: ovest1.y }, 'rgba(99, 102, 241, 0.35)');
            if (nord && est1) drawLine({ x: nord.right - 50, y: nord.y }, { x: est1.left + 10, y: est1.y }, 'rgba(236, 72, 153, 0.35)');

            // Dati Sud (Goals B4) ai layer West (Obj A4) ed Est (KPI D4)
            const sud = getCenter('xmatrix-slot-B4');
            const ovest4 = getCenter('xmatrix-slot-A4');
            const est4 = getCenter('xmatrix-slot-D4');

            if (sud && ovest4) drawLine({ x: sud.left + 50, y: sud.y }, { x: ovest4.right - 10, y: ovest4.y }, 'rgba(52, 211, 153, 0.35)');
            if (sud && est4) drawLine({ x: sud.right - 50, y: sud.y }, { x: est4.left + 10, y: est4.y }, 'rgba(250, 204, 21, 0.35)');

            setSvgLines(newLines);
        };

        const t = setTimeout(updateLines, 400); // Wait for grid reflow
        window.addEventListener('resize', updateLines);
        return () => { clearTimeout(t); window.removeEventListener('resize', updateLines); };
    }, [isSetupComplete, mission]);

    // ── ONBOARDING STATE ───────────────────────────────────────────────────────
    // isSetupComplete === false → show the calibration CTA instead of the grid
    if (!isSetupComplete) {
        return (
            <div className="w-full h-[calc(100vh-80px)] csuite-grid opacity-50 pointer-events-none">
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
        <div ref={gridRef} className="csuite-grid w-full relative">
            {/* ── SVG LAYER (Background correlations) ─── */}
            <svg className="absolute inset-0 pointer-events-none z-0 w-full h-full">
                {svgLines.map((line, i) => (
                    <g key={i}>
                        <path d={line.path} fill="none" stroke={line.color} strokeWidth="1.5" strokeDasharray="4 4" className="animate-pulse" />
                        <circle cx={line.startX} cy={line.startY} r="3" fill={line.color} />
                        <circle cx={line.endX} cy={line.endY} r="3" fill={line.color} className="animate-pulse" />
                    </g>
                ))}
            </svg>

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
