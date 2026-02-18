import React from 'react';
import { CheckCircle, Circle, Clock, Zap } from 'lucide-react';

/**
 * EventTimeline — Event-Driven Phase Timeline
 * Visual representation of event lifecycle phases.
 * 
 * phases: Array of { id, label, status: 'completed'|'active'|'pending', date?, description? }
 * currentPhase: string (id of current active phase)
 */

const PHASE_ICONS = {
  completed: CheckCircle,
  active: Zap,
  pending: Circle,
};

const PHASE_STYLES = {
  completed: {
    icon: 'text-emerald-400',
    dot: 'bg-emerald-500',
    connector: 'bg-emerald-500/50',
    label: 'text-white/80',
    date: 'text-emerald-400/70',
  },
  active: {
    icon: 'text-cyan-400',
    dot: 'bg-cyan-500 ring-2 ring-cyan-400/30 ring-offset-1 ring-offset-black/50',
    connector: 'bg-white/10',
    label: 'text-white font-semibold',
    date: 'text-cyan-400/70',
  },
  pending: {
    icon: 'text-white/30',
    dot: 'bg-white/15',
    connector: 'bg-white/10',
    label: 'text-white/40',
    date: 'text-white/25',
  },
};

const DEFAULT_PHASES = [
  { id: 'briefing', label: 'Briefing Iniziale', status: 'completed' },
  { id: 'analysis', label: 'Analisi Rischi', status: 'completed' },
  { id: 'planning', label: 'Pianificazione', status: 'active' },
  { id: 'execution', label: 'Esecuzione', status: 'pending' },
  { id: 'review', label: 'Review Finale', status: 'pending' },
];

const EventTimeline = ({ phases = DEFAULT_PHASES, compact = false }) => {
  return (
    <div className={`glass-tile rounded-2xl ${compact ? 'p-3' : 'p-4'} border border-white/10`}>
      {!compact && (
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-white/50" />
          <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Timeline Progetto
          </span>
        </div>
      )}

      <div className="relative">
        {phases.map((phase, idx) => {
          const isLast = idx === phases.length - 1;
          const styles = PHASE_STYLES[phase.status] || PHASE_STYLES.pending;
          const PhaseIcon = PHASE_ICONS[phase.status] || Circle;

          return (
            <div key={phase.id} className="flex gap-3">
              {/* Connector Column */}
              <div className="flex flex-col items-center">
                {/* Dot */}
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${styles.dot}`} />
                {/* Vertical Line */}
                {!isLast && (
                  <div className={`w-0.5 flex-1 my-1 min-h-[16px] ${styles.connector}`} />
                )}
              </div>

              {/* Content */}
              <div className={`${isLast ? 'pb-0' : 'pb-3'} flex-1 min-w-0`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs truncate ${styles.label}`}>
                    {phase.label}
                  </span>
                  {phase.date && (
                    <span className={`text-xs flex-shrink-0 ${styles.date}`}>
                      {phase.date}
                    </span>
                  )}
                </div>
                {phase.description && phase.status === 'active' && (
                  <p className="text-xs text-white/40 mt-0.5 truncate">{phase.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EventTimeline;
