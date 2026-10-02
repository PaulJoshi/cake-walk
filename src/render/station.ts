import { createRng } from '../game/rng';
import type { World } from '../game/World';
import { T } from '../game/tuning';
import {
  GravityGlitch,
  LaserGate,
  MeteorShower,
  Saucer,
  Teleporter,
  Walkway,
} from '../level/obstacles';
import type { Obstacle } from '../level/obstacles/types';
import { STATION } from '../level/station';
import { FAR, FLOOR_EXT, FLOOR_Y, WALL_EXT, WALL_Y, depthY } from './background';
import { GREEN, INK, RED, text } from './draw';
import { MAX_VIEW_W, SCENE_H, view } from './Screen';
import type { SpaceSprites } from './spaceSprites';
import type { PersonSprites } from './sprites';

/** Tray top height above the floor (matches the renderer). */
const TRAY_LIFT = 40;
/** The big windows in the back wall (scene y). */
const WIN_TOP = 44;
const WIN_BOT = 146;
const TILE = 128;
/** Far-layer x of the blue planet and the ringed gas giant. */
const PLANET_X = 260;
const GIANT_X = 760;
/** Where the observation deck's round window shows the planet up close. */
const DECK_WIN_Y = 70;

interface Crew {
  x: number;
  p: PersonSprites;
  phase: number;
  speed: number;
}

/**
 * The Space Station world's scenery and obstacles: deep space through the windows, a metal
 * corridor with a moving walkway, laser gate, gravity generator, teleporter pads, a visiting
 * flying saucer, a meteor shower, and the observation deck where the couple waits.
 */
export class StationScene {
  private readonly space: HTMLCanvasElement;
  private readonly wall: HTMLCanvasElement;
  private readonly floor: HTMLCanvasElement;
  private readonly crew: Crew[] = [];
  private readonly cache = new Map<unknown, unknown>();
  private cacheWorld: World | null = null;

  constructor(readonly sprites: SpaceSprites) {
    this.space = this.buildSpace();
    this.wall = this.buildWall();
    this.floor = this.buildFloor();
    const rng = createRng('space-crew');
    for (let x = 120; x < STATION.LENGTH - 160; x += 70 + rng.int(-14, 20)) {
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
  private buildSpace(): HTMLCanvasElement {
    const w = Math.ceil(STATION.LENGTH * FAR + MAX_VIEW_W + 4);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = WALL_EXT + WALL_Y;
    const ctx = c.getContext('2d')!;
    ctx.translate(0, WALL_EXT);
    ctx.fillStyle = '#07061a';
    ctx.fillRect(0, -WALL_EXT, w, WALL_EXT + WALL_Y);
    const rng = createRng('space-sky');
    // Nebula: soft clumps of colour.
    for (let i = 0; i < w / 40; i++) {
      const cx = rng.int(0, w);
      const cy = rng.int(-WALL_EXT, WALL_Y);
      const col = [
        'rgba(155, 91, 209, 0.10)',
        'rgba(255, 111, 168, 0.08)',
        'rgba(63, 127, 214, 0.10)',
      ][i % 3];
      ctx.fillStyle = col;
      for (let k = 0; k < 6; k++)
        ctx.fillRect(cx + rng.int(-30, 30), cy + rng.int(-14, 14), rng.int(20, 50), rng.int(6, 16));
    }
    // Stars, a few of them bright with a cross.
    for (let i = 0; i < w / 3; i++) {
      const x = rng.int(0, w);
      const y = rng.int(-WALL_EXT, WALL_Y);
      const b = rng.next();
      ctx.fillStyle =
        b > 0.9 ? '#fff7d6' : b > 0.6 ? 'rgba(255, 247, 214, 0.7)' : 'rgba(180, 200, 255, 0.45)';
      ctx.fillRect(x, y, 1, 1);
      if (b > 0.985) {
        ctx.fillRect(x - 2, y, 5, 1);
        ctx.fillRect(x, y - 2, 1, 5);
      }
    }
    this.drawPlanet(ctx, PLANET_X, 104, 46);
    // A ringed gas giant further along, and a little moon.
    const gx = GIANT_X;
    const gy = 80;
    const ring = (front: boolean) => {
      ctx.fillStyle = front ? '#ffd36b' : '#b08a3a';
      for (let i = 0; i < 160; i++) {
        const a = (i / 160) * Math.PI * 2;
        if (Math.sin(a) > 0 !== front) continue;
        const x = Math.round(gx + Math.cos(a) * 46);
        const y = Math.round(gy + Math.sin(a) * 7 - Math.cos(a) * 8);
        ctx.fillRect(x, y, 2, 1);
      }
    };
    ring(false);
    for (let dy = -26; dy <= 26; dy++) {
      const half = Math.round(Math.sqrt(26 * 26 - dy * dy));
      const band = Math.floor((dy + 26) / 5) % 3;
      ctx.fillStyle = ['#e8b48a', '#c98b5e', '#f2d0a0'][band];
      ctx.fillRect(gx - half, gy + dy, half * 2, 1);
      ctx.fillStyle = 'rgba(20, 10, 30, 0.45)';
      ctx.fillRect(gx + Math.round(half * 0.3), gy + dy, Math.round(half * 0.7), 1);
    }
    ring(true);
    ctx.fillStyle = '#c9ced8';
    ctx.fillRect(gx + 60, gy - 30, 6, 6);
    ctx.fillStyle = '#8f96a3';
    ctx.fillRect(gx + 63, gy - 30, 3, 6);
    return c;
  }

  /** The blue planet: oceans, continents, clouds, a dark side and a glowing rim. */
  private drawPlanet(ctx: CanvasRenderingContext2D, px: number, py: number, r: number): void {
    const rng = createRng('space-planet');
    for (let dy = -r - 2; dy <= r + 2; dy++) {
      const half = Math.round(Math.sqrt(Math.max(0, (r + 2) * (r + 2) - dy * dy)));
      ctx.fillStyle = 'rgba(111, 211, 255, 0.35)';
      ctx.fillRect(px - half, py + dy, half * 2, 1);
    }
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.round(Math.sqrt(r * r - dy * dy));
      ctx.fillStyle = '#2e7fd6';
      ctx.fillRect(px - half, py + dy, half * 2, 1);
    }
    for (let i = 0; i < 9; i++) {
      const cx = px + rng.int(-r + 8, r - 8);
      const cy = py + rng.int(-r + 8, r - 8);
      for (let k = 0; k < 7; k++) {
        const x = cx + rng.int(-8, 8);
        const y = cy + rng.int(-6, 6);
        if ((x - px) ** 2 + (y - py) ** 2 > (r - 3) ** 2) continue;
        ctx.fillStyle = k % 3 ? '#4bb38a' : '#6f8f2e';
        ctx.fillRect(x, y, rng.int(4, 9), rng.int(2, 4));
      }
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 14; i++) {
      const x = px + rng.int(-r + 4, r - 10);
      const y = py + rng.int(-r + 4, r - 4);
      if ((x - px) ** 2 + (y - py) ** 2 > (r - 4) ** 2) continue;
      ctx.fillRect(x, y, rng.int(6, 14), 1);
    }
    // Night side.
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.round(Math.sqrt(r * r - dy * dy));
      const cut = Math.round(half * 0.35);
      ctx.fillStyle = 'rgba(7, 6, 26, 0.55)';
      ctx.fillRect(px + cut, py + dy, half - cut, 1);
    }
  }

