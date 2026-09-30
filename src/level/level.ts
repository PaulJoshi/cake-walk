/**
 * The one level: fixed layout (world x positions), with seeded variation applied by the
 * obstacles themselves. Depth: 0 = the waiter's lane, +1 = the back row, -1 = towards camera.
 */
export const LEVEL = {
  LENGTH: 2760,
  START_X: 56,
  KITCHEN_END: 250,
  SPILL: { x0: 385, x1: 470 },
  UNCLE_X: 700,
  ROOMBA_X: 1000,
  TODDLER: { trigger: 1170, cross: 1300 },
  GRANDMA: { trigger: 1450, start: 1540 },
  DJ_X: 1840,
  BOUQUET: { trigger: 1990, brideX: 2140 },
  CONGA: { trigger: 2270, cross: 2400 },
  TABLE: { x0: 2622, x1: 2690, x: 2700 },
  /** Bass drop fires at this many seconds remaining. */
  BASS_DROP_AT: 20,
  /** A lane object is "in the waiter's lane" while |depth| < this. */
  LANE_HALF_DEPTH: 0.45,
} as const;

/** Named zones for the debug "skip to zone" keys (1-9, 0). */
export const ZONES: readonly { name: string; x: number }[] = [
  { name: 'Kitchen', x: LEVEL.START_X },
  { name: 'Spill', x: 320 },
  { name: 'Uncle', x: 600 },
  { name: 'Roomba', x: 880 },
  { name: 'Toddler', x: 1120 },
  { name: 'Grandma', x: 1420 },
  { name: 'DJ', x: 1760 },
  { name: 'Bouquet', x: 1960 },
  { name: 'Conga', x: 2240 },
  { name: 'Table', x: 2560 },
];
