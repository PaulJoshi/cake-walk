import type { GameEvent, World } from '../game/World';

/** Synth audio (filled in during the juice milestone). */
export class Audio {
  muted = false;
  unlock(): void {}
  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }
  countdown(_go: boolean): void {}
  startMusic(): void {}
  stopMusic(): void {}
  pauseMusic(_paused: boolean): void {}
  track(_w: World): void {}
  event(_e: GameEvent): void {}
}
