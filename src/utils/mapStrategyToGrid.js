/**
 * Hoshin-to-Grid Mapper  —  Layout Governance Engine v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts mission calibration data into X-Matrix 4×4 grid descriptors,
 * enforcing Layout Governance rules:
 *
 *   1. Sphere Collision Guard  — span-aware; auto-shrinks or drops violators
 *   2. Iper-Proattivo Fix      — 2×1 wide OR 4×1 ultra-wide, never a 2×2 block
 *   3. Anti-Gap Pattern        — single-item quadrants expand for visual symmetry
 *   4. Overload Management     — stack / carousel for > 4 items per quadrant
 *
 * Grid coordinate system:
 *   Columns: A(1) | B(2) | C(3) | D(4)
 *   Rows:    1 (top) → 4 (bottom)
 *
 *  ┌──────┬──────────────────┬──────┐
 *  │  A1  │   B1/WEST(2×)   │  D1  │  ← Row 1
 *  ├──────┼──────────────────┤──────┤
 *  │  A2  │  🔮 SPHERE ZONE  │  D2  │  ← Rows 2+3
 *  │      │  B2 C2 B3 C3    │      │     (inviolabile)
 *  │  A3  │  — — — — — — —  │  D3  │
 *  ├──────┼──────────────────┤──────┤
 *  │  A4  │   B4/SOUTH(2×)  │  D4  │  ← Row 4
 *  └──────┴──────────────────┴──────┘
 *
 * @param {object|null} mission - Active mission from MissionContext
 *   Relevant fields: priorities[], kpis[], vision, northStar, orchestrationStyle
 * @returns {Array<{component, slot, cssClass, size, colSpan, rowSpan, [renderMode], [extras]}>}
 */
