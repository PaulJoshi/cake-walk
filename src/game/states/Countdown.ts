import type { Game } from '../Game';
import type { State } from './State';

const STEPS = ['3', '2', '1', "DON'T DROP IT!"];
const STEP_TIME = 0.75;

/** "3, 2, 1, DON'T DROP IT." The world is frozen; tilt is calibrated here. */
export class Countdown implements State {
  readonly name = 'countdown';
  private t = 0;
  private shown = -1;

  enter(g: Game): void {
    this.t = 0;
    this.shown = -1;
    g.input.calibrateTilt();
    g.ui.hideAll();
  }

  update(g: Game, dt: number): void {
    this.t += dt;
    const i = Math.floor(this.t / STEP_TIME);
    if (i !== this.shown && i < STEPS.length) {
      this.shown = i;
      g.audio.countdown(i === STEPS.length - 1);
    }
    g.renderer.update(g.world, dt);
    if (this.t >= STEP_TIME * STEPS.length - 0.25) g.setState('playing');
  }

  render(g: Game): void {
    const i = Math.min(STEPS.length - 1, Math.floor(this.t / STEP_TIME));
    g.draw(g.world, { countdown: STEPS[i] });
  }
}
