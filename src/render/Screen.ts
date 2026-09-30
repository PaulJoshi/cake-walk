export const VIEW_W = 480;
export const VIEW_H = 270;

/**
 * Owns the visible canvas and a fixed 480x270 back buffer. The game draws into the back
 * buffer; `present()` blits it to the visible canvas with nearest-neighbour scaling.
 * Integer scaling is used when it fills most of the window, otherwise fractional scaling,
 * and the rest is letterboxed.
 */
export class Screen {
  readonly buffer: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private readonly out: CanvasRenderingContext2D;
  /** Size of one game pixel in CSS pixels. */
  cssScale = 1;
  /** Offset of the game area inside the window, in CSS pixels. */
  cssLeft = 0;
  cssTop = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.buffer = document.createElement('canvas');
    this.buffer.width = VIEW_W;
    this.buffer.height = VIEW_H;
    const ctx = this.buffer.getContext('2d', { alpha: false });
    const out = canvas.getContext('2d', { alpha: false });
    if (!ctx || !out) throw new Error('Canvas 2D is not supported');
    this.ctx = ctx;
    this.out = out;
    this.ctx.imageSmoothingEnabled = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const vv = window.visualViewport;
    const winW = vv?.width ?? window.innerWidth;
    const winH = vv?.height ?? window.innerHeight;
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    const fit = Math.min((winW * dpr) / VIEW_W, (winH * dpr) / VIEW_H);
    const intScale = Math.floor(fit);
    // Integer scaling where it fills at least 85% of the fit; otherwise fractional.
    const devScale = intScale >= 1 && intScale / fit >= 0.85 ? intScale : fit;
    const devW = Math.round(VIEW_W * devScale);
    const devH = Math.round(VIEW_H * devScale);
    this.canvas.width = devW;
    this.canvas.height = devH;
    const cssW = devW / dpr;
    const cssH = devH / dpr;
    this.cssScale = cssW / VIEW_W;
    this.cssLeft = (winW - cssW) / 2;
    this.cssTop = (winH - cssH) / 2;
    const s = this.canvas.style;
    s.width = `${cssW}px`;
    s.height = `${cssH}px`;
    s.left = `${this.cssLeft}px`;
    s.top = `${this.cssTop}px`;
    document.documentElement.style.setProperty('--px', `${this.cssScale}px`);
    document.documentElement.style.setProperty('--game-w', `${cssW}px`);
    document.documentElement.style.setProperty('--game-h', `${cssH}px`);
    document.documentElement.style.setProperty('--game-left', `${this.cssLeft}px`);
    document.documentElement.style.setProperty('--game-top', `${this.cssTop}px`);
    this.out.imageSmoothingEnabled = false;
  }

  /** Convert a client (CSS) coordinate to game-view coordinates. */
  toView(clientX: number, clientY: number): { x: number; y: number } {
    return {
      x: (clientX - this.cssLeft) / this.cssScale,
      y: (clientY - this.cssTop) / this.cssScale,
    };
  }

  present(): void {
    this.out.imageSmoothingEnabled = false;
    this.out.drawImage(this.buffer, 0, 0, this.canvas.width, this.canvas.height);
  }
}
