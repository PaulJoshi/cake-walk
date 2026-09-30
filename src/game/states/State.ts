import type { Game } from '../Game';

export type StateName = 'title' | 'countdown' | 'playing' | 'paused' | 'result';

export interface State {
  readonly name: StateName;
  enter?(g: Game): void;
  exit?(g: Game): void;
  /** Real (wall-clock) seconds since the last frame, already clamped. */
  update(g: Game, dt: number): void;
  render(g: Game): void;
}
