/**
 * The Space Station world: the same 60-second walk, from the docking bay along the station's
 * spine to the observation deck, where an astronaut is marrying an alien. Fixed layout with
 * seeded variation applied by the obstacles themselves.
 */
export const STATION = {
  LENGTH: 2760,
  START_X: 56,
  KITCHEN_END: 250,
  /** Start of the moving walkway. */
  WALKWAY_X: 380,
  /** Centre of the laser security gate. */
  LASER_X: 880,
  /** Start of the section where the artificial gravity glitches. */
  GRAVITY_X: 1060,
  /** The teleporter pad. */
  TELEPORT_X: 1500,
  /** Crossing this x calls in the flying saucer. */
  UFO: { trigger: 1840 },
  /** The meteor shower hits at this many seconds remaining. */
  METEOR_AT: 42,
  TABLE: { x0: 2622, x1: 2690, x: 2700 },
} as const;

/** Named zones for the debug "skip to zone" keys. */
export const STATION_ZONES: readonly { name: string; x: number }[] = [
  { name: 'Docking bay', x: STATION.START_X },
  { name: 'Walkway', x: 300 },
  { name: 'Laser gate', x: 740 },
  { name: 'Gravity', x: 980 },
  { name: 'Teleporter', x: 1400 },
  { name: 'Saucer', x: 1740 },
  { name: 'Corridor', x: 2200 },
  { name: 'Table', x: 2560 },
];
