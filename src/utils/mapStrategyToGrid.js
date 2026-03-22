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
  
  // Ovest: fallback on vision if annualObjectives is empty/missing
  const annualObjs   = Array.isArray(mission.annualObjectives) && mission.annualObjectives.length > 0 
                        ? mission.annualObjectives 
                        : [mission.vision || 'Strategic North Star'];
                        
  const longTermObjs = Array.isArray(mission.longTermObjectives) ? mission.longTermObjectives : [];

  const slots = [];

  // FASE 4: UI Implementazione delle intersezioni
  // TODO: Il frontend leggerà il campo 'correlations' per tracciare vettori/linee (SVG) 
  // tra Priorità (Nord) e Obiettivi/KPI.
  // TODO: Il campo 'accountability' guiderà il rendering dei mini-avatar/label dei responsabili.

  // ── NORD (Alto-Centro): TOP PRIORITIES (D) ──────────────────────────────
  // Usa lo slot B1 (spans 2 columns: grid-column: 2 / 4)
  if (priorities.length > 0) {
      slots.push({
          component: 'TileSteeringFocus',
          slot: 'B1',
          cssClass: 'xmatrix-slot-B1',
          extras: { 
              label: priorities[0], 
              type: 'priority_north',
              correlations: [{ priorityId: 'p1', kpiId: 'k1', level: 'high', type: 'direct' }],
              accountability: [{ ownerName: 'TBD', supportNames: [] }]
          }
      });
  }

  // ── SUD (Basso-Centro): LONG-TERM GOALS (A) ─────────────────────────────
  // Usa lo slot B4 (spans 2 columns: grid-column: 2 / 4)
  if (longTermObjs.length > 0 || true) {
      slots.push({
          component: 'TileCompass',
          slot: 'B4',
          cssClass: 'xmatrix-slot-B4',
          extras: { 
              label: longTermObjs[0] || 'Long-Term Goal', 
              type: 'long_term_goal',
              correlations: [{ priorityId: 'p1', kpiId: 'k1', level: 'medium', type: 'indirect' }],
              accountability: [{ ownerName: 'TBD', supportNames: [] }]
          }
      });
  }

  // ── OVEST (Sinistra): ANNUAL OBJECTIVES (B) ─────────────────────────────
  // Usa gli slot A1, A2s, A3s, A4 (singole celle incolonnate a sinistra)
  const westSlots = ['xmatrix-slot-A1', 'xmatrix-slot-A2s', 'xmatrix-slot-A3s', 'xmatrix-slot-A4'];
  annualObjs.slice(0, 4).forEach((obj, idx) => {
      slots.push({
          component: 'TileIntelligence', // Renderizza qui l'obiettivo
          slot: `A${idx + 1}`,
          cssClass: westSlots[idx],
          extras: { 
              label: obj, 
              type: 'annual_objective',
              accountability: [{ ownerName: 'TBD', supportNames: [] }]
          }
      });
  });

  // ── EST (Destra): KPIs (E) ────────────────────────────────────────────────
  // Usa gli slot D1, D2s, D3s, D4 (singole celle incolonnate a destra)
  const eastSlots = ['xmatrix-slot-D1', 'xmatrix-slot-D2s', 'xmatrix-slot-D3s', 'xmatrix-slot-D4'];
  kpis.slice(0, 4).forEach((kpi, idx) => {
      slots.push({
          component: 'TileRadar',
          slot: `D${idx + 1}`,
          cssClass: eastSlots[idx],
          extras: { 
              label: kpi, 
              type: 'kpi',
              accountability: [{ ownerName: 'TBD', supportNames: [] }]
          }
      });
  });

  return slots;
}
