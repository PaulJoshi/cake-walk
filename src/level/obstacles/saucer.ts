import type { World } from '../../game/World';
import type { Rng } from '../../game/rng';
import { T } from '../../game/tuning';
import { STATION } from '../station';
import type { MeteorShower } from './meteors';
import type { Obstacle } from './types';
import { easeAlert } from './util';

type SaucerState = 'idle' | 'arrive' | 'beam' | 'leave' | 'gone';

/**
 * A flying saucer (the groom's cousins, fashionably late) hovers over the cake and locks on with
 * a tractor beam. It sways from side to side, dragging the top of the cake towards it, and the
 * beam makes the cake lighter. Then it zooms off (sooner if the meteor alarm goes off).
 */
export class Saucer implements Obstacle {
  readonly kind = 'ufo';
  readonly trigger: number;
  readonly beamTime: number;
  readonly sway: number;
  readonly swayPeriod: number;
  readonly phase: number;
  state: SaucerState = 'idle';
  stateTime = 0;
  alert = 0;
  alertX = 0;
  alertY = 0;
  /** Saucer x relative to the waiter's tray (px). */
  offset = 0;

  constructor(
    rng: Rng,
    private readonly meteors?: MeteorShower,
  ) {
    this.trigger = STATION.UFO.trigger + rng.range(-T.UFO_SHIFT, T.UFO_SHIFT);
    this.beamTime = rng.range(T.UFO_BEAM_MIN, T.UFO_BEAM_MAX);
    this.sway = rng.range(T.UFO_SWAY_MIN, T.UFO_SWAY_MAX);
    this.swayPeriod = rng.range(T.UFO_SWAY_PERIOD_MIN, T.UFO_SWAY_PERIOD_MAX);
    this.phase = rng.sign() * (Math.PI / 2);
  }

  get beaming(): boolean {
    return this.state === 'beam';
  }

  update(w: World, dt: number): void {
    this.stateTime += dt;
    this.alertX = w.waiter.x;
    switch (this.state) {
      case 'idle':
        if (w.waiter.x > this.trigger) {
          this.set('arrive');
          w.events.push({ type: 'ufo' });
        }
        break;
      case 'arrive':
        this.offset = this.sway * Math.sin(this.phase);
        if (this.stateTime >= T.UFO_ARRIVE) this.set('beam');
        break;
      case 'beam': {
        // Ease the pull in so the lock-on itself is not a jolt.
        const ease = Math.min(1, this.stateTime / 0.4);
        this.offset =
          this.sway * Math.sin(this.phase + (Math.PI * 2 * this.stateTime) / this.swayPeriod);
        w.cake.omega += T.UFO_PULL * (this.offset / this.sway) * ease * dt;
        w.floorAUp -= T.UFO_LIFT * ease;
        const alarm = this.meteors !== undefined && this.meteors.count > 0;
        if (this.stateTime >= this.beamTime || alarm) this.set('leave');
        break;
      }
      case 'leave':
        if (this.stateTime >= 1.5) this.set('gone');
        break;
      case 'gone':
        break;
    }
    this.alert = easeAlert(this.alert, this.state === 'arrive', dt);
  }

  private set(s: SaucerState): void {
    this.state = s;
    this.stateTime = 0;
  }
}
