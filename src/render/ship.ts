import { createRng } from '../game/rng';
import type { World } from '../game/World';
import { T } from '../game/tuning';
import { Barrel, Cannonballs, Kraken, Parrot, Plank, RogueWave, Swell } from '../level/obstacles';
import type { Obstacle } from '../level/obstacles/types';
import { SHIP } from '../level/ship';
import { FAR, FLOOR_EXT, FLOOR_Y, WALL_EXT, WALL_Y, depthY } from './background';
import { GOLD, INK, RED, bubble, pixelLine, text } from './draw';
import { MAX_VIEW_W, SCENE_H, view } from './Screen';
import type { ShipSprites } from './shipSprites';
import type { PersonSprites } from './sprites';

/** Resting height of the sea horizon in scene coordinates. */
const HORIZON = 120;
/** Top of the ship's rail (bulwark). */
const RAIL_TOP = 150;
/** Visible roll of the horizon at full swell (rad). */
const ROLL_VIS = 0.04;
/** Tray top height above the floor (matches the renderer). */
const TRAY_LIFT = 40;
const SUN_X = 360;
const MASTS = [300, 690, 1560, SHIP.MAST_X];
const CROW_Y = 22;

interface Crew {
  x: number;
  p: PersonSprites;
  phase: number;
  speed: number;
}

/**
 * The Pirate Ship world's scenery and obstacles: a sunset sky, a rocking sea horizon, two
 * ships lashed together with a gangplank over shark water, and the captain's table.
 */
export class ShipScene {
  private readonly sky: HTMLCanvasElement;
  private readonly deck: HTMLCanvasElement;
  private readonly rail: HTMLCanvasElement;
  private readonly crew: Crew[] = [];
  private readonly cache = new Map<unknown, unknown>();
  private cacheWorld: World | null = null;

  constructor(readonly sprites: ShipSprites) {
    this.sky = this.buildSky();
    this.deck = this.buildDeck();
    this.rail = this.buildRail();
    const rng = createRng('pirate-crew');
    for (let x = 120; x < SHIP.LENGTH - 160; x += 70 + rng.int(-14, 20)) {
      if (MASTS.some((m) => Math.abs(m - x) < 14)) continue;
      this.crew.push({
        x,
        p: sprites.crew[rng.int(0, sprites.crew.length - 1)],
        phase: rng.range(0, 6.28),
        speed: rng.range(2, 4),
      });
    }
  }

  /** Cached obstacle lookup by class. */
  ob<K>(w: World, cls: abstract new (...args: never[]) => K): K | undefined {
    if (w !== this.cacheWorld) {
      this.cache.clear();
      this.cacheWorld = w;
    }
    if (!this.cache.has(cls))
      this.cache.set(
        cls,
        w.obstacles.find((o) => o instanceof cls),
      );
    return this.cache.get(cls) as K | undefined;
  }

