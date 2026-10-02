import { T, type Tuning } from './tuning';
import { createRng, type Rng } from './rng';
import {
  applyImpulse,
  createCake,
  maxSlideRatio,
  slideLimit,
  stepCake,
  type CakeState,
} from '../physics/cake';
import { createWaiter, stepWaiter, type WaiterEnv, type WaiterState } from '../physics/waiter';
import type { Intent } from '../input/intent';
import type { Obstacle } from '../level/obstacles/types';
import { WORLDS, type Layout, type WorldId } from '../level/worlds';

export type Outcome = 'none' | 'won' | 'toppled' | 'cupcake' | 'timeout';

export type GameEvent =
  | { type: 'hit'; strength: number; x: number; label: string }
  | { type: 'tierLost'; from: number; to: number; theta: number }
  | { type: 'topple'; theta: number }
  | { type: 'clutch' }
  | { type: 'gasp' }
  | { type: 'slowmo' }
  | { type: 'step'; speed: number }
  | { type: 'dust'; x: number }
  | { type: 'placed' }
  | { type: 'bassCount'; n: number }
  | { type: 'bassDrop' }
  | { type: 'bouquetThrow' }
  | { type: 'bouquetLand' }
  | { type: 'hop' }
  | { type: 'slip' }
  | { type: 'timeout' }
  | { type: 'bell'; n: number }
  | { type: 'wave' }
  | { type: 'boing'; strength: number }
  | { type: 'squawk' }
  | { type: 'flap' }
  | { type: 'tentacle' }
  | { type: 'slam'; x: number }
  | { type: 'zap'; x: number }
  | { type: 'gravity'; mult: number }
  | { type: 'teleport'; from: number; to: number }
  | { type: 'ufo' }
  | { type: 'alarm'; n: number }
  | { type: 'meteor'; dir: number }
  | { type: 'breach'; x: number }
  | { type: 'shutters' };

/**
 * One round of CAKE WALK: waiter + cake + obstacles + timer + outcome. Completely headless
 * (no DOM, no rendering) so the autopilot can play it in tests.
 */
export class World {
  readonly t: Tuning;
  readonly rng: Rng;
  /** Separate stream for cosmetic randomness so visuals never change the outcome. */
  readonly fxRng: Rng;
  readonly waiter: WaiterState;
  readonly cake: CakeState;
  readonly obstacles: Obstacle[];
  readonly events: GameEvent[] = [];
  readonly env: WaiterEnv = { decelMult: 1, blockX: Infinity, blockV: 0 };
  /** The world's layout (start, table, length). */
  readonly level: Layout;
  /** Extra vertical acceleration of the floor under the waiter this tick (px/s^2, + = up). */
  floorAUp = 0;
  /** How far the floor under the waiter is pushed down (px), e.g. by the gangplank. */
  sink = 0;
  /** Speed the floor carries the waiter forward this tick (px/s), e.g. a moving walkway. */
  floorV = 0;
  private prevFloorV = 0;

  /** Simulated seconds since the round started. */
  time = 0;
  timeLeft: number;
  outcome: Outcome = 'none';
  /** Seconds since the outcome was decided. */
  outcomeTime = 0;
  /** Seconds the waiter has been holding still inside the table zone. */
  setDownHold = 0;
  clutches = 0;
  hits = 0;
  maxLean = 0;
  /** Seconds remaining at the moment of winning. */
  finalTimeLeft = 0;
  /** True while leaning past the gasp angle (guests say OOOH!). */
  gasping = false;

  private clutchArmed = false;
  private gaspCooldown = 0;
  private slowmoArmed = true;
  private wasMoving = false;

  constructor(
    readonly seed: string,
    readonly worldId: WorldId = 'wedding',
    tuning: Tuning = T,
  ) {
    this.t = tuning;
    this.rng = createRng(seed);
    this.fxRng = createRng(`${seed}:fx`);
    this.level = WORLDS[worldId].layout;
    this.waiter = createWaiter(this.level.START_X);
    this.cake = createCake(tuning);
    this.timeLeft = tuning.ROUND_TIME;
    this.obstacles = WORLDS[worldId].build(this.rng);
  }

  get finished(): boolean {
    return this.outcome !== 'none';
  }

  get won(): boolean {
    return this.outcome === 'won';
  }

  get inTableZone(): boolean {
    return this.waiter.x >= this.level.TABLE.x0 && this.waiter.x <= this.level.TABLE.x1;
  }

  /** Apply an obstacle hit to the cake (and optionally the waiter's speed). */
  hit(dOmega: number, dSlide: number, speedMult: number, label: string, x: number): void {
    applyImpulse(this.cake, dOmega, dSlide);
    this.waiter.v *= speedMult;
    this.hits++;
    this.events.push({
      type: 'hit',
      strength: Math.min(1, Math.abs(dOmega) / 1.5 + Math.abs(dSlide) / 120),
      x,
      label,
    });
  }

