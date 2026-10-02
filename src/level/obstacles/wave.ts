import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { SHIP } from '../ship';
import type { Obstacle } from './types';

/**
 * Global event: the lookout rings the bell 3-2-1 and a rogue wave breaks over the rail,
 * shoving the waiter and leaving the whole deck slippery for a few seconds.
 */
export class RogueWave implements Obstacle {
  readonly kind = 'wave';
  readonly dir: number;
  /** Seconds remaining when the wave breaks (seeded around SHIP.WAVE_AT). */
  readonly breakAt: number;
  alert = 0;
  alertX = SHIP.MAST_X;
  alertY = 0;
  /** Countdown number the lookout is ringing (0 = none). */
  count = 0;
  broken = false;
  /** Seconds since the wave broke. */
  sinceBreak = 0;

  constructor(rng: Rng) {
    this.dir = rng.sign();
    this.breakAt = SHIP.WAVE_AT + rng.range(-T.WAVE_SHIFT, T.WAVE_SHIFT);
  }

  /** True while the deck is still wet. */
  get wet(): boolean {
    return this.broken && this.sinceBreak < T.WAVE_WET_TIME;
  }

  update(w: World, dt: number): void {
    const left = w.timeLeft;
    const at = this.breakAt;
    if (this.broken) {
      this.sinceBreak += dt;
      this.alert = 0;
      if (this.wet) w.env.decelMult = Math.min(w.env.decelMult, T.SPILL_DECEL_MULT);
      return;
    }
    const n = left <= at ? 0 : Math.ceil(left - at);
    if (n >= 1 && n <= 3 && n !== this.count) {
      this.count = n;
      w.events.push({ type: 'bell', n });
    }
    this.alert = left - at < T.ALERT_LEAD * 3 ? 1 : 0;
    if (left <= at) {
      this.broken = true;
      this.count = 0;
      w.hit(
        this.dir * T.WAVE_OMEGA,
        this.dir * T.WAVE_SLIDE,
        T.WAVE_SPEED_MULT,
        'SPLASH!',
        w.waiter.x,
      );
      w.events.push({ type: 'wave' });
    }
  }
}