  // ---------------------------------------------------------------- pre-rendered layers
  private buildSky(): HTMLCanvasElement {
    const w = Math.ceil(SHIP.LENGTH * FAR + MAX_VIEW_W + 4);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = WALL_EXT + WALL_Y;
    const ctx = c.getContext('2d')!;
    ctx.translate(0, WALL_EXT);
    // Banded sunset, darkest at the top. Hard pixel bands rather than a smooth gradient.
    const bands: [number, string][] = [
      [-WALL_EXT, '#140f33'],
      [-170, '#1d1544'],
      [-90, '#2c1a55'],
      [-20, '#45205f'],
      [20, '#6b2668'],
      [52, '#9a2f6c'],
      [78, '#c8436b'],
      [96, '#ec6a5e'],
      [108, '#ff9a4a'],
      [116, '#ffc35c'],
    ];
    for (let i = 0; i < bands.length; i++) {
      const y0 = bands[i][0];
      const y1 = i + 1 < bands.length ? bands[i + 1][0] : WALL_Y;
      ctx.fillStyle = bands[i][1];
      ctx.fillRect(0, y0, w, y1 - y0);
    }
    const rng = createRng('pirate-sky');
    // Stars in the high, dark sky.
    for (let i = 0; i < w / 6; i++) {
      const y = rng.int(-WALL_EXT, 10);
      ctx.fillStyle = y < -120 ? '#fff7d6' : 'rgba(255, 247, 214, 0.5)';
      ctx.fillRect(rng.int(0, w), y, 1, 1);
    }
    // A big setting sun with retro cut-out stripes.
    const r = 26;
    for (let dy = -r; dy <= 4; dy++) {
      const half = Math.round(Math.sqrt(r * r - dy * dy));
      const y = HORIZON + dy;
      if (dy > -12 && (dy + 40) % 5 === 0) continue;
      ctx.fillStyle = dy < -14 ? '#fff2b0' : dy < -4 ? '#ffd36b' : '#ffb347';
      ctx.fillRect(SUN_X - half, y, half * 2, 1);
    }
    // Long flat clouds lit from below.
    for (let i = 0; i < w / 90; i++) {
      const cx = rng.int(0, w);
      const cy = rng.int(-60, 92);
      const cw = rng.int(24, 70);
      ctx.fillStyle = cy < 30 ? '#5a2a6a' : '#b0436e';
      ctx.fillRect(cx, cy, cw, 3);
      ctx.fillRect(cx + 6, cy - 2, cw - 16, 2);
      ctx.fillStyle = cy < 30 ? '#7a3a7a' : '#ff8a6a';
      ctx.fillRect(cx + 2, cy + 3, cw - 6, 1);
    }
    // A far-off island with a palm tree, sitting on the horizon.
    const ix = 860;
    ctx.fillStyle = '#4a1f4f';
    ctx.fillRect(ix, HORIZON - 4, 46, 4);
    ctx.fillRect(ix + 8, HORIZON - 7, 28, 3);
    ctx.fillRect(ix + 26, HORIZON - 24, 2, 18);
    for (const [dx, dy] of [
      [-8, 0],
      [-5, -1],
      [3, -1],
      [6, 0],
      [-2, -2],
    ])
      ctx.fillRect(ix + 27 + dx, HORIZON - 25 + dy, 6, 2);
    return c;
  }

  private buildDeck(): HTMLCanvasElement {
    const w = 96;
    const h = SCENE_H - WALL_Y + FLOOR_EXT;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    let y = 0;
    let row = 0;
    while (y < h) {
      const rh = 4 + Math.floor(row * 1.2);
      ctx.fillStyle = row % 2 ? '#b8834a' : '#a8743e';
      ctx.fillRect(0, y, w, rh);
      ctx.fillStyle = '#7a4a26';
      ctx.fillRect(0, y + rh - 1, w, 1);
      const seam = (row * 29) % 64;
      ctx.fillRect(seam, y, 1, rh);
      ctx.fillStyle = 'rgba(40, 20, 10, 0.5)';
      ctx.fillRect(seam + 2, y + Math.floor(rh / 2), 1, 1);
      ctx.fillRect(seam - 3, y + Math.floor(rh / 2), 1, 1);
      ctx.fillStyle = 'rgba(255, 230, 180, 0.14)';
      ctx.fillRect(0, y, w, 1);
      y += rh;
      row++;
    }
    return c;
  }

  private buildRail(): HTMLCanvasElement {
    const w = 96;
    const h = WALL_Y - RAIL_TOP;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    for (let y = 4; y < h; y += 4) {
      ctx.fillStyle = (y / 4) % 2 ? '#6b3b25' : '#5b311f';
      ctx.fillRect(0, y, w, 4);
      ctx.fillStyle = '#41210f';
      ctx.fillRect(0, y + 3, w, 1);
    }
    // Rail cap and posts.
    ctx.fillStyle = '#8f5a36';
    ctx.fillRect(0, 0, w, 4);
    ctx.fillStyle = '#c08a58';
    ctx.fillRect(0, 0, w, 1);
    for (const x of [10, 58]) {
      ctx.fillStyle = '#41210f';
      ctx.fillRect(x, 4, 4, h - 4);
      ctx.fillStyle = '#7a4a2a';
      ctx.fillRect(x, 4, 1, h - 4);
    }
    // A gunport with a cannon muzzle poking out.
    ctx.fillStyle = '#1a0f1f';
    ctx.fillRect(28, 9, 16, 12);
    ctx.fillStyle = '#c99a4a';
    ctx.fillRect(27, 8, 18, 1);
    ctx.fillStyle = '#2b2f36';
    ctx.fillRect(31, 12, 10, 6);
    ctx.fillStyle = '#5c6470';
    ctx.fillRect(32, 13, 3, 2);
    return c;
  }

