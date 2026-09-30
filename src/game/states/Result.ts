import type { Game } from '../Game';
import type { State } from './State';

/** Win or one of the three fail screens. The world keeps animating behind the overlay. */
export class Result implements State {
  readonly name = 'result';

  enter(g: Game): void {
    g.input.enabled = false;
    g.audio.stopMusic();
    g.audio.result(g.world.outcome);
    g.showResult();
  }

  exit(g: Game): void {
    g.input.enabled = true;
  }

  update(g: Game, dt: number): void {
    g.simulate(g.world, dt, () => g.input.update(1 / g.world.t.SIM_HZ));
    g.renderer.update(g.world, dt);
  }

  render(g: Game): void {
    g.draw(g.world, {});
  }
}
