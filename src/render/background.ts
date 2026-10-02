import { createRng } from '../game/rng';
import { LEVEL } from '../level/level';
import { MAX_VIEW_W, SCENE_H, view } from './Screen';
import type { PersonSprites, SpriteBank } from './sprites';

/** Screen y of the waiter's lane floor (feet). */
export const FLOOR_Y = 238;
/** Screen pixels per depth unit (depth +1 = back row). */
export const DEPTH_PX = 20;
/** Where the back wall meets the floor. */
export const WALL_Y = 178;
/** Extra wall above the scene and floor below it, shown on tall (portrait) views. */
export const WALL_EXT = 280;
export const FLOOR_EXT = 420;

export const FAR = 0.35;
export const LIGHTS = 0.5;
export const MID = 0.7;

export const depthY = (depth: number) => FLOOR_Y - depth * DEPTH_PX;

const DANCE_X0 = 1660;
const DANCE_X1 = 2560;

interface MidGuest {
  x: number;
  p: PersonSprites;
  phase: number;
  seated: boolean;
  speed: number;
}

/** Two parallax layers (far wall + mid tables/guests) plus the floor. */
export class Background {
  private readonly far: HTMLCanvasElement;
  private readonly floor: HTMLCanvasElement;
  private readonly dance: HTMLCanvasElement;
  private readonly tables: number[] = [];
  private readonly guests: MidGuest[] = [];

  constructor(private readonly sprites: SpriteBank) {
    this.far = this.buildFar();
    this.floor = this.buildFloor(false);
    this.dance = this.buildFloor(true);
    // Fixed layout (independent of the round seed) so the hall always looks the same.
    const rng = createRng('banquet-hall');
    const midLen = LEVEL.LENGTH * MID + MAX_VIEW_W;
    for (let x = 40; x < midLen; x += 118 + rng.int(-10, 10)) this.tables.push(x);
    for (const tx of this.tables) {
      const n = rng.int(1, 3);
      for (let i = 0; i < n; i++)
        this.guests.push({
          x: tx - 16 + i * 16 + rng.int(-2, 2),
          p: sprites.guests[rng.int(0, sprites.guests.length - 1)],
          phase: rng.range(0, 6.28),
          seated: true,
          speed: rng.range(1.5, 3),
        });
      if (rng.next() < 0.7)
        this.guests.push({
          x: tx + 58 + rng.int(-4, 4),
          p: sprites.guests[rng.int(0, sprites.guests.length - 1)],
          phase: rng.range(0, 6.28),
          seated: false,
          speed: rng.range(2, 4),
        });
    }
  }

