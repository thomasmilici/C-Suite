/**
 * Transforms the active mission data (vision, priorities, kpis) into a static 
 * 9-tile X-Matrix layout ('C-Suite OS 9-Tile Encastrement').
 * 
 * @param {object} mission - The active mission config from Firestore
 * @returns {Array<{component, slot, cssClass, size, [renderMode], [extras]}>}
 */
export function mapStrategyToGrid(mission) {
  if (!mission) return [];

  const priorities   = Array.isArray(mission.priorities) ? mission.priorities : [];
  const kpis         = Array.isArray(mission.kpis)       ? mission.kpis       : [];
  const orgStyle     = (mission.orchestrationStyle || '').trim();
  const isIperProat  = orgStyle === 'Iper-Proattivo';

  const p1 = priorities[0] || 'AI Orchestration';
  const p2 = priorities[1] || 'Operatività Autonoma';
  const vStar = mission.vision || 'Strategic North Star';
  const k1 = kpis[0] || '-40% Time-to-Decision';
  const k2 = kpis[1] || '95% Accuracy';

  return [
    // ── CENTER COLUMN (Encastred around sphere) ──────────────────────────────
    { component: 'TileSteeringFocus',  slot: 'N1', cssClass: 'compass-slot-N1', extras: { label: p1, type: 'priority_nw' } },
    { component: 'TileDecisionLog',    slot: 'S1', cssClass: 'compass-slot-S1', extras: { label: 'Decision Log', type: 'system' } },
    { component: 'TilePulse',          slot: 'S2', cssClass: 'compass-slot-S2', extras: { label: 'Accountability Log', type: 'system' } },

    // ── LEFT COLUMN (W) ──────────────────────────────────────────────────────
    { component: 'BriefingRoom',       slot: 'W1', cssClass: 'compass-slot-W1', extras: { label: 'Intelligence Reports', type: 'system' } },
    { component: 'TileIntelligence',   slot: 'W2', cssClass: 'compass-slot-W2', extras: { label: vStar, type: 'vision' } },
    { component: 'TileCompass',        slot: 'W3', cssClass: 'compass-slot-W3', extras: { label: 'OKR / Critical Signals', type: 'system' } },

    // ── RIGHT COLUMN (E) ─────────────────────────────────────────────────────
    { component: 'AiPendingActionTop', slot: 'E1', cssClass: 'compass-slot-E1', extras: { label: p2, type: 'priority_ne', isIperProattivo: isIperProat, priorities } },
    { component: 'MissionSummaryTile', slot: 'E2', cssClass: 'compass-slot-E2', extras: { label: k1, type: 'kpi', isHighlighted: true } },
    { component: 'TileRadar',          slot: 'E3', cssClass: 'compass-slot-E3', extras: { label: k2, type: 'kpi' } },
  ];
}
