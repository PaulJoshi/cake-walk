import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { LEVEL } from '../level';
import { overlaps, type Obstacle, type Span } from './types';
import { easeAlert } from './util';

/** Conga line: a line of dancers crosses the lane; each one that overlaps bumps the waiter. */
export class Conga implements Obstacle {
  readonly kind = 'conga';
  readonly x: number;
  readonly delay: number;
  /** Seeded gap between dancers (s). */
  readonly spacing: number;
  /** Sim time the leader starts moving (Infinity until triggered). */
  start = Infinity;
  alert = 0;
  alertX: number;
  alertY = 0;
  readonly bumped: boolean[] = [];

  constructor(rng: Rng) {
    this.x = LEVEL.CONGA.cross + rng.range(-T.CONGA_SHIFT, T.CONGA_SHIFT);
    this.alertX = this.x;
    this.delay = rng.range(T.CONGA_DELAY_MIN, T.CONGA_DELAY_MAX);
    this.spacing = rng.range(T.CONGA_SPACING_MIN, T.CONGA_SPACING_MAX);
    for (let i = 0; i < T.CONGA_COUNT; i++) this.bumped.push(false);
  }

  /** Depth of dancer i at `time` (starts at the back, walks towards the camera). */
  depthOf(i: number, time: number): number {
    const t0 = this.start + i * this.spacing;
    return 1.4 - Math.max(0, time - t0) * T.CONGA_DEPTH_SPEED;
  }

  get triggered(): boolean {
    return this.start !== Infinity;
  }

  hazards(w: World, dt: number, out: Span[]): number {
    if (!this.triggered) return 0;
    const time = w.time + dt;
    for (let i = 0; i < T.CONGA_COUNT; i++) {
      const d = this.depthOf(i, time);
      // Waiting dancers at the back still count as "about to come" for the bot.
      if (d > -LEVEL.LANE_HALF_DEPTH && d < LEVEL.LANE_HALF_DEPTH + 0.35) {
        out[0].x0 = this.x - T.CONGA_HALF_W;
        out[0].x1 = this.x + T.CONGA_HALF_W;
        return 1;
      }
    }
    return 0;
  }

  update(w: World, dt: number): void {
    const wx = w.waiter.x;
    if (!this.triggered && wx > LEVEL.CONGA.trigger) this.start = w.time + this.delay;
    const lastDepth = this.depthOf(T.CONGA_COUNT - 1, w.time);
    this.alert = easeAlert(this.alert, this.triggered && lastDepth > -LEVEL.LANE_HALF_DEPTH, dt);
    if (!this.triggered) return;
    const half = w.t.WAITER_HALF_W;
    for (let i = 0; i < T.CONGA_COUNT; i++) {
      if (this.bumped[i]) continue;
      if (Math.abs(this.depthOf(i, w.time)) >= LEVEL.LANE_HALF_DEPTH) continue;
      if (overlaps(wx - half, wx + half, this.x - T.CONGA_HALF_W, this.x + T.CONGA_HALF_W)) {
        this.bumped[i] = true;
        const dir = i % 2 === 0 ? 1 : -1;
        w.hit(dir * T.CONGA_OMEGA, dir * T.CONGA_SLIDE, T.CONGA_SPEED_MULT, 'CONGA!', this.x);
      }
    }
  }
}