  step(intent: Intent, dt: number): void {
    const t = this.t;
    const w = this.waiter;
    const c = this.cake;

    if (this.finished) {
      this.outcomeTime += dt;
      // Let the waiter coast to a stop; no more physics consequences.
      w.v = Math.max(0, w.v - t.STOP_DECEL * dt);
      w.x += w.v * dt;
      return;
    }

    this.time += dt;
    this.timeLeft = Math.max(0, t.ROUND_TIME - this.time);

    // Obstacles set up the environment (spill, blockers) and deliver hits.
    this.env.decelMult = 1;
    this.env.blockX = this.level.TABLE.x;
    this.env.blockV = 0;
    this.floorAUp = 0;
    this.sink = 0;
    this.floorV = 0;
    for (const o of this.obstacles) {
      o.update(this, dt);
      if (o.blockX) {
        const bx = o.blockX(this);
        if (bx < this.env.blockX) {
          this.env.blockX = bx;
          this.env.blockV = o.blockV ? o.blockV(this) : 0;
        }
      }
    }

    const strideBefore = Math.floor(w.stride / 18);
    stepWaiter(t, w, intent, this.env, dt);
    if (Math.floor(w.stride / 18) !== strideBefore) this.events.push({ type: 'step', speed: w.v });
    // A moving floor carries the waiter along (never through a blocker) and its speed changes
    // jolt the tray like walking does.
    if (this.floorV > 0) w.x = Math.max(w.x, Math.min(w.x + this.floorV * dt, this.env.blockX));
    const aFloor = (this.floorV - this.prevFloorV) / dt;
    this.prevFloorV = this.floorV;
    const moving = w.v > 20;
    if (this.wasMoving && w.v < 5) this.events.push({ type: 'dust', x: w.x });
    if (moving) this.wasMoving = true;
    else if (w.v < 5) this.wasMoving = false;

    const before = c.count;
    const fell = stepCake(t, c, w.aTray + aFloor * t.ARM_COUPLING, w.aUp + this.floorAUp, dt);
    if (fell >= 0) this.events.push({ type: 'tierLost', from: fell, to: before, theta: c.theta });

    const lean = Math.abs(c.theta);
    this.maxLean = Math.max(this.maxLean, lean);

    // Slow-motion moment when any tier gets close to sliding off.
    const ratio = maxSlideRatio(t, c);
    if (this.slowmoArmed && ratio > t.SLOWMO_FRAC) {
      this.slowmoArmed = false;
      this.events.push({ type: 'slowmo' });
    } else if (ratio < t.SLOWMO_FRAC * 0.6) this.slowmoArmed = true;

    // Crowd reactions and clutch saves.
    this.gaspCooldown -= dt;
    if (lean > t.GASP_ANGLE) {
      if (!this.gasping && this.gaspCooldown <= 0) {
        this.events.push({ type: 'gasp' });
        this.gaspCooldown = 1.5;
      }
      this.gasping = true;
    } else if (lean < t.GASP_ANGLE * 0.8) this.gasping = false;
    if (lean > t.CLUTCH_ANGLE) this.clutchArmed = true;
    if (this.clutchArmed && lean < t.CLUTCH_RECOVER && !c.toppled) {
      this.clutchArmed = false;
      this.clutches++;
      this.events.push({ type: 'clutch' });
    }

    // Outcomes.
    if (c.toppled) {
      this.finish('toppled');
      this.events.push({ type: 'topple', theta: c.theta });
      return;
    }
    if (c.count < t.MIN_TIERS) {
      this.finish('cupcake');
      return;
    }

    // Set-down at the table.
    if (this.inTableZone && w.v < t.SET_DOWN_SPEED && lean < t.SET_DOWN_ANGLE && w.y <= 0) {
      this.setDownHold += dt;
      if (this.setDownHold >= t.SET_DOWN_HOLD) {
        this.finalTimeLeft = this.timeLeft;
        this.finish('won');
        this.events.push({ type: 'placed' });
        return;
      }
    } else this.setDownHold = 0;

    if (this.timeLeft <= 0) {
      this.finish('timeout');
      this.events.push({ type: 'timeout' });
    }
  }

  private finish(o: Outcome): void {
    this.outcome = o;
    this.outcomeTime = 0;
    if (o !== 'won') this.finalTimeLeft = this.timeLeft;
  }

  /** Teleport (debug zone skip). */
  skipTo(x: number): void {
    this.waiter.x = x;
    this.waiter.v = 0;
  }

  /** Worst tier slide as a fraction of its fall threshold (0..1+). */
  slideRisk(j: number): number {
    return Math.abs(this.cake.tiers[j].s) / slideLimit(this.t, this.cake, j);
  }
}
