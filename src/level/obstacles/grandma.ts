import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { LEVEL } from '../level';
import type { Obstacle } from './types';
import { easeAlert } from './util';

type GrandmaState = 'hidden' | 'enter' | 'walk' | 'exit' | 'gone';

/** Grandma with a walker: steps into the lane ahead and shuffles along slowly. */
export class Grandma implements Obstacle {
  readonly kind = 'grandma';
  readonly walkTime: number;
  readonly speed: number;
  /** Waiter x that makes her step into the lane. */
  readonly trigger: number;
  state: GrandmaState = 'hidden';
  x: number;
  depth = 1.2;
  stateTime = 0;
  alert = 0;
  alertX: number;
  alertY = 0;
  /** Seconds the waiter has spent pressed right behind her (for the joke bubble). */
  pressed = 0;
  private blocking = false;

  constructor(rng: Rng) {
    const shift = rng.range(-T.GRANDMA_SHIFT, T.GRANDMA_SHIFT);
    this.x = LEVEL.GRANDMA.start + shift;
    this.alertX = this.x;
    this.trigger = LEVEL.GRANDMA.trigger + shift;
    this.walkTime = rng.range(T.GRANDMA_TIME_MIN, T.GRANDMA_TIME_MAX);
    this.speed = rng.range(T.GRANDMA_SPEED_MIN, T.GRANDMA_SPEED_MAX);
  }

  get active(): boolean {
    return this.state === 'enter' || this.state === 'walk' || this.state === 'exit';
  }

  blockX(w: World): number {
    if (!this.blocking || this.depth > LEVEL.LANE_HALF_DEPTH) return Infinity;
    return this.x - T.GRANDMA_HALF_W - w.t.WAITER_HALF_W - 1;
  }

  blockV(): number {
    return this.speed;
  }

  update(w: World, dt: number): void {
    this.stateTime += dt;
    const step = T.GRANDMA_STEP_TIME;
    switch (this.state) {
      case 'hidden':
        if (w.waiter.x > this.trigger) {
          this.set('enter');
          // Only block if the waiter is still behind her.
          this.blocking = w.waiter.x < this.x - T.GRANDMA_HALF_W - w.t.WAITER_HALF_W;
        }
        break;
      case 'enter':
        this.depth = 1.2 * (1 - Math.min(1, this.stateTime / step));
        if (this.stateTime >= step) this.set('walk');
        break;
      case 'walk':
        if (this.stateTime >= this.walkTime) this.set('exit');
        break;
      case 'exit':
        this.depth = 1.2 * Math.min(1, this.stateTime / step);
        if (this.stateTime >= step) this.set('gone');
        break;
      case 'gone':
        break;
    }
    if (this.active) this.x += this.speed * dt;
    this.alertX = this.x;
    this.alert = easeAlert(this.alert, this.state === 'enter', dt);
    const gap = this.x - T.GRANDMA_HALF_W - w.t.WAITER_HALF_W - w.waiter.x;
    if (this.blocking && this.active && gap < 4) this.pressed += dt;
  }

  private set(s: GrandmaState): void {
    this.state = s;
    this.stateTime = 0;
  }
}
