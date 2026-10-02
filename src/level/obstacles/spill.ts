import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { LEVEL } from '../level';
import type { Obstacle } from './types';
import { easeAlert } from './util';

/** Champagne spill: stopping is slippery and moving on it causes random slips. */
export class Spill implements Obstacle {
  readonly kind = 'spill';
  readonly x0: number;
  readonly x1: number;
  alert = 0;
  alertX: number;
  alertY = 0;
  private slipTimer = 0;

  constructor(rng: Rng) {
    const mid = (LEVEL.SPILL.x0 + LEVEL.SPILL.x1) / 2 + rng.range(-T.SPILL_SHIFT, T.SPILL_SHIFT);
    const half = rng.range(T.SPILL_WIDTH_MIN, T.SPILL_WIDTH_MAX) / 2;
    this.x0 = mid - half;
    this.x1 = mid + half;
    this.alertX = mid;
  }

  isOn(x: number): boolean {
    return x >= this.x0 && x <= this.x1;
  }

  update(w: World, dt: number): void {
    const t = w.t;
    const x = w.waiter.x;
    const lead = t.WALK_MAX * t.ALERT_LEAD * 1.4;
    this.alert = easeAlert(this.alert, x > this.x0 - lead && x < this.x0 + 10, dt);
    if (!this.isOn(x)) {
      this.slipTimer = t.SPILL_SLIP_INTERVAL * 0.5;
      return;
    }
    w.env.decelMult = Math.min(w.env.decelMult, t.SPILL_DECEL_MULT);
    if (w.waiter.v > 10) {
      this.slipTimer -= dt;
      if (this.slipTimer <= 0) {
        this.slipTimer = t.SPILL_SLIP_INTERVAL * w.rng.range(0.7, 1.3);
        const s = w.rng.sign();
        w.cake.omega += s * t.SPILL_SLIP_OMEGA * w.rng.range(0.6, 1);
        w.waiter.v = Math.max(0, w.waiter.v + w.rng.sign() * t.SPILL_SLIP_SPEED);
        w.slip();
      }
    }
  }
}