  private buildFar(): HTMLCanvasElement {
    const w = Math.ceil(LEVEL.LENGTH * FAR + MAX_VIEW_W + 4);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = WALL_EXT + WALL_Y;
    const ctx = c.getContext('2d')!;
    // Upper wall above the scene, fading into the dark ceiling.
    const up = ctx.createLinearGradient(0, 0, 0, WALL_EXT);
    up.addColorStop(0, '#1a0f1f');
    up.addColorStop(0.5, '#2a0f1e');
    up.addColorStop(1, '#3a1428');
    ctx.fillStyle = up;
    ctx.fillRect(0, 0, w, WALL_EXT);
    // Damask dots continue up to a ceiling cornice.
    const cornice = WALL_EXT - 160;
    ctx.fillStyle = 'rgba(255, 200, 150, 0.06)';
    for (let y = WALL_EXT - 4; y > cornice + 4; y -= 12)
      for (let x = 6; x < w; x += 12) ctx.fillRect(x, y, 2, 2);
    ctx.fillStyle = '#6b3b25';
    ctx.fillRect(0, cornice - 3, w, 3);
    ctx.fillStyle = '#c99a4a';
    ctx.fillRect(0, cornice, w, 2);
    ctx.fillStyle = '#e8c070';
    ctx.fillRect(0, cornice + 2, w, 1);
    // The authored wall below, in scene coordinates.
    ctx.translate(0, WALL_EXT);
    const g = ctx.createLinearGradient(0, 0, 0, WALL_Y);
    g.addColorStop(0, '#3a1428');
    g.addColorStop(0.55, '#7a2c3a');
    g.addColorStop(1, '#8f3f3a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, WALL_Y);
    // Damask dots.
    ctx.fillStyle = 'rgba(255, 200, 150, 0.07)';
    for (let y = 8; y < 130; y += 12)
      for (let x = (y / 12) % 2 ? 6 : 0; x < w; x += 12) ctx.fillRect(x, y, 2, 2);
    // Crown moulding.
    ctx.fillStyle = '#c99a4a';
    ctx.fillRect(0, 10, w, 2);
    ctx.fillStyle = '#e8c070';
    ctx.fillRect(0, 12, w, 1);
    const rng = createRng('far-wall');
    // Arched windows with a night sky, drapes either side.
    for (let x = 30; x < w; x += 96) {
      const wx = x;
      const wy = 34;
      const ww = 34;
      const wh = 86;
      ctx.fillStyle = '#e8c070';
      ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
      ctx.fillStyle = '#151a3d';
      ctx.fillRect(wx, wy + 8, ww, wh - 8);
      ctx.fillRect(wx + 4, wy + 2, ww - 8, 6);
      ctx.fillRect(wx + 8, wy, ww - 16, 2);
      ctx.fillStyle = '#e8c070';
      ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh);
      ctx.fillRect(wx, wy + 40, ww, 2);
      ctx.fillStyle = '#fff7d6';
      for (let i = 0; i < 6; i++)
        ctx.fillRect(wx + rng.int(2, ww - 3), wy + rng.int(10, wh - 4), 1, 1);
      if (rng.next() < 0.25) {
        ctx.fillStyle = '#fff2b0';
        ctx.fillRect(wx + 6, wy + 14, 5, 5);
        ctx.fillStyle = '#151a3d';
        ctx.fillRect(wx + 8, wy + 13, 4, 4);
      }
      // Drapes.
      for (const dx of [-12, ww + 2]) {
        ctx.fillStyle = '#b8323f';
        ctx.fillRect(wx + dx, wy - 6, 10, wh + 10);
        ctx.fillStyle = '#8e2231';
        for (let i = 2; i < 10; i += 3) ctx.fillRect(wx + dx + i, wy - 6, 1, wh + 10);
        ctx.fillStyle = '#e8c070';
        ctx.fillRect(wx + dx, wy + 50, 10, 2);
      }
      // Swag over the window.
      ctx.fillStyle = '#d24a55';
      for (let i = -12; i < ww + 12; i++) {
        const sag = Math.round(Math.sin(((i + 12) / (ww + 24)) * Math.PI) * 6);
        ctx.fillRect(wx + i, wy - 8, 1, 4 + sag);
      }
      // Sconce between windows.
      const sx = wx + ww + 30;
      ctx.fillStyle = 'rgba(255, 210, 120, 0.18)';
      ctx.fillRect(sx - 6, 56, 13, 16);
      ctx.fillStyle = '#e8c070';
      ctx.fillRect(sx - 1, 66, 3, 6);
      ctx.fillStyle = '#fff2b0';
      ctx.fillRect(sx - 1, 62, 3, 4);
    }
    // Wainscot.
    ctx.fillStyle = '#e8d3b0';
    ctx.fillRect(0, 136, w, WALL_Y - 136);
    ctx.fillStyle = '#c9ae86';
    ctx.fillRect(0, 136, w, 2);
    for (let x = 4; x < w; x += 28) {
      ctx.fillRect(x, 142, 22, 1);
      ctx.fillRect(x, 142, 1, 30);
      ctx.fillStyle = '#f5e6c8';
      ctx.fillRect(x + 1, 143, 21, 1);
      ctx.fillStyle = '#c9ae86';
      ctx.fillRect(x + 22, 142, 1, 30);
      ctx.fillRect(x, 172, 23, 1);
    }
    ctx.fillStyle = '#6b3b25';
    ctx.fillRect(0, WALL_Y - 3, w, 3);
    return c;
  }

  private buildFloor(dance: boolean): HTMLCanvasElement {
    const w = 96;
    const h = SCENE_H - WALL_Y + FLOOR_EXT;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    if (dance) {
      let y = 0;
      let row = 0;
      while (y < h) {
        const rh = 5 + Math.floor(row * 1.4);
        for (let x = 0; x < w; x += 16) {
          const on = ((x / 16) | 0) % 2 === row % 2;
          ctx.fillStyle = on ? '#3a2d5c' : '#221a3a';
          ctx.fillRect(x, y, 16, rh);
          ctx.fillStyle = on ? '#4d3d78' : '#2c2248';
          ctx.fillRect(x, y, 16, 1);
        }
        y += rh;
        row++;
      }
      return c;
    }
    ctx.fillStyle = '#9a5a33';
    ctx.fillRect(0, 0, w, h);
    let y = 0;
    let row = 0;
    while (y < h) {
      const rh = 4 + Math.floor(row * 1.2);
      ctx.fillStyle = row % 2 ? '#a8653a' : '#935430';
      ctx.fillRect(0, y, w, rh);
      ctx.fillStyle = '#7a4326';
      ctx.fillRect(0, y + rh - 1, w, 1);
      const seam = (row * 37) % 48;
      ctx.fillRect(seam, y, 1, rh);
      ctx.fillRect(seam + 48, y, 1, rh);
      ctx.fillStyle = 'rgba(255, 220, 170, 0.12)';
      ctx.fillRect(0, y, w, 1);
      y += rh;
      row++;
    }
    return c;
  }

