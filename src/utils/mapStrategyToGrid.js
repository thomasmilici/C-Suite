/**
 * Transforms the active mission data (vision, priorities, kpis) into a static 
 * 8-tile X-Matrix layout ('Closed Compass' PromptPal encastrement).
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
    { component: 'TileSteeringFocus',  slot: 'N1', cssClass: 'compass-slot-N1', extras: { label: p1, type: 'priority_nw' } },
    { component: 'AiPendingActionTop', slot: 'N2', cssClass: 'compass-slot-N2', extras: { label: p2, type: 'priority_ne', isIperProattivo: isIperProat, priorities } },
    { component: 'TileIntelligence',   slot: 'W1', cssClass: 'compass-slot-W1', extras: { label: 'Strategic Intelligence' } },
    { component: 'BriefingRoom',       slot: 'W2', cssClass: 'compass-slot-W2', extras: { label: vStar, type: 'vision' } },
    { component: 'MissionSummaryTile', slot: 'E1', cssClass: 'compass-slot-E1', extras: { label: k1, type: 'kpi' } },
    { component: 'TileRadar',          slot: 'E2', cssClass: 'compass-slot-E2', extras: { label: k2, type: 'kpi' } },
    { component: 'TileDecisionLog',    slot: 'S1', cssClass: 'compass-slot-S1', extras: { label: 'Decision Log', type: 'system' } },
    { component: 'TilePulse',          slot: 'S2', cssClass: 'compass-slot-S2', extras: { label: 'Daily Pulse', type: 'system' } },
  ];
}
