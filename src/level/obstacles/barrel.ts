import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { SHIP } from '../ship';
import type { Obstacle, Span } from './types';
import { easeAlert } from './util';

/**
 * A rum barrel swinging on a rope from the yardarm. At the bottom of its swing it is low
 * enough to clip the top tiers (a shorter cake ducks under it); at the ends it rises clear.
 */
export class Barrel implements Obstacle {
  readonly kind = 'barrel';
  /** World x of the rope's pivot. */
  readonly x: number;
  readonly period: number;
  /** Swing amplitude (rad). */
  readonly amp: number;
  readonly phase: number;
  alert = 0;
  alertX: number;
  alertY = 0;
  /** Swing angle (rad, + = forward) and the barrel's position (height above the tray). */
  angle = 0;
  bx = 0;
  bh = 0;
  private lastHitSwing = -1;

  constructor(rng: Rng) {
    this.x = SHIP.BARREL_X + rng.range(-T.BARREL_SHIFT, T.BARREL_SHIFT);
    this.alertX = this.x;
    this.period = rng.range(T.BARREL_PERIOD_MIN, T.BARREL_PERIOD_MAX);
    this.amp = rng.range(T.BARREL_AMP_MIN, T.BARREL_AMP_MAX);
    this.phase = rng.range(0, Math.PI * 2);
    this.pose(0);
  }

  angleAt(time: number): number {
    return this.amp * Math.sin(this.phase + (Math.PI * 2 * time) / this.period);
  }

  /** Index of the half-swing at `time` (each pass through the bottom gets its own). */
  private swingAt(time: number): number {
    return Math.floor((this.phase + (Math.PI * 2 * time) / this.period) / Math.PI + 0.5);
  }

  pose(time: number): void {
    this.angle = this.angleAt(time);
    this.bx = this.x + T.BARREL_ROPE * Math.sin(this.angle);
    this.bh = T.BARREL_LOW + T.BARREL_ROPE * (1 - Math.cos(this.angle));
  }

  /** Height of the top of a cake with `count` tiers above the tray (px). */
  static cakeTop(count: number): number {
    return T.TRAY_H + count * T.TIER_H;
  }

  /** True while the barrel at `time` hangs low enough to hit a cake of `count` tiers. */
  lowAt(time: number, count: number): boolean {
    const a = this.angleAt(time);
    const h = T.BARREL_LOW + T.BARREL_ROPE * (1 - Math.cos(a));
    return h - T.BARREL_RADIUS < Barrel.cakeTop(count);
  }

  hazards(w: World, dt: number, out: Span[]): number {
    const time = w.time + dt;
    if (!this.lowAt(time, w.cake.count)) return 0;
    const bx = this.x + T.BARREL_ROPE * Math.sin(this.angleAt(time));
    out[0].x0 = bx - T.BARREL_RADIUS - 4;
    out[0].x1 = bx + T.BARREL_RADIUS + 4;
    return 1;
  }

  update(w: World, dt: number): void {
    this.pose(w.time);
    const c = w.cake;
    const wx = w.waiter.x;
    this.alertX = this.x;
    const near = wx > this.x - T.BARREL_ROPE - 200 && wx < this.x;
    this.alert = easeAlert(this.alert, near && this.lowAt(w.time + T.ALERT_LEAD * 0.5, 7), dt);
    if (c.count === 0 || !this.lowAt(w.time, c.count)) return;
    // Only the top tier is in reach: compare with its width around the tray.
    const top = c.tiers[c.count - 1];
    const cx = wx + w.waiter.tray;
    if (Math.abs(this.bx - cx) > T.BARREL_RADIUS + top.w / 2) return;
    const swing = this.swingAt(w.time);
    if (swing === this.lastHitSwing) return;
    this.lastHitSwing = swing;
    const vx = Math.cos(this.phase + (Math.PI * 2 * w.time) / this.period);
    const dir = vx >= 0 ? 1 : -1;
    w.hit(dir * T.BARREL_OMEGA, dir * T.BARREL_SLIDE, 1, 'BONK!', this.bx);
  }
}
