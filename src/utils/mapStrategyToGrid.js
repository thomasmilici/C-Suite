/**
 * Hoshin-to-Grid Mapper  —  X-Matrix Strategy Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts mission calibration data into a X-Matrix 4×4 grid descriptor array.
 * Implements Hoshin Kanri quadrant logic:
 *
 *   NORTH (col A)  → Absolute Priorities   → slots A1, A2, A3, A4
 *   WEST  (B1)     → Annual Objectives     → slot  B1  (wide)
 *   EAST  (col D)  → KPI Metrics           → slots D1, D2, D3, D4
 *   SOUTH (B4)     → Accountability / Log  → slot  B4  (wide)
 *
 * SPHERE ZONE (INVIOLABILE): B2, C2, B3, C3 — never assigned to any tile.
 *
 * Grid visual:
 *  ┌──────┬──────────────────┬──────┐
 *  │  A1  │   B1 WEST (2×)  │  D1  │  ← Row 1
 *  ├──────┼─────────────────┬┤──────┤
 *  │  A2  │                 ││  D2  │
 *  │      │  🔮 SFERA AI    ││      │  ← Rows 2+3 (B2 C2 B3 C3 = sphere)
 *  │  A3  │                 ││  D3  │
 *  ├──────┼─────────────────┴┤──────┤
 *  │  A4  │   B4 SOUTH (2×) │  D4  │  ← Row 4
 *  └──────┴──────────────────┴──────┘
 *   NORTH       WEST/SOUTH          EAST
 *
 * @param {object|null} mission - Active mission from MissionContext (Firestore doc)
 *   Expected fields: priorities[], kpis[], vision, northStar, orchestrationStyle
 * @returns {Array<{component: string, slot: string, cssClass: string, size: string}>}
 */
