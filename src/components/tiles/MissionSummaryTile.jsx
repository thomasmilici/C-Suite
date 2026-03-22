import toast from 'react-hot-toast';
import { Target, Zap, BarChart3, Layers, RefreshCcw, CalendarClock } from 'lucide-react';
import { useMission } from '../../context/MissionContext';


/**
 * MissionSummaryTile
 * ─────────────────────────────────────────────────────────────────────────────
 * An intelligent "filled placeholder" that shows real mission calibration data
 * (vision, priorities, kpis, orchestrationStyle) instead of a blank slot.
 *
 * Used by mapStrategyToGrid as PLACEHOLDER in symmetry-fill slots.
 * Falls back gracefully if no calibration data is available.
 *
 * Props (passed via tileProps):
 *   - section?: 'vision' | 'priorities' | 'kpis' | 'style' | 'auto'
 *     If 'auto' (default), picks the most data-rich section to display.
 */
export function MissionSummaryTile({ section = 'auto' }) {
    const { mission } = useMission();

    const vision            = mission?.vision            || null;
    const priorities        = Array.isArray(mission?.priorities) ? mission.priorities : [];
    const kpis              = Array.isArray(mission?.kpis)       ? mission.kpis       : [];
    const orchestrationStyle = mission?.orchestrationStyle       || null;

    let daysToReview = null;
    
    // Fallback to createdAt or exactly now if both are pending writes
    const rawDate = mission?.updatedAt || mission?.createdAt;
    
    if (mission && rawDate !== undefined) {
        const updatedDate = rawDate && rawDate.toDate 
            ? rawDate.toDate() 
            : rawDate ? new Date(rawDate) : new Date();
            
        const nextReviewDate = new Date(updatedDate);
        nextReviewDate.setDate(nextReviewDate.getDate() + 30);
        const today = new Date();
        const diffTime = nextReviewDate - today;
        daysToReview = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Auto-pick: show the most informative section
    let displaySection = section;
    if (section === 'auto') {
        if (vision)                  displaySection = 'vision';
        else if (priorities.length)  displaySection = 'priorities';
        else if (kpis.length)        displaySection = 'kpis';
        else if (orchestrationStyle) displaySection = 'style';
        else                         displaySection = 'empty';
    }

    // ── Empty state ────────────────────────────────────────────────────────────
    if (displaySection === 'empty' || !mission) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 p-4 text-center">
                <div className="w-6 h-6 rounded-full border border-white/10 mb-2" />
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                    — non calibrato —
                </p>
            </div>
        );
    }

    // ── Vision section ─────────────────────────────────────────────────────────
    let content = null;

    if (displaySection === 'vision') {
        content = (
            <div className="flex flex-col gap-2 p-1">
                <div className="flex items-center gap-1.5 mb-1">
                    <Target className="w-3 h-3 text-indigo-400" />
                    <span className="text-[9px] font-mono text-indigo-400/70 uppercase tracking-widest">
                        North Star
                    </span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed font-mono line-clamp-4">
                    {vision}
                </p>
            </div>
        );
    }

    // ── Priorities section ─────────────────────────────────────────────────────
    else if (displaySection === 'priorities') {
        content = (
            <div className="flex flex-col gap-2 p-1">
                <div className="flex items-center gap-1.5 mb-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span className="text-[9px] font-mono text-amber-400/70 uppercase tracking-widest">
                        Priorità
                    </span>
                </div>
                <div className="flex flex-col gap-1">
                    {priorities.slice(0, 4).map((p, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                            <span className="text-[9px] font-mono text-amber-500/50 mt-0.5 flex-shrink-0">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <span className="text-[10px] text-white/60 font-mono leading-tight line-clamp-2">
                                {p}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── KPIs section ──────────────────────────────────────────────────────────
    else if (displaySection === 'kpis') {
        content = (
            <div className="flex flex-col gap-2 p-1">
                <div className="flex items-center gap-1.5 mb-1">
                    <BarChart3 className="w-3 h-3 text-emerald-400" />
                    <span className="text-[9px] font-mono text-emerald-400/70 uppercase tracking-widest">
                        KPI
                    </span>
                </div>
                <div className="flex flex-col gap-1">
                    {kpis.slice(0, 4).map((k, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-emerald-500/50 mt-1.5 flex-shrink-0" />
                            <span className="text-[10px] text-white/60 font-mono leading-tight line-clamp-2">
                                {k}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── Orchestration style section ────────────────────────────────────────────
    else if (displaySection === 'style') {
        const styleColors = {
            'Iper-Proattivo': 'text-red-400 border-red-500/20 bg-red-500/5',
            'Standard':       'text-indigo-400 border-indigo-500/20 bg-indigo-500/5',
            'Delegatore':     'text-blue-400 border-blue-500/20 bg-blue-500/5',
            'Reattivo':       'text-zinc-400 border-zinc-500/20 bg-zinc-500/5',
        };
        const colorClass = styleColors[orchestrationStyle] || styleColors['Standard'];
        content = (
            <div className="flex flex-col gap-2 p-1">
                <div className="flex items-center gap-1.5 mb-1">
                    <Layers className="w-3 h-3 text-white/40" />
                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
                        Stile
                    </span>
                </div>
                <span className={`inline-flex self-start px-2 py-0.5 rounded-lg border text-[10px] font-mono font-semibold ${colorClass}`}>
                    {orchestrationStyle}
                </span>
            </div>
        );
    }

    if (!content) return null;

    return (
        <div className="relative w-full h-full flex flex-col group/tile">
            {content}
            <button
                onClick={async () => {
                    if (mission?.id) {
                        try {
                            const { updateMission } = await import('../../services/missionService');
                            await updateMission(mission.id, { isSetupComplete: false });
                        } catch (err) {
                            console.error('Failed to recalibrate:', err);
                            toast.error('Impossibile ricalibrare: permessi insufficienti.');
                        }
                    }
                }}
                className="absolute top-1 right-1 p-1.5 opacity-40 hover:opacity-100 transition-opacity text-zinc-400 hover:text-cyan-400 hover:bg-cyan-950/50 rounded-md shadow-sm border border-transparent hover:border-cyan-800/30"
                title="Ricalibra Mandato"
            >
                <RefreshCcw className="w-4 h-4" />
            </button>
            <div className="absolute bottom-1 right-1 flex items-center gap-2">
                {daysToReview !== null && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-mono text-indigo-400 font-bold tracking-widest" title="Giorni alla prossima review della Hoshin Matrix">
                        <CalendarClock className="w-3 h-3" />
                        <span>REVIEW: {daysToReview > 0 ? `${daysToReview}G` : 'SCADUTA'}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
