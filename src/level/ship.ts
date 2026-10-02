/**
 * The Pirate Ship world: the same 60-second walk, from the galley across two ships lashed
 * together, to the captain's table on the flagship. Fixed layout with seeded variation
 * applied by the obstacles themselves (depth works as in the wedding hall).
 */
export const SHIP = {
  LENGTH: 2760,
  START_X: 56,
  KITCHEN_END: 250,
  CANNON_X: 500,
  BARREL_X: 860,
  /** Centre of the gangplank between the two ships. */
  PLANK_X: 1160,
  PARROT: { trigger: 1380 },
  KRAKEN_X: 2000,
  /** The crow's nest mast where the lookout rings the bell. */
  MAST_X: 2260,
  TABLE: { x0: 2622, x1: 2690, x: 2700 },
  /** The rogue wave breaks at this many seconds remaining. */
  WAVE_AT: 20,
} as const;

/** Named zones for the debug "skip to zone" keys. */
export const SHIP_ZONES: readonly { name: string; x: number }[] = [
  { name: 'Galley', x: SHIP.START_X },
  { name: 'Cannonballs', x: 330 },
  { name: 'Barrel', x: 700 },
  { name: 'Plank', x: 980 },
  { name: 'Parrot', x: 1300 },
  { name: 'Kraken', x: 1780 },
  { name: 'Mast', x: 2180 },
  { name: 'Table', x: 2560 },
];
