/**
 * EVERY gameplay constant lives here. Units: world pixels, seconds, radians.
 * The object is intentionally mutable so `?debug=1` can live-tweak values.
 */
const DEG = Math.PI / 180;

export const T = {
  // ---------------------------------------------------------------- simulation
  /** Fixed simulation rate (ticks per second). */
  SIM_HZ: 120,
  /** Longest frame delta fed to the accumulator (prevents spiral of death). */
  MAX_FRAME_DT: 0.1,
  /** Round length in seconds. */
  ROUND_TIME: 60,

  // ---------------------------------------------------------------- waiter walking
  /** Top walking speed (px/s). */
  WALK_MAX: 90,
  /** Acceleration while WALK is held (px/s^2). */
  WALK_ACCEL: 220,
  /** Deceleration when WALK is released (px/s^2). */
  STOP_DECEL: 300,
  /** Deceleration multiplier on the champagne spill (slippery). */
  SPILL_DECEL_MULT: 0.35,
  /** Seconds between random slip impulses while moving on the spill. */
  SPILL_SLIP_INTERVAL: 0.28,
  /** Angular velocity kick of one slip (rad/s, random sign). */
  SPILL_SLIP_OMEGA: 0.32,
  /** Speed kick of one slip (px/s, random sign). */
  SPILL_SLIP_SPEED: 10,
  /** Deceleration when pressing into a blocker such as grandma (px/s^2). Harsher than a stop. */
  BLOCK_DECEL: 520,
  /** Distance before a blocker where the soft block begins (px). */
  BLOCK_SOFT: 6,
  /** Half width of the waiter's body for collisions (px). */
  WAITER_HALF_W: 7,
  /** Gravity for the waiter's hop (px/s^2). */
  HOP_GRAVITY: 900,

  // ---------------------------------------------------------------- tray
  /** Arm reach: tray offset range is +/- this (px). */
  TRAY_REACH: 14,
  /** Max tray speed relative to the hands (px/s). */
  TRAY_SPEED: 60,
  /** Max tray acceleration relative to the hands (px/s^2). */
  TRAY_ACCEL: 1400,
  /** Proportional gain from offset error to desired tray speed (1/s). */
  TRAY_RESPONSE: 7,
  /** Fraction of the waiter's walking acceleration that reaches the tray (arm compliance). */
  ARM_COUPLING: 0.5,
  /** Time constant for smoothing the finite-difference tray acceleration (s). */
  ACCEL_SMOOTH_TAU: 0.03,
  /** Keyboard: tray target change rate while A/D held (units/s, target range is [-1, 1]). */
  KEY_TRAY_RATE: 3.2,
  /** Keyboard: rate the tray target eases back to 0 when released (units/s). */
  KEY_TRAY_RETURN: 2.2,

  // ---------------------------------------------------------------- cake pendulum
  /** Effective gravity for the pendulum (px/s^2). */
  // Full cake: L ~ 61 px, G/L ~ 2.2: an unbalanced full-throttle start topples in ~2.3 s.
  G: 135,
  /** Pendulum length = centre-of-mass height above the tray * this scale. */
  L_SCALE: 2.4,
  /**
   * Angular damping (1/s). Kept low on purpose: damping makes the cake follow the tray,
   * which would make slow tray corrections useless. Low damping = wobbly jelly.
   */
  DAMP: 1.0,
  /** "Frosting stickiness": restoring stiffness inside GLUE_ZONE (1/s^2). Must exceed G/L. */
  GLUE: 9,
  /** Glue only acts for small leans (rad). */
  GLUE_ZONE: 8.5 * DEG,
  /** Glue fades out linearly between GLUE_ZONE and GLUE_ZONE * GLUE_TAPER. */
  GLUE_TAPER: 1.8,
  /** Whole cake topples beyond this lean (rad). */
  TOPPLE_ANGLE: 40 * DEG,

  // ---------------------------------------------------------------- tiers
  /** Number of tiers at the start. */
  TIER_COUNT: 7,
  /** Bottom tier width (px). */
  TIER_W_BOTTOM: 56,
  /** Top tier width (px). */
  TIER_W_TOP: 20,
  /** Tier height (px). */
  TIER_H: 10,
  /** Tray thickness below the bottom tier (px). */
  TRAY_H: 2,
  /** Slide drive: s'' += SLIDE_GAIN * G * sin(theta). */
  SLIDE_GAIN: 4.1,
  /** Upper tiers are looser: drive multiplier grows by this much from bottom to top. */
  SLIDE_HEIGHT_GAIN: 0.6,
  /** Slide spring stiffness (1/s^2). */
  SLIDE_K: 30,
  /** Slide damping (1/s). */
  SLIDE_C: 6,
  /** A tier falls when |slide| exceeds this fraction of the width of the tier below. */
  SLIDE_FALL_FRAC: 0.45,
  /** Fraction of the fall threshold that triggers the slow-motion moment. */
  SLOWMO_FRAC: 0.8,
  /** Slow-motion time scale and duration (s, real time). */
  SLOWMO_SCALE: 0.4,
  SLOWMO_TIME: 0.15,

  // ---------------------------------------------------------------- obstacles
  /** Seconds of warning shown before an obstacle matters. */
  ALERT_LEAD: 1.0,
  // Per-seed variation: each obstacle's position shifts by up to +/- this (px) from its
  // zone's base x in level.ts, so every seed lays the hall out a little differently.
  SPILL_SHIFT: 40,
  SPILL_WIDTH_MIN: 60,
  SPILL_WIDTH_MAX: 110,
  UNCLE_SHIFT: 50,
  ROOMBA_SHIFT: 50,
  TODDLER_SHIFT: 45,
  GRANDMA_SHIFT: 50,
  CONGA_SHIFT: 40,
  /** Seeded shift of the bass drop moment (+/- s around LEVEL.BASS_DROP_AT). */
  BASS_DROP_SHIFT: 3,
  // Dancing Uncle: hip bumps into the lane on a rhythm.
  /** Seeded tempo: seconds between hip bumps. */
  UNCLE_PERIOD_MIN: 1.05,
  UNCLE_PERIOD_MAX: 1.45,
  /** Per-beat seeded timing jitter (+/- s). */
  UNCLE_JITTER: 0.15,
  /** How long the hips stay in the lane per beat (s). */
  UNCLE_OUT_TIME: 0.36,
  /** Wind-up animation before each bump (s). */
  UNCLE_WINDUP: 0.35,
  /** Half width of the hip zone in the lane (px). */
  UNCLE_REACH: 16,
  UNCLE_OMEGA: 1.0,
  UNCLE_SLIDE: 30,
  UNCLE_SPEED_MULT: 0.5,
  // Roomba: patrols an ellipse; only its front arc is in the lane.
  ROOMBA_PERIOD_MIN: 3.6,
  ROOMBA_PERIOD_MAX: 4.6,
  ROOMBA_RX_MIN: 50,
  ROOMBA_RX_MAX: 68,
  ROOMBA_HALF_W: 8,
  /** Upward speed of the waiter's hop when running over it (px/s). */
  ROOMBA_HOP: 80,
  ROOMBA_OMEGA: 0.7,
  ROOMBA_SLIDE: 22,
  ROOMBA_SPEED_MULT: 0.75,
  ROOMBA_COOLDOWN: 1.0,
  // Toddler Dash: waits after the trigger, then sprints across aiming at the waiter.
  TODDLER_DELAY_MIN: 0.55,
  TODDLER_DELAY_MAX: 0.95,
  /** Runs anyway this long after the trigger (s). */
  TODDLER_WAIT_MAX: 2.6,
  /** Starts running when the waiter is this many seconds from the crossing. */
  TODDLER_AIM_ETA: 0.5,
  /** Depth units per second while sprinting. */
  TODDLER_RUN_SPEED: 3.6,
  TODDLER_HALF_W: 6,
  TODDLER_OMEGA: 1.35,
  TODDLER_SLIDE: 70,
  // Grandma with a walker: slow blocker in the lane.
  GRANDMA_SPEED_MIN: 10,
  GRANDMA_SPEED_MAX: 18,
  GRANDMA_TIME_MIN: 2.6,
  GRANDMA_TIME_MAX: 4.8,
  GRANDMA_HALF_W: 10,
  /** Seconds to step into / out of the lane. */
  GRANDMA_STEP_TIME: 0.8,
  // Bass drop (global event).
  BASS_OMEGA: 0.75,
  BASS_SLIDE: 30,
  // Bouquet toss.
  BOUQUET_DELAY: 0.9,
  BOUQUET_FLIGHT: 1.3,
  /** Extra mass on the top tier (bottom tier = 1). */
  BOUQUET_MASS: 0.3,
  /** Seeded landing offset range (+/- px from the top tier centre). */
  BOUQUET_OFFSET_MAX: 7,
  BOUQUET_OMEGA_PER_PX: 0.06,
  BOUQUET_SLIDE_PER_PX: 5,
  // Conga line: dancers cross the lane in sequence.
  CONGA_COUNT: 6,
  /** Seeded gap between dancers (s). */
  CONGA_SPACING_MIN: 0.34,
  CONGA_SPACING_MAX: 0.5,
  CONGA_DEPTH_SPEED: 1.6,
  CONGA_DELAY_MIN: 0.3,
  CONGA_DELAY_MAX: 0.8,
  CONGA_HALF_W: 6,
  CONGA_OMEGA: 0.35,
  CONGA_SLIDE: 12,
  CONGA_SPEED_MULT: 0.7,

  // ---------------------------------------------------------------- pirate ship world
  // Rolling deck: the ship rocks on a seeded swell that keeps nudging the cake.
  SWELL_PERIOD_MIN: 3.6,
  SWELL_PERIOD_MAX: 5.0,
  /** Peak angular acceleration the swell puts on the cake (rad/s^2). */
  SWELL_ACCEL_MIN: 0.08,
  SWELL_ACCEL_MAX: 0.15,
  /** The swell fades in over this distance after the galley (px). */
  SWELL_FADE_IN: 160,
  // Loose cannonballs roll across the deck (in depth) with the swell.
  CANNON_SHIFT: 40,
  CANNON_COUNT_MIN: 2,
  CANNON_COUNT_MAX: 3,
  /** Seeded gap between neighbouring cannonballs (px). */
  CANNON_GAP_MIN: 45,
  CANNON_GAP_MAX: 75,
  /** How far across the deck they roll (depth units either side of the lane). */
  CANNON_DEPTH: 1.7,
  /** Seeded lag of each ball behind the swell (rad). */
  CANNON_LAG_MAX: 1.2,
  CANNON_HALF_W: 5,
  CANNON_HOP: 70,
  CANNON_OMEGA: 0.55,
  CANNON_SLIDE: 18,
  CANNON_SPEED_MULT: 0.75,
  CANNON_COOLDOWN: 0.8,
  // Swinging rum barrel: a pendulum from the yardarm that clips the top of the cake.
  BARREL_SHIFT: 50,
  BARREL_PERIOD_MIN: 3.4,
  BARREL_PERIOD_MAX: 4.2,
  /** Seeded swing amplitude (rad). */
  BARREL_AMP_MIN: 62 * DEG,
  BARREL_AMP_MAX: 72 * DEG,
  BARREL_ROPE: 60,
  /** Height of the barrel's centre above the tray at the bottom of its swing (px). */
  BARREL_LOW: 62,
  BARREL_RADIUS: 8,
  BARREL_OMEGA: 0.35,
  BARREL_SLIDE: 60,
  // Walk the plank: a springy gangplank between the two ships. Fast steps make it bounce.
  PLANK_SHIFT: 40,
  PLANK_LEN_MIN: 120,
  PLANK_LEN_MAX: 165,
  /** Static sag in the middle of the plank under the waiter (px). */
  PLANK_SAG: 5,
  /** Plank spring stiffness (1/s^2) and damping (1/s). */
  PLANK_K: 70,
  PLANK_DAMP: 2.2,
  /** Plank speed kick per footstep at full walking speed (px/s). Scales with speed^2. */
  PLANK_KICK: 26,
  /** Lean kick (rad/s) per px of bounce at the bottom of each bounce (random side). */
  PLANK_WOBBLE: 0.05,
  // The captain's parrot perches on the top tier, flaps about and flies off again.
  PARROT_SHIFT: 50,
  /** Seconds it circles (telegraph) before landing. */
  PARROT_CIRCLE: 1.0,
  PARROT_PERCH_MIN: 2.0,
  PARROT_PERCH_MAX: 3.2,
  PARROT_MASS: 0.22,
  PARROT_LAND_OMEGA: 0.25,
  PARROT_FLAP_MIN: 0.35,
  PARROT_FLAP_MAX: 0.7,
  PARROT_FLAP_OMEGA: 0.16,
  // Kraken: a tentacle bursts up through the deck, blocks the way, then slams the deck.
  KRAKEN_SHIFT: 50,
  /** Distance before the tentacle that makes it rise (px). */
  KRAKEN_TRIGGER: 130,
  KRAKEN_RISE: 0.6,
  KRAKEN_TIME_MIN: 1.5,
  KRAKEN_TIME_MAX: 2.8,
  /** Wind-up before the slam (telegraph, s). */
  KRAKEN_WINDUP: 0.5,
  KRAKEN_HALF_W: 9,
  /** The slam jolts anyone closer than this (px), weaker with distance. */
  KRAKEN_SLAM_RANGE: 80,
  KRAKEN_SLAM_OMEGA: 0.4,
  KRAKEN_SLAM_SLIDE: 18,
  KRAKEN_SLAM_HOP: 60,
  // Rogue wave (global event): the lookout rings 3-2-1, then a wave breaks over the deck.
  WAVE_SHIFT: 3,
  WAVE_OMEGA: 0.7,
  WAVE_SLIDE: 28,
  WAVE_SPEED_MULT: 0.6,
  /** The deck stays slippery this long after the wave (s). */
  WAVE_WET_TIME: 3,

  // ---------------------------------------------------------------- set-down
  /** Max speed to set the cake down (px/s). */
  SET_DOWN_SPEED: 8,
  /** Max lean to set the cake down (rad). */
  SET_DOWN_ANGLE: 10 * DEG,
  /** Hold still this long inside the table zone (s). */
  SET_DOWN_HOLD: 0.5,

  // ---------------------------------------------------------------- reactions / scoring
  /** Guests gasp above this lean (rad). */
  GASP_ANGLE: 20 * DEG,
  /** Recovering from beyond this lean counts as a CLUTCH save (rad). */
  CLUTCH_ANGLE: 30 * DEG,
  /** ...once the lean falls back below this (rad). */
  CLUTCH_RECOVER: 10 * DEG,
  /** Minimum tiers to count as a wedding cake. */
  MIN_TIERS: 4,
  TIER_POINTS: 1000,
  TIME_POINTS_PER_S: 100,
  CLUTCH_POINTS: 250,
  S_GRADE_SECONDS: 15,
};

export type Tuning = typeof T;
export { DEG };
