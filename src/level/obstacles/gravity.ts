import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { STATION } from '../station';
import type { Obstacle } from './types';
import { easeAlert } from './util';

/**
 * Gravity glitch: in this stretch of corridor the artificial gravity cycles through normal,
 * low (the cake goes floaty), normal and heavy (it falls over twice as fast). The cycle runs on
 * the clock, so you can watch the warning panel and time your way in.
 */
export class GravityGlitch implements Obstacle {
  readonly kind = 'gravity';
  readonly x0: number;
  readonly x1: number;
  readonly period: number;
  readonly heavy: number;
  readonly phase: number;
  alert = 0;
  alertX: number;
  alertY = 0;
  /** Current gravity multiplier inside the zone. */
  mult = 1;
  private lastTarget = 1;

  constructor(rng: Rng) {
    this.x0 = STATION.GRAVITY_X + rng.range(-T.GRAVITY_SHIFT, T.GRAVITY_SHIFT);
    this.x1 = this.x0 + rng.range(T.GRAVITY_LEN_MIN, T.GRAVITY_LEN_MAX);
    this.period = rng.range(T.GRAVITY_PERIOD_MIN, T.GRAVITY_PERIOD_MAX);
    this.heavy = rng.range(T.GRAVITY_HEAVY_MIN, T.GRAVITY_HEAVY_MAX);
    this.phase = rng.range(0, this.period);
    this.alertX = this.x0;
  }

  private level(quarter: number): number {
    return [1, T.GRAVITY_LOW, 1, this.heavy][((quarter % 4) + 4) % 4];
  }

  /** Gravity multiplier the generator is heading for at sim time `time`. */
  targetAt(time: number): number {
    return this.level(Math.floor(((time + this.phase) / this.period) * 4));
  }

  /** Gravity multiplier at sim time `time`, easing between levels. */
  multAt(time: number): number {
    const q = ((time + this.phase) / this.period) * 4;
    const quarter = Math.floor(q);
    const into = ((q - quarter) * this.period) / 4;
    const f = Math.min(1, into / T.GRAVITY_RAMP);
    const a = this.level(quarter - 1);
    return a + (this.level(quarter) - a) * f;
  }

  inside(x: number): boolean {
    return x > this.x0 && x < this.x1;
  }

  update(w: World, dt: number): void {
    this.mult = this.multAt(w.time);
    const x = w.waiter.x;
    const lead = w.t.WALK_MAX * w.t.ALERT_LEAD;
    this.alert = easeAlert(this.alert, x > this.x0 - lead && x < this.x0, dt);
    const target = this.targetAt(w.time);
    const inside = this.inside(x);
    if (target !== this.lastTarget && inside) w.events.push({ type: 'gravity', mult: target });
    this.lastTarget = target;
    if (!inside) return;
    w.floorAUp += (this.mult - 1) * w.t.G;
  }
}
