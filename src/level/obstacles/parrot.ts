import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { recomputeL } from '../../physics/cake';
import { SHIP } from '../ship';
import type { Obstacle } from './types';
import { easeAlert } from './util';

type ParrotState = 'idle' | 'circle' | 'perched' | 'leaving' | 'gone';

/**
 * The captain's parrot circles overhead, lands on the top tier (raising the centre of mass),
 * flaps about for a few seconds, then flies off again.
 */
export class Parrot implements Obstacle {
  readonly kind = 'parrot';
  readonly trigger: number;
  /** Seeded seconds it stays perched. */
  readonly perchTime: number;
  /** Seeded side it lands on (+1 = front). */
  readonly side: number;
  state: ParrotState = 'idle';
  stateTime = 0;
  /** Tier it perched on. */
  tier = -1;
  /** Seconds since the last flap (for the wing animation). */
  sinceFlap = 9;
  alert = 0;
  alertX = 0;
  alertY = 0;
  private flapTimer = 0;
  private mass = 0;

  constructor(rng: Rng) {
    this.trigger = SHIP.PARROT.trigger + rng.range(-T.PARROT_SHIFT, T.PARROT_SHIFT);
    this.perchTime = rng.range(T.PARROT_PERCH_MIN, T.PARROT_PERCH_MAX);
    this.side = rng.sign();
  }

  get onCake(): boolean {
    return this.state === 'perched';
  }

  update(w: World, dt: number): void {
    this.stateTime += dt;
    this.sinceFlap += dt;
    const c = w.cake;
    switch (this.state) {
      case 'idle':
        if (w.waiter.x > this.trigger) {
          this.set('circle');
          w.events.push({ type: 'squawk' });
        }
        break;
      case 'circle':
        if (this.stateTime >= T.PARROT_CIRCLE) {
          this.set('perched');
          this.tier = c.count - 1;
          this.mass = T.PARROT_MASS;
          c.topMass += this.mass;
          recomputeL(w.t, c);
          this.flapTimer = w.rng.range(T.PARROT_FLAP_MIN, T.PARROT_FLAP_MAX);
          w.hit(this.side * T.PARROT_LAND_OMEGA, 0, 1, 'SQUAWK!', w.waiter.x + w.waiter.tray);
        }
        break;
      case 'perched':
        // Losing the top tier takes the perch away (the cake drops its top mass itself).
        if (c.count - 1 < this.tier) {
          this.mass = 0;
          this.set('leaving');
          break;
        }
        this.flapTimer -= dt;
        if (this.flapTimer <= 0) {
          this.flapTimer = w.rng.range(T.PARROT_FLAP_MIN, T.PARROT_FLAP_MAX);
          c.omega += w.rng.sign() * T.PARROT_FLAP_OMEGA;
          this.sinceFlap = 0;
          w.events.push({ type: 'flap' });
        }
        if (this.stateTime >= this.perchTime) {
          c.topMass = Math.max(0, c.topMass - this.mass);
          this.mass = 0;
          recomputeL(w.t, c);
          this.set('leaving');
          w.events.push({ type: 'squawk' });
        }
        break;
      case 'leaving':
        if (this.stateTime > 2) this.set('gone');
        break;
      case 'gone':
        break;
    }
    this.alertX = w.waiter.x + w.waiter.tray;
    this.alert = easeAlert(this.alert, this.state === 'circle', dt);
  }

  private set(s: ParrotState): void {
    this.state = s;
    this.stateTime = 0;
  }
}
