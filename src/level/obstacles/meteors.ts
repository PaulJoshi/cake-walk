import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { STATION } from '../station';
import type { Obstacle } from './types';

/**
 * Global event: the alarm counts down 3-2-1, a meteor shower rocks the station (wherever you
 * are), and the last meteor punches a hole in the hull. Air rushes out of the breach, pulling
 * the cake towards it (walk past it and the pull flips), until the blast shutters slam shut.
 */
export class MeteorShower implements Obstacle {
  readonly kind = 'meteors';
  /** Seconds remaining when the first meteor hits. */
  readonly strikeAt: number;
  /** Seconds remaining at each impact. */
  readonly impacts: number[] = [];
  readonly dirs: number[] = [];
  /** Which side of the waiter the hull breaches (+1 = ahead). */
  readonly breachDir: number;
  alert = 0;
  alertX = 0;
  alertY = 0;
  /** Countdown number on the alarm (0 = none). */
  count = 0;
  /** Impacts so far. */
  hits = 0;
  /** World x of the hole in the hull (set when it happens). */
  breachX = 0;
  /** Seconds since the hull breached (Infinity = not yet). */
  sinceBreach = Infinity;

  constructor(rng: Rng) {
    this.strikeAt = STATION.METEOR_AT + rng.range(-T.METEOR_SHIFT, T.METEOR_SHIFT);
    const n = rng.int(T.METEOR_COUNT_MIN, T.METEOR_COUNT_MAX);
    let at = this.strikeAt;
    // Meteors hit alternate sides of the station, starting from a seeded side.
    const first = rng.sign();
    for (let i = 0; i < n; i++) {
      this.impacts.push(at);
      this.dirs.push(i % 2 ? -first : first);
      at -= rng.range(T.METEOR_GAP_MIN, T.METEOR_GAP_MAX);
    }
    this.breachDir = rng.sign();
  }

  /** True while air is rushing out of the breach. */
  get breaching(): boolean {
    return this.sinceBreach < T.BREACH_TIME;
  }

  /** Strength of the escaping air, 0..1 (gusts up then dies down as the shutters close). */
  get gust(): number {
    return this.breaching ? Math.sin((Math.PI * this.sinceBreach) / T.BREACH_TIME) : 0;
  }

  update(w: World, dt: number): void {
    const left = w.timeLeft;
    const n = left <= this.strikeAt ? 0 : Math.ceil(left - this.strikeAt);
    if (this.hits === 0 && n >= 1 && n <= 3 && n !== this.count) {
      this.count = n;
      w.events.push({ type: 'alarm', n });
    }
    while (this.hits < this.impacts.length && left <= this.impacts[this.hits]) {
      const d = this.dirs[this.hits];
      this.count = 0;
      w.hit(d * T.METEOR_OMEGA, d * T.METEOR_SLIDE, 1, 'KRAKOOM!', w.waiter.x);
      w.events.push({ type: 'meteor', dir: d });
      this.hits++;
      if (this.hits === this.impacts.length) {
        this.sinceBreach = 0;
        this.breachX = w.waiter.x + this.breachDir * 110;
        w.events.push({ type: 'breach', x: this.breachX });
        return;
      }
    }
    if (this.sinceBreach === Infinity) return;
    const was = this.breaching;
    this.sinceBreach += dt;
    if (was && !this.breaching) w.events.push({ type: 'shutters' });
    // The air rushes towards the hole, so walking past it flips the pull.
    const toward = Math.max(-1, Math.min(1, (this.breachX - w.waiter.x) / 60));
    w.cake.omega += toward * T.BREACH_ACCEL * this.gust * dt;
  }
}
