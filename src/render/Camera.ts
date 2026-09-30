import { LEVEL } from '../level/level';
import { VIEW_W } from './Screen';

/** Side-scrolling camera that follows the waiter with a lookahead in the walking direction. */
export class Camera {
  x = 0;
  private look = 0;

  /** Where the waiter sits on screen (fraction of the width). */
  static readonly ANCHOR = 0.34;

  reset(targetX: number): void {
    this.look = 0;
    this.x = this.clamp(targetX - VIEW_W * Camera.ANCHOR);
  }

  update(targetX: number, speed: number, dt: number): void {
    const wantLook = speed * 0.9;
    this.look += (wantLook - this.look) * Math.min(1, dt * 2.5);
    const want = this.clamp(targetX - VIEW_W * Camera.ANCHOR + this.look);
    this.x += (want - this.x) * Math.min(1, dt * 6);
  }

  private clamp(x: number): number {
    return Math.max(0, Math.min(LEVEL.LENGTH - VIEW_W, x));
  }
}
