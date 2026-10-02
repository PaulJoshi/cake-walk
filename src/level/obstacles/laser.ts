import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { hop } from '../../physics/waiter';
import { STATION } from '../station';
import { overlaps, type Obstacle, type Span } from './types';
import { easeAlert } from './util';

/**
 * Laser security gate: the beams switch on and off on a seeded rhythm (with a warning flicker).
 * Walk through while they are off. Get caught in them and ZAP!
 */
export class LaserGate implements Obstacle {
  readonly kind = 'laser';
  readonly x: number;
  readonly period: number;
  /** Seconds the beams stay on each period. */
  readonly onTime: number;
  readonly phase: number;
  alert = 0;
  alertX: number;
  alertY = 0;
  on = false;
  /** True during the warning flicker before the beams switch on. */
  warn = false;
  private cooldown = 0;

  constructor(rng: Rng) {
    this.x = STATION.LASER_X + rng.range(-T.LASER_SHIFT, T.LASER_SHIFT);
    this.period = rng.range(T.LASER_PERIOD_MIN, T.LASER_PERIOD_MAX);
    this.onTime = this.period * rng.range(T.LASER_DUTY_MIN, T.LASER_DUTY_MAX);
    this.phase = rng.range(0, this.period);
    this.alertX = this.x;
  }

  /** Seconds into the current period at sim time `time` (beams on for the first onTime). */
  cycleAt(time: number): number {
    return (time + this.phase) % this.period;
  }

  onAt(time: number): boolean {
    return this.cycleAt(time) < this.onTime;
  }

  hazards(w: World, dt: number, out: Span[]): number {
    if (!this.onAt(w.time + dt)) return 0;
    out[0].x0 = this.x - T.LASER_HALF_W;
    out[0].x1 = this.x + T.LASER_HALF_W;
    return 1;
  }

  update(w: World, dt: number): void {
    const c = this.cycleAt(w.time);
    this.on = c < this.onTime;
    this.warn = !this.on && c > this.period - T.LASER_WARN;
    this.cooldown -= dt;
    const wx = w.waiter.x;
    const near = wx > this.x - w.t.WALK_MAX * w.t.ALERT_LEAD * 1.5 && wx < this.x + 10;
    this.alert = easeAlert(this.alert, near && (this.on || this.warn), dt);
    const half = w.t.WAITER_HALF_W;
    if (
      this.on &&
      this.cooldown <= 0 &&
      overlaps(wx - half, wx + half, this.x - T.LASER_HALF_W, this.x + T.LASER_HALF_W)
    ) {
      this.cooldown = T.LASER_COOLDOWN;
      const dir = w.rng.sign();
      hop(w.waiter, T.LASER_HOP);
      w.hit(dir * T.LASER_OMEGA, dir * T.LASER_SLIDE, T.LASER_SPEED_MULT, 'ZAP!', this.x);
      w.events.push({ type: 'zap', x: this.x });
    }
  }
}
