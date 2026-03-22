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
const cardClass = "bg-[#060a14]/90 backdrop-blur-3xl border border-slate-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.02),_0_10px_40px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden flex flex-col w-full min-h-[220px] relative transition-all duration-300 group hover:border-cyan-900/40 shrink-0";

// ── TILE WRAPPER ───────────────────────────────────────────────────────────────
function TileWrapper({ tileKey, tileProps, innerClass = "p-4" }) {
    const Tile = TILE_REGISTRY[tileKey];
    if (!Tile) return null;

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
                </div>
            )}
            <div className={`flex-1 overflow-y-auto no-scrollbar relative ${innerClass}`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <Tile props={tileProps} />
            </div>
        </div>
    );
}

// ── DYNAMIC BENTO GRID (X-Matrix Refactor) ───────────────────────────────────
export function DynamicBentoGrid({ user, isAdmin, isSpeaking = false, onOpenSignal, onOpenOKR }) {
    const { mission, isSetupComplete } = useMission();
    const [activeStrategyNode, setActiveStrategyNode] = useState(null);
    const tileProps = { user, isAdmin, onOpenSignal, onOpenOKR, activeStrategyNode, setActiveStrategyNode };

    if (!isSetupComplete) {
        return (
            <div className="w-full h-[calc(100vh-80px)] bg-black/50 flex items-center justify-center">
                <OnboardingTaskTile missionName={mission?.name} />
            </div>
        );
    }

    const priorities = Array.isArray(mission?.priorities) ? mission.priorities : [];
    const kpis = Array.isArray(mission?.kpis) ? mission.kpis : [];
    const p1 = priorities[0] || 'AI Orchestration';
    const p2 = priorities[1] || 'Operatività Autonoma';
    const k1 = kpis[0] || '-40% Time-to-Decision';
    const k2 = kpis[1] || '95% Accuracy';

    return (
        <div className="flex flex-col w-full h-full">
            {/* STEP 4: BANDA HOSHIN SOTTO LA NAVBAR */}
            <div 
                className="h-[28px] shrink-0 flex items-center px-4 gap-6 z-10"
                style={{ 
                    background: 'rgba(99,102,241,0.08)', 
                    borderBottom: '1px solid rgba(99,102,241,0.2)'
                }}
            >
                <div className="text-[10px] font-mono tracking-widest uppercase text-[#818cf8] font-bold">
                    HOSHIN X-MATRIX
                </div>
                <div className="text-[10px] font-mono tracking-widest uppercase text-white/60">
                    ◆ MISSION: {mission?.name || 'N/A'}
                </div>
                <div className="text-[10px] font-mono tracking-widest uppercase text-[#4ade80] flex items-center gap-1.5 ml-8">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse"></div>
                    ◆ COCKPIT ATTIVO
                </div>
                <div className="text-[10px] font-mono tracking-widest uppercase text-zinc-500 ml-auto">
                    REVIEW: +30 GG
                </div>
            </div>

            {/* STEP 1: CSS GRID COCKPIT */}
            <div className="w-full relative custom-scrollbar overflow-x-hidden md:overflow-x-auto overflow-y-auto">
                <div className="min-w-[1000px] md:min-w-0" style={{ 
                    display: 'grid', 
                    height: 'calc(100vh - 64px - 28px)', 
                    gridTemplateColumns: '280px 1fr 320px',
                    gridTemplateRows: 'auto 1fr auto',
                    gridTemplateAreas: `
                        "nord-label   nord       nord-label-dx"
                        "ovest        centro     est"
                        "sud-label    sud        sud-label-dx"
                    `,
                    gap: '2px',
                    background: 'rgba(255,255,255,0.03)'
                }}>
                    
                    {/* LABELS */}
                    <div style={{ gridArea: 'nord-label', background: 'rgba(0,0,0,0.2)' }} className="p-2 border-b border-white/5 border-r border-[#000]">
                        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/30 text-center flex h-full items-center justify-center">
                            ◈ PRIORITÀ TATTICHE — NORD
                        </div>
                    </div>
                    
                    <div style={{ gridArea: 'sud-label', background: 'rgba(0,0,0,0.2)' }} className="p-2 border-t border-white/5 border-r border-[#000]">
                        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/30 text-center flex h-full items-center justify-center">
                            ◈ OBIETTIVI A LUNGO TERMINE — SUD
                        </div>
                    </div>

                    {/* ZONA NORD */}
                    <div style={{ gridArea: 'nord', background: 'rgba(0,0,0,0.25)' }} className="border-b border-l border-r border-white/5 p-3 flex gap-4 overflow-x-auto overflow-y-hidden custom-scrollbar">
                        <div className="flex-1 min-w-[300px]">
                            <TileWrapper tileKey="TileSteeringFocus" tileProps={{ ...tileProps, extras: { label: p1, type: 'priority_nw' } }} />
                        </div>
                        <div className="flex-1 min-w-[300px]">
                            <TileWrapper tileKey="AiPendingActionTop" tileProps={{ ...tileProps, extras: { label: p2, type: 'priority_ne', isIperProattivo: mission?.orchestrationStyle === 'Iper-Proattivo', priorities } }} />
                        </div>
                    </div>

                    {/* ZONA OVEST */}
                    <div style={{ gridArea: 'ovest', background: 'rgba(0,0,0,0.25)' }} className="border-t border-b border-r border-white/5 relative flex overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-8 border-r border-white/5 bg-black/20 flex items-center justify-center">
                            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/30" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
                                ◈ OBIETTIVI ANNUALI
                            </div>
                        </div>
                        <div className="flex-1 pl-11 p-3 flex flex-col gap-4 overflow-y-auto no-scrollbar">
                            <TileWrapper tileKey="BriefingRoom" tileProps={{ ...tileProps }} />
                            <TileWrapper tileKey="TileDecisionLog" tileProps={{ ...tileProps }} />
                            <TileWrapper tileKey="TileCompass" tileProps={{ ...tileProps }} />
                        </div>
                    </div>

                    {/* ZONA CENTRO (SVG) */}
                    <div style={{ gridArea: 'centro' }} className="flex items-center justify-center p-8 bg-black/40 min-h-[240px]">
                        <svg className="w-full h-full min-w-[240px] max-w-full drop-shadow-2xl" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <polygon points="0,0 100,0 50,50" fill="rgba(99,102,241,0.15)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
                            <text x="50" y="20" fill="rgba(255,255,255,0.4)" fontSize="4" fontFamily="monospace" textAnchor="middle" alignmentBaseline="middle">TOP INITIATIVES</text>
                            
                            <polygon points="100,0 100,100 50,50" fill="rgba(249,115,22,0.15)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
                            <text x="80" y="50" fill="rgba(255,255,255,0.4)" fontSize="4" fontFamily="monospace" textAnchor="middle" alignmentBaseline="middle" transform="rotate(90 80,50)">METRICS</text>

                            <polygon points="0,100 100,100 50,50" fill="rgba(34,197,94,0.15)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
                            <text x="50" y="80" fill="rgba(255,255,255,0.4)" fontSize="4" fontFamily="monospace" textAnchor="middle" alignmentBaseline="middle">LONG-TERM GOALS</text>

                            <polygon points="0,0 0,100 50,50" fill="rgba(234,179,8,0.15)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
                            <text x="20" y="50" fill="rgba(255,255,255,0.4)" fontSize="4" fontFamily="monospace" textAnchor="middle" alignmentBaseline="middle" transform="rotate(-90 20,50)">ANNUAL OBJ.</text>
                        </svg>
                    </div>

                    {/* ZONA EST */}
                    <div style={{ gridArea: 'est', background: 'rgba(0,0,0,0.25)' }} className="border-t border-b border-l border-white/5 relative flex overflow-hidden">
                        <div className="flex-1 pr-11 p-3 flex flex-col gap-4 overflow-y-auto no-scrollbar">
                            <TileWrapper tileKey="MissionSummaryTile" tileProps={{ ...tileProps, extras: { label: k1, type: 'kpi' } }} />
                            <TileWrapper tileKey="TileRadar" tileProps={{ ...tileProps, extras: { label: k2, type: 'kpi' } }} />
                            <TileWrapper tileKey="ProactiveAlerts" tileProps={{ ...tileProps }} />
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-8 border-l border-white/5 bg-black/20 flex items-center justify-center">
                            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/30" style={{ writingMode: 'vertical-rl', whiteSpace: 'nowrap' }}>
                                ◈ KPI & RISULTATI
                            </div>
                        </div>
                    </div>

                    {/* ZONA SUD */}
                    <div style={{ gridArea: 'sud', background: 'rgba(0,0,0,0.25)' }} className="border-t border-l border-r border-white/5 p-3 flex gap-4 overflow-x-auto overflow-y-hidden custom-scrollbar">
                        <div className="flex-1 min-w-[300px] max-w-[50%]">
                            <TileWrapper tileKey="TileIntelligence" tileProps={{ ...tileProps }} />
                        </div>
                        <div className="flex-1 min-w-[300px] max-w-[50%]">
                            <TileWrapper tileKey="TilePulse" tileProps={{ ...tileProps }} />
                        </div>
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                @media (max-width: 768px) {
                    .min-w-\\[1000px\\] {
                        min-width: 0 !important;
                        display: flex !important;
                        flex-direction: column !important;
                        height: auto !important;
                    }
                    .nord-label, .sud-label, .nord-label-dx, .sud-label-dx { display: none !important; }
                    .flex-1 { min-width: 0 !important; width: 100% !important; max-width: 100% !important; }
                    .border-l, .border-r { border-color: transparent !important; }
                    .w-8 { width: auto !important; height: 32px; writing-mode: horizontal-tb !important; transform: none !important; position: static !important; writingMode: inherit !important; }
                    .pl-11, .pr-11 { padding-left: 12px !important; padding-right: 12px !important; }
                }
            `}</style>
        </div>
    );
}
