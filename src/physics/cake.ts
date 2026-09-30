import type { Tuning } from '../game/tuning';

/**
 * Cake tower model. The whole stack is an inverted pendulum pivoting at the tray (lean
 * angle theta, positive = leaning right/forward). Each tier j >= 1 also slides relative to
 * the tier below with a damped spring. Pure data + functions, no rendering, fully testable.
 */
export interface Tier {
  /** Width (px). */
  w: number;
  /** Relative mass (bottom tier ~ 1). */
  mass: number;
  /** Slide offset relative to the tier below (px, positive = right). */
  s: number;
  /** Slide velocity (px/s). */
  sv: number;
}

export interface CakeState {
  theta: number;
  omega: number;
  /** All tiers ever on the cake (index 0 = bottom). Only the first `count` are present. */
  tiers: Tier[];
  count: number;
  /** Extra mass sitting on top of the top tier (e.g. the bouquet). */
  topMass: number;
  /** Pendulum length (px), recomputed whenever mass changes. */
  L: number;
  /** Centre of mass height above the tray (px). */
  com: number;
  toppled: boolean;
}

export function tierWidth(t: Tuning, j: number): number {
  const n = t.TIER_COUNT;
  return Math.round(t.TIER_W_BOTTOM + ((t.TIER_W_TOP - t.TIER_W_BOTTOM) * j) / (n - 1));
}

export function createCake(t: Tuning): CakeState {
  const tiers: Tier[] = [];
  for (let j = 0; j < t.TIER_COUNT; j++) {
    const w = tierWidth(t, j);
    tiers.push({ w, mass: (w * w) / (t.TIER_W_BOTTOM * t.TIER_W_BOTTOM), s: 0, sv: 0 });
  }
  const cake: CakeState = {
    theta: 0,
    omega: 0,
    tiers,
    count: t.TIER_COUNT,
    topMass: 0,
    L: 1,
    com: 1,
    toppled: false,
  };
  recomputeL(t, cake);
  return cake;
}

export function resetCake(t: Tuning, cake: CakeState): void {
  cake.theta = 0;
  cake.omega = 0;
  cake.count = t.TIER_COUNT;
  cake.topMass = 0;
  cake.toppled = false;
  for (let j = 0; j < cake.tiers.length; j++) {
    const tier = cake.tiers[j];
    tier.w = tierWidth(t, j);
    tier.mass = (tier.w * tier.w) / (t.TIER_W_BOTTOM * t.TIER_W_BOTTOM);
    tier.s = 0;
    tier.sv = 0;
  }
  recomputeL(t, cake);
}

/** Recompute centre-of-mass height and pendulum length from the tiers still present. */
export function recomputeL(t: Tuning, cake: CakeState): void {
  let m = 0;
  let mh = 0;
  for (let j = 0; j < cake.count; j++) {
    const tm = cake.tiers[j].mass;
    m += tm;
    mh += tm * (t.TRAY_H + j * t.TIER_H + t.TIER_H / 2);
  }
  if (cake.topMass > 0 && cake.count > 0) {
    m += cake.topMass;
    mh += cake.topMass * (t.TRAY_H + cake.count * t.TIER_H + 3);
  }
  cake.com = m > 0 ? mh / m : t.TRAY_H;
  cake.L = Math.max(4, cake.com * t.L_SCALE);
}

/** Slide threshold for tier j (it falls when |s_j| exceeds this). */
export function slideLimit(t: Tuning, cake: CakeState, j: number): number {
  return t.SLIDE_FALL_FRAC * cake.tiers[j - 1].w;
}

/** Largest |s_j| / limit over the present tiers (0 = perfectly stacked, 1 = falling). */
export function maxSlideRatio(t: Tuning, cake: CakeState): number {
  let r = 0;
  for (let j = 1; j < cake.count; j++) {
    r = Math.max(r, Math.abs(cake.tiers[j].s) / slideLimit(t, cake, j));
  }
  return r;
}

