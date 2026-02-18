import React from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

/**
 * EventHealthBar — Event-Driven Health Monitor
 * Shows the overall health/status of a dossier/event in real-time.
 * 
 * healthScore: 0-100
 * phase: 'planning' | 'active' | 'review' | 'completed' | 'critical'
 * nextActions: string[]
 * daysToDeadline: number | null
 */

const PHASE_CONFIG = {
  planning: {
    label: 'Pianificazione',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    bar: 'bg-blue-500',
    icon: Clock,
  },
  active: {
    label: 'In Corso',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    bar: 'bg-emerald-500',
    icon: Activity,
  },
  review: {
    label: 'Revisione',
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
    bar: 'bg-amber-500',
    icon: TrendingUp,
  },
  completed: {
    label: 'Completato',
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    border: 'border-green-500/30',
    bar: 'bg-green-500',
    icon: CheckCircle,
  },
  critical: {
    label: 'Critico',
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    bar: 'bg-red-500',
    icon: AlertTriangle,
  },
};

const getHealthColor = (score) => {
  if (score >= 75) return { bar: 'bg-emerald-500', text: 'text-emerald-400' };
  if (score >= 50) return { bar: 'bg-amber-500', text: 'text-amber-400' };
  if (score >= 25) return { bar: 'bg-orange-500', text: 'text-orange-400' };
  return { bar: 'bg-red-500', text: 'text-red-400' };
};

const EventHealthBar = ({ event }) => {
  if (!event) return null;

  const phase = event.phase || 'planning';
  const healthScore = event.healthScore ?? 70;
  const nextActions = event.nextActions || [];
  const daysToDeadline = event.daysToDeadline ?? null;

  const phaseConfig = PHASE_CONFIG[phase] || PHASE_CONFIG.planning;
  const PhaseIcon = phaseConfig.icon;
  const healthColor = getHealthColor(healthScore);

  return (
    <div className={`glass-tile rounded-2xl p-4 border ${phaseConfig.border} ${phaseConfig.bg} mb-4`}>
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PhaseIcon className={`w-4 h-4 ${phaseConfig.color}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${phaseConfig.color}`}>
            {phaseConfig.label}
          </span>
        </div>
        {daysToDeadline !== null && (
          <span className="text-xs text-white/50">
            {daysToDeadline > 0
              ? `${daysToDeadline}g al deadline`
              : daysToDeadline === 0
              ? 'Deadline oggi'
              : `${Math.abs(daysToDeadline)}g scaduto`}
          </span>
        )}
      </div>

      {/* Health Score Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-white/60">Event Health</span>
          <span className={`text-xs font-bold ${healthColor.text}`}>{healthScore}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-700 ${healthColor.bar}`}
            style={{ width: `${healthScore}%` }}
          />
        </div>
      </div>

      {/* Next Actions */}
      {nextActions.length > 0 && (
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1.5">Prossime Azioni</p>
          <div className="space-y-1">
            {nextActions.slice(0, 3).map((action, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className={`w-1 h-1 rounded-full ${phaseConfig.bar}`} />
                <span className="text-xs text-white/70 truncate">{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventHealthBar;
