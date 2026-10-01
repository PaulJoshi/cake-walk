import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { LEVEL } from '../level';
import { overlaps, type Obstacle, type Span } from './types';
import { easeAlert } from './util';

type ToddlerState = 'hidden' | 'peek' | 'run' | 'gone';

/** Toddler Dash: once triggered, peeks (telegraph), then sprints across aiming at the waiter. */
export class Toddler implements Obstacle {
  readonly kind = 'toddler';
  readonly x: number;
  /** Waiter x that makes the toddler peek out. */
  readonly trigger: number;
  readonly minDelay: number;
  state: ToddlerState = 'hidden';
  depth = 1.3;
  alert = 0;
  alertX: number;
  alertY = 0;
  /** Seconds since the current state began. */
  stateTime = 0;
  private hitDone = false;

  constructor(rng: Rng) {
    const shift = rng.range(-T.TODDLER_SHIFT, T.TODDLER_SHIFT);
    this.x = LEVEL.TODDLER.cross + shift;
    this.trigger = LEVEL.TODDLER.trigger + shift;
    this.alertX = this.x;
    this.minDelay = rng.range(T.TODDLER_DELAY_MIN, T.TODDLER_DELAY_MAX);
  }

  get inLane(): boolean {
    return this.state === 'run' && Math.abs(this.depth) < LEVEL.LANE_HALF_DEPTH;
  }

  hazards(_w: World, dt: number, out: Span[]): number {
    let hazard = false;
    if (this.state === 'peek')
      hazard = true; // could start any moment: treat as blocked
    else if (this.state === 'run') {
      const d = this.depth - T.TODDLER_RUN_SPEED * dt;
      hazard = Math.abs(d) < LEVEL.LANE_HALF_DEPTH;
    }
    if (!hazard) return 0;
    out[0].x0 = this.x - T.TODDLER_HALF_W;
    out[0].x1 = this.x + T.TODDLER_HALF_W;
    return 1;
  }

  update(w: World, dt: number): void {
    this.stateTime += dt;
    const wx = w.waiter.x;
    switch (this.state) {
      case 'hidden':
        if (wx > this.trigger && wx < this.x) this.set('peek');
        break;
      case 'peek': {
        const dist = this.x - T.TODDLER_HALF_W - w.t.WAITER_HALF_W - wx;
        const eta = dist / Math.max(w.waiter.v, 1);
        if (
          (this.stateTime >= this.minDelay && eta <= T.TODDLER_AIM_ETA) ||
          this.stateTime >= T.TODDLER_WAIT_MAX
        )
          this.set('run');
        break;
      }
      case 'run':
        this.depth -= T.TODDLER_RUN_SPEED * dt;
        if (this.depth < -1.8) this.set('gone');
        break;
      case 'gone':
        break;
    }
    this.alert = easeAlert(this.alert, this.state === 'peek' || this.inLane, dt);
    if (this.hitDone || !this.inLane) return;
    const half = w.t.WAITER_HALF_W;
    if (overlaps(wx - half, wx + half, this.x - T.TODDLER_HALF_W, this.x + T.TODDLER_HALF_W)) {
      this.hitDone = true;
      w.hit(T.TODDLER_OMEGA, T.TODDLER_SLIDE, 0, 'WHEEE!', this.x);
    }
  }

  private set(s: ToddlerState): void {
    this.state = s;
    this.stateTime = 0;
  }
}
