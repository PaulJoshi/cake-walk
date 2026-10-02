import { view } from './Screen';

/** Side-scrolling camera that follows the waiter with a lookahead in the walking direction. */
export class Camera {
  x = 0;
  /** Level length (px): the camera never shows past either end. */
  length = 2760;
  private look = 0;

  /** Where the waiter sits on screen (fraction of the width); further left on narrow views. */
  static readonly ANCHOR = 0.34;
  static readonly NARROW_ANCHOR = 0.3;

  private anchor(): number {
    return view.w * (view.w < 420 ? Camera.NARROW_ANCHOR : Camera.ANCHOR);
  }

  reset(targetX: number): void {
    this.look = 0;
    this.x = this.clamp(targetX - this.anchor());
  }

  update(targetX: number, speed: number, dt: number): void {
    // Narrow views get proportionally less lookahead so the waiter stays on screen.
    const wantLook = speed * 0.9 * Math.min(1, view.w / 480);
    this.look += (wantLook - this.look) * Math.min(1, dt * 2.5);
    const want = this.clamp(targetX - this.anchor() + this.look);
    this.x += (want - this.x) * Math.min(1, dt * 6);
  }

  private clamp(x: number): number {
    return Math.max(0, Math.min(this.length - view.w, x));
  }
}