  private buildWall(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = TILE;
    c.height = WALL_EXT + WALL_Y;
    const ctx = c.getContext('2d')!;
    ctx.translate(0, WALL_EXT);
    ctx.fillStyle = '#262b45';
    ctx.fillRect(0, -WALL_EXT, TILE, WALL_EXT + WALL_Y);
    // Panels with rivets.
    for (let y = -WALL_EXT; y < WALL_Y; y += 32) {
      ctx.fillStyle = '#1a1e33';
      ctx.fillRect(0, y, TILE, 1);
      ctx.fillStyle = '#353c5e';
      ctx.fillRect(0, y + 1, TILE, 1);
      for (const x of [4, 60, 68, 124]) {
        ctx.fillStyle = '#4a5478';
        ctx.fillRect(x, y + 4, 1, 1);
        ctx.fillRect(x, y + 27, 1, 1);
      }
    }
    ctx.fillStyle = '#1a1e33';
    ctx.fillRect(0, -WALL_EXT, 1, WALL_EXT + WALL_Y);
    ctx.fillRect(64, -WALL_EXT, 1, WALL_EXT + WALL_Y);
    // Ceiling pipes and a glowing light strip.
    ctx.fillStyle = '#3a4060';
    ctx.fillRect(0, 2, TILE, 5);
    ctx.fillStyle = '#5c6480';
    ctx.fillRect(0, 2, TILE, 1);
    ctx.fillStyle = '#7a3a4a';
    ctx.fillRect(0, 10, TILE, 3);
    ctx.fillStyle = '#1a1e33';
    for (let x = 8; x < TILE; x += 32) ctx.fillRect(x, 0, 3, 14);
    ctx.fillStyle = '#9ff0ff';
    ctx.fillRect(20, 24, 88, 3);
    ctx.fillStyle = 'rgba(159, 240, 255, 0.2)';
    ctx.fillRect(16, 27, 96, 6);
    // The window: cut a hole so space shows through, then the frame.
    const x0 = 14;
    const x1 = TILE - 14;
    ctx.clearRect(x0, WIN_TOP, x1 - x0, WIN_BOT - WIN_TOP);
    ctx.fillStyle = '#8f96a3';
    ctx.fillRect(x0 - 3, WIN_TOP - 3, x1 - x0 + 6, 3);
    ctx.fillRect(x0 - 3, WIN_BOT, x1 - x0 + 6, 3);
    ctx.fillRect(x0 - 3, WIN_TOP, 3, WIN_BOT - WIN_TOP);
    ctx.fillRect(x1, WIN_TOP, 3, WIN_BOT - WIN_TOP);
    ctx.fillRect(TILE / 2 - 1, WIN_TOP, 2, WIN_BOT - WIN_TOP);
    ctx.fillStyle = '#c9ced8';
    ctx.fillRect(x0 - 3, WIN_TOP - 3, x1 - x0 + 6, 1);
    // Glass glint.
    ctx.fillStyle = 'rgba(230, 248, 255, 0.12)';
    for (let i = 0; i < 12; i++) ctx.fillRect(x0 + 6 + i, WIN_TOP + 4 + i * 2, 2, 2);
    // Console strip under the window.
    ctx.fillStyle = '#1a1e33';
    ctx.fillRect(0, WIN_BOT + 8, TILE, 18);
    ctx.fillStyle = '#353c5e';
    ctx.fillRect(0, WIN_BOT + 8, TILE, 1);
    const lights = ['#6be38a', '#ffd36b', '#ff4f5e', '#6fd3ff'];
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = lights[(i * 3) % 4];
      ctx.fillRect(10 + i * 11, WIN_BOT + 13, 3, 2);
    }
    ctx.fillStyle = '#0d1020';
    ctx.fillRect(0, WALL_Y - 4, TILE, 4);
    // Round portholes higher up (seen on tall portrait screens).
    for (const [px, py] of [
      [32, -90],
      [96, -190],
    ]) {
      const r = 14;
      for (let dy = -r - 3; dy <= r + 3; dy++) {
        const half = Math.round(Math.sqrt((r + 3) ** 2 - dy * dy));
        ctx.fillStyle = '#8f96a3';
        ctx.fillRect(px - half, py + dy, half * 2, 1);
      }
      for (let dy = -r; dy <= r; dy++) {
        const half = Math.round(Math.sqrt(r * r - dy * dy));
        ctx.clearRect(px - half, py + dy, half * 2, 1);
      }
      ctx.fillStyle = '#c9ced8';
      ctx.fillRect(px - 6, py - r - 2, 12, 1);
    }
    return c;
  }

  private buildFloor(): HTMLCanvasElement {
    const w = 96;
    const h = SCENE_H - WALL_Y + FLOOR_EXT;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    let y = 0;
    let row = 0;
    while (y < h) {
      const rh = 5 + Math.floor(row * 1.4);
      ctx.fillStyle = row % 2 ? '#4f5775' : '#565f80';
      ctx.fillRect(0, y, w, rh);
      ctx.fillStyle = '#353c5e';
      ctx.fillRect(0, y + rh - 1, w, 1);
      const seam = (row * 37) % 48;
      ctx.fillRect(seam, y, 1, rh);
      ctx.fillRect(seam + 48, y, 1, rh);
      ctx.fillStyle = '#7a84a6';
      ctx.fillRect(seam + 3, y + 1, 1, 1);
      ctx.fillRect(seam + 51, y + 1, 1, 1);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(0, y, w, 1);
      y += rh;
      row++;
    }
    return c;
  }

  // ---------------------------------------------------------------- background
  private tile(ctx: CanvasRenderingContext2D, cam: number, img: HTMLCanvasElement, y: number) {
    const tw = img.width;
    const ox = -Math.round(cam) % tw;
    for (let x = ox - tw; x < view.w + tw; x += tw) ctx.drawImage(img, x, y);
  }

  drawBack(
    ctx: CanvasRenderingContext2D,
    w: World,
    cam: number,
    time: number,
    gasping: boolean,
  ): void {
    ctx.drawImage(this.space, -Math.round(cam * FAR), -WALL_EXT);
    this.drawMeteorsFar(ctx, w, time);
    this.tile(ctx, cam, this.wall, -WALL_EXT);
    this.drawBreach(ctx, w, cam, time);
    this.drawBlinkers(ctx, cam, time);
    this.tile(ctx, cam, this.floor, WALL_Y);
    // Glowing guide line along the lane.
    ctx.fillStyle = 'rgba(111, 211, 255, 0.25)';
    const off = Math.round(-cam) % 16;
    for (let x = off - 16; x < view.w; x += 16) ctx.fillRect(x, FLOOR_Y + 6, 8, 1);
    this.drawWalkway(ctx, w, cam, time);
    this.drawGravity(ctx, w, cam, time, true);
    this.drawPads(ctx, w, cam, time);
    this.drawCrew(ctx, w, cam, time, gasping);
  }

  /** Little console lights blinking along the wall. */
  private drawBlinkers(ctx: CanvasRenderingContext2D, cam: number, time: number): void {
    const ox = -Math.round(cam) % TILE;
    for (let x = ox - TILE; x < view.w + TILE; x += TILE) {
      const k = Math.floor((x + Math.round(cam)) / TILE);
      for (let i = 0; i < 3; i++) {
        if (Math.sin(time * (2 + i) + k * 1.7 + i) < 0.3) continue;
        ctx.fillStyle = ['#6be38a', '#ff4f5e', '#ffd36b'][i];
        ctx.fillRect(x + 20 + i * 33, WIN_BOT + 18, 2, 2);
      }
    }
  }

  private drawMeteorsFar(ctx: CanvasRenderingContext2D, w: World, time: number): void {
    const m = this.ob(w, MeteorShower);
    if (!m) return;
    const until = w.timeLeft - m.strikeAt;
    // Streaks start with the alarm and stop once the shutters are down.
    if (until > 3.2 || m.sinceBreach > T.BREACH_TIME) return;
    for (let i = 0; i < 9; i++) {
      const speed = 160 + (i % 3) * 60;
      const life = (view.w + 120) / speed;
      const t = (time + i * 0.37) % life;
      const x = view.w + 40 - t * speed;
      const y = -20 + ((i * 53) % 150) + t * speed * 0.35;
      ctx.fillStyle = 'rgba(255, 179, 71, 0.5)';
      for (let k = 1; k < 8; k++) ctx.fillRect(Math.round(x + k * 3), Math.round(y - k), 2, 1);
      ctx.drawImage(this.sprites.meteor, Math.round(x - 3), Math.round(y - 3));
    }
  }

  /** The hole the last meteor punched in the wall, and the blast shutters closing over it. */
  private drawBreach(ctx: CanvasRenderingContext2D, w: World, cam: number, time: number): void {
    const m = this.ob(w, MeteorShower);
    if (!m || m.sinceBreach === Infinity) return;
    const x = Math.round(m.breachX - cam);
    if (x < -60 || x > view.w + 60) return;
    const cy = 100;
    ctx.fillStyle = '#07061a';
    for (let dy = -26; dy <= 26; dy++) {
      const half = Math.round(Math.sqrt(26 * 26 - dy * dy) * (0.8 + 0.2 * Math.sin(dy * 1.7)));
      ctx.fillRect(x - half, cy + dy, half * 2, 1);
    }
    ctx.fillStyle = '#fff7d6';
    for (let i = 0; i < 6; i++) ctx.fillRect(x - 14 + i * 5, cy - 10 + ((i * 7) % 20), 1, 1);
    // Torn metal edge.
    ctx.fillStyle = '#8f96a3';
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      const r = 26 + ((a * 5) % 4);
      ctx.fillRect(Math.round(x + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r), 3, 2);
    }
    // Shutters slide down as the air stops rushing out, then stay shut.
    const close = Math.max(0, Math.min(1, (m.sinceBreach - (T.BREACH_TIME - 0.7)) / 0.6));
    if (close > 0) {
      const h = Math.round(60 * close);
      for (let y = cy - 30; y < cy - 30 + h; y += 4) {
        ctx.fillStyle = '#5c6480';
        ctx.fillRect(x - 32, y, 64, 3);
        ctx.fillStyle = '#e8b93b';
        ctx.fillRect(x - 32 + ((y / 4) % 2) * 8, y, 6, 3);
        ctx.fillRect(x + 10 + ((y / 4) % 2) * 8, y, 6, 3);
      }
    }
    // Air rushing to the hole: streaks moving towards it.
    if (m.breaching) {
      const g = m.gust;
      ctx.fillStyle = `rgba(230, 248, 255, ${0.5 * g})`;
      for (let i = 0; i < 18; i++) {
        const d = (((time * 220 + i * 47) % 260) + 260) % 260;
        const side = i % 2 ? 1 : -1;
        const sx = x - side * (280 - d);
        const sy = cy + ((i * 29) % 120) - 40 + (d / 260) * (cy - (cy + ((i * 29) % 120) - 40));
        ctx.fillRect(Math.round(sx), Math.round(sy), 10, 1);
      }
      void time;
    }
  }

  private drawWalkway(ctx: CanvasRenderingContext2D, w: World, cam: number, time: number): void {
    const ww = this.ob(w, Walkway);
    if (!ww) return;
    const x0 = Math.round(ww.x0 - cam);
    const x1 = Math.round(ww.x1 - cam);
    if (x1 < -10 || x0 > view.w + 10) return;
    const top = depthY(0.8);
    const bot = depthY(-0.8);
    ctx.fillStyle = '#1a1e33';
    ctx.fillRect(x0, top, x1 - x0, bot - top);
    // Moving chevrons.
    ctx.fillStyle = '#353c5e';
    const off = Math.round((time * ww.speed) % 12);
    for (let x = x0 + off; x < x1 - 4; x += 12) {
      for (let y = top + 2; y < bot - 2; y += 1) {
        const k = Math.abs(y - (top + bot) / 2);
        ctx.fillRect(x - Math.round(k * 0.4), y, 2, 1);
      }
    }
    // Side rails with yellow caps at the ends.
    ctx.fillStyle = '#8f96a3';
    ctx.fillRect(x0, top - 2, x1 - x0, 2);
    ctx.fillRect(x0, bot, x1 - x0, 2);
    ctx.fillStyle = '#e8b93b';
    ctx.fillRect(x0 - 2, top - 2, 4, bot - top + 4);
    ctx.fillRect(x1 - 2, top - 2, 4, bot - top + 4);
  }

  /** Gravity zone: the floor glows (blue = light, red = heavy) and dust floats in low gravity. */
  private drawGravity(
    ctx: CanvasRenderingContext2D,
    w: World,
    cam: number,
    time: number,
    floor: boolean,
  ): void {
    const g = this.ob(w, GravityGlitch);
    if (!g) return;
    const x0 = Math.round(g.x0 - cam);
    const x1 = Math.round(g.x1 - cam);
    if (x1 < -40 || x0 > view.w + 40) return;
    const m = g.mult;
    const low = m < 0.9;
    const heavy = m > 1.1;
    if (floor) {
      if (low || heavy) {
        ctx.fillStyle = low ? 'rgba(111, 211, 255, 0.16)' : 'rgba(255, 79, 94, 0.18)';
        ctx.fillRect(x0, WALL_Y, x1 - x0, SCENE_H - WALL_Y + FLOOR_EXT);
      }
      // Hazard tape across the floor marking the zone edges: a wide band of diagonal stripes,
      // faded so it reads as paint on the floor rather than a post.
      ctx.globalAlpha = 0.55;
      for (const x of [x0 - 6, x1 - 6]) {
        ctx.fillStyle = '#141018';
        ctx.fillRect(x, WALL_Y + 4, 12, FLOOR_Y + 24 - WALL_Y);
        ctx.fillStyle = '#e8b93b';
        for (let y = WALL_Y + 4; y < FLOOR_Y + 28; y += 2) {
          const k = (((y - WALL_Y) >> 1) % 6) * 2;
          ctx.fillRect(x + k, y, 4, 2);
          if (k > 8) ctx.fillRect(x + k - 12, y, 4, 2);
        }
      }
      ctx.globalAlpha = 1;
      return;
    }
    // Overhead generator with a big readout, hanging from the ceiling.
    const cx = Math.round((x0 + x1) / 2);
    const sy = 40;
    ctx.fillStyle = '#5c6480';
    ctx.fillRect(cx - 30, -WALL_EXT, 2, sy + WALL_EXT);
    ctx.fillRect(cx + 28, -WALL_EXT, 2, sy + WALL_EXT);
    ctx.fillStyle = '#1a1e33';
    ctx.fillRect(cx - 44, sy, 88, 34);
    ctx.fillStyle = '#5c6480';
    ctx.fillRect(cx - 44, sy, 88, 2);
    ctx.fillRect(cx - 44, sy + 32, 88, 2);
    const col = low ? '#6fd3ff' : heavy ? RED : GREEN;
    const pct = `${Math.round((m * 100) / 10) * 10}%`;
    text(ctx, 'GRAVITY', cx, sy + 10, 8, INK, 'center', false);
    text(ctx, pct, cx, sy + 23, 8, col, 'center', false);
    // Emitter ring pulsing.
    const pulse = (Math.sin(time * (heavy ? 10 : 4)) + 1) / 2;
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.3 + 0.4 * pulse;
    ctx.fillRect(cx - 40, sy + 36, 80, 2);
    ctx.globalAlpha = 1;
    if (low) {
      // Floating specks drift up through the zone.
      ctx.fillStyle = 'rgba(230, 248, 255, 0.7)';
      for (let i = 0; i < 24; i++) {
        const fx = x0 + ((i * 41) % Math.max(1, x1 - x0));
        const fy = FLOOR_Y - ((time * 14 + i * 23) % 150);
        ctx.fillRect(Math.round(fx + Math.sin(time + i) * 4), Math.round(fy), 1, 1);
      }
    } else if (heavy) {
      // Pressure lines push down.
      ctx.fillStyle = 'rgba(255, 79, 94, 0.35)';
      for (let i = 0; i < 16; i++) {
        const fx = x0 + ((i * 37) % Math.max(1, x1 - x0));
        const fy = 40 + ((time * 160 + i * 31) % 180);
        ctx.fillRect(Math.round(fx), Math.round(fy), 1, 6);
      }
    }
  }

  private drawPads(ctx: CanvasRenderingContext2D, w: World, cam: number, time: number): void {
    const tp = this.ob(w, Teleporter);
    if (!tp) return;
    for (const [px, entry] of [
      [tp.x, true],
      [tp.exitX, false],
    ] as const) {
      const x = Math.round(px - cam);
      if (x < -40 || x > view.w + 40) continue;
      // A flat round pad on the floor with glowing rings.
      const cy = FLOOR_Y + 2;
      const glow = (Math.sin(time * 5 + (entry ? 0 : 2)) + 1) / 2;
      const col = entry ? '#6fd3ff' : '#b98cff';
      const ellipse = (rx: number, ry: number, fill: boolean) => {
        for (let dy = -ry; dy <= ry; dy++) {
          const half = Math.round(rx * Math.sqrt(1 - (dy / (ry + 0.5)) ** 2));
          if (fill) ctx.fillRect(x - half, cy + dy, half * 2, 1);
          else {
            ctx.fillRect(x - half, cy + dy, 2, 1);
            ctx.fillRect(x + half - 2, cy + dy, 2, 1);
          }
        }
      };
      ctx.fillStyle = '#8f96a3';
      ellipse(24, 8, true);
      ctx.fillStyle = '#353c5e';
      ellipse(22, 7, true);
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.45 + glow * 0.55;
      ellipse(17, 5, false);
      ellipse(10, 3, false);
      ctx.fillRect(x - 3, cy, 6, 1);
      // A soft column of light above the pad.
      ctx.globalAlpha = 0.08 + glow * 0.06;
      ctx.fillRect(x - 16, FLOOR_Y - 110, 32, 112);
      ctx.globalAlpha = 1;
      if (entry && !tp.used && w.waiter.x < tp.x)
        text(ctx, 'TELEPORTER', x, depthY(1.2) - 70, 8, '#6fd3ff');
    }
  }

  private drawCrew(
    ctx: CanvasRenderingContext2D,
    w: World,
    cam: number,
    time: number,
    gasping: boolean,
  ): void {
    const feet = depthY(1.5);
    const g = this.ob(w, GravityGlitch);
    for (const c of this.crew) {
      if (c.x > STATION.TABLE.x - 70) continue;
      const x = Math.round(c.x - cam);
      if (x < -20 || x > view.w + 20) continue;
      const bob = Math.sin(time * c.speed + c.phase) > 0.3 ? 1 : 0;
      const jump = gasping ? (Math.sin(time * 18 + c.phase) > 0 ? 2 : 0) : 0;
      // Crew inside the gravity zone float in low gravity and squash in heavy.
      let lift = 0;
      if (g && c.x > g.x0 && c.x < g.x1 && g.mult < 0.9)
        lift = Math.round((1 - g.mult) * (6 + Math.sin(time * 1.5 + c.phase) * 4));
      ctx.drawImage(c.p.lower, x - 6, feet - c.p.lower.height - jump - lift);
      ctx.drawImage(
        c.p.upper,
        x - 6,
        feet - c.p.lower.height - c.p.upper.height + 1 - bob - jump - lift,
      );
    }
  }

  /** Screen x of visible crew (for the gasp bubbles). */
  visibleGuests(cam: number, out: number[]): number {
    let n = 0;
    for (let i = 0; i < this.crew.length && n < out.length; i++) {
      const x = this.crew[i].x - cam;
      if (x > 20 && x < view.w - 20) out[n++] = x;
    }
    return n;
  }

  // ---------------------------------------------------------------- set pieces
  drawPieces(ctx: CanvasRenderingContext2D, w: World, cam: number, time: number): void {
    this.drawDock(ctx, cam, time);
    this.drawDeck(ctx, cam, time);
    this.drawGravity(ctx, w, cam, time, false);
  }

  private drawDock(ctx: CanvasRenderingContext2D, cam: number, time: number): void {
    const x = Math.round(24 - cam);
    if (x < -80) return;
    const base = depthY(1.5);
    // Airlock door with hazard stripes and a round porthole.
    ctx.fillStyle = '#353c5e';
    ctx.fillRect(x - 12, base - 80, 74, 80);
    ctx.fillStyle = '#5c6480';
    ctx.fillRect(x - 6, base - 70, 62, 70);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#141018' : '#e8b93b';
      ctx.fillRect(x - 6 + i * 8, base - 6, 8, 6);
    }
    ctx.fillStyle = '#1a1e33';
    ctx.fillRect(x + 24, base - 70, 2, 64);
    ctx.fillStyle = '#8f96a3';
    ctx.fillRect(x + 15, base - 52, 20, 20);
    ctx.fillStyle = '#07061a';
    ctx.fillRect(x + 18, base - 49, 14, 14);
    ctx.fillStyle = '#fff7d6';
    ctx.fillRect(x + 21, base - 46, 1, 1);
    ctx.fillRect(x + 28, base - 41, 1, 1);
    const on = Math.sin(time * 3) > 0;
    ctx.fillStyle = on ? '#6be38a' : '#2f6b3a';
    ctx.fillRect(x + 52, base - 60, 4, 4);
    ctx.fillStyle = '#1a1e33';
    ctx.fillRect(x - 8, base - 94, 66, 12);
    text(ctx, 'DOCK 7', x + 25, base - 88, 8, '#6fd3ff', 'center', false);
  }

  private drawDeck(ctx: CanvasRenderingContext2D, cam: number, time: number): void {
    const x = Math.round(STATION.TABLE.x - cam);
    if (x < -130 || x > view.w + 130) return;
    // A big round window onto the blue planet, framed in gold.
    const r = 46;
    const cy = DECK_WIN_Y;
    ctx.fillStyle = '#c9a24a';
    for (let dy = -r - 4; dy <= r + 4; dy++) {
      const half = Math.round(Math.sqrt((r + 4) * (r + 4) - dy * dy));
      ctx.fillRect(x - half, cy + dy, half * 2, 1);
    }
    ctx.fillStyle = '#07061a';
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.round(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(x - half, cy + dy, half * 2, 1);
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.clip();
    this.drawPlanet(ctx, x + 16, cy + 40, 52);
    ctx.fillStyle = '#fff7d6';
    for (let i = 0; i < 10; i++)
      ctx.fillRect(x - 40 + ((i * 37) % 80), cy - 40 + ((i * 23) % 40), 1, 1);
    ctx.restore();
    // Floating heart balloons.
    for (let i = 0; i < 4; i++) {
      const bx = x + [-70, -50, 50, 70][i];
      const by = depthY(1.2) - 100 + Math.round(Math.sin(time * 1.4 + i) * 3);
      ctx.drawImage(this.sprites.heart, bx - 2, by);
      ctx.fillStyle = 'rgba(255, 248, 236, 0.6)';
      ctx.fillRect(bx, by + 5, 1, 24);
    }
    // The happy couple: an astronaut bride and her alien groom.
    const feet = depthY(1.1);
    this.person(ctx, this.sprites.groom, x - 42, feet);
    this.person(ctx, this.sprites.bride, x + 42, feet);
    // Her veil, from the top of her head.
    const head = feet - this.sprites.bride.lower.height - this.sprites.bride.upper.height + 1;
    const bx = x + 42;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(bx - 5, head - 1, 10, 2);
    ctx.fillRect(bx + 3, head, 3, 16);
    // The table: white cloth with a glowing trim.
    const top = FLOOR_Y - TRAY_LIFT;
    const base = depthY(0.6);
    ctx.fillStyle = '#c9ced8';
    ctx.fillRect(x - 30, top + 3, 60, base - top - 3);
    ctx.fillStyle = '#8f96a3';
    for (let i = -28; i < 30; i += 8) ctx.fillRect(x + i, top + 6, 1, base - top - 6);
    ctx.fillStyle = '#fffaf2';
    ctx.fillRect(x - 33, top, 66, 4);
    const glow = (Math.sin(time * 3) + 1) / 2;
    ctx.fillStyle = glow > 0.5 ? '#6be38a' : '#6fd3ff';
    ctx.fillRect(x - 33, top + 4, 66, 1);
  }

  private person(ctx: CanvasRenderingContext2D, p: PersonSprites, x: number, feet: number): void {
    const lx = Math.round(x - 6);
    const ly = Math.round(feet - p.lower.height);
    ctx.drawImage(p.lower, lx, ly);
    ctx.drawImage(p.upper, lx, ly - p.upper.height + 1);
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
      if (o instanceof LaserGate) this.drawLaser(ctx, o, o.x - cam, time, behind);
      else if (o instanceof Saucer && !behind) this.drawSaucer(ctx, w, o, cam, time);
      else if (o instanceof Teleporter && !behind) {
        if (o.sinceUse > 0.7) continue;
        const f = 1 - o.sinceUse / 0.7;
        for (const px of [o.x, o.exitX]) {
          const x = Math.round(px - cam);
          ctx.globalAlpha = f * 0.7;
          ctx.fillStyle = '#e6f8ff';
          ctx.fillRect(x - 10, FLOOR_Y - 120, 20, 122);
          ctx.fillStyle = px === o.x ? '#6fd3ff' : '#b98cff';
          ctx.fillRect(x - 14, FLOOR_Y - 120, 3, 122);
          ctx.fillRect(x + 11, FLOOR_Y - 120, 3, 122);
          ctx.globalAlpha = 1;
        }
      } else if (o instanceof MeteorShower && !behind) {
        if (o.count > 0) {
          // Red alert: the whole corridor flashes.
          const flash = (Math.sin(time * 9) + 1) / 2;
          ctx.globalAlpha = 0.12 * flash;
          ctx.fillStyle = RED;
          ctx.fillRect(0, -WALL_EXT, view.w, WALL_EXT + SCENE_H + FLOOR_EXT);
          ctx.globalAlpha = 1;
          if (Math.sin(time * 12) > -0.4)
            text(ctx, `METEOR SHOWER IN ${o.count}!`, view.w / 2, 48, 16, '#ffb347');
        } else if (o.breaching) {
          ctx.globalAlpha = 0.1 * o.gust;
          ctx.fillStyle = RED;
          ctx.fillRect(0, -WALL_EXT, view.w, WALL_EXT + SCENE_H + FLOOR_EXT);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  private drawLaser(
    ctx: CanvasRenderingContext2D,
    o: LaserGate,
    x: number,
    time: number,
    behind: boolean,
  ): void {
    x = Math.round(x);
    if (x < -40 || x > view.w + 40) return;
    const back = depthY(1.1);
    const front = depthY(-1.1);
    const top = FLOOR_Y - 120;
    // Emitter posts: one behind the lane, one in front of it.
    const post = (y: number) => {
      const t0 = top - (FLOOR_Y - y);
      ctx.fillStyle = '#353c5e';
      ctx.fillRect(x - 4, t0, 8, y - t0);
      ctx.fillStyle = '#5c6480';
      ctx.fillRect(x - 4, t0, 2, y - t0);
      ctx.fillStyle = '#8f96a3';
      ctx.fillRect(x - 6, t0 - 4, 12, 4);
      ctx.fillStyle = o.on ? RED : o.warn && Math.sin(time * 40) > 0 ? '#ffb347' : '#5a2a3a';
      for (let k = 0; k < 6; k++) ctx.fillRect(x - 1, y - 12 - k * 18, 3, 3);
    };
    if (behind) {
      post(back);
      return;
    }
    // Beams across the lane, in front of the waiter.
    if (o.on || (o.warn && Math.sin(time * 40) > 0.3)) {
      ctx.globalAlpha = o.on ? 0.9 : 0.35;
      for (let k = 0; k < 6; k++) {
        const y0 = back - 12 - k * 18;
        const y1 = front - 12 - k * 18;
        ctx.fillStyle = '#ff4f5e';
        ctx.fillRect(x - 1, Math.min(y0, y1), 2, Math.abs(y1 - y0) + 2);
        ctx.fillStyle = '#ffd0d6';
        ctx.fillRect(x, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 2);
      }
      // A sheet of light between the posts.
      ctx.globalAlpha = o.on ? 0.18 : 0.06;
      ctx.fillStyle = '#ff4f5e';
      ctx.fillRect(x - 3, top, 6, front - top);
      ctx.globalAlpha = 1;
    }
    post(front);
  }

  private drawSaucer(
    ctx: CanvasRenderingContext2D,
    w: World,
    o: Saucer,
    cam: number,
    time: number,
  ): void {
    if (o.state === 'idle' || o.state === 'gone') return;
    const tx = w.waiter.x + w.waiter.tray - cam;
    const cakeTop = FLOOR_Y - TRAY_LIFT + w.sink - w.waiter.y - w.cake.count * T.TIER_H;
    const hover = cakeTop - 52 + Math.round(Math.sin(time * 3) * 2);
    let x = tx + o.offset;
    let y = hover;
    if (o.state === 'arrive') {
      const f = 1 - Math.min(1, o.stateTime / T.UFO_ARRIVE);
      x += f * 220;
      y -= f * 120;
    } else if (o.state === 'leave') {
      const t = o.stateTime;
      x += t * t * 260;
      y -= t * t * 200;
    }
    const spr = this.sprites.saucer;
    if (o.beaming) {
      // Tractor beam: a flickering cone down to the top of the cake.
      const flick = 0.35 + 0.15 * Math.sin(time * 30);
      ctx.globalAlpha = flick;
      ctx.fillStyle = '#9ff0c0';
      const h = cakeTop - (y + 8);
      for (let i = 0; i < h; i++) {
        const f = i / Math.max(1, h);
        const half = Math.round(8 + f * (22 + Math.abs(o.offset) * 0.3));
        const cx = x + (tx - x) * f;
        if ((i + Math.floor(time * 20)) % 4 === 0) continue;
        ctx.fillRect(Math.round(cx - half), Math.round(y + 8 + i), half * 2, 1);
      }
      ctx.globalAlpha = 1;
    }
    const sw = spr.width * 2;
    const sh = spr.height * 2;
    const left = Math.round(x - sw / 2);
    const top = Math.round(y - sh / 2);
    ctx.drawImage(spr, left, top, sw, sh);
    // Running lights chase around the rim.
    const k = Math.floor(time * 12) % 6;
    ctx.fillStyle = '#ff4f5e';
    ctx.fillRect(left + 4 + k * 6, top + 10, 2, 2);
  }

  /** The waiter's bubble helmet (drawn over the sprite). */
  drawHelmet(ctx: CanvasRenderingContext2D, x: number, top: number): void {
    const cx = x;
    const cy = top + 4;
    ctx.fillStyle = 'rgba(159, 240, 255, 0.18)';
    for (let dy = -7; dy <= 7; dy++) {
      const half = Math.round(Math.sqrt(49 - dy * dy));
      ctx.fillRect(cx - half, cy + dy, half * 2, 1);
    }
    ctx.fillStyle = 'rgba(230, 248, 255, 0.75)';
    for (let a = 0; a < 28; a++) {
      const ang = (a / 28) * Math.PI * 2;
      if (ang > 1.2 && ang < 1.95) continue;
      ctx.fillRect(
        Math.round(cx + Math.cos(ang) * 7.5),
        Math.round(cy + Math.sin(ang) * 7.5),
        1,
        1,
      );
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 4, cy - 5, 2, 1);
    ctx.fillRect(cx - 5, cy - 4, 1, 2);
  }

  /** Telegraph bubble height for a station obstacle, or null to use the default. */
  alertY(o: Obstacle, w: World): number | null {
    if (o instanceof MeteorShower || o instanceof Saucer) return -1;
    if (o instanceof Walkway) return FLOOR_Y - 18;
    if (o instanceof LaserGate) return FLOOR_Y - 132;
    if (o instanceof GravityGlitch) return FLOOR_Y - 40;
    if (o instanceof Teleporter) return FLOOR_Y - 24;
    void w;
    return null;
  }
}
