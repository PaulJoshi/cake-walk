import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { LEVEL } from '../level';
import type { Obstacle } from './types';

/** Global event: the DJ counts down 3-2-1 and drops the bass at 20 s remaining. */
export class BassDrop implements Obstacle {
  readonly kind = 'bassdrop';
  readonly dir: number;
  alert = 0;
  alertX = LEVEL.DJ_X;
  alertY = 0;
  /** Countdown number currently on the DJ sign (0 = none). */
  count = 0;
  dropped = false;
  /** Seconds since the drop. */
  sinceDrop = 0;

  constructor(rng: Rng) {
    this.dir = rng.sign();
  }

  update(w: World, dt: number): void {
    const left = w.timeLeft;
    const at = LEVEL.BASS_DROP_AT;
    if (this.dropped) {
      this.sinceDrop += dt;
      this.alert = 0;
      return;
    }
    const n = left <= at ? 0 : Math.ceil(left - at);
    if (n >= 1 && n <= 3 && n !== this.count) {
      this.count = n;
      w.events.push({ type: 'bassCount', n });
    }
    this.alert = left - at < T.ALERT_LEAD * 3 ? 1 : 0;
    if (left <= at) {
      this.dropped = true;
      this.count = 0;
      w.hit(this.dir * T.BASS_OMEGA, this.dir * T.BASS_SLIDE, 1, 'DROP!', w.waiter.x);
      w.events.push({ type: 'bassDrop' });
    }
  }
}
