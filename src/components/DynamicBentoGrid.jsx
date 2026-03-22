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

    // ── INTERACTIVE DOTS & HUMAN IN THE LOOP (FASE 3) ─────────────────────────
    const [selectedDot, setSelectedDot] = useState(null);

    const handleDotClick = (rIdx, cIdx, type, priorityStr, kpiStr) => {
        setSelectedDot({ rIdx, cIdx, type, priorityStr, kpiStr });
    };

    useEffect(() => {
        // SVG Logic will be rebuilt during Fase 2/3 for interactive dots
    }, [isSetupComplete, mission]);

    // ── ONBOARDING STATE ───────────────────────────────────────────────────────
    // isSetupComplete === false → show the calibration CTA instead of the grid
    if (!isSetupComplete) {
        return (
            <div className="w-full h-[calc(100vh-80px)] csuite-grid bg-black/50">
                {/* TL placeholder */}
                <div className={`${cardClass} items-center justify-center opacity-20 pointer-events-none`}>
                    <div className="w-8 h-8 rounded-full border border-white/10" />
                </div>

                {/* Center — Onboarding CTA (spans 2 rows) */}
                <div className="row-span-2 col-start-2 row-start-1 relative z-50">
                    <OnboardingTaskTile missionName={mission?.name} />
                </div>

                {/* TR placeholder */}
                <div className={`${cardClass} items-center justify-center opacity-20 pointer-events-none`}>
                    <div className="w-8 h-8 rounded-full border border-white/10" />
                </div>

                {/* BL placeholder */}
                <div className={`${cardClass} items-center justify-center opacity-20 pointer-events-none`}>
                    <div className="w-8 h-8 rounded-full border border-white/10" />
                </div>

                {/* BR placeholder */}
                <div className={`${cardClass} items-center justify-center opacity-20 pointer-events-none`}>
                    <div className="w-8 h-8 rounded-full border border-white/10" />
                </div>
            </div>
        );
    }

    // ── X-MATRIX PURE LAYOUT ──────────────────────────────────────────────────
    // Direct mapping to the 4 axes (North, South, East, West) + 4 Intersections
    const priorities = Array.isArray(mission?.priorities) ? mission.priorities : [];
    const kpis = Array.isArray(mission?.kpis) ? mission.kpis : [];
    const annualObjs = Array.isArray(mission?.annualObjectives) && mission.annualObjectives.length > 0
        ? mission.annualObjectives : [mission?.vision || 'Strategic North Star'];
    const longTermObjs = Array.isArray(mission?.longTermObjectives) ? mission.longTermObjectives : [];

    return (
        <div ref={gridRef} className="xmatrix-pure-grid w-full relative">
            {/* ── INTERSEZIONI ANGOLARI (FASE 2) ─── */}
            {/* NW: Priorities (cols) x AnnualObjs (rows) */}
            <div className="xmatrix-area-nw flex items-center justify-center relative overlow-hidden">
                <div className="grid gap-2 p-2 bg-white/[0.01] rounded-[20px] border border-white/[0.04] w-full h-full" style={{
                    gridTemplateColumns: `repeat(${Math.max(1, priorities.length)}, 1fr)`,
                    gridTemplateRows: `repeat(${Math.max(1, Math.min(annualObjs.length, 4))}, 1fr)`
                }}>
                    {Array.from({ length: Math.min(annualObjs.length, 4) }).map((_, rIdx) => 
                        Array.from({ length: Math.max(1, priorities.length) }).map((_, cIdx) => (
                            <div key={`${rIdx}-${cIdx}`} className="flex items-center justify-center">
                                {/* Simulazione correlazione debole/forte in base agli indici */}
                                {(rIdx + cIdx) % 3 === 0 && <div className="w-3 h-3 rounded-full bg-zinc-600/50" />}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* NE: Priorities (cols) x KPIs (rows) */}
            <div className="xmatrix-area-ne flex items-center justify-center relative overflow-hidden shadow-[inset_0_0_40px_rgba(99,102,241,0.02)]">
                <div className="grid gap-2 p-2 bg-indigo-500/[0.02] rounded-[20px] border border-indigo-500/[0.08] w-full h-full" style={{
                    gridTemplateColumns: `repeat(${Math.max(1, priorities.length)}, 1fr)`,
                    gridTemplateRows: `repeat(${Math.max(1, Math.min(kpis.length, 4))}, 1fr)`
                }}>
                    {Array.from({ length: Math.min(kpis.length, 4) }).map((_, rIdx) => 
                        Array.from({ length: Math.max(1, priorities.length) }).map((_, cIdx) => {
                            const pName = priorities[cIdx] || 'Priority ' + (cIdx + 1);
                            const kName = kpis[rIdx] || 'KPI ' + (rIdx + 1);
                            const isStrong = rIdx === cIdx;
                            const isWeak = (rIdx + cIdx) % 2 === 0;

                            return (
                                <div key={`${rIdx}-${cIdx}`} className="flex items-center justify-center" onClick={() => (isStrong || isWeak) && handleDotClick(rIdx, cIdx, isStrong ? 'strong' : 'weak', pName, kName)}>
                                    {isStrong ? (
                                        <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)] cursor-pointer hover:scale-125 transition-transform hover:ring-2 hover:ring-indigo-400" title="Correlazione Forte" />
                                    ) : isWeak ? (
                                        <div className="w-3 h-3 rounded-full border border-indigo-500/50 cursor-pointer hover:bg-indigo-500/20 transition-colors" title="Correlazione Debole (AI Suggerita)" />
                                    ) : null}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* SW: LongTermObjs (cols) x AnnualObjs (rows) */}
            <div className="xmatrix-area-sw flex items-center justify-center relative overlow-hidden">
                <div className="grid gap-2 p-2 bg-white/[0.01] rounded-[20px] border border-white/[0.04] w-full h-full" style={{
                    gridTemplateColumns: `repeat(${Math.max(1, longTermObjs.length)}, 1fr)`,
                    gridTemplateRows: `repeat(${Math.max(1, Math.min(annualObjs.length, 4))}, 1fr)`
                }}>
                    {Array.from({ length: Math.min(annualObjs.length, 4) }).map((_, rIdx) => 
                        Array.from({ length: Math.max(1, longTermObjs.length) }).map((_, cIdx) => (
                            <div key={`${rIdx}-${cIdx}`} className="flex items-center justify-center">
                                {rIdx === cIdx && <div className="w-3 h-3 rounded-full border border-zinc-500/30" />}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* SE: Accountability / Resources - LongTermObjs (cols) x KPIs (rows) */}
            <div className="xmatrix-area-se flex items-center justify-center relative overlow-hidden shadow-[inset_0_0_40px_rgba(16,185,129,0.02)]">
                <div className="grid gap-2 p-2 bg-emerald-500/[0.02] rounded-[20px] border border-emerald-500/[0.08] w-full h-full" style={{
                    gridTemplateColumns: `repeat(${Math.max(1, longTermObjs.length)}, 1fr)`,
                    gridTemplateRows: `repeat(${Math.max(1, Math.min(kpis.length, 4))}, 1fr)`
                }}>
                    {Array.from({ length: Math.min(kpis.length, 4) }).map((_, rIdx) => 
                        Array.from({ length: Math.max(1, longTermObjs.length) }).map((_, cIdx) => (
                            <div key={`${rIdx}-${cIdx}`} className="flex items-center justify-center tooltip-trigger group cursor-pointer">
                                <span className="text-[10px] font-mono text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 w-6 h-6 flex items-center justify-center rounded-full ring-2 ring-transparent group-hover:ring-emerald-500/40 transition-all">
                                    {String.fromCharCode(65 + (rIdx + cIdx) % 26)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── ASSI STRATEGICI ─── */}
            <div className="xmatrix-axis-n">
                {priorities.length > 0 ? priorities.map((p, i) => (
                    <TileWrapper key={`p-${i}`} tileKey="TileSteeringFocus" tileProps={{ ...tileProps, extras: { label: p, type: 'priority_north', accountability: [{ ownerName: 'TBD' }] } }} />
                )) : (
                    <TileWrapper tileKey="TileSteeringFocus" tileProps={{ ...tileProps, extras: { label: 'Definisci Priorità', type: 'priority_north' } }} />
                )}
            </div>
            
            <div className="xmatrix-axis-s">
                {longTermObjs.length > 0 ? longTermObjs.map((g, i) => (
                    <TileWrapper key={`g-${i}`} tileKey="TileCompass" tileProps={{ ...tileProps, extras: { label: g, type: 'long_term_goal', accountability: [{ ownerName: 'TBD' }] } }} />
                )) : (
                    <TileWrapper tileKey="TileCompass" tileProps={{ ...tileProps, extras: { label: 'Milestone di Lungo Termine', type: 'long_term_goal' } }} />
                )}
            </div>
            
            <div className="xmatrix-axis-w">
                {annualObjs.slice(0, 4).map((obj, i) => (
                    <TileWrapper key={`o-${i}`} tileKey="TileIntelligence" tileProps={{ ...tileProps, extras: { label: obj, type: 'annual_objective', accountability: [{ ownerName: 'TBD' }] } }} />
                ))}
            </div>
            
            <div className="xmatrix-axis-e">
                {kpis.slice(0, 4).map((kpi, i) => (
                    <TileWrapper key={`k-${i}`} tileKey="TileRadar" tileProps={{ ...tileProps, extras: { label: kpi, type: 'kpi', accountability: [{ ownerName: 'TBD' }] } }} />
                ))}
            </div>

            {/* ── CENTRO VUOTO ─── */}
            <div className="xmatrix-center-empty flex items-center justify-center relative">
                 <div className="w-16 h-16 rounded-full border border-white/5 opacity-20 pointer-events-none" />
                 {/* Decorative Cross Lines */}
                 <div className="absolute inset-x-8 top-1/2 h-[1px] bg-white/5 -translate-y-1/2 pointer-events-none" />
                 <div className="absolute inset-y-8 left-1/2 w-[1px] bg-white/5 -translate-x-1/2 pointer-events-none" />
            </div>

            {/* ── MODALE INTERATTIVA CORRELAZIONI (HUMAN IN THE LOOP) ─── */}
            {selectedDot && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm bg-[#0a0f1c] border border-indigo-500/30 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8),_inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-indigo-500/5">
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-indigo-400" />
                                <h3 className="text-white text-sm font-semibold tracking-wide">Correlation Strategy</h3>
                            </div>
                            <button onClick={() => setSelectedDot(null)} className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                                <span className="text-xs">✕</span>
                            </button>
                        </div>
                        <div className="p-5 flex flex-col gap-4">
                            <div className="text-sm text-zinc-300">
                                <p className="mb-2"><span className="text-zinc-500 text-xs uppercase tracking-widest block mb-1">Priority (Nord)</span> <strong className="text-white bg-white/5 px-2 py-1 rounded inline-block">{selectedDot.priorityStr}</strong></p>
                                <p><span className="text-zinc-500 text-xs uppercase tracking-widest block mb-1">KPI (Est)</span> <strong className="text-white bg-white/5 px-2 py-1 rounded inline-block">{selectedDot.kpiStr}</strong></p>
                            </div>
                            
                            <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                                <button className={`flex-1 py-1.5 text-xs font-mono rounded ${selectedDot.type === 'strong' ? 'bg-indigo-500 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>FORTE (●)</button>
                                <button className={`flex-1 py-1.5 text-xs font-mono rounded ${selectedDot.type === 'weak' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>DEBOLE (○)</button>
                                <button className="flex-1 py-1.5 text-xs font-mono rounded text-zinc-500 hover:text-red-400">RIMUOVI</button>
                            </div>

                            {selectedDot.type === 'weak' && (
                                <div className="mt-2 p-3 bg-cyan-900/20 border border-cyan-800/40 rounded-lg">
                                    <p className="text-[11px] text-cyan-300/80 mb-2 font-mono leading-relaxed">
                                        ⚡ <strong>AI Insight:</strong> I dati suggeriscono l'attivazione di questa correlazione per compensare il rischio di deragliamento.
                                    </p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setSelectedDot(null)} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] uppercase tracking-wider font-bold py-1.5 rounded transition-colors shadow-[0_0_10px_rgba(8,145,178,0.4)]">Go (Approva)</button>
                                        <button onClick={() => setSelectedDot(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] uppercase tracking-wider font-bold py-1.5 rounded transition-colors">No-Go</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
