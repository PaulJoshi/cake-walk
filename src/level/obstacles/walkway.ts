import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { STATION } from '../station';
import type { Obstacle } from './types';
import { easeAlert } from './util';

/**
 * Moving walkway: a conveyor floor that carries the waiter forward at a seeded speed. Getting
 * on jerks the tray forward (the cake tips back), getting off brakes it (the cake tips forward).
 */
export class Walkway implements Obstacle {
  readonly kind = 'walkway';
  readonly x0: number;
  readonly x1: number;
  /** Belt speed (px/s). */
  readonly speed: number;
  alert = 0;
  alertX: number;
  alertY = 0;

  constructor(rng: Rng) {
    this.x0 = STATION.WALKWAY_X + rng.range(-T.WALKWAY_SHIFT, T.WALKWAY_SHIFT);
    this.x1 = this.x0 + rng.range(T.WALKWAY_LEN_MIN, T.WALKWAY_LEN_MAX);
    this.speed = rng.range(T.WALKWAY_SPEED_MIN, T.WALKWAY_SPEED_MAX);
    this.alertX = this.x0;
  }

  /** How fast the floor carries a waiter standing at x (px/s), easing in and out at the ends. */
  speedAt(x: number): number {
    if (x <= this.x0 || x >= this.x1) return 0;
    const u = Math.min(1, (x - this.x0) / T.WALKWAY_RAMP, (this.x1 - x) / T.WALKWAY_RAMP);
    return this.speed * u * u * (3 - 2 * u);
  }

  update(w: World, dt: number): void {
    const x = w.waiter.x;
    const lead = w.t.WALK_MAX * w.t.ALERT_LEAD;
    this.alert = easeAlert(this.alert, x > this.x0 - lead && x < this.x0, dt);
    w.floorV += this.speedAt(x);
  }
}
