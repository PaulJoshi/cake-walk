import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { hop } from '../../physics/waiter';
import { LEVEL } from '../level';
import { overlaps, type Obstacle, type Span } from './types';
import { easeAlert } from './util';

/**
 * Robot vacuum patrolling an ellipse: x = cx + rx cos(phi), depth = 0.65 + 0.65 sin(phi).
 * Only the front arc of the loop crosses the waiter's lane.
 */
export class Roomba implements Obstacle {
  readonly kind = 'roomba';
  readonly cx: number;
  readonly rx: number;
  /** Angular speed (rad/s, sign = direction). */
  readonly spin: number;
  readonly phase: number;
  alert = 0;
  alertX: number = LEVEL.ROOMBA_X;
  alertY = 0;
  x = 0;
  depth = 1;
  vx = 0;
  private cooldown = 0;

  constructor(rng: Rng) {
    this.cx = LEVEL.ROOMBA_X + rng.range(-T.ROOMBA_SHIFT, T.ROOMBA_SHIFT);
    this.rx = rng.range(T.ROOMBA_RX_MIN, T.ROOMBA_RX_MAX);
    this.spin = (rng.sign() * Math.PI * 2) / rng.range(T.ROOMBA_PERIOD_MIN, T.ROOMBA_PERIOD_MAX);
    this.phase = rng.range(0, Math.PI * 2);
    this.pose(0);
  }

  private phi(time: number): number {
    return this.phase + this.spin * time;
  }

  /** Update x/depth/vx for a given time (pure function of time: predictable). */
  pose(time: number): void {
    const p = this.phi(time);
    this.x = this.cx + this.rx * Math.cos(p);
    this.depth = 0.65 + 0.65 * Math.sin(p);
    this.vx = -this.rx * Math.sin(p) * this.spin;
  }

  inLaneAt(time: number): boolean {
    return 0.65 + 0.65 * Math.sin(this.phi(time)) < LEVEL.LANE_HALF_DEPTH;
  }

  hazards(w: World, dt: number, out: Span[]): number {
    const time = w.time + dt;
    if (!this.inLaneAt(time)) return 0;
    const x = this.cx + this.rx * Math.cos(this.phi(time));
    out[0].x0 = x - T.ROOMBA_HALF_W;
    out[0].x1 = x + T.ROOMBA_HALF_W;
    return 1;
  }

  update(w: World, dt: number): void {
    this.pose(w.time);
    const wx = w.waiter.x;
    const near = wx > this.cx - this.rx - 220 && wx < this.cx + this.rx;
    this.alertX = this.x;
    // Warn when it is in, or about to enter, the lane.
    this.alert = easeAlert(this.alert, near && this.inLaneAt(w.time + T.ALERT_LEAD * 0.6), dt);
    this.cooldown -= dt;
    if (this.cooldown > 0 || this.depth >= LEVEL.LANE_HALF_DEPTH || w.waiter.y > 2) return;
    const half = w.t.WAITER_HALF_W;
    if (overlaps(wx - half, wx + half, this.x - T.ROOMBA_HALF_W, this.x + T.ROOMBA_HALF_W)) {
      this.cooldown = T.ROOMBA_COOLDOWN;
      hop(w.waiter, T.ROOMBA_HOP);
      const dir = this.vx >= 0 ? 1 : -1;
      // Feet shoved in the roomba's direction: cake tips the other way.
      w.hit(-dir * T.ROOMBA_OMEGA, -dir * T.ROOMBA_SLIDE, T.ROOMBA_SPEED_MULT, 'BEEP!', this.x);
      w.events.push({ type: 'hop' });
    }
  }
}