export function mapStrategyToGrid(mission) {

  // ═══════════════════════════════════════════════════════════════════════════
  //  CONSTANTS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Sphere occupies these 4 cells — NEVER writable by any tile. */
  const SPHERE_ZONE = new Set(['B2', 'C2', 'B3', 'C3']);

  /** Sphere bounding box in 1-indexed grid coords (used for span overlap math). */
  const SPHERE = { colStart: 2, colEnd: 3, rowStart: 2, rowEnd: 3 };

  /** Reusable intelligent filler: shows real mission data in empty symmetry slots. */
  const PLACEHOLDER = 'MissionSummaryTile';

  // ═══════════════════════════════════════════════════════════════════════════
  //  MISSION DATA
  // ═══════════════════════════════════════════════════════════════════════════

  const priorities   = Array.isArray(mission?.priorities) ? mission.priorities : [];
  const kpis         = Array.isArray(mission?.kpis)       ? mission.kpis       : [];
  const hasVision    = !!(mission?.vision || mission?.northStar);
  const orgStyle     = (mission?.orchestrationStyle || '').trim();
  const isIperProat  = orgStyle === 'Iper-Proattivo';

  // ═══════════════════════════════════════════════════════════════════════════
  //  SLOT COORDINATE MAP
  //  Maps every CSS slot key → its top-left grid cell (1-indexed).
  //  Required by the collision guard to compute bounding boxes.
  // ═══════════════════════════════════════════════════════════════════════════

  const SLOT_COORDS = {
    // Row 1
    'A1':      { col: 1, row: 1 },
    'B1':      { col: 2, row: 1 },
    'D1':      { col: 4, row: 1 },
    // Multi-span row-1 specials
    'A1wide':  { col: 1, row: 1 },   // colSpan 2 → A+B
    'row1':    { col: 1, row: 1 },   // colSpan 4 → full top row
    // Col A middle (rows 2+3)
    'A2':      { col: 1, row: 2 },   // rowSpan 2 → tall merged
    'A2s':     { col: 1, row: 2 },   // rowSpan 1 → row 2 only
    'A3s':     { col: 1, row: 3 },   // rowSpan 1 → row 3 only
    // Col D middle (rows 2+3)
    'D2':      { col: 4, row: 2 },   // rowSpan 2 → tall merged
    'D2s':     { col: 4, row: 2 },   // rowSpan 1 → row 2 only
    'D3s':     { col: 4, row: 3 },   // rowSpan 1 → row 3 only
    // Row 4
    'A4':      { col: 1, row: 4 },
    'B4':      { col: 2, row: 4 },
    'D4':      { col: 4, row: 4 },
  };

  /** CSS class lookup: slot key → Tailwind/xmatrix CSS class. */
  const SLOT_CSS = {
    'A1':     'xmatrix-slot-A1',
    'B1':     'xmatrix-slot-B1',
    'D1':     'xmatrix-slot-D1',
    'A1wide': 'xmatrix-slot-A1wide',
    'row1':   'xmatrix-slot-row1',
    'A2':     'xmatrix-slot-A2',
    'A2s':    'xmatrix-slot-A2s',
    'A3s':    'xmatrix-slot-A3s',
    'D2':     'xmatrix-slot-D2',
    'D2s':    'xmatrix-slot-D2s',
    'D3s':    'xmatrix-slot-D3s',
    'A4':     'xmatrix-slot-A4',
    'B4':     'xmatrix-slot-B4',
    'D4':     'xmatrix-slot-D4',
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  GOVERNANCE RULE 1 — SPHERE COLLISION GUARD
  //  Validates every descriptor before it enters the result array.
  //  If a tile's bounding box overlaps the sphere zone, it tries to
  //  auto-shrink spans. If unfixable (1×1 still overlaps), the tile is dropped.
  // ═══════════════════════════════════════════════════════════════════════════

  function _overlaps(col, row, colSpan, rowSpan) {
    const colEnd = col + colSpan - 1;
    const rowEnd = row + rowSpan - 1;
    return (
      colEnd   >= SPHERE.colStart && col <= SPHERE.colEnd &&
      rowEnd   >= SPHERE.rowStart && row <= SPHERE.rowEnd
    );
  }

  /**
   * Validate a raw descriptor.
   * @returns {object|null} — cleaned descriptor, or null if blocked.
   */
  function validate(desc) {
    if (SPHERE_ZONE.has(desc.slot)) return null; // hard block on exact slot

    const coords = SLOT_COORDS[desc.slot];
    if (!coords) return null; // unknown slot → drop

    const { col, row } = coords;
    let { colSpan = 1, rowSpan = 1 } = desc;

    if (!_overlaps(col, row, colSpan, rowSpan)) return { ...desc, colSpan, rowSpan };

    // Try shrinking colSpan first (prefer width-reduction over height)
    while (colSpan > 1 && _overlaps(col, row, colSpan, rowSpan)) colSpan--;
    // Then try shrinking rowSpan
    while (rowSpan > 1 && _overlaps(col, row, colSpan, rowSpan)) rowSpan--;
    // If 1×1 still collides → tile is entirely inside sphere → drop
    if (_overlaps(col, row, colSpan, rowSpan)) return null;

    // Recompute size string after shrink
    const sizeFixed = `${colSpan}x${rowSpan}`;
    return { ...desc, colSpan, rowSpan, size: sizeFixed };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  KEYWORD → COMPONENT RESOLVERS
  // ═══════════════════════════════════════════════════════════════════════════

  const PRIORITY_KW = [
    [/forecast|predict|ai|intelligence|anali|insight/i, 'TileIntelligence'  ],
    [/risk|threat|signal|danger|vulnerab/i,              'TileRadar'         ],
    [/layout|fix|focus|steering|priorit|agenda|regia/i,  'TileSteeringFocus' ],
    [/compass|strateg|direction|align|obiettiv/i,        'TileCompass'       ],
    [/decision|scelta|log|approv|choice/i,               'TileDecisionLog'   ],
    [/pulse|mood|daily|energia|giornata/i,               'TilePulse'         ],
    [/brief|context|situation|scenario/i,                'BriefingRoom'      ],
    [/pending|queue|review|hitl|action|azione/i,         'AiPendingActionTop'],
  ];

  const KPI_KW = [
    [/decision|time.to|speed|cycle|latency/i,    'TileDecisionLog'   ],
    [/risk|threat|signal|level|exposure/i,        'TileRadar'         ],
    [/intelligence|insight|data|score|forecast/i, 'TileIntelligence'  ],
    [/pulse|mood|nps|team|energia/i,              'TilePulse'         ],
    [/compass|align|objectiv|obiettiv/i,          'TileCompass'       ],
  ];

  function resolveComp(text, kwMap, pool, used) {
    for (const [re, comp] of kwMap) {
      if (re.test(text) && !used.has(comp)) return comp;
    }
    return pool.find(c => !used.has(c)) || PLACEHOLDER;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  RESULT BUILDER
  // ═══════════════════════════════════════════════════════════════════════════

  const result    = [];
  const usedComps = new Set(); // tracks real components (not placeholders) for dedup
  const usedSlots = new Set(); // prevents double-booking a slot

  /**
   * Place a tile descriptor into the result, after collision validation.
   * @param {string} component - TILE_REGISTRY key
   * @param {string} slot      - Grid slot key (e.g. 'A1', 'B1', 'row1')
   * @param {string} size      - 'ColsxRows' string (e.g. '2x1', '1x2')
   * @param {object} meta      - Optional extra fields (renderMode, extras)
   */
  function place(component, slot, size = '1x1', meta = {}) {
    if (usedSlots.has(slot)) return; // slot already occupied

    const cssClass     = SLOT_CSS[slot];
    if (!cssClass) return; // unregistered slot

    const [cs, rs]     = size.split('x').map(Number);
    const colSpan      = cs || 1;
    const rowSpan      = rs || 1;

    const raw       = { component, slot, cssClass, size, colSpan, rowSpan, ...meta };
    const validated = validate(raw);
    if (!validated) return; // collision guard rejected

    result.push(validated);
    usedSlots.add(slot);
    if (component !== PLACEHOLDER && component !== 'KpiCarousel') {
      usedComps.add(component);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SCENARIO FLAGS
  // ═══════════════════════════════════════════════════════════════════════════

  const northOverload = priorities.length > 4;
  const eastOverload  = kpis.length > 4;
  const northMini     = priorities.length === 1 && !isIperProat;
  const eastMini      = kpis.length === 1;
  // Ultra-wide: Iper-Proattivo with high load (> 2 priorities)
  const ultraWide     = isIperProat && priorities.length > 2;

  // ═══════════════════════════════════════════════════════════════════════════
  //  GOVERNANCE RULE 2 — IPER-PROATTIVO LAYOUT
  //  AiPendingActionTop is NEVER a 2×2.
  //  It becomes:  2×1 wide  (B1)  when priorities ≤ 2
  //               4×1 ultra (row1) when priorities > 2  (high urgency)
  // ═══════════════════════════════════════════════════════════════════════════

  const northDefaults = ['TileSteeringFocus', 'AiPendingActionTop', 'TileCompass', 'TilePulse'];
  const eastDefaults  = ['TileRadar', 'TileDecisionLog', 'TileIntelligence', 'TilePulse'];

  if (isIperProat) {
    if (ultraWide) {
      // ── 4×1 ULTRA-WIDE: AiPendingActionTop claims the entire Row 1 ──────
      place('AiPendingActionTop', 'row1', '4x1');
      // Row 1 fully consumed → NORTH starts from rows 2+3+4 of col A
      // EAST starts from rows 2+3+4 of col D
      _placeNorthFrom(['A2s', 'A3s', 'A4']);
      _placeEastFrom(['D2s', 'D3s', 'D4']);
    } else {
      // ── 2×1 WIDE: AiPendingActionTop in center-top ──────────────────────
      place('AiPendingActionTop', 'B1', '2x1');
      // A1 → first NORTH tile; D1 → first EAST tile
      _placeNorthFrom(['A1', 'A2', 'A4']);
      _placeEastFrom(['D1', 'D2', 'D4']);
    }

  // ═══════════════════════════════════════════════════════════════════════════
  //  GOVERNANCE RULE 3 — ANTI-GAP (North Minimalist)
  //  Single priority expands to a 2×1 wide tile occupying A1+B1.
  //  BriefingRoom is rerouted to the SOUTH slot (B4).
  // ═══════════════════════════════════════════════════════════════════════════
  } else if (northMini) {
    const singleComp = resolveComp(priorities[0], PRIORITY_KW, northDefaults, usedComps);
    place(singleComp, 'A1wide', '2x1'); // spans cols A+B, row 1
    // D1 gets the primary KPI tile
    const d1Comp = resolveComp(kpis[0] || '', KPI_KW, eastDefaults, usedComps);
    place(d1Comp, 'D1', '1x1');
    // Remaining EAST tiles
    _placeEastFrom(['D2', 'D4']);
    // SOUTH gets BriefingRoom or TilePulse (BriefingRoom displaced from WEST)
    const southComp = hasVision && !usedComps.has('BriefingRoom')
      ? 'BriefingRoom' : 'TilePulse';
    place(southComp, 'B4', '2x1');
    _fillSymmetry();
    return result.filter(e => !SPHERE_ZONE.has(e.slot));

  } else {
    // ── NORMAL SCENARIO ────────────────────────────────────────────────────
    const westTile = hasVision ? 'BriefingRoom' : PLACEHOLDER;
    place(westTile, 'B1', '2x1'); // WEST: vision/annual objectives
    _placeNorthFrom(['A1', 'A2', 'A2s', 'A3s', 'A4']);
    _placeEastFrom(['D1', 'D2', 'D2s', 'D3s', 'D4']);
  }

  // ── SOUTH quadrant (all paths except northMini early return) ──────────────
  _placeSouth();
  _fillSymmetry();

  // ── FINAL SPHERE FILTER ────────────────────────────────────────────────────
  return result.filter(e => !SPHERE_ZONE.has(e.slot));

  // ═══════════════════════════════════════════════════════════════════════════
  //  INTERNAL HELPERS — North, East, South placement strategies
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Place NORTH tiles (priorities → left column A) into the given slot pool.
   * Applies OVERLOAD MANAGEMENT if priorities > 4.
   * @param {string[]} availableSlots - Ordered slot keys to fill
   */
  function _placeNorthFrom(availableSlots) {
    const slotsWithSizes = _inferSizes(availableSlots);

    if (northOverload) {
      // ── GOVERNANCE RULE 4: Overload → Stack mode ────────────────────────
      // Consolidate into first available tall slot with renderMode:'stack'
      const tallSlot = slotsWithSizes.find(s => s.size === '1x2') || slotsWithSizes[0];
      if (!tallSlot) return;
      const anchor = resolveComp(priorities[0] || '', PRIORITY_KW, northDefaults, usedComps);
      place(anchor, tallSlot.slot, tallSlot.size, {
        renderMode: 'stack',
        extras: priorities.slice(1), // all priorities passed as extras for stacking
      });
      return;
    }

    // Build component list from priorities
    const comps = priorities.slice(0, availableSlots.length).map(p =>
      resolveComp(p, PRIORITY_KW, northDefaults, usedComps)
    );
    // Pad to at least 2 for visual symmetry
    while (comps.length < Math.min(2, availableSlots.length)) {
      comps.push(resolveComp('', PRIORITY_KW, northDefaults, usedComps) || PLACEHOLDER);
    }

    // Adaptive slot selection based on how many tiles we have
    const slots = _pickNorthSlots(availableSlots, comps.length);
    comps.slice(0, slots.length).forEach((comp, i) => {
      place(comp, slots[i].slot, slots[i].size);
    });
  }

  /**
   * Place EAST tiles (KPIs → right column D) into the given slot pool.
   * Applies OVERLOAD MANAGEMENT if kpis > 4, and ANTI-GAP if kpis === 1.
   * @param {string[]} availableSlots - Ordered slot keys to fill
   */
  function _placeEastFrom(availableSlots) {
    const slotsWithSizes = _inferSizes(availableSlots);

    if (eastOverload) {
      // ── GOVERNANCE RULE 4: Overload → KpiCarousel in last slot ──────────
      // Top 3 KPIs go in regular slots; excess goes to KpiCarousel
      const regularSlots = slotsWithSizes.slice(0, 3);
      kpis.slice(0, regularSlots.length).forEach((k, i) => {
        const comp = resolveComp(k, KPI_KW, eastDefaults, usedComps);
        place(comp, regularSlots[i].slot, '1x1');
      });
      const carouselSlot = slotsWithSizes[slotsWithSizes.length - 1];
      if (carouselSlot && !usedSlots.has(carouselSlot.slot)) {
        place('KpiCarousel', carouselSlot.slot, '1x1', {
          renderMode: 'carousel',
          extras: kpis.slice(3),
        });
      }
      return;
    }

    if (eastMini) {
      // ── GOVERNANCE RULE 3: Anti-Gap — flank the sphere (D2s) ────────────
      const singleKpi = resolveComp(kpis[0] || '', KPI_KW, eastDefaults, usedComps);
      // Place the single KPI at D2s (next to sphere) instead of corner D1
      const flankSlot = availableSlots.includes('D2s') ? 'D2s'
                      : availableSlots.includes('D2')  ? 'D2'
                      : availableSlots[0];
      place(singleKpi, flankSlot, '1x1');
      // Fill the rest of EAST with placeholders for symmetry
      availableSlots
        .filter(s => s !== flankSlot)
        .forEach(s => place(PLACEHOLDER, s, _slotDefaultSize(s)));
      return;
    }

    // NORMAL: adaptive fill
    const comps = kpis.slice(0, availableSlots.length).map(k =>
      resolveComp(k, KPI_KW, eastDefaults, usedComps)
    );
    while (comps.length < Math.min(2, availableSlots.length)) {
      comps.push(resolveComp('', KPI_KW, eastDefaults, usedComps) || PLACEHOLDER);
    }
    const slots = _pickEastSlots(availableSlots, comps.length);
    comps.slice(0, slots.length).forEach((comp, i) => {
      place(comp, slots[i].slot, slots[i].size);
    });
  }

  /** Place the SOUTH tile (accountability anchor, center-bottom B4). */
  function _placeSouth() {
    if (usedSlots.has('B4')) return;
    const southCandidates = ['TilePulse', 'TileDecisionLog', 'TileCompass'];
    const southTile = southCandidates.find(c => !usedComps.has(c)) || PLACEHOLDER;
    place(southTile, 'B4', '2x1');
  }

  /** Fill remaining empty edge slots with placeholders to maintain grid symmetry. */
  function _fillSymmetry() {
    const edgeSlots = ['A4', 'D4'];
    edgeSlots.forEach(s => {
      if (!usedSlots.has(s)) place(PLACEHOLDER, s, '1x1');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SLOT SELECTION UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Adaptive North slot picker:
   * Merges rows 2+3 into a tall slot when < 4 tiles; splits when = 4.
   */
  function _pickNorthSlots(pool, count) {
    // Prefer these canonical layouts
    const A_LAYOUTS = {
      1: [{ slot: 'A1',  size: '1x1' }],
      2: [{ slot: 'A1',  size: '1x1' }, { slot: 'A2',  size: '1x2' }],
      3: [{ slot: 'A1',  size: '1x1' }, { slot: 'A2',  size: '1x2' }, { slot: 'A4',  size: '1x1' }],
      4: [{ slot: 'A1',  size: '1x1' }, { slot: 'A2s', size: '1x1' }, { slot: 'A3s', size: '1x1' }, { slot: 'A4', size: '1x1' }],
    };
    const layout = A_LAYOUTS[Math.min(count, 4)] || A_LAYOUTS[2];
    // Filter to only slots in the provided pool (ultra-wide mode restricts pool)
    return layout.filter(l => pool.includes(l.slot));
  }

  /** Same logic for the East (D) column. */
  function _pickEastSlots(pool, count) {
    const D_LAYOUTS = {
      1: [{ slot: 'D1',  size: '1x1' }],
      2: [{ slot: 'D1',  size: '1x1' }, { slot: 'D2',  size: '1x2' }],
      3: [{ slot: 'D1',  size: '1x1' }, { slot: 'D2',  size: '1x2' }, { slot: 'D4',  size: '1x1' }],
      4: [{ slot: 'D1',  size: '1x1' }, { slot: 'D2s', size: '1x1' }, { slot: 'D3s', size: '1x1' }, { slot: 'D4', size: '1x1' }],
    };
    const layout = D_LAYOUTS[Math.min(count, 4)] || D_LAYOUTS[2];
    return layout.filter(l => pool.includes(l.slot));
  }

  /** Returns the canonical default size string for a given slot key. */
  function _slotDefaultSize(slot) {
    if (slot === 'A2' || slot === 'D2') return '1x2';
    if (slot === 'B1' || slot === 'B4') return '2x1';
    if (slot === 'A1wide')              return '2x1';
    if (slot === 'row1')                return '4x1';
    return '1x1';
  }

  /** Converts a raw slot key array into {slot, size} objects using default sizes. */
  function _inferSizes(slots) {
    return slots.map(s => ({ slot: s, size: _slotDefaultSize(s) }));
  }
}
