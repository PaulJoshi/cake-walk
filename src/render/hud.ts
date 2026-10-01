import type { World } from '../game/World';
import { T } from '../game/tuning';
import { LEVEL } from '../level/level';
import { GOLD, INK, PINK, RED, text } from './draw';
import { view } from './Screen';

export interface HudOptions {
  /** Attract mode (title screen): no HUD. */
  attract: boolean;
  /** Big centre text during the countdown. */
  countdown: string | null;
  /** Tutorial hint lines for the current device. */
  walkHint: string;
  balanceHint: string;
}

/** Timer text: "00:60" at the start, then whole seconds, tenths under 10 s. */
export function formatTimer(timeLeft: number): string {
  if (timeLeft >= 10) return `00:${String(Math.min(60, Math.ceil(timeLeft))).padStart(2, '0')}`;
  return `00:0${Math.max(0, timeLeft).toFixed(1)}`;
}

function cakeIcon(ctx: CanvasRenderingContext2D, x: number, y: number, on: boolean): void {
  ctx.fillStyle = on ? '#fffaf2' : 'rgba(255,255,255,0.12)';
  ctx.fillRect(x, y + 3, 10, 5);
  ctx.fillRect(x + 2, y, 6, 3);
  ctx.fillStyle = on ? PINK : 'rgba(255,111,168,0.2)';
  ctx.fillRect(x, y + 6, 10, 1);
  ctx.fillRect(x + 2, y + 2, 6, 1);
}

export function drawHud(
  ctx: CanvasRenderingContext2D,
  w: World,
  o: HudOptions,
  time: number,
): void {
  if (o.attract) return;

  // Timer (top centre), pulsing red in the last 10 s.
  const left = w.finished && w.won ? w.finalTimeLeft : w.timeLeft;
  const urgent = left < 10 && !w.finished;
  const pulse = urgent ? 0.5 + 0.5 * Math.sin(time * 12) : 0;
  ctx.fillStyle = 'rgba(26,15,31,0.7)';
  ctx.fillRect(view.w / 2 - 50, 4, 100, 24);
  ctx.fillStyle = urgent ? RED : GOLD;
  ctx.fillRect(view.w / 2 - 50, 27, 100 * Math.max(0, left / T.ROUND_TIME), 1);
  text(ctx, formatTimer(left), view.w / 2, 17, 16, urgent ? (pulse > 0.5 ? RED : INK) : INK);

  // Tier icons (top left).
  ctx.fillStyle = 'rgba(26,15,31,0.7)';
  ctx.fillRect(4, 4, 7 * 12 + 6, 16);
  for (let j = 0; j < T.TIER_COUNT; j++) cakeIcon(ctx, 8 + j * 12, 8, j < w.cake.count);
  if (w.clutches > 0) text(ctx, `CLUTCH x${w.clutches}`, 8, 28, 8, GOLD, 'left');

  // Distance-to-table progress bar (bottom of the view).
  const half = Math.min(120, view.w / 2 - 24);
  const x0 = Math.round(view.w / 2 - half);
  const x1 = Math.round(view.w / 2 + half);
  const y = view.h - 8;
  const p = Math.max(
    0,
    Math.min(
      1,
      (w.waiter.x - LEVEL.START_X) / ((LEVEL.TABLE.x0 + LEVEL.TABLE.x1) / 2 - LEVEL.START_X),
    ),
  );
  ctx.fillStyle = 'rgba(26,15,31,0.75)';
  ctx.fillRect(x0 - 4, y - 4, x1 - x0 + 16, 9);
  ctx.fillStyle = '#4a3040';
  ctx.fillRect(x0, y - 1, x1 - x0, 3);
  ctx.fillStyle = PINK;
  ctx.fillRect(x0, y - 1, Math.round((x1 - x0) * p), 3);
  ctx.fillStyle = INK;
  ctx.fillRect(Math.round(x0 + (x1 - x0) * p) - 1, y - 3, 3, 7);
  // Table icon at the end.
  ctx.fillStyle = GOLD;
  ctx.fillRect(x1 + 3, y - 3, 7, 2);
  ctx.fillRect(x1 + 4, y - 1, 1, 4);
  ctx.fillRect(x1 + 8, y - 1, 1, 4);

  // Hints and the countdown sit over the scene's back wall, wherever the scene is in the view.
  const sy = view.sceneY;

  // Tutorial hints in the kitchen zone.
  const wx = w.waiter.x;
  if (!w.finished && wx < LEVEL.KITCHEN_END && w.time < 12) {
    const blink = Math.sin(time * 6) > -0.3;
    const msg = wx < LEVEL.START_X + 30 ? o.walkHint : o.balanceHint;
    if (blink) text(ctx, msg, view.w / 2, sy + 48, 8, INK);
  }

  // Set-down guidance.
  if (!w.finished && wx > LEVEL.TABLE.x0 - 260) {
    if (w.inTableZone) {
      const f = w.setDownHold / T.SET_DOWN_HOLD;
      text(
        ctx,
        f > 0 ? 'HOLD STILL...' : 'STOP HERE!',
        view.w / 2,
        sy + 48,
        8,
        f > 0 ? '#6be38a' : GOLD,
      );
      ctx.fillStyle = 'rgba(26,15,31,0.75)';
      ctx.fillRect(view.w / 2 - 31, sy + 58, 62, 6);
      ctx.fillStyle = '#6be38a';
      ctx.fillRect(view.w / 2 - 30, sy + 59, Math.round(60 * f), 4);
    } else if (wx < LEVEL.TABLE.x0)
      text(ctx, 'STOP AT THE CAKE TABLE', view.w / 2, sy + 48, 8, GOLD);
  }

  if (o.countdown) {
    const big = o.countdown.length <= 2;
    text(ctx, o.countdown, view.w / 2, sy + 110, big ? 32 : 16, big ? GOLD : PINK);
  }
}
