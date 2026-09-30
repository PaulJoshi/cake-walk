import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { addTopMass } from '../../physics/cake';
import { LEVEL } from '../level';
import type { Obstacle } from './types';
import { easeAlert } from './util';

type BouquetState = 'idle' | 'windup' | 'flight' | 'landed' | 'lost';

/** Bouquet toss: the bride throws it over her shoulder and it lands on the top tier. */
export class Bouquet implements Obstacle {
  readonly kind = 'bouquet';
  readonly brideX = LEVEL.BOUQUET.brideX;
  /** Seeded landing offset from the top tier centre (px). */
  readonly offset: number;
  state: BouquetState = 'idle';
  stateTime = 0;
  /** Flight progress 0..1. */
  progress = 0;
  /** World x where the bouquet is aimed (tracks the waiter). */
  targetX = 0;
  /** Tier the bouquet sits on once landed. */
  tier = -1;
  alert = 0;
  alertX = LEVEL.BOUQUET.brideX;
  alertY = 0;

  constructor(rng: Rng) {
    this.offset = rng.range(-T.BOUQUET_OFFSET_MAX, T.BOUQUET_OFFSET_MAX);
  }

  update(w: World, dt: number): void {
    this.stateTime += dt;
    this.targetX = w.waiter.x + w.waiter.tray + this.offset;
    switch (this.state) {
      case 'idle':
        if (w.waiter.x > LEVEL.BOUQUET.trigger) this.set('windup');
        break;
      case 'windup':
        if (this.stateTime >= T.BOUQUET_DELAY) {
          this.set('flight');
          w.events.push({ type: 'bouquetThrow' });
        }
        break;
      case 'flight':
        this.progress = Math.min(1, this.stateTime / T.BOUQUET_FLIGHT);
        if (this.progress >= 1) {
          this.set('landed');
          const c = w.cake;
          this.tier = c.count - 1;
          addTopMass(w.t, c, T.BOUQUET_MASS);
          w.hit(
            this.offset * T.BOUQUET_OMEGA_PER_PX + 0.15,
            this.offset * T.BOUQUET_SLIDE_PER_PX,
            1,
            'CATCH!',
            this.targetX,
          );
          w.events.push({ type: 'bouquetLand' });
        }
        break;
      case 'landed':
        // The bouquet leaves with the top tier.
        if (w.cake.count - 1 < this.tier) this.set('lost');
        break;
      case 'lost':
        break;
    }
    this.alertX = this.brideX;
    this.alert = easeAlert(this.alert, this.state === 'windup' || this.state === 'flight', dt);
  }

  private set(s: BouquetState): void {
    this.state = s;
    this.stateTime = 0;
  }
}
