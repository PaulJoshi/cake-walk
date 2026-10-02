import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { STATION } from '../station';
import type { Obstacle } from './types';
import { easeAlert } from './util';

/**
 * Teleporter: the pad fills the corridor. Step on it and you arrive a little further on, at
 * full speed, with the cake re-assembled not quite where it was (a seeded scramble).
 */
export class Teleporter implements Obstacle {
  readonly kind = 'teleporter';
  readonly x: number;
  readonly jump: number;
  readonly dir: number;
  readonly omega: number;
  alert = 0;
  alertX: number;
  alertY = 0;
  used = false;
  /** Seconds since the waiter beamed across. */
  sinceUse = Infinity;

  constructor(rng: Rng) {
    this.x = STATION.TELEPORT_X + rng.range(-T.TELEPORT_SHIFT, T.TELEPORT_SHIFT);
    this.jump = rng.range(T.TELEPORT_JUMP_MIN, T.TELEPORT_JUMP_MAX);
    this.dir = rng.sign();
    this.omega = rng.range(T.TELEPORT_OMEGA_MIN, T.TELEPORT_OMEGA_MAX);
    this.alertX = this.x;
  }

  /** Where the waiter comes out. */
  get exitX(): number {
    return this.x + this.jump;
  }

  update(w: World, dt: number): void {
    this.sinceUse += dt;
    const x = w.waiter.x;
    const lead = w.t.WALK_MAX * w.t.ALERT_LEAD;
    this.alert = easeAlert(this.alert, !this.used && x > this.x - lead, dt);
    if (this.used || x < this.x) return;
    this.used = true;
    this.sinceUse = 0;
    w.waiter.x += this.jump;
    w.hit(this.dir * this.omega, this.dir * T.TELEPORT_SLIDE, 1, 'BZZT!', w.waiter.x);
    w.events.push({ type: 'teleport', from: x, to: w.waiter.x });
  }
}
