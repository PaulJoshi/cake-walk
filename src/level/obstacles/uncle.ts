import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { LEVEL } from '../level';
import { overlaps, type Obstacle, type Span } from './types';
import { easeAlert } from './util';

/** Dancing Uncle: hip-bumps into the lane on a (seeded, jittery) rhythm. */
export class Uncle implements Obstacle {
  readonly kind = 'uncle';
  readonly x = LEVEL.UNCLE_X;
  alert = 0;
  alertX = LEVEL.UNCLE_X;
  alertY = 0;
  /** Start time of each hip bump (sim seconds). */
  readonly beats: number[] = [];
  private lastHitBeat = -1;

  constructor(rng: Rng) {
    let tb = rng.range(0.2, T.UNCLE_PERIOD);
    while (tb < T.ROUND_TIME + 5) {
      this.beats.push(tb);
      tb += T.UNCLE_PERIOD + rng.range(-T.UNCLE_JITTER, T.UNCLE_JITTER);
    }
  }

  /** Index of the beat active (hips out) at time `time`, or -1. */
  beatAt(time: number): number {
    for (let k = 0; k < this.beats.length; k++) {
      const b = this.beats[k];
      if (b > time) return -1;
      if (time < b + T.UNCLE_OUT_TIME) return k;
    }
    return -1;
  }

  /** Hip pose for rendering: -1..1 (sign = bump direction), 0 = neutral. */
  hipPose(time: number): number {
    for (let k = 0; k < this.beats.length; k++) {
      const b = this.beats[k];
      const dir = k % 2 === 0 ? 1 : -1;
      if (time >= b - T.UNCLE_WINDUP && time < b)
        return -dir * 0.4 * ((time - (b - T.UNCLE_WINDUP)) / T.UNCLE_WINDUP);
      if (time >= b && time < b + T.UNCLE_OUT_TIME) return dir;
      if (b > time) break;
    }
    return 0;
  }

  hazards(w: World, dt: number, out: Span[]): number {
    if (this.beatAt(w.time + dt) < 0) return 0;
    out[0].x0 = this.x - T.UNCLE_REACH;
    out[0].x1 = this.x + T.UNCLE_REACH;
    return 1;
  }

  update(w: World, dt: number): void {
    const wx = w.waiter.x;
    const near = wx > this.x - 200 && wx < this.x + 20;
    let soon = false;
    for (const b of this.beats) {
      if (b + T.UNCLE_OUT_TIME < w.time) continue;
      soon = b - w.time < T.ALERT_LEAD;
      break;
    }
    this.alert = easeAlert(this.alert, near && soon, dt);
    const k = this.beatAt(w.time);
    if (k < 0 || k === this.lastHitBeat) return;
    const half = w.t.WAITER_HALF_W;
    if (overlaps(wx - half, wx + half, this.x - T.UNCLE_REACH, this.x + T.UNCLE_REACH)) {
      this.lastHitBeat = k;
      const dir = k % 2 === 0 ? 1 : -1;
      w.hit(dir * T.UNCLE_OMEGA, dir * T.UNCLE_SLIDE, T.UNCLE_SPEED_MULT, 'BUMP!', this.x);
    }
  }
}
