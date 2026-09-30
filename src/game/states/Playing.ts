import { Autopilot } from '../../bot/autopilot';
import type { Game } from '../Game';
import type { State } from './State';

/** The 60-second round. Fixed-timestep simulation driven by the player's Intent. */
export class Playing implements State {
  readonly name = 'playing';
  private endDelay = 0;
  private bot = new Autopilot();

  enter(g: Game): void {
    this.endDelay = 0;
    if (g.world.time === 0) this.bot = new Autopilot();
    g.input.enabled = true;
    g.ui.hideAll();
    g.ui.showTouchHints(g.input.touchSeen);
    g.audio.startMusic();
  }

  exit(g: Game): void {
    g.ui.showTouchHints(false);
  }

  update(g: Game, dt: number): void {
    const w = g.world;
    const step = 1 / w.t.SIM_HZ;
    g.simulate(w, dt, () => (g.botPlay ? this.bot.update(w) : g.input.update(step)));
    g.audio.track(w);
    g.renderer.update(w, dt);
    if (w.finished) {
      this.endDelay += dt;
      if (this.endDelay > (w.won ? 1.8 : 1.6)) g.setState('result');
    }
  }

  render(g: Game): void {
    g.draw(g.world, {});
  }
}