  // ---------------------------------------------------------------- background
  /** The deck gap (open water) between the two ships, in world x. */
  private gap(w: World): [number, number] {
    const p = this.ob(w, Plank);
    return p ? [p.x0 + 8, p.x1 - 8] : [Infinity, Infinity];
  }

  /** Screen x ranges of [0, view.w] that are on a ship (not over the gap). */
  private shipSpans(w: World, cam: number): [number, number][] {
    const [g0, g1] = this.gap(w);
    const a = Math.round(g0 - cam);
    const b = Math.round(g1 - cam);
    if (b <= 0 || a >= view.w) return [[0, view.w]];
    const out: [number, number][] = [];
    if (a > 0) out.push([0, a]);
    if (b < view.w) out.push([b, view.w]);
    return out;
  }

  /** Tile a pre-rendered strip across the ships only (clipped around the gap). */
  private tileShips(
    ctx: CanvasRenderingContext2D,
    w: World,
    cam: number,
    tile: HTMLCanvasElement,
    y: number,
  ): void {
    const ox = -Math.round(cam) % 96;
    for (const [x0, x1] of this.shipSpans(w, cam)) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y, x1 - x0, tile.height);
      ctx.clip();
      for (let x = ox - 96; x < view.w + 96; x += 96) ctx.drawImage(tile, x, y);
      ctx.restore();
    }
  }

  drawBack(
    ctx: CanvasRenderingContext2D,
    w: World,
    cam: number,
    time: number,
    gasping: boolean,
  ): void {
    const swell = this.ob(w, Swell);
    const roll = swell ? swell.rollAt(w.time) : 0;
    ctx.drawImage(this.sky, -Math.round(cam * FAR), -WALL_EXT);
    this.drawSea(ctx, w, cam, time, roll);

    // Rail (bulwark) along the back of each ship, then the deck planks.
    this.tileShips(ctx, w, cam, this.rail, RAIL_TOP);
    this.tileShips(ctx, w, cam, this.deck, WALL_Y);
    this.drawGap(ctx, w, cam, time);
    for (const mx of MASTS) this.drawMast(ctx, w, mx - cam, time, mx === SHIP.MAST_X);
    this.drawCrew(ctx, w, cam, time, gasping);
    // A wet deck glistens after the rogue wave.
    const wave = this.ob(w, RogueWave);
    if (wave && wave.wet) {
      const f = 1 - wave.sinceBreak / T.WAVE_WET_TIME;
      ctx.globalAlpha = 0.25 * f;
      ctx.fillStyle = '#6fd3ff';
      ctx.fillRect(0, WALL_Y, view.w, SCENE_H - WALL_Y + FLOOR_EXT);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#e6f8ff';
      for (let i = 0; i < 14; i++) {
        const gx = ((i * 71 + Math.floor(time * 2) * 13) % (view.w + 40)) - 20;
        const gy = WALL_Y + 8 + ((i * 37) % 70);
        if (Math.sin(time * 6 + i) > 0.3 * (1 - f) * 3 - 0.5) ctx.fillRect(gx, gy, 3, 1);
      }
    }
  }

  private drawSea(
    ctx: CanvasRenderingContext2D,
    w: World,
    cam: number,
    time: number,
    roll: number,
  ): void {
    const tilt = roll * ROLL_VIS;
    const bob = roll * 1.5;
    const wave = this.ob(w, RogueWave);
    // Rogue wave wall rising behind the rail during the countdown.
    let wallH = 0;
    if (wave) {
      const until = w.timeLeft - wave.breakAt;
      if (!wave.broken && until < 3.2) wallH = (1 - Math.max(0, until) / 3.2) * 70;
      else if (wave.broken && wave.sinceBreak < 0.8) wallH = 70 * (1 - wave.sinceBreak / 0.8);
    }
    for (let x = 0; x < view.w; x += 2) {
      const hy = Math.round(HORIZON + (x - view.w / 2) * tilt + bob);
      // Deep sea, lighter towards the horizon.
      ctx.fillStyle = '#ff9a6a';
      ctx.fillRect(x, hy, 2, 1);
      ctx.fillStyle = '#7a3a6a';
      ctx.fillRect(x, hy + 1, 2, 3);
      ctx.fillStyle = '#3a3a7a';
      ctx.fillRect(x, hy + 4, 2, 6);
      ctx.fillStyle = '#1f3f6a';
      ctx.fillRect(x, hy + 10, 2, WALL_Y - hy - 10);
      if (wallH > 0) {
        const crest = Math.sin(x * 0.09 + time * 3) * 4;
        const top = Math.round(RAIL_TOP - wallH + crest);
        ctx.fillStyle = '#2a7f9a';
        ctx.fillRect(x, top, 2, RAIL_TOP - top + 2);
        ctx.fillStyle = '#e6f8ff';
        ctx.fillRect(x, top, 2, 3);
        ctx.fillStyle = '#9fe0f0';
        ctx.fillRect(x, top + 3, 2, 2);
      }
    }
    // Sun glitter on the water and drifting wave dashes.
    const sx = Math.round(SUN_X - cam * FAR);
    for (let i = 0; i < 9; i++) {
      const y = HORIZON + 3 + i * 3 + Math.round(bob);
      const half = 10 - i + Math.round(Math.sin(time * 3 + i) * 2);
      ctx.fillStyle = i < 3 ? '#ffd36b' : '#ff9a4a';
      if (sx + half > 0 && sx - half < view.w) ctx.fillRect(sx - half, y, half * 2, 1);
    }
    ctx.fillStyle = 'rgba(159, 224, 240, 0.35)';
    for (let i = 0; i < 24; i++) {
      const x =
        ((((i * 53 - cam * 0.5 + time * 6) % (view.w + 30)) + view.w + 30) % (view.w + 30)) - 15;
      const y = HORIZON + 14 + ((i * 7) % 20) + Math.round((x - view.w / 2) * tilt);
      ctx.fillRect(Math.round(x), y, 6, 1);
    }
  }

  private drawGap(ctx: CanvasRenderingContext2D, w: World, cam: number, time: number): void {
    const p = this.ob(w, Plank);
    if (!p) return;
    const [g0, g1] = this.gap(w);
    const a = Math.round(g0 - cam);
    const b = Math.round(g1 - cam);
    if (b < -20 || a > view.w + 20) return;
    const bottom = SCENE_H + FLOOR_EXT;
    // Open water far below, between the hulls.
    ctx.fillStyle = '#16405a';
    ctx.fillRect(a, RAIL_TOP + 10, b - a, bottom - RAIL_TOP);
    ctx.fillStyle = '#1f5a7a';
    for (let y = WALL_Y + 6; y < bottom; y += 9) {
      const off = Math.round(Math.sin(time * 2 + y * 0.3) * 4);
      for (let x = a + ((y * 7) % 16) + off; x < b - 6; x += 18) ctx.fillRect(x, y, 6, 1);
    }
    // Sharks circling.
    for (let i = 0; i < 2; i++) {
      const ph = time * (0.7 + i * 0.25) + i * 3;
      const fx = (a + b) / 2 + Math.cos(ph) * ((b - a) / 2 - 16);
      const fy = FLOOR_Y + 16 + i * 26 + Math.sin(ph) * 6;
      const fin = this.sprites.fin;
      ctx.save();
      ctx.translate(Math.round(fx), Math.round(fy));
      if (Math.sin(ph) < 0) ctx.scale(-1, 1);
      ctx.drawImage(fin, -4, -fin.height);
      ctx.restore();
    }
    // Hull ends of both ships, with rope bumpers.
    for (const [x, dir] of [
      [a, -1],
      [b, 1],
    ] as const) {
      ctx.fillStyle = '#41210f';
      ctx.fillRect(dir < 0 ? x - 4 : x, RAIL_TOP, 4, bottom - RAIL_TOP);
      ctx.fillStyle = '#8f5a36';
      ctx.fillRect(dir < 0 ? x - 4 : x + 3, RAIL_TOP, 1, bottom - RAIL_TOP);
      ctx.fillStyle = '#e8d3b0';
      for (let y = WALL_Y + 12; y < bottom; y += 34) ctx.fillRect(x - 2, y, 4, 6);
    }
    // The plank itself: sags and bounces under the waiter.
    const x0 = Math.round(p.x0 - cam);
    const x1 = Math.round(p.x1 - cam);
    const onIt = p.isOn(w.waiter.x);
    const mid = onIt ? (w.waiter.x - p.x0) / (p.x1 - p.x0) : 0.5;
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / (x1 - x0);
      // Deflection shape peaks under the waiter.
      const shape = u < mid ? u / Math.max(0.01, mid) : (1 - u) / Math.max(0.01, 1 - mid);
      const d = Math.round(p.z * Math.sin((shape * Math.PI) / 2));
      ctx.fillStyle = '#c99a5e';
      ctx.fillRect(x, FLOOR_Y + d - 1, 1, 2);
      ctx.fillStyle = '#7a4a26';
      ctx.fillRect(x, FLOOR_Y + d + 1, 1, 2);
    }
    ctx.fillStyle = '#41210f';
    ctx.fillRect(x0 - 2, FLOOR_Y - 2, 3, 5);
    ctx.fillRect(x1 - 1, FLOOR_Y - 2, 3, 5);
    if (w.waiter.x < p.x0 + 10)
      text(ctx, 'WALK THE PLANK', (x0 + x1) / 2, HORIZON - 40, 8, GOLD, 'center');
  }

  private drawMast(
    ctx: CanvasRenderingContext2D,
    w: World,
    x: number,
    time: number,
    crow: boolean,
  ): void {
    x = Math.round(x);
    if (x < -70 || x > view.w + 70) return;
    const base = depthY(1.7);
    const top = -WALL_EXT;
    // Rigging (ratlines) down to the rail.
    for (const dx of [-46, 46]) {
      pixelLine(ctx, x, 30, x + dx, RAIL_TOP + 2, '#2a1520');
      pixelLine(ctx, x, -60, x + dx * 1.2, RAIL_TOP + 2, '#2a1520');
    }
    // Mast.
    ctx.fillStyle = '#5b311f';
    ctx.fillRect(x - 3, top, 6, base - top);
    ctx.fillStyle = '#8f5a36';
    ctx.fillRect(x - 3, top, 2, base - top);
    // Yards and sails, billowing with the wind.
    const billow = Math.round(Math.sin(time * 1.3 + x * 0.01) * 2);
    for (const [y, half, h] of [
      [-200, 34, 70],
      [-80, 46, 92],
    ] as const) {
      ctx.fillStyle = '#5b311f';
      ctx.fillRect(x - half - 6, y, (half + 6) * 2, 3);
      for (let i = 0; i < h; i++) {
        const f = i / h;
        const hw = Math.round(half - f * 6 + Math.sin(f * Math.PI) * (4 + billow));
        ctx.fillStyle = f > 0.9 ? '#cdb892' : i % 14 === 0 ? '#dccaa4' : '#f3e6c8';
        ctx.fillRect(x - hw, y + 3 + i, hw * 2, 1);
      }
      ctx.fillStyle = '#c94040';
      ctx.fillRect(x - 6, y + 3 + Math.round(h * 0.35), 12, 6);
    }
    ctx.fillStyle = '#5b311f';
    ctx.fillRect(x - 40, 22, 80, 3);
    if (!crow) return;
    // Crow's nest with the lookout and the bell.
    const wave = this.ob(w, RogueWave);
    const ringing = wave && wave.count > 0;
    const look = this.sprites.crew[3];
    const peek = ringing ? Math.round(Math.abs(Math.sin(time * 8))) : 0;
    ctx.drawImage(look.upper, x - 6, CROW_Y - look.upper.height + 6 - peek);
    ctx.fillStyle = '#41210f';
    ctx.fillRect(x - 14, CROW_Y, 28, 10);
    ctx.fillStyle = '#8f5a36';
    ctx.fillRect(x - 14, CROW_Y, 28, 2);
    ctx.fillRect(x - 14, CROW_Y + 6, 28, 1);
    const swing = ringing ? Math.round(Math.sin(time * 18) * 2) : 0;
    ctx.fillStyle = '#e8b93b';
    ctx.fillRect(x + 16 + swing, CROW_Y - 2, 6, 6);
    ctx.fillRect(x + 15 + swing, CROW_Y + 3, 8, 2);
    ctx.fillStyle = '#41210f';
    ctx.fillRect(x + 18, CROW_Y - 5, 2, 3);
    if (ringing) {
      text(ctx, String(wave.count), x, CROW_Y - 28, 16, Math.sin(time * 20) > 0 ? RED : INK);
      bubble(ctx, 'WAVE!', x - 34, CROW_Y - 8, RED);
    }
  }

  private drawCrew(
    ctx: CanvasRenderingContext2D,
    w: World,
    cam: number,
    time: number,
    gasping: boolean,
  ): void {
    const [g0, g1] = this.gap(w);
    const feet = depthY(1.5);
    for (const c of this.crew) {
      if (c.x > g0 - 10 && c.x < g1 + 10) continue;
      if (c.x > SHIP.TABLE.x - 70) continue;
      const x = Math.round(c.x - cam);
      if (x < -20 || x > view.w + 20) continue;
      const bob = Math.sin(time * c.speed + c.phase) > 0.3 ? 1 : 0;
      const jump = gasping ? (Math.sin(time * 18 + c.phase) > 0 ? 2 : 0) : 0;
      ctx.drawImage(c.p.lower, x - 6, feet - c.p.lower.height - jump);
      ctx.drawImage(c.p.upper, x - 6, feet - c.p.lower.height - c.p.upper.height + 1 - bob - jump);
    }
  }

  /** Screen x of visible crew (for the ARRR! bubbles). */
  visibleGuests(cam: number, out: number[]): number {
    let n = 0;
    for (let i = 0; i < this.crew.length && n < out.length; i++) {
      const x = this.crew[i].x - cam;
      if (x > 20 && x < view.w - 20) out[n++] = x;
    }
    return n;
  }

  // ---------------------------------------------------------------- set pieces
  drawPieces(ctx: CanvasRenderingContext2D, cam: number, time: number): void {
    this.drawGalley(ctx, cam, time);
    this.drawCaptainsTable(ctx, cam, time);
  }

  private drawGalley(ctx: CanvasRenderingContext2D, cam: number, time: number): void {
    const x = Math.round(24 - cam);
    if (x < -80) return;
    const base = depthY(1.5);
    ctx.fillStyle = '#5b311f';
    ctx.fillRect(x - 10, base - 76, 70, 76);
    for (let y = base - 72; y < base; y += 6) {
      ctx.fillStyle = '#41210f';
      ctx.fillRect(x - 10, y, 70, 1);
    }
    // Door with a porthole.
    ctx.fillStyle = '#7a4a2a';
    ctx.fillRect(x + 10, base - 56, 30, 56);
    ctx.fillStyle = '#41210f';
    ctx.fillRect(x + 24, base - 56, 2, 56);
    ctx.fillStyle = '#e8b93b';
    ctx.fillRect(x + 21, base - 44, 8, 8);
    ctx.fillStyle = '#6fb3d6';
    ctx.fillRect(x + 22, base - 43, 6, 6);
    ctx.fillStyle = '#e6f6ff';
    ctx.fillRect(x + 23, base - 42, 2, 2);
    // Swinging lantern.
    const sw = Math.round(Math.sin(time * 1.6) * 2);
    ctx.drawImage(this.sprites.lantern, x + 46 + sw, base - 48);
    ctx.fillStyle = '#2a1520';
    ctx.fillRect(x - 6, base - 88, 62, 12);
    text(ctx, 'GALLEY', x + 25, base - 82, 8, GOLD, 'center', false);
  }

  private drawCaptainsTable(ctx: CanvasRenderingContext2D, cam: number, time: number): void {
    const x = Math.round(SHIP.TABLE.x - cam);
    if (x < -110 || x > view.w + 110) return;
    const back = depthY(1.0);
    // Lantern posts with a string of bunting and the (romantic) Jolly Roger.
    for (const dx of [-60, 60]) {
      ctx.fillStyle = '#41210f';
      ctx.fillRect(x + dx - 1, back - 104, 3, 104);
      ctx.drawImage(this.sprites.lantern, x + dx - 1, back - 112);
    }
    const flags = ['#d6334e', '#fffaf2', '#1f2a44', '#ffd36b'];
    for (let i = 0; i <= 18; i++) {
      const f = i / 18;
      const fx = x - 59 + f * 118;
      const fy = back - 100 + Math.sin(f * Math.PI) * 16;
      ctx.fillStyle = '#2a1520';
      ctx.fillRect(Math.round(fx), Math.round(fy), 5, 1);
      if (i % 2 === 0 && i > 0 && i < 18) {
        ctx.fillStyle = flags[(i / 2) % 4];
        ctx.fillRect(Math.round(fx), Math.round(fy) + 1, 4, 3);
        ctx.fillRect(Math.round(fx) + 1, Math.round(fy) + 4, 2, 2);
      }
    }
    const wave = Math.round(Math.sin(time * 3) * 1);
    ctx.fillStyle = '#141018';
    ctx.fillRect(x - 13, back - 150 + wave, 27, 22);
    ctx.fillRect(x - 13, back - 128, 27, 1);
    ctx.drawImage(this.sprites.skull, x - 4, back - 146 + wave);
    ctx.fillStyle = '#41210f';
    ctx.fillRect(x - 15, back - 154, 2, 54);
    // The happy couple behind the table.
    const feet = depthY(1.1);
    this.person(ctx, this.sprites.captain, x - 42, feet, false);
    this.person(ctx, this.sprites.bride, x + 42, feet, false);
    // Captain's parrot-free table.
    const top = FLOOR_Y - TRAY_LIFT;
    const base = depthY(0.6);
    ctx.fillStyle = '#5b311f';
    ctx.fillRect(x - 30, top + 3, 60, base - top - 3);
    ctx.fillStyle = '#41210f';
    for (let i = -28; i < 30; i += 8) ctx.fillRect(x + i, top + 6, 1, base - top - 6);
    ctx.fillStyle = '#fffaf2';
    ctx.fillRect(x - 33, top, 66, 4);
    ctx.fillStyle = '#d6334e';
    for (let i = -32; i < 32; i += 6) ctx.fillRect(x + i, top + 4, 3, 4);
    ctx.drawImage(this.sprites.lantern, x - 30, top - 6);
  }

  private person(
    ctx: CanvasRenderingContext2D,
    p: PersonSprites,
    x: number,
    feet: number,
    step: boolean,
    lean = 0,
  ): void {
    const lower = step ? p.lowerStep : p.lower;
    const lx = Math.round(x - 6);
    const ly = Math.round(feet - lower.height);
    ctx.drawImage(lower, lx, ly);
    ctx.drawImage(p.upper, Math.round(x - 6 + lean), ly - p.upper.height + 1);
  }

  // ---------------------------------------------------------------- obstacles
  drawObstacles(
    ctx: CanvasRenderingContext2D,
    w: World,
    cam: number,
    time: number,
    behind: boolean,
  ): void {
    for (const o of w.obstacles) {
      if (o instanceof Cannonballs) {
        const spr = this.sprites.cannonball;
        for (let i = 0; i < o.xs.length; i++) {
          const d = o.depthOf(i, w.time);
          if (behind === d < 0) continue;
          const x = Math.round(o.xs[i] - cam);
          if (x < -10 || x > view.w + 10) continue;
          const y = Math.round(depthY(d));
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = '#1a0f1f';
          ctx.fillRect(x - 4, y - 1, 8, 2);
          ctx.globalAlpha = 1;
          ctx.save();
          ctx.translate(x, y - 4);
          ctx.rotate(Math.round(o.depthOf(i, w.time) * 3) * (Math.PI / 2));
          ctx.drawImage(spr, -4, -4);
          ctx.restore();
        }
      } else if (o instanceof Barrel) {
        const px = Math.round(o.x - cam);
        if (px < -120 || px > view.w + 120) continue;
        const pivotY = FLOOR_Y - TRAY_LIFT - T.BARREL_LOW - T.BARREL_ROPE;
        if (behind) {
          // A cargo crane behind the lane holds the rope.
          const post = px - 54;
          const base = depthY(1.3);
          ctx.fillStyle = '#5b311f';
          ctx.fillRect(post - 2, pivotY - 6, 5, base - pivotY + 6);
          ctx.fillRect(post - 2, pivotY - 6, px - post + 8, 4);
          ctx.fillStyle = '#8f5a36';
          ctx.fillRect(post - 2, pivotY - 6, 1, base - pivotY + 6);
          pixelLine(ctx, post + 2, pivotY + 22, post + 24, pivotY - 3, '#41210f', 2);
          continue;
        }
        const bx = Math.round(o.bx - cam);
        const by = Math.round(FLOOR_Y - TRAY_LIFT - o.bh);
        pixelLine(ctx, px, pivotY - 2, bx, by - 6, '#e8d3b0');
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(o.angle);
        ctx.drawImage(this.sprites.barrel, -6, -7);
        ctx.restore();
      } else if (o instanceof Parrot) {
        if (behind) continue;
        const tx = w.waiter.x + w.waiter.tray - cam;
        const cakeTop = FLOOR_Y - TRAY_LIFT + w.sink - w.waiter.y - w.cake.count * T.TIER_H;
        const spr = this.sprites.parrotFly;
        if (o.state === 'circle') {
          const a = time * 5;
          const f = 1 - o.stateTime / T.PARROT_CIRCLE;
          const x = tx + Math.cos(a) * 30 * f;
          const y = cakeTop - 14 - Math.abs(Math.sin(a)) * 30 * f;
          ctx.drawImage(spr, Math.round(x - 5), Math.round(y - 10));
        } else if (o.state === 'leaving') {
          const t = o.stateTime;
          ctx.drawImage(spr, Math.round(tx + t * 110 - 5), Math.round(cakeTop - 10 - t * 80));
        }
      } else if (o instanceof Kraken) {
        if (!behind || o.state === 'hidden' || o.state === 'gone') continue;
        this.drawTentacle(ctx, o, o.x - cam, time);
      } else if (o instanceof RogueWave) {
        // The lookout's warning, wherever the crow's nest is.
        if (!behind && o.count > 0 && Math.sin(time * 12) > -0.4)
          text(ctx, `WAVE IN ${o.count}!`, view.w / 2, 48, 16, '#6fd3ff');
      }
    }
  }

  private drawTentacle(ctx: CanvasRenderingContext2D, o: Kraken, x: number, time: number): void {
    x = Math.round(x);
    if (x < -60 || x > view.w + 60) return;
    const base = FLOOR_Y + 1;
    // Broken planks around the hole.
    ctx.fillStyle = '#1a0f1f';
    ctx.fillRect(x - 12, base - 2, 24, 4);
    ctx.fillStyle = '#7a4a26';
    ctx.fillRect(x - 16, base - 5, 5, 3);
    ctx.fillRect(x + 11, base - 6, 6, 3);
    ctx.fillRect(x - 6, base - 4, 3, 2);
    const h = o.height;
    if (h <= 0) return;
    const segs = 18;
    const len = 78 * h;
    let lean = Math.sin(time * 2.6) * 0.35;
    if (o.state === 'windup') lean = 0.5 + Math.min(1, o.stateTime / T.KRAKEN_WINDUP) * 0.5;
    if (o.state === 'sink') lean = -1.4;
    let px = x;
    let py = base;
    for (let i = 0; i < segs; i++) {
      const f = i / segs;
      const ang = lean * f * f * 1.6 + Math.sin(time * 4 + f * 5) * 0.15 * f;
      const step = len / segs;
      px += Math.sin(ang) * step;
      py -= Math.cos(ang) * step;
      const r = Math.max(2, Math.round(8 * (1 - f * 0.8)));
      ctx.fillStyle = '#7a2f8a';
      ctx.fillRect(Math.round(px - r), Math.round(py - r), r * 2, r * 2);
      ctx.fillStyle = '#a24ab0';
      ctx.fillRect(Math.round(px - r), Math.round(py - r), Math.max(1, r - 2), r * 2);
      if (i % 2 === 0 && r > 2) {
        ctx.fillStyle = '#ffb3e6';
        ctx.fillRect(Math.round(px - r - 1), Math.round(py), 2, 2);
      }
    }
    // Curled tip.
    ctx.fillStyle = '#7a2f8a';
    ctx.fillRect(Math.round(px - 3), Math.round(py - 4), 3, 2);
    ctx.fillRect(Math.round(px - 4), Math.round(py - 2), 2, 2);
  }

  /** Telegraph bubble height for a pirate obstacle, or null to use the default. */
  alertY(o: Obstacle, w: World): number | null {
    if (o instanceof Swell || o instanceof RogueWave) return -1;
    if (o instanceof Cannonballs) return FLOOR_Y - 24;
    if (o instanceof Barrel) return FLOOR_Y - TRAY_LIFT - T.BARREL_LOW - T.BARREL_ROPE - 14;
    if (o instanceof Plank) return FLOOR_Y - 18;
    if (o instanceof Parrot) return FLOOR_Y - TRAY_LIFT - w.cake.count * T.TIER_H - 50;
    if (o instanceof Kraken) return FLOOR_Y - 96;
    return null;
  }
}