/**
 * Apply an instantaneous hit: `dOmega` to the lean rate and `dSlide` (px/s) of slide
 * velocity shared by the tiers, weighted towards the top of the stack.
 */
export function applyImpulse(cake: CakeState, dOmega: number, dSlide: number): void {
  cake.omega += dOmega;
  const n = cake.count;
  for (let j = 1; j < n; j++) {
    cake.tiers[j].sv += (dSlide * j) / (n - 1) / cake.tiers[j].mass ** 0.25;
  }
}

/** Put extra mass on the top tier (bouquet). Raises the centre of mass. */
export function addTopMass(t: Tuning, cake: CakeState, mass: number): void {
  cake.topMass += mass;
  recomputeL(t, cake);
}

/**
 * Frosting stickiness weight: 1 inside GLUE_ZONE, tapering linearly to 0 at
 * GLUE_ZONE * GLUE_TAPER so the catch-net has a soft edge instead of a cliff.
 */
export function glueFactor(t: Tuning, theta: number): number {
  const a = Math.abs(theta);
  if (a <= t.GLUE_ZONE) return 1;
  const outer = t.GLUE_ZONE * t.GLUE_TAPER;
  return a >= outer ? 0 : (outer - a) / (outer - t.GLUE_ZONE);
}

/**
 * Advance the cake by dt.
 * @param aTray horizontal acceleration of the tray in world space (px/s^2, + = right)
 * @param aUp vertical acceleration of the tray (px/s^2, + = up)
 * @returns index of the lowest tier that fell this step, or -1
 */
export function stepCake(
  t: Tuning,
  cake: CakeState,
  aTray: number,
  aUp: number,
  dt: number,
): number {
  if (cake.toppled || cake.count === 0) return -1;
  const L = cake.L;
  const th = cake.theta;
  // Effective gravity; never negative (airborne = weightless, landing = heavy).
  const g = Math.max(0, t.G + aUp);
  const glue = t.GLUE * th * glueFactor(t, th);
  const alpha = (g / L) * Math.sin(th) - (aTray / L) * Math.cos(th) - t.DAMP * cake.omega - glue;
  // Semi-implicit Euler: stable and cheap at 120 Hz.
  cake.omega += alpha * dt;
  cake.theta += cake.omega * dt;
  if (Math.abs(cake.theta) > t.TOPPLE_ANGLE) {
    cake.toppled = true;
    return -1;
  }

  const drive = t.SLIDE_GAIN * g * Math.sin(cake.theta);
  let fell = -1;
  const topMassShare = cake.topMass;
  for (let j = 1; j < cake.count; j++) {
    const tier = cake.tiers[j];
    // Tiers higher up are looser; extra mass on the top tier makes it heavier to stop.
    const m = tier.mass + (j === cake.count - 1 ? topMassShare : 0);
    const loose = 1 + t.SLIDE_HEIGHT_GAIN * (j / (t.TIER_COUNT - 1));
    const inertia = Math.sqrt(m / tier.mass);
    const acc = drive * loose - (t.SLIDE_K / inertia) * tier.s - (t.SLIDE_C / inertia) * tier.sv;
    tier.sv += acc * dt;
    tier.s += tier.sv * dt;
    if (fell < 0 && Math.abs(tier.s) > slideLimit(t, cake, j)) fell = j;
  }
  if (fell >= 0) {
    cake.count = fell;
    // The bouquet goes with the top tier.
    cake.topMass = 0;
    recomputeL(t, cake);
  }
  return fell;
}

/**
 * Horizontal offset (px, relative to the tray centre, in the cake's leaning frame) of tier j:
 * the accumulated slides of every tier up to and including j.
 */
export function tierOffset(cake: CakeState, j: number): number {
  let x = 0;
  for (let k = 1; k <= j; k++) x += cake.tiers[k].s;
  return x;
}