  drawFar(ctx: CanvasRenderingContext2D, camX: number, time: number): void {
    ctx.drawImage(this.far, -Math.round(camX * FAR), -WALL_EXT);
    // String lights (own parallax layer): catenary spans with twinkling bulbs.
    const lx = camX * LIGHTS;
    const span = 72;
    const first = Math.floor(lx / span) * span;
    const colors = ['#ffe9a8', '#ffd36b', '#ffb3c7', '#fff4d6'];
    for (let s = first; s < lx + view.w + span; s += span) {
      for (let i = 0; i <= span; i += 2) {
        const f = i / span;
        const y = 22 + Math.sin(f * Math.PI) * 16;
        const x = Math.round(s + i - lx);
        ctx.fillStyle = '#2a1520';
        ctx.fillRect(x, Math.round(y), 1, 1);
        if (i % 8 === 4) {
          const k = (s + i) / 8;
          const tw = Math.sin(time * 3 + k * 1.7) > 0.85 ? 0.5 : 1;
          ctx.globalAlpha = 0.25 * tw;
          ctx.fillStyle = colors[(k % colors.length) | 0];
          ctx.fillRect(x - 1, Math.round(y) + 1, 3, 3);
          ctx.globalAlpha = tw;
          ctx.fillRect(x, Math.round(y) + 2, 1, 2);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  drawFloor(ctx: CanvasRenderingContext2D, camX: number, time: number): void {
    const ox = -Math.round(camX) % 96;
    for (let x = ox - 96; x < view.w + 96; x += 96) {
      const wx = x + Math.round(camX);
      const tile = wx + 96 > DANCE_X0 && wx < DANCE_X1 ? this.dance : this.floor;
      ctx.drawImage(tile, x, WALL_Y);
    }
    // Pulsing dance floor lights.
    const x0 = DANCE_X0 - camX;
    const x1 = DANCE_X1 - camX;
    if (x1 > 0 && x0 < view.w) {
      const beat = (time * 2) % 1;
      ctx.globalAlpha = 0.14 * (1 - beat);
      ctx.fillStyle = ['#ff6fa8', '#6fd3ff', '#ffd36b'][Math.floor(time * 2) % 3];
      ctx.fillRect(
        Math.max(0, Math.round(x0)),
        WALL_Y,
        Math.min(view.w, Math.round(x1)) - Math.max(0, Math.round(x0)),
        SCENE_H - WALL_Y + FLOOR_EXT,
      );
      ctx.globalAlpha = 1;
    }
  }

  drawMid(ctx: CanvasRenderingContext2D, camX: number, time: number, gasping: boolean): void {
    const mx = camX * MID;
    const tableY = WALL_Y + 16;
    // Guests standing behind the tables (upper bodies) first.
    for (const g of this.guests) {
      const x = Math.round(g.x - mx);
      if (x < -20 || x > view.w + 20) continue;
      const bob = Math.sin(time * g.speed + g.phase) > 0.3 ? 1 : 0;
      const jump = gasping ? (Math.sin(time * 18 + g.phase) > 0 ? 2 : 0) : 0;
      const up = g.p.upper;
      if (g.seated) {
        ctx.drawImage(up, x - 6, tableY - up.height + 4 - bob - jump);
      } else {
        const feet = tableY + 8;
        ctx.drawImage(g.p.lower, x - 6, feet - g.p.lower.height);
        ctx.drawImage(up, x - 6, feet - g.p.lower.height - up.height + 1 - bob - jump);
      }
    }
    for (const tx of this.tables) {
      const x = Math.round(tx - mx);
      if (x < -40 || x > view.w + 40) continue;
      // Round table: cloth top + skirt + centrepiece.
      ctx.fillStyle = '#e9dccb';
      ctx.fillRect(x - 26, tableY + 2, 52, 12);
      ctx.fillStyle = '#fffaf2';
      ctx.fillRect(x - 28, tableY - 2, 56, 5);
      ctx.fillRect(x - 26, tableY - 3, 52, 1);
      ctx.fillStyle = '#d8c7b2';
      for (let i = -24; i < 26; i += 6) ctx.fillRect(x + i, tableY + 3, 1, 11);
      ctx.fillStyle = '#b8a48c';
      ctx.fillRect(x - 26, tableY + 13, 52, 1);
      ctx.fillStyle = '#9fd6e8';
      ctx.fillRect(x - 1, tableY - 8, 3, 6);
      ctx.drawImage(this.sprites.flowers[((tx / 7) % 4) | 0], x - 1, tableY - 11);
      ctx.drawImage(this.sprites.flowers[((tx / 5 + 1) % 4) | 0], x - 3, tableY - 9);
      ctx.drawImage(this.sprites.flowers[((tx / 3 + 2) % 4) | 0], x + 1, tableY - 9);
      // Candles.
      ctx.fillStyle = '#fff2b0';
      ctx.fillRect(x - 14, tableY - 5, 1, 3);
      ctx.fillRect(x + 14, tableY - 5, 1, 3);
      ctx.fillStyle = Math.sin(time * 9 + tx) > 0 ? '#ffb347' : '#ffd36b';
      ctx.fillRect(x - 14, tableY - 7, 1, 2);
      ctx.fillRect(x + 14, tableY - 7, 1, 2);
    }
  }

  /** Screen positions of visible mid-layer guests (for OOOH! bubbles). */
  visibleGuests(camX: number, out: number[]): number {
    let n = 0;
    const mx = camX * MID;
    for (let i = 0; i < this.guests.length && n < out.length; i += 2) {
      const x = this.guests[i].x - mx;
      if (x > 20 && x < view.w - 20) out[n++] = x;
    }
    return n;
  }
}
