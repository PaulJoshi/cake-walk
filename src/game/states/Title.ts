import { Autopilot } from '../../bot/autopilot';
import { randomSeed } from '../rng';
import { World } from '../World';
import type { Game } from '../Game';
import type { State } from './State';

/** Title screen with attract mode: the autopilot plays in the background. */
export class Title implements State {
  readonly name = 'title';
  private bot = new Autopilot();
  private world: World | null = null;
  private restart = 0;

  enter(g: Game): void {
    if (g.challenge) g.ui.showChallenge();
    else g.ui.showTitle();
    g.audio.stopMusic();
    // Scores or a name change that couldn't reach the scoreboard earlier.
    void g.scoreboard.flush();
    this.newRun(g);
  }

  /** Start a fresh autopilot run in the picked world. */
  newRun(g: Game): void {
    this.world = new World(`attract-${randomSeed()}`, g.worldId);
    this.bot = new Autopilot();
    this.restart = 0;
    g.renderer.reset(this.world);
  }

  update(g: Game, dt: number): void {
    const w = this.world!;
    g.simulate(w, dt, () => this.bot.update(w), true);
    g.renderer.update(w, dt);
    if (w.finished) {
      this.restart += dt;
      if (this.restart > 3) this.newRun(g);
    }
  }

  render(g: Game): void {
    g.draw(this.world!, { attract: true });
  }
}
