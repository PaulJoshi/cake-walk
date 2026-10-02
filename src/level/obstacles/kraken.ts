import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { hop } from '../../physics/waiter';
import { SHIP } from '../ship';
import type { Obstacle } from './types';
import { easeAlert } from './util';

type KrakenState = 'hidden' | 'rise' | 'wave' | 'windup' | 'sink' | 'gone';

/**
 * A kraken tentacle bursts up through the deck ahead and blocks the way. After a while it
 * rears back and slams the deck as it sinks: the closer you queued, the bigger the jolt.
 */
export class Kraken implements Obstacle {
  readonly kind = 'kraken';
  readonly x: number;
  readonly trigger: number;
  /** Seeded seconds it waves about before the slam. */
  readonly waveTime: number;
  /** Seeded slam direction (+1 = forward). */
  readonly dir: number;
  state: KrakenState = 'hidden';
  stateTime = 0;
  alert = 0;
  alertX: number;
  alertY = 0;
  private blocking = false;

  constructor(rng: Rng) {
    this.x = SHIP.KRAKEN_X + rng.range(-T.KRAKEN_SHIFT, T.KRAKEN_SHIFT);
    this.trigger = this.x - T.KRAKEN_TRIGGER;
    this.alertX = this.x;
    this.waveTime = rng.range(T.KRAKEN_TIME_MIN, T.KRAKEN_TIME_MAX);
    this.dir = rng.sign();
  }

  get active(): boolean {
    return this.state === 'rise' || this.state === 'wave' || this.state === 'windup';
  }

  /** How far out of the deck the tentacle is (0..1). */
  get height(): number {
    if (this.state === 'rise') return Math.min(1, this.stateTime / T.KRAKEN_RISE);
    if (this.state === 'wave' || this.state === 'windup') return 1;
    if (this.state === 'sink') return Math.max(0, 1 - this.stateTime / 0.5);
    return 0;
  }

  blockX(w: World): number {
    if (!this.blocking || !this.active) return Infinity;
    return this.x - T.KRAKEN_HALF_W - w.t.WAITER_HALF_W - 1;
  }

  /** A careful waiter waits out of the worst of the slam. */
  queueX(w: World): number {
    const bx = this.blockX(w);
    return bx === Infinity ? bx : Math.min(bx, this.x - T.KRAKEN_SLAM_RANGE * 0.7);
  }

  update(w: World, dt: number): void {
    this.stateTime += dt;
    const wx = w.waiter.x;
    switch (this.state) {
      case 'hidden':
        if (wx > this.trigger) {
          this.set('rise');
          this.blocking = wx < this.x - T.KRAKEN_HALF_W - w.t.WAITER_HALF_W;
          w.events.push({ type: 'tentacle' });
        }
        break;
      case 'rise':
        if (this.stateTime >= T.KRAKEN_RISE) this.set('wave');
        break;
      case 'wave':
        if (this.stateTime >= this.waveTime) this.set('windup');
        break;
      case 'windup':
        if (this.stateTime >= T.KRAKEN_WINDUP) {
          this.set('sink');
          w.events.push({ type: 'slam', x: this.x });
          const dist = Math.abs(this.x - wx);
          if (dist < T.KRAKEN_SLAM_RANGE) {
            const s = 1 - dist / T.KRAKEN_SLAM_RANGE;
            hop(w.waiter, T.KRAKEN_SLAM_HOP * s);
            w.hit(
              this.dir * T.KRAKEN_SLAM_OMEGA * s,
              this.dir * T.KRAKEN_SLAM_SLIDE * s,
              1,
              'SLAM!',
              this.x,
            );
          }
        }
        break;
      case 'sink':
        if (this.stateTime >= 0.5) this.set('gone');
        break;
      case 'gone':
        break;
    }
    this.alert = easeAlert(this.alert, this.state === 'rise' || this.state === 'windup', dt);
  }

  private set(s: KrakenState): void {
    this.state = s;
    this.stateTime = 0;
  }
}
