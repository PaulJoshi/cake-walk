import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { hop } from '../../physics/waiter';
import { LEVEL } from '../level';
import { SHIP } from '../ship';
import type { Swell } from './swell';
import { overlaps, type Obstacle, type Span } from './types';
import { easeAlert } from './util';

/**
 * Loose cannonballs roll from rail to rail (in depth) with the swell, crossing the lane
 * twice per swell. Watch the horizon to time them. Running into one makes you hop.
 */
export class Cannonballs implements Obstacle {
  readonly kind = 'cannonballs';
  /** Lane x of each ball. */
  readonly xs: number[] = [];
  /** Seeded lag of each ball behind the swell (rad). */
  readonly lags: number[] = [];
  alert = 0;
  alertX: number;
  alertY = 0;
  private cooldown = 0;

  constructor(
    rng: Rng,
    readonly swell: Swell,
  ) {
    const n = rng.int(T.CANNON_COUNT_MIN, T.CANNON_COUNT_MAX);
    let x = SHIP.CANNON_X + rng.range(-T.CANNON_SHIFT, T.CANNON_SHIFT);
    for (let i = 0; i < n; i++) {
      this.xs.push(x);
      this.lags.push(rng.range(0, T.CANNON_LAG_MAX));
      x += rng.range(T.CANNON_GAP_MIN, T.CANNON_GAP_MAX);
    }
    this.alertX = this.xs[0];
  }

  depthOf(i: number, time: number): number {
    return T.CANNON_DEPTH * Math.sin(this.swell.phaseAt(time) - this.lags[i]);
  }

  hazards(w: World, dt: number, out: Span[]): number {
    const time = w.time + dt;
    let n = 0;
    for (let i = 0; i < this.xs.length && n < out.length; i++) {
      if (Math.abs(this.depthOf(i, time)) >= LEVEL.LANE_HALF_DEPTH) continue;
      out[n].x0 = this.xs[i] - T.CANNON_HALF_W;
      out[n].x1 = this.xs[i] + T.CANNON_HALF_W;
      n++;
    }
    return n;
  }

  update(w: World, dt: number): void {
    const wx = w.waiter.x;
    const last = this.xs[this.xs.length - 1];
    const near = wx > this.xs[0] - 220 && wx < last + 10;
    let soon = false;
    for (let i = 0; i < this.xs.length; i++) {
      if (Math.abs(this.depthOf(i, w.time + T.ALERT_LEAD * 0.5)) < LEVEL.LANE_HALF_DEPTH) {
        soon = wx < this.xs[i];
        if (soon) {
          this.alertX = this.xs[i];
          break;
        }
      }
    }
    this.alert = easeAlert(this.alert, near && soon, dt);
    this.cooldown -= dt;
    if (this.cooldown > 0 || w.waiter.y > 2) return;
    const half = w.t.WAITER_HALF_W;
    for (let i = 0; i < this.xs.length; i++) {
      if (Math.abs(this.depthOf(i, w.time)) >= LEVEL.LANE_HALF_DEPTH) continue;
      const x = this.xs[i];
      if (!overlaps(wx - half, wx + half, x - T.CANNON_HALF_W, x + T.CANNON_HALF_W)) continue;
      this.cooldown = T.CANNON_COOLDOWN;
      hop(w.waiter, T.CANNON_HOP);
      // The ball rolls the way the deck tips and takes the feet with it: cake tips back.
      const dir = this.swell.roll >= 0 ? 1 : -1;
      w.hit(-dir * T.CANNON_OMEGA, -dir * T.CANNON_SLIDE, T.CANNON_SPEED_MULT, 'CLONK!', x);
      w.events.push({ type: 'hop' });
      break;
    }
  }
}
