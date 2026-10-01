/** Height of the authored scene (wall + floor) in game pixels. */
export const SCENE_H = 270;
/** Narrowest view, used on portrait screens: enough lane to see what is coming. */
export const MIN_VIEW_W = 300;
/** Widest view, for ultra-wide windows (wider ones crop the scene top and bottom). */
export const MAX_VIEW_W = 960;
/** Share of any spare height that goes above the scene (the rest extends the floor). */
const HEADROOM = 0.45;

/**
 * The visible area in game pixels. It always matches the window's aspect ratio, so the game
 * fills the screen: landscape windows see the full scene height and a wider slice of the
 * hall, portrait windows see MIN_VIEW_W across with extra wall above and floor below.
 * `sceneY` is where scene y = 0 sits inside the view.
 */
export const view = { w: 480, h: SCENE_H, sceneY: 0 };

/**
 * Owns the visible canvas and the back buffer. The game draws into the back buffer at
 * `view` size; `present()` blits it to the visible canvas with nearest-neighbour scaling.
 * Integer scaling is used when it is close to the ideal fit, otherwise fractional; either
 * way the buffer is sized to cover the whole window, so there is no letterboxing.
 */
export class Screen {
  readonly buffer: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private readonly out: CanvasRenderingContext2D;
  /** Size of one game pixel in CSS pixels. */
  cssScale = 1;
  /** Size of one game pixel in device pixels. */
  private devScale = 1;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.buffer = document.createElement('canvas');
    const ctx = this.buffer.getContext('2d', { alpha: false });
    const out = canvas.getContext('2d', { alpha: false });
    if (!ctx || !out) throw new Error('Canvas 2D is not supported');
    this.ctx = ctx;
    this.out = out;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const vv = window.visualViewport;
    const winW = vv?.width ?? window.innerWidth;
    const winH = vv?.height ?? window.innerHeight;
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    const devW = Math.max(1, Math.round(winW * dpr));
    const devH = Math.max(1, Math.round(winH * dpr));
    // Fit the scene height, but never show less than MIN_VIEW_W or more than MAX_VIEW_W across.
    const fit = Math.max(Math.min(devH / SCENE_H, devW / MIN_VIEW_W), devW / MAX_VIEW_W);
    const intScale = Math.floor(fit);
    // Integer scaling where it is at least 85% of the fit; otherwise fractional.
    const scale = intScale >= 1 && intScale / fit >= 0.85 ? intScale : fit;
    this.devScale = scale;
    view.w = Math.ceil(devW / scale);
    view.h = Math.ceil(devH / scale);
    view.sceneY = Math.round(
      view.h >= SCENE_H ? (view.h - SCENE_H) * HEADROOM : (view.h - SCENE_H) / 2,
    );
    if (this.buffer.width !== view.w || this.buffer.height !== view.h) {
      this.buffer.width = view.w;
      this.buffer.height = view.h;
    }
    this.ctx.imageSmoothingEnabled = false;
    this.canvas.width = devW;
    this.canvas.height = devH;
    this.cssScale = scale / dpr;
    const s = this.canvas.style;
    s.width = `${winW}px`;
    s.height = `${winH}px`;
    document.documentElement.style.setProperty('--px', `${this.cssScale}px`);
    this.out.imageSmoothingEnabled = false;
  }

  /** Convert a client (CSS) coordinate to view coordinates. */
  toView(clientX: number, clientY: number): { x: number; y: number } {
    return { x: clientX / this.cssScale, y: clientY / this.cssScale };
  }

  present(): void {
    this.out.imageSmoothingEnabled = false;
    const s = this.devScale;
    this.out.drawImage(this.buffer, 0, 0, view.w * s, view.h * s);
  }
}
