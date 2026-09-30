import type { Tuning } from '../game/tuning';
import type { CakeState } from '../physics/cake';
import type { Sprite } from './sprites';

export const CAKE_W = 104;
export const CAKE_H = 112;
/** Pivot (tray top centre) inside the offscreen cake canvas. */
export const PIVOT_X = CAKE_W / 2;
export const PIVOT_Y = CAKE_H - 2;

const FROST = '#fffaf2';
const FROST_SHADE = '#efe2d4';
const FROST_DARK = '#d9c6b6';
const PINK = '#ff8fb8';
const PINK_DARK = '#e0628f';
const PEARL = '#ffe9a8';

/** Draw one tier with its top-left corner at (x, y). */
export function drawTier(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  j: number,
): void {
  x = Math.round(x);
  y = Math.round(y);
  ctx.fillStyle = FROST;
  ctx.fillRect(x, y, w, h);
  // Right-side shade and bottom shadow for volume.
  ctx.fillStyle = FROST_SHADE;
  ctx.fillRect(
    x + w - Math.max(3, Math.round(w * 0.14)),
    y + 1,
    Math.max(3, Math.round(w * 0.14)),
    h - 1,
  );
  ctx.fillStyle = FROST_DARK;
  ctx.fillRect(x, y + h - 1, w, 1);
  // Pink ribbon band.
  ctx.fillStyle = j % 2 === 0 ? PINK : PINK_DARK;
  ctx.fillRect(x, y + h - 4, w, 2);
  // Scalloped drips along the top.
  ctx.fillStyle = FROST;
  for (let i = 1; i < w - 1; i += 3) ctx.fillRect(x + i, y + 1, 1, 1 + ((i + j) % 2));
  ctx.fillStyle = PINK;
  for (let i = 2; i < w - 2; i += 6) ctx.fillRect(x + i, y + 2, 1, 1);
  // Pearls on the band.
  ctx.fillStyle = PEARL;
  for (let i = 3; i < w - 2; i += 5) ctx.fillRect(x + i, y + h - 4, 1, 1);
}

const tierCache = new Map<number, Sprite>();

/** Cached single-tier canvas (for flying debris). */
export function tierSprite(w: number, h: number, j: number): Sprite {
  const key = w * 100 + j;
  let c = tierCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    drawTier(c.getContext('2d')!, 0, 0, w, h, j);
    tierCache.set(key, c);
  }
  return c;
}

/**
 * Renders the upright cake (with tier slides) into an offscreen canvas. The caller rotates it
 * by theta around (PIVOT_X, PIVOT_Y).
 */
export class CakeCanvas {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CAKE_W;
    this.canvas.height = CAKE_H;
    this.ctx = this.canvas.getContext('2d')!;
  }

  render(
    t: Tuning,
    cake: CakeState,
    topper: Sprite,
    bouquet: Sprite | null,
    bouquetOffset = 0,
    count = cake.count,
  ): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CAKE_W, CAKE_H);
    let off = 0;
    let topY = PIVOT_Y;
    let topX = PIVOT_X;
    for (let j = 0; j < count; j++) {
      const tier = cake.tiers[j];
      if (j > 0) off += tier.s;
      const y = PIVOT_Y - (j + 1) * t.TIER_H;
      drawTier(ctx, PIVOT_X - tier.w / 2 + off, y, tier.w, t.TIER_H, j);
      topY = y;
      topX = PIVOT_X + off;
    }
    if (count > 0) {
      if (count === t.TIER_COUNT)
        ctx.drawImage(topper, Math.round(topX - topper.width / 2), topY - topper.height + 1);
      if (bouquet)
        ctx.drawImage(
          bouquet,
          Math.round(topX - bouquet.width / 2 + bouquetOffset + (count === t.TIER_COUNT ? 6 : 0)),
          topY - bouquet.height + 2,
        );
    }
  }
}
