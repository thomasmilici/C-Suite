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
import { HoshinArrows } from './HoshinArrows';

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

    // ── HOSHIN ARROWS STATE LOGIC ──
    const nordTileRef = useRef(null);
    const estTileRef = useRef(null);
    const ovestTileRef = useRef(null);
    const sudTileRef = useRef(null);

    const today = new Date().toDateString();

    const nordEmpty = priorities.length === 0 || priorities.every(p => !p || p.trim() === '');
    const nordActive = nordEmpty;
    const isPast10AM = new Date().getHours() >= 10;
    const nordUrgent = isPast10AM && nordEmpty;

    const signals = mission?.signals || [];
    const hasHighSeveritySignal = signals.some(s => s.severity === 'high' || s.severity === 'critical');
    const hasRisk = signals.length > 0;
    const metrics = mission?.metrics || [];
    const hasMetTarget = metrics.some(m => m.current >= m.target);
    const estActive = hasRisk || hasMetTarget;
    const estUrgent = hasHighSeveritySignal;

    const decisions = mission?.decisions || [];
    const hasDecisionToday = decisions.some(d => new Date(d.createdAt?.toDate ? d.createdAt.toDate() : d.createdAt).toDateString() === today);
    const okrs = mission?.okrs || [];
    const hasSoonOkr = okrs.some(o => {
      if (!o.dueDate) return false;
      const days = (new Date(o.dueDate?.toDate ? o.dueDate.toDate() : o.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= 7;
    });
    const ovestActive = !hasDecisionToday || hasSoonOkr;
    const ovestUrgent = false;

    const reports = mission?.intelligenceReports || [];
    const hasRecentReport = reports.some(r => {
      if (!r.createdAt) return false;
      const hours = (new Date() - new Date(r.createdAt?.toDate ? r.createdAt.toDate() : r.createdAt)) / (1000 * 60 * 60);
      return hours <= 24;
    });
    const pulseUpdates = mission?.pulseUpdates || [];
    const hasPulseToday = pulseUpdates.some(p => new Date(p.timestamp?.toDate ? p.timestamp.toDate() : p.timestamp).toDateString() === today);
    const sudActive = hasRecentReport || hasPulseToday;
    const sudUrgent = false;

    useEffect(() => {
        if (nordTileRef.current) {
          nordTileRef.current.style.borderColor = nordActive ? 'rgba(99,102,241,0.45)' : 'rgba(99,102,241,0.20)';
          nordTileRef.current.style.boxShadow = nordActive 
            ? '0 4px 32px rgba(0,0,0,0.35), 0 0 24px rgba(99,102,241,0.12) inset, 0 0 1px rgba(99,102,241,0.5)' 
            : '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)';
        }
    }, [nordActive]);

    useEffect(() => {
        if (estTileRef.current) {
          estTileRef.current.style.borderColor = estActive ? 'rgba(249,115,22,0.45)' : 'rgba(249,115,22,0.18)';
          estTileRef.current.style.boxShadow = estActive 
            ? '0 4px 32px rgba(0,0,0,0.35), 0 0 24px rgba(249,115,22,0.12) inset, 0 0 1px rgba(249,115,22,0.5)' 
            : '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)';
        }
    }, [estActive]);

    useEffect(() => {
        if (ovestTileRef.current) {
          ovestTileRef.current.style.borderColor = ovestActive ? 'rgba(234,179,8,0.45)' : 'rgba(234,179,8,0.18)';
          ovestTileRef.current.style.boxShadow = ovestActive 
            ? '0 4px 32px rgba(0,0,0,0.35), 0 0 24px rgba(234,179,8,0.12) inset, 0 0 1px rgba(234,179,8,0.5)' 
            : '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)';
        }
    }, [ovestActive]);

    useEffect(() => {
        if (sudTileRef.current) {
          sudTileRef.current.style.borderColor = sudActive ? 'rgba(34,197,94,0.45)' : 'rgba(34,197,94,0.18)';
          sudTileRef.current.style.boxShadow = sudActive 
            ? '0 4px 32px rgba(0,0,0,0.35), 0 0 24px rgba(34,197,94,0.12) inset, 0 0 1px rgba(34,197,94,0.5)' 
            : '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)';
        }
    }, [sudActive]);

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

            {/* ── BENTO GRID ASIMMETRICA ── */}
            <div className="w-full relative custom-scrollbar overflow-x-hidden md:overflow-x-auto overflow-y-auto">
                <div style={{
                  minWidth: '1000px',
                  height: 'calc(100vh - 88px)',
                  padding: '12px',
                  boxSizing: 'border-box',
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px 280px',
                  gridTemplateRows: '220px 220px 180px',
                  gap: '12px',
                  overflow: 'hidden',
                  background: `
                    radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.07) 0%, transparent 50%),
                    radial-gradient(ellipse at 85% 40%, rgba(249,115,22,0.06) 0%, transparent 50%),
                    radial-gradient(ellipse at 15% 70%, rgba(234,179,8,0.05) 0%, transparent 45%),
                    radial-gradient(ellipse at 55% 95%, rgba(34,197,94,0.06) 0%, transparent 45%)
                  `,
                }}>

                  {/* ── TILE NORD (indaco) ── */}
                  <div style={{
                    gridColumn: '1/2', gridRow: '1/2',
                    background: 'rgba(99,102,241,0.09)',
                    border: '1px solid rgba(99,102,241,0.20)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
                  }} ref={nordTileRef}>
                    <div className="flex-1 overflow-auto thick-scrollbar">
                      <TileWrapper tileKey="TileSteeringFocus" tileProps={{ ...tileProps, extras: { label: p1, type: 'priority_nw' } }} customStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }} />
                      <TileWrapper tileKey="AiPendingActionTop" tileProps={{ ...tileProps, extras: { label: p2, type: 'priority_ne', isIperProattivo: mission?.orchestrationStyle === 'Iper-Proattivo', priorities } }} customStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />
                    </div>
                  </div>

                  {/* ── TILE EST (arancione) ── */}
                  <div style={{
                    gridColumn: '3/4', gridRow: '1/3',
                    background: 'rgba(249,115,22,0.08)',
                    border: '1px solid rgba(249,115,22,0.18)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '10px',
                    transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
                  }} ref={estTileRef}>
                    <div className="flex-1 w-full min-h-[0] overflow-hidden rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
                      <TileWrapper tileKey="MissionSummaryTile" tileProps={{ ...tileProps, extras: { label: k1, type: 'kpi' } }} customStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }} />
                    </div>
                    <div className="flex-1 w-full min-h-[0] overflow-hidden rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
                      <TileWrapper tileKey="TileCompass" tileProps={{ ...tileProps, extras: { label: k2, type: 'kpi' } }} customStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }} />
                    </div>
                    <div className="flex-1 w-full min-h-[0] overflow-hidden rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
                      <TileWrapper tileKey="TileRadar" tileProps={{ ...tileProps }} customStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }} />
                    </div>
                  </div>

                  {/* ── WIDGET FRECCE CENTRALE ── */}
                  <div style={{
                    gridColumn: '2/3', gridRow: '1/3',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <HoshinArrows 
                      nordActive={nordActive} nordUrgent={nordUrgent}
                      estActive={estActive} estUrgent={estUrgent}
                      ovestActive={ovestActive} ovestUrgent={ovestUrgent}
                      sudActive={sudActive} sudUrgent={sudUrgent}
                    />
                  </div>

                  {/* ── TILE OVEST (ambra) ── */}
                  <div style={{
                    gridColumn: '1/2', gridRow: '2/3',
                    background: 'rgba(234,179,8,0.08)',
                    border: '1px solid rgba(234,179,8,0.18)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '10px',
                    transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
                  }} ref={ovestTileRef}>
                    <div className="flex-1 min-h-[0] overflow-hidden rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
                      <TileWrapper tileKey="BriefingRoom" tileProps={{ ...tileProps }} customStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }} />
                    </div>
                    <div className="flex-1 min-h-[0] overflow-hidden rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
                      <TileWrapper tileKey="TileDecisionLog" tileProps={{ ...tileProps }} customStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }} />
                    </div>
                  </div>

                  {/* ── TILE SUD (verde) ── */}
                  <div style={{
                    gridColumn: '1/4', gridRow: '3/4',
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.18)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '10px',
                    padding: '10px',
                    transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
                  }} ref={sudTileRef}>
                    <div className="flex-1 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
                      <TileWrapper tileKey="TileIntelligence" tileProps={{ ...tileProps }} customStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }} />
                    </div>
                    <div className="flex-1 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
                      <TileWrapper tileKey="TilePulse" tileProps={{ ...tileProps }} customStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }} />
                    </div>
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