export function mapStrategyToGrid(mission) {

  // ── CONSTANTS ──────────────────────────────────────────────────────────────
  const SPHERE_SLOTS  = new Set(['B2', 'C2', 'B3', 'C3']);
  const PLACEHOLDER   = 'ProactiveAlerts';  // filler tile that can appear multiple times

  // ── MISSION DATA ───────────────────────────────────────────────────────────
  const priorities       = Array.isArray(mission?.priorities)   ? mission.priorities   : [];
  const kpis             = Array.isArray(mission?.kpis)         ? mission.kpis         : [];
  const hasVision        = !!(mission?.vision || mission?.northStar);
  const orchestrationStyle = (mission?.orchestrationStyle || '').trim();
  const isIperProattivo  = orchestrationStyle === 'Iper-Proattivo';

  // ── SLOT DEFINITIONS ───────────────────────────────────────────────────────
  // NORTH column slots (rows 1→4, col A)
  // When < 4 NORTH tiles: rows 2+3 are merged into a tall xmatrix-slot-A2 (1×2).
  // When = 4 NORTH tiles: rows split into individual A2s + A3s.
  const NORTH_SLOTS = {
    1: [ // 1 tile  → only A1 (the most visible row)
      { slot: 'A1', cssClass: 'xmatrix-slot-A1', size: '1x1' },
    ],
    2: [ // 2 tiles → A1 + A2-tall (rows 2+3 merged)
      { slot: 'A1', cssClass: 'xmatrix-slot-A1', size: '1x1' },
      { slot: 'A2', cssClass: 'xmatrix-slot-A2', size: '1x2' },
    ],
    3: [ // 3 tiles → A1 + A2-tall + A4
      { slot: 'A1', cssClass: 'xmatrix-slot-A1', size: '1x1' },
      { slot: 'A2', cssClass: 'xmatrix-slot-A2', size: '1x2' },
      { slot: 'A4', cssClass: 'xmatrix-slot-A4', size: '1x1' },
    ],
    4: [ // 4 tiles → all individual rows
      { slot: 'A1',  cssClass: 'xmatrix-slot-A1',  size: '1x1' },
      { slot: 'A2s', cssClass: 'xmatrix-slot-A2s', size: '1x1' },
      { slot: 'A3s', cssClass: 'xmatrix-slot-A3s', size: '1x1' },
      { slot: 'A4',  cssClass: 'xmatrix-slot-A4',  size: '1x1' },
    ],
  };

  // EAST column slots (rows 1→4, col D) — same logic as NORTH
  const EAST_SLOTS = {
    1: [ { slot: 'D1', cssClass: 'xmatrix-slot-D1', size: '1x1' } ],
    2: [
      { slot: 'D1', cssClass: 'xmatrix-slot-D1', size: '1x1' },
      { slot: 'D2', cssClass: 'xmatrix-slot-D2', size: '1x2' },
    ],
    3: [
      { slot: 'D1', cssClass: 'xmatrix-slot-D1', size: '1x1' },
      { slot: 'D2', cssClass: 'xmatrix-slot-D2', size: '1x2' },
      { slot: 'D4', cssClass: 'xmatrix-slot-D4', size: '1x1' },
    ],
    4: [
      { slot: 'D1',  cssClass: 'xmatrix-slot-D1',  size: '1x1' },
      { slot: 'D2s', cssClass: 'xmatrix-slot-D2s', size: '1x1' },
      { slot: 'D3s', cssClass: 'xmatrix-slot-D3s', size: '1x1' },
      { slot: 'D4',  cssClass: 'xmatrix-slot-D4',  size: '1x1' },
    ],
  };

  // ── COMPONENT RESOLVER HELPERS ─────────────────────────────────────────────
  // Keyword → candidate tile component, in priority order.
  const PRIORITY_KEYWORD_MAP = [
    [/forecast|predict|ai|intelligence|anali|insight/i, 'TileIntelligence'  ],
    [/risk|threat|signal|danger|vulnerability/i,         'TileRadar'         ],
    [/layout|fix|focus|steering|priorit|agenda|regia/i,  'TileSteeringFocus' ],
    [/compass|strateg|direction|align|obiettiv/i,        'TileCompass'       ],
    [/decision|scelta|log|approv|choice/i,               'TileDecisionLog'   ],
    [/pulse|mood|daily|daily|energia|giornata/i,         'TilePulse'         ],
    [/brief|context|situation|narr|scenario/i,           'BriefingRoom'      ],
    [/pending|queue|review|hitl|action|azione/i,         'AiPendingActionTop'],
  ];

  const KPI_KEYWORD_MAP = [
    [/decision|time.to|speed|cycle|latency/i,   'TileDecisionLog'   ],
    [/risk|threat|signal|level|exposure/i,       'TileRadar'         ],
    [/intelligence|insight|data|score|forecast/i,'TileIntelligence'  ],
    [/pulse|mood|nps|team|energia/i,             'TilePulse'         ],
    [/compass|align|objectiv|obiettiv/i,         'TileCompass'       ],
  ];

  /**
   * Resolve a free-text priority/KPI string to a component key.
   * Never returns a component that's already in the `usedSet`.
   * Falls back through a priority default list, then to the fallback arg.
   */
  function resolveComponent(text, keywordMap, defaultPool, usedSet, fallback) {
    for (const [regex, comp] of keywordMap) {
      if (regex.test(text) && !usedSet.has(comp)) return comp;
    }
    const fromPool = defaultPool.find(c => !usedSet.has(c));
    return fromPool || fallback;
  }

  // ── BUILD RESULT ───────────────────────────────────────────────────────────
  const result    = [];
  const usedSet   = new Set(); // tracks non-placeholder components for dedup

  function place(component, slotDef, overrideSize) {
    if (SPHERE_SLOTS.has(slotDef.slot)) return; // collision guard
    const isPlaceholder = component === PLACEHOLDER;
    result.push({
      component,
      slot:     slotDef.slot,
      cssClass: slotDef.cssClass,
      size:     overrideSize || slotDef.size,
    });
    if (!isPlaceholder) usedSet.add(component);
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  WEST QUADRANT — Annual Objectives / Vision (B1, center-top wide)
  //  Default: BriefingRoom. Iper-Proattivo: AiPendingActionTop with 2×2 flag.
  // ────────────────────────────────────────────────────────────────────────────
  if (isIperProattivo) {
    // In Iper-Proattivo mode the AI action queue claims the wide prominent slot
    place('AiPendingActionTop',
      { slot: 'B1', cssClass: 'xmatrix-slot-B1' },
      '2x2' // size flag: 2×2 prominence signal for styling consumers
    );
  } else {
    const westTile = hasVision ? 'BriefingRoom' : PLACEHOLDER;
    place(westTile, { slot: 'B1', cssClass: 'xmatrix-slot-B1' }, '2x1');
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  NORTH QUADRANT — Absolute Priorities (col A, rows 1→4)
  //  Up to 4 tiles; fewer priorities → merged tall slots for cleaner layout.
  // ────────────────────────────────────────────────────────────────────────────
  const northDefaults = ['TileSteeringFocus', 'AiPendingActionTop', 'TileCompass', 'TilePulse'];

  // Build list of resolved component keys for NORTH (min 2 for symmetry)
  const northComponents = priorities.slice(0, 4).map(p =>
    resolveComponent(p, PRIORITY_KEYWORD_MAP, northDefaults, usedSet, northDefaults[0])
  );
  while (northComponents.length < 2) {
    const def = northDefaults.find(c => !usedSet.has(c) && !northComponents.includes(c));
    northComponents.push(def || PLACEHOLDER);
  }

  // Clamp to 4 and pick the right slot layout
  const northCount = Math.min(northComponents.length, 4);
  const northSlots = NORTH_SLOTS[northCount];

  northComponents.slice(0, northSlots.length).forEach((comp, i) => {
    place(comp, northSlots[i]);
  });

  // If only 1-2 used, fill the bottom A4 slot with a placeholder for symmetry
  if (northCount <= 2) {
    place(PLACEHOLDER, { slot: 'A4', cssClass: 'xmatrix-slot-A4', size: '1x1' });
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  EAST QUADRANT — KPI Metrics (col D, rows 1→4)
  //  Up to 4 tiles; fewer KPIs → merged tall slots.
  // ────────────────────────────────────────────────────────────────────────────
  const eastDefaults = ['TileRadar', 'TileDecisionLog', 'TileIntelligence', 'TilePulse'];

  const eastComponents = kpis.slice(0, 4).map(k =>
    resolveComponent(k, KPI_KEYWORD_MAP, eastDefaults, usedSet, eastDefaults[0])
  );
  while (eastComponents.length < 2) {
    const def = eastDefaults.find(c => !usedSet.has(c) && !eastComponents.includes(c));
    eastComponents.push(def || PLACEHOLDER);
  }

  const eastCount = Math.min(eastComponents.length, 4);
  const eastSlots = EAST_SLOTS[eastCount];

  eastComponents.slice(0, eastSlots.length).forEach((comp, i) => {
    place(comp, eastSlots[i]);
  });

  // Symmetry fill for D4 when < 3 east tiles
  if (eastCount <= 2) {
    const usedSlots = new Set(result.map(r => r.slot));
    if (!usedSlots.has('D4')) {
      place(PLACEHOLDER, { slot: 'D4', cssClass: 'xmatrix-slot-D4', size: '1x1' });
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  SOUTH QUADRANT — Accountability / Daily Log (B4, center-bottom wide)
  //  Prefers TilePulse; falls back gracefully.
  // ────────────────────────────────────────────────────────────────────────────
  const southOptions = ['TilePulse', 'TileDecisionLog', 'TileCompass', PLACEHOLDER];
  const southTile    = southOptions.find(c => c === PLACEHOLDER || !usedSet.has(c)) || PLACEHOLDER;
  place(southTile, { slot: 'B4', cssClass: 'xmatrix-slot-B4', size: '2x1' });

  // ── FINAL COLLISION GUARD ──────────────────────────────────────────────────
  // Belt-and-suspenders: strip any descriptor that accidentally landed on a
  // sphere slot (should never happen, but this makes the contract rock-solid).
  return result.filter(entry => !SPHERE_SLOTS.has(entry.slot));
}
