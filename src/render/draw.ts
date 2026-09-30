/** Small drawing helpers shared by the renderer and HUD. */
export const FONT = '"Press Start 2P", ui-monospace, monospace';
export const font = (size: number) => `${size}px ${FONT}`;

export const INK = '#fff8ec';
export const SHADOW = '#1a0f1f';
export const PINK = '#ff6fa8';
export const GOLD = '#ffd36b';
export const RED = '#ff4f5e';
export const GREEN = '#6be38a';
export const AMBER = '#ffb347';

export function text(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size = 8,
  color = INK,
  align: CanvasTextAlign = 'center',
  outline = true,
): void {
  ctx.font = font(size);
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  x = Math.round(x);
  y = Math.round(y);
  if (outline) {
    ctx.fillStyle = SHADOW;
    const o = size >= 16 ? 2 : 1;
    ctx.fillText(s, x - o, y);
    ctx.fillText(s, x + o, y);
    ctx.fillText(s, x, y - o);
    ctx.fillText(s, x, y + o);
    ctx.fillText(s, x + o, y + o);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

/** 1-2 px pixel line (Bresenham) so arms stay crisp. */
export function pixelLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  w = 1,
): void {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  ctx.fillStyle = color;
  for (let i = 0; i < 200; i++) {
    ctx.fillRect(x0, y0, w, w);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

/** Speech/alert bubble with a tail, centred at (x, y). */
export function bubble(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  fg = RED,
  bg = INK,
  scale = 1,
): void {
  ctx.font = font(8);
  const w = Math.round((ctx.measureText(s).width + 8) * scale);
  const h = Math.round(14 * scale);
  x = Math.round(x);
  y = Math.round(y);
  ctx.fillStyle = SHADOW;
  ctx.fillRect(x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2);
  ctx.fillRect(x - 3, y + h / 2, 6, 3);
  ctx.fillStyle = bg;
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.fillRect(x - 2, y + h / 2, 4, 2);
  ctx.fillRect(x - 1, y + h / 2 + 2, 2, 1);
  if (scale > 0.7) text(ctx, s, x, y + 1, 8, fg, 'center', false);
}
