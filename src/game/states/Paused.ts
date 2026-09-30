import type { Game } from '../Game';
import type { State } from './State';

/** Paused (P / Esc, or automatically when the tab is hidden or loses focus). */
export class Paused implements State {
  readonly name = 'paused';

  enter(g: Game): void {
    g.input.releaseAll();
    g.audio.pauseMusic(true);
    g.ui.showPause();
  }

  exit(g: Game): void {
    g.audio.pauseMusic(false);
    g.ui.hideAll();
  }

  update(): void {}

  render(g: Game): void {
    g.draw(g.world, {});
  }
}
