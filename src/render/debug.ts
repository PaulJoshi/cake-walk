import type { World } from '../game/World';
import { ZONES } from '../level/level';
import type { Span } from '../level/obstacles/types';
import { FLOOR_Y } from './background';
import { text } from './draw';

const spans: Span[] = [{ x0: 0, x1: 0 }];
const deg = (r: number) => ((r * 180) / Math.PI).toFixed(1);

/** ?debug=1 overlay: numbers, hitboxes, seed and zone-skip help. */
export function drawDebug(ctx: CanvasRenderingContext2D, w: World, cam: number, fps: number): void {
  const c = w.cake;
  const wt = w.waiter;
  // Hitboxes.
  ctx.strokeStyle = '#6be38a';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    Math.round(wt.x - w.t.WAITER_HALF_W - cam) + 0.5,
    FLOOR_Y - 35.5,
    w.t.WAITER_HALF_W * 2,
    36,
  );
  ctx.globalAlpha = 0.5;
  for (const o of w.obstacles) {
    if (!o.hazards) continue;
    const n = o.hazards(w, 0, spans);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = '#ff4f5e';
      ctx.fillRect(
        Math.round(spans[i].x0 - cam),
        FLOOR_Y - 30,
        Math.round(spans[i].x1 - spans[i].x0),
        30,
      );
    }
  }
  if (w.env.blockX < 1e6) {
    ctx.fillStyle = '#ffd36b';
    ctx.fillRect(Math.round(w.env.blockX - cam), FLOOR_Y - 50, 1, 50);
  }
  ctx.globalAlpha = 1;

  const lines = [
    `FPS ${fps.toFixed(0)}  SEED ${w.seed}`,
    `th ${deg(c.theta)}  w ${c.omega.toFixed(2)}  L ${c.L.toFixed(1)}`,
    `aTray ${wt.aTray.toFixed(0)}  v ${wt.v.toFixed(0)}  x ${wt.x.toFixed(0)}`,
    `tray ${wt.tray.toFixed(1)}  tiers ${c.count}  t ${w.time.toFixed(1)}`,
    `slide ${c.tiers
      .slice(1, c.count)
      .map((t) => t.s.toFixed(1))
      .join(' ')}`,
    `keys 1-9,0: ${ZONES.map((z) => z.name.slice(0, 3)).join(' ')}`,
  ];
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(2, 34, 250, lines.length * 9 + 4);
  ctx.font = '8px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#6be38a';
  lines.forEach((l, i) => ctx.fillText(l, 5, 37 + i * 9));
  if (w.finished) text(ctx, w.outcome.toUpperCase(), 240, 250, 8, '#6be38a');
}
