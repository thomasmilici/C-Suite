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
function TileWrapper({ tileKey, tileProps, innerClass = "p-4", customStyle = {} }) {
    const Tile = TILE_REGISTRY[tileKey];
    if (!Tile) return null;

    const label = tileProps?.extras?.label;
    const type = tileProps?.extras?.type || ''; 
    const isPriority = type.startsWith('priority');
    const priorityPrefix = type === 'priority_nw' ? 'Daily Steering Focus' : type === 'priority_ne' ? 'Strategy Topics' : 'Focus';

    return (
        <div 
            className="flex flex-col w-full h-full relative overflow-hidden transition-all duration-200 group shrink-0"
            style={{
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
                ...customStyle
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)';
            }}
        >
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
                className="h-[28px] shrink-0 flex items-center px-4 gap-6 z-10 overflow-hidden"
                style={{ 
                    background: 'rgba(99,102,241,0.08)', 
                    borderBottom: '1px solid rgba(99,102,241,0.2)'
                }}
            >
                <div className="text-[10px] font-mono tracking-widest uppercase text-[#818cf8] font-bold whitespace-nowrap">
                    HOSHIN X-MATRIX
                </div>
                <div className="text-[10px] font-mono tracking-widest uppercase text-white/60 whitespace-nowrap">
                    ◆ MISSION: {mission?.name || 'N/A'}
                </div>
                <div className="text-[10px] font-mono tracking-widest uppercase text-[#4ade80] flex items-center gap-1.5 ml-8 whitespace-nowrap">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse"></div>
                    ◆ COCKPIT ATTIVO
                </div>
                <div className="text-[10px] font-mono tracking-widest uppercase text-zinc-500 ml-auto whitespace-nowrap xl:block hidden">
                    REVIEW: +30 GG
                </div>
            </div>

            {/* ── Sfondo globale ── */}
            <div style={{
              minHeight: 'calc(100vh - 88px)',
              padding: '12px',
              boxSizing: 'border-box',
              background: `
                radial-gradient(ellipse at 50% 0%,   rgba(99,102,241,0.09) 0%, transparent 50%),
                radial-gradient(ellipse at 0%  50%,  rgba(234,179,8,0.06)  0%, transparent 45%),
                radial-gradient(ellipse at 100% 50%, rgba(249,115,22,0.06) 0%, transparent 45%),
                radial-gradient(ellipse at 50% 100%, rgba(34,197,94,0.07)  0%, transparent 50%)
              `,
            }}>

              {/* IL QUADRATO GRANDE — container principale */}
              <div style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1 / 1',
                maxHeight: 'calc(100vh - 110px)',
                maxWidth: 'calc(100vh - 110px)',
                margin: '0 auto',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.07)',
                overflow: 'hidden',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              }}>

                {/* ── GRIGLIA 2x2 DEI WIDGET ── */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gridTemplateRows: '1fr 1fr',
                  gap: '2px',
                  zIndex: 1,
                }}>

                  {/* QUADRANTE NORD-OVEST → asse NORD */}
                  <div style={{
                    background: 'rgba(99,102,241,0.09)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    borderRight: '1px solid rgba(255,255,255,0.04)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px',
                    gap: '8px',
                  }}>
                    <div style={{ flex: 1, minHeight: 0, background: 'rgba(99,102,241,0.10)', borderTop: '2px solid rgba(99,102,241,0.5)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.18)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 2px 16px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                      <TileWrapper tileKey="TileSteeringFocus" tileProps={{ ...tileProps, extras: { label: p1, type: 'priority_nw' } }} customStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }} />
                    </div>
                    <div style={{ flex: 1, minHeight: 0, background: 'rgba(99,102,241,0.07)', borderTop: '2px solid rgba(99,102,241,0.35)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.14)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 2px 16px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                      <TileWrapper tileKey="AiPendingActionTop" tileProps={{ ...tileProps, extras: { label: p2, type: 'priority_ne', isIperProattivo: mission?.orchestrationStyle === 'Iper-Proattivo', priorities } }} customStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }} />
                    </div>
                  </div>

                  {/* QUADRANTE NORD-EST → asse EST */}
                  <div style={{
                    background: 'rgba(249,115,22,0.07)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    borderLeft: '1px solid rgba(255,255,255,0.04)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px',
                    gap: '8px',
                  }}>
                    <div style={{ flex: 1, minHeight: 0, background: 'rgba(249,115,22,0.10)', borderTop: '2px solid rgba(249,115,22,0.5)', borderRadius: '12px', border: '1px solid rgba(249,115,22,0.18)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 2px 16px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                      <TileWrapper tileKey="MissionSummaryTile" tileProps={{ ...tileProps, extras: { label: k1, type: 'kpi' } }} customStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }} />
                    </div>
                    <div style={{ flex: 1, minHeight: 0, background: 'rgba(249,115,22,0.07)', borderTop: '2px solid rgba(249,115,22,0.35)', borderRadius: '12px', border: '1px solid rgba(249,115,22,0.14)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 2px 16px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                      <TileWrapper tileKey="TileRadar" tileProps={{ ...tileProps, extras: { label: k2, type: 'kpi' } }} customStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }} />
                    </div>
                  </div>

                  {/* QUADRANTE SUD-OVEST → asse OVEST */}
                  <div style={{
                    background: 'rgba(234,179,8,0.07)',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    borderRight: '1px solid rgba(255,255,255,0.04)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px',
                    gap: '8px',
                  }}>
                    <div style={{ flex: 1, minHeight: 0, background: 'rgba(234,179,8,0.10)', borderTop: '2px solid rgba(234,179,8,0.5)', borderRadius: '12px', border: '1px solid rgba(234,179,8,0.18)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 2px 16px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                      <TileWrapper tileKey="BriefingRoom" tileProps={{ ...tileProps }} customStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }} />
                    </div>
                    <div style={{ flex: 1, minHeight: 0, background: 'rgba(234,179,8,0.07)', borderTop: '2px solid rgba(234,179,8,0.35)', borderRadius: '12px', border: '1px solid rgba(234,179,8,0.14)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 2px 16px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                      <TileWrapper tileKey="TileDecisionLog" tileProps={{ ...tileProps }} customStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }} />
                    </div>
                  </div>

                  {/* QUADRANTE SUD-EST → asse SUD */}
                  <div style={{
                    background: 'rgba(34,197,94,0.07)',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    borderLeft: '1px solid rgba(255,255,255,0.04)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px',
                    gap: '8px',
                  }}>
                    <div style={{ flex: 1, minHeight: 0, background: 'rgba(34,197,94,0.10)', borderTop: '2px solid rgba(34,197,94,0.5)', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.18)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 2px 16px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                      <TileWrapper tileKey="TileIntelligence" tileProps={{ ...tileProps }} customStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }} />
                    </div>
                    <div style={{ flex: 1, minHeight: 0, background: 'rgba(34,197,94,0.07)', borderTop: '2px solid rgba(34,197,94,0.35)', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.14)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 2px 16px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                      <TileWrapper tileKey="TilePulse" tileProps={{ ...tileProps }} customStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }} />
                    </div>
                  </div>

                </div>

                {/* ── X SVG OVERLAY ── */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 2,
                  pointerEvents: 'none',
                }}>
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    style={{ display: 'block' }}
                  >
                    <line
                      x1="0" y1="0" x2="100" y2="100"
                      stroke="rgba(255,255,255,0.10)"
                      strokeWidth="0.3"
                    />
                    <line
                      x1="100" y1="0" x2="0" y2="100"
                      stroke="rgba(255,255,255,0.10)"
                      strokeWidth="0.3"
                    />
                    <circle
                      cx="50" cy="50" r="6"
                      fill="rgba(255,255,255,0.04)"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="0.4"
                    />
                    <text x="50" y="6"
                      textAnchor="middle"
                      fill="rgba(165,180,252,0.5)"
                      fontSize="3.5"
                      fontFamily="monospace"
                      letterSpacing="0.5"
                    >NORD — PRIORITÀ TATTICHE</text>
                    <text x="50" y="97"
                      textAnchor="middle"
                      fill="rgba(187,247,208,0.5)"
                      fontSize="3.5"
                      fontFamily="monospace"
                      letterSpacing="0.5"
                    >SUD — OBIETTIVI A LUNGO TERMINE</text>
                    <text
                      x="3" y="50"
                      fill="rgba(253,230,138,0.5)"
                      fontSize="3.5"
                      fontFamily="monospace"
                      letterSpacing="0.5"
                      transform="rotate(-90, 3, 50)"
                      textAnchor="middle"
                    >OVEST — OBJ. ANNUALI</text>
                    <text
                      x="97" y="50"
                      fill="rgba(254,215,170,0.5)"
                      fontSize="3.5"
                      fontFamily="monospace"
                      letterSpacing="0.5"
                      transform="rotate(90, 97, 50)"
                      textAnchor="middle"
                    >EST — KPI &amp; RISULTATI</text>
                  </svg>
                </div>
              </div>
            </div>
            {/* ── Sfondo globale ── */}
                <style jsx>{`
                @media (max-width: 1024px) {
                    .min-w-\\[1000px\\] {
                        min-width: 0 !important;
                        display: flex !important;
                        flex-direction: column !important;
                        height: auto !important;
                    }
                    /* Force the inner rows (Nord/Sud) to stack vertically on small screens */
                    .flex-row {
                        flex-direction: column !important;
                    }
                }
            `}</style>
        </div>
    );
}
