import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { SHIP } from '../ship';
import type { Obstacle } from './types';
import { easeAlert } from './util';

/**
 * Walk the plank: a springy gangplank over shark-infested water between the two ships.
 * It sags under the waiter and every footstep bounces it; the faster you walk, the bigger
 * the bounce, and each big bounce throws the cake a little to one side.
 */
export class Plank implements Obstacle {
  readonly kind = 'plank';
  readonly x0: number;
  readonly x1: number;
  alert = 0;
  alertX: number;
  alertY = 0;
  /** Deflection of the plank under the waiter (px, + = down) and its rate. */
  z = 0;
  zv = 0;
  private lastStep = 0;

  constructor(rng: Rng) {
    const mid = SHIP.PLANK_X + rng.range(-T.PLANK_SHIFT, T.PLANK_SHIFT);
    const half = rng.range(T.PLANK_LEN_MIN, T.PLANK_LEN_MAX) / 2;
    this.x0 = mid - half;
    this.x1 = mid + half;
    this.alertX = this.x0;
  }

  isOn(x: number): boolean {
    return x > this.x0 && x < this.x1;
  }

  /** Static sag under a waiter standing at x (px). */
  sagAt(x: number): number {
    if (!this.isOn(x)) return 0;
    return T.PLANK_SAG * Math.sin((Math.PI * (x - this.x0)) / (this.x1 - this.x0));
  }

  update(w: World, dt: number): void {
    const wt = w.waiter;
    const on = this.isOn(wt.x);
    const lead = w.t.WALK_MAX * w.t.ALERT_LEAD * 1.4;
    this.alert = easeAlert(this.alert, wt.x > this.x0 - lead && wt.x < this.x0 + 10, dt);
    const step = Math.floor(wt.stride / 18);
    if (on && step !== this.lastStep) {
      const f = wt.v / w.t.WALK_MAX;
      this.zv += T.PLANK_KICK * f * f;
    }
    this.lastStep = step;
    const zv0 = this.zv;
    const acc = -T.PLANK_K * (this.z - this.sagAt(wt.x)) - T.PLANK_DAMP * this.zv;
    this.zv += acc * dt;
    this.z += this.zv * dt;
    if (!on) return;
    w.sink = this.z;
    // Plank accelerating down = lighter cake, bouncing up = heavier.
    w.floorAUp -= acc;
    // At the bottom of each bounce the plank twists: a kick to a random side.
    const bounce = this.z - this.sagAt(wt.x);
    if (zv0 > 0 && this.zv <= 0 && bounce > 0.5) {
      w.cake.omega += w.rng.sign() * T.PLANK_WOBBLE * bounce;
      w.events.push({ type: 'boing', strength: Math.min(1, bounce / 6) });
    }
  }
}
