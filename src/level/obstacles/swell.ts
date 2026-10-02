import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { SHIP } from '../ship';
import type { Obstacle } from './types';

/**
 * Rolling deck: the ship rocks on a seeded swell, which keeps nudging the cake one way and
 * then the other. Calm in the galley, full strength once out on deck.
 */
export class Swell implements Obstacle {
  readonly kind = 'swell';
  readonly period: number;
  /** Peak angular acceleration on the cake (rad/s^2). */
  readonly accel: number;
  readonly phase: number;
  alert = 0;
  alertX = 0;
  alertY = 0;
  /** Current roll, -1..1 (+ = the deck tips forward). */
  roll = 0;

  constructor(rng: Rng) {
    this.period = rng.range(T.SWELL_PERIOD_MIN, T.SWELL_PERIOD_MAX);
    this.accel = rng.range(T.SWELL_ACCEL_MIN, T.SWELL_ACCEL_MAX);
    this.phase = rng.range(0, Math.PI * 2);
  }

  /** Swell phase (rad) at sim time `time`. */
  phaseAt(time: number): number {
    return this.phase + (Math.PI * 2 * time) / this.period;
  }

  rollAt(time: number): number {
    return Math.sin(this.phaseAt(time));
  }

  /** 0 in the galley, fading in to 1 out on deck. */
  strength(x: number): number {
    return Math.max(0, Math.min(1, (x - SHIP.KITCHEN_END + 60) / T.SWELL_FADE_IN));
  }

  update(w: World, dt: number): void {
    this.roll = this.rollAt(w.time);
    w.cake.omega += this.accel * this.roll * this.strength(w.waiter.x) * dt;
  }
}
