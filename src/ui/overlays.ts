import type { Game } from '../game/Game';

/** DOM overlays (filled in during the game-flow milestone). */
export class Overlays {
  constructor(private readonly root: HTMLElement) {}
  hideAll(): void {
    this.root.innerHTML = '';
  }
  showTitle(): void {}
  showPause(): void {
    this.root.innerHTML =
      '<div style="position:fixed;top:40%;width:100%;text-align:center">PAUSED - P</div>';
  }
  showTouchHints(_on: boolean): void {}
  setMuted(_m: boolean): void {}
  toggleFullscreen(): void {}
  showResult(g: Game): void {
    this.root.innerHTML = `<div style="position:fixed;top:40%;width:100%;text-align:center">${g.world.outcome.toUpperCase()} - R TO RETRY</div>`;
  }
}
