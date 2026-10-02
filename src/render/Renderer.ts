import type { GameEvent, World } from '../game/World';
import { LEVEL } from '../level/level';
import {
  BassDrop,
  Bouquet,
  Conga,
  Grandma,
  Parrot,
  Roomba,
  Spill,
  Toddler,
  Uncle,
} from '../level/obstacles';
import { T } from '../game/tuning';
import { tierOffset } from '../physics/cake';
import { Background, DEPTH_PX, FLOOR_Y, depthY } from './background';
import { CakeCanvas, PIVOT_X, PIVOT_Y, tierSprite } from './cakeArt';
import { Camera } from './Camera';
import { bubble, GOLD, GREEN, INK, PINK, pixelLine, RED, text } from './draw';
import { FloatTexts, Particles, Shake } from './particles';
import { view } from './Screen';
import { buildSprites, type PersonSprites, type Sprite, type SpriteBank } from './sprites';
import { drawHud, type HudOptions } from './hud';
import { drawDebug } from './debug';
import { ShipScene } from './ship';
import { buildShipSprites } from './shipSprites';
import { StationScene } from './station';
import { buildSpaceSprites } from './spaceSprites';

const TRAY_W = 62;
/** Tray top height above the floor. */
const TRAY_LIFT = 40;
const FROSTING = ['#fffaf2', '#fffaf2', '#ff8fb8', '#ffd6e6', '#e0628f'];
const CONFETTI = ['#ff6fa8', '#ffd36b', '#6fd3ff', '#6be38a', '#ffffff', '#b98cff'];

interface Debris {
  active: boolean;
  img: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
}

interface Decal {
  x: number;
  y: number;
  w: number;
  color: string;
}

export interface RenderOptions extends HudOptions {
  debug: boolean;
  fps: number;
}

/** Draws a World into the view-sized back buffer. Owns all cosmetic state (FX, camera). */
export class Renderer {
  readonly sprites: SpriteBank;
  readonly camera = new Camera();
  readonly particles = new Particles(700);
  readonly texts = new FloatTexts(24);
  readonly shake: Shake;
  private readonly bg: Background;
  private readonly ship: ShipScene;
  private readonly station: StationScene;
  private readonly cake = new CakeCanvas();
  private readonly debris: Debris[] = [];
  private readonly decals: Decal[] = [];
  private decalNext = 0;
  private time = 0;
  private topple = { active: false, theta: 0, omega: 0, slide: 0, splatted: false, count: 0 };
  private place = { active: false, t: 0, done: false, fromX: 0, fromY: 0, count: 0 };
  private clutchFlash = 0;
  private gaspBubbles = 0;
  private readonly guestXs: number[] = new Array(8).fill(0);

  constructor(reducedMotion: boolean) {
    this.sprites = buildSprites();
    this.bg = new Background(this.sprites);
    this.ship = new ShipScene(buildShipSprites());
    this.station = new StationScene(buildSpaceSprites());
    this.shake = new Shake(!reducedMotion);
    for (let i = 0; i < 10; i++)
      this.debris.push({
        active: false,
        img: this.sprites.bulb,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        rot: 0,
        vr: 0,
      });
    for (let i = 0; i < 24; i++) this.decals.push({ x: -1e4, y: 0, w: 0, color: '#fff' });
  }

  private cacheWorld: World | null = null;
  private readonly cache = new Map<unknown, unknown>();

  /** Cached obstacle lookup by class (no per-frame allocation). */
  private ob<K>(w: World, cls: abstract new (...args: never[]) => K): K | undefined {
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

  reset(w: World): void {
    this.camera.length = w.level.LENGTH;
    this.camera.reset(w.waiter.x);
    this.particles.clear();
    this.texts.clear();
    for (const d of this.debris) d.active = false;
    for (const d of this.decals) d.x = -1e4;
    this.topple.active = false;
    this.place.active = false;
    this.place.done = false;
    this.clutchFlash = 0;
    this.gaspBubbles = 0;
    this.shake.trauma = 0;
  }

  /** World-space tray top-centre for the current waiter state. */
  private trayPos(w: World): { x: number; y: number } {
    return { x: w.waiter.x + w.waiter.tray, y: FLOOR_Y - TRAY_LIFT - w.waiter.y + w.sink };
  }

  private addDecal(x: number, y: number, wdt: number, color: string): void {
    const d = this.decals[this.decalNext];
    this.decalNext = (this.decalNext + 1) % this.decals.length;
    d.x = x;
    d.y = y;
    d.w = wdt;
    d.color = color;
  }

  private splat(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI;
      const sp = 40 + Math.random() * 120;
      this.particles.spawn(
        'blob',
        x,
        y,
        Math.cos(a) * sp,
        -Math.sin(a) * sp,
        0.8 + Math.random() * 0.6,
        FROSTING[i % FROSTING.length],
        1 + (i % 3),
        420,
        FLOOR_Y + 6,
      );
    }
    this.addDecal(x, y, 10 + n / 3, '#fffaf2');
    this.addDecal(x + 3, y + 1, 5 + n / 6, '#ff8fb8');
  }

  /** React to simulation events with particles, texts and shake. */
  handleEvent(e: GameEvent, w: World): void {
    const tp = this.trayPos(w);
    switch (e.type) {
      case 'hit':
        this.shake.add(0.25 + e.strength * 0.5);
        this.texts.spawn(e.label, e.x, FLOOR_Y - 70, GOLD, 16, 0.9);
        for (let i = 0; i < 8; i++)
          this.particles.spawn(
            'spark',
            e.x,
            FLOOR_Y - 20,
            (Math.random() - 0.5) * 120,
            -Math.random() * 90,
            0.35,
            INK,
            1,
          );
        break;
      case 'tierLost': {
        const c = w.cake;
        const th = e.theta;
        const dir = Math.sign(c.tiers[e.from].s || th || 1);
        for (let j = e.from; j < e.to; j++) {
          const d = this.debris.find((b) => !b.active);
          if (!d) break;
          const lx = tierOffset(c, j);
          const u = (j + 0.5) * T.TIER_H;
          d.active = true;
          d.img = tierSprite(c.tiers[j].w, T.TIER_H, j);
          d.x = tp.x + lx * Math.cos(th) + u * Math.sin(th);
          d.y = tp.y + lx * Math.sin(th) - u * Math.cos(th);
          const k = j - e.from;
          d.vx = dir * (55 + k * 22) + w.waiter.v * 0.6;
          d.vy = -70 - k * 18;
          d.rot = th;
          d.vr = dir * (3 + k);
        }
        this.shake.add(0.3);
        this.texts.spawn(
          e.to - e.from > 1 ? `-${e.to - e.from} TIERS!` : 'NOOO!',
          tp.x,
          tp.y - 90,
          RED,
          16,
          1.1,
        );
        break;
      }
      case 'topple':
        this.topple = {
          active: true,
          theta: e.theta,
          omega: w.cake.omega,
          slide: 0,
          splatted: false,
          count: w.cake.count,
        };
        this.shake.add(0.4);
        break;
      case 'clutch':
        this.clutchFlash = 1;
        this.texts.spawn('CLUTCH!', view.w / 2, 70, GOLD, 24, 1.3, true);
        this.texts.spawn(`+${T.CLUTCH_POINTS}`, view.w / 2, 92, INK, 8, 1.3, true);
        break;
      case 'gasp':
        this.gaspBubbles = 1.4;
        break;
      case 'dust':
        for (let i = 0; i < 6; i++)
          this.particles.spawn(
            'dust',
            e.x + (i - 3) * 2,
            FLOOR_Y - 1,
            (i - 3) * 12,
            -6 - Math.random() * 8,
            0.5,
            '#e8d3b0',
            2,
          );
        break;
      case 'slip':
        for (let i = 0; i < 5; i++)
          this.particles.spawn(
            'spark',
            w.waiter.x,
            FLOOR_Y - 2,
            (Math.random() - 0.5) * 80,
            -30 - Math.random() * 40,
            0.4,
            '#fff3b0',
            1,
            200,
          );
        break;
      case 'hop':
        this.shake.add(0.15);
        break;
      case 'bassDrop':
        this.shake.add(0.9);
        this.texts.spawn('BASS DROP!', view.w / 2, 64, '#b98cff', 24, 1.2, true);
        break;
      case 'bouquetLand':
        for (let i = 0; i < 14; i++)
          this.particles.spawn(
            'petal',
            tp.x,
            tp.y - w.cake.count * T.TIER_H - 6,
            (Math.random() - 0.5) * 90,
            -40 - Math.random() * 50,
            1.6,
            i % 2 ? '#ff8fb8' : '#ffffff',
            1,
            60,
            FLOOR_Y + 4,
          );
        break;
      case 'wave':
        this.shake.add(0.9);
        this.texts.spawn('ROGUE WAVE!', view.w / 2, 64, '#6fd3ff', 24, 1.2, true);
        for (let i = 0; i < 80; i++)
          this.particles.spawn(
            'blob',
            this.camera.x + Math.random() * view.w,
            120 + Math.random() * 30,
            (Math.random() - 0.5) * 80,
            -60 - Math.random() * 120,
            1.2 + Math.random() * 0.6,
            i % 3 ? '#9fe0f0' : '#e6f8ff',
            1 + (i % 2),
            380,
            FLOOR_Y + 30,
          );
        break;
      case 'slam':
      case 'tentacle':
        this.shake.add(e.type === 'slam' ? 0.6 : 0.3);
        for (let i = 0; i < 10; i++)
          this.particles.spawn(
            'spark',
            (e.type === 'slam' ? e.x : w.waiter.x + 120) + (Math.random() - 0.5) * 30,
            FLOOR_Y - 2,
            (Math.random() - 0.5) * 140,
            -40 - Math.random() * 90,
            0.6,
            '#8f5a36',
            2,
            300,
            FLOOR_Y + 4,
          );
        break;
      case 'boing':
        this.shake.add(0.1 * e.strength);
        break;
      case 'flap':
      case 'squawk':
        for (let i = 0; i < 4; i++)
          this.particles.spawn(
            'petal',
            tp.x + (Math.random() - 0.5) * 20,
            tp.y - w.cake.count * T.TIER_H - 8,
            (Math.random() - 0.5) * 60,
            -20 - Math.random() * 30,
            1,
            ['#e8283c', '#3fbf4a', '#2e7fd6'][i % 3],
            1,
            60,
            FLOOR_Y + 4,
          );
        break;
      case 'zap':
        this.shake.add(0.4);
        for (let i = 0; i < 14; i++)
          this.particles.spawn(
            'spark',
            e.x,
            FLOOR_Y - 20 - Math.random() * 50,
            (Math.random() - 0.5) * 160,
            -Math.random() * 120,
            0.4,
            i % 2 ? '#ff4f5e' : '#fff3b0',
            1,
            200,
          );
        break;
      case 'gravity':
        this.texts.spawn(
          e.mult < 1 ? 'LOW GRAVITY!' : e.mult > 1 ? 'HEAVY GRAVITY!' : 'NORMAL GRAVITY',
          w.waiter.x,
          FLOOR_Y - 110,
          e.mult < 1 ? '#6fd3ff' : e.mult > 1 ? RED : INK,
          8,
          1.1,
        );
        if (e.mult > 1) this.shake.add(0.2);
        break;
      case 'teleport':
        for (const x of [e.from, e.to])
          for (let i = 0; i < 24; i++)
            this.particles.spawn(
              'spark',
              x + (Math.random() - 0.5) * 20,
              FLOOR_Y - Math.random() * 90,
              (Math.random() - 0.5) * 40,
              -20 - Math.random() * 60,
              0.7,
              i % 2 ? '#6fd3ff' : '#e6f8ff',
              1,
              -40,
            );
        this.shake.add(0.2);
        break;
      case 'ufo':
        this.texts.spawn('UFO!', w.waiter.x + 60, 60, '#9ff0c0', 16, 1.2);
        break;
      case 'meteor':
        this.shake.add(0.7);
        for (let i = 0; i < 16; i++)
          this.particles.spawn(
            'spark',
            this.camera.x + Math.random() * view.w,
            20 + Math.random() * 40,
            (Math.random() - 0.5) * 60,
            40 + Math.random() * 80,
            0.8,
            i % 2 ? '#ffb347' : '#8f96a3',
            2,
            300,
            FLOOR_Y + 4,
          );
        break;
      case 'breach':
        this.shake.add(0.8);
        this.texts.spawn('HULL BREACH!', view.w / 2, 64, RED, 24, 1.4, true);
        break;
      case 'shutters':
        this.shake.add(0.2);
        this.texts.spawn('SEALED!', view.w / 2, 64, GREEN, 16, 1, true);
        break;
      case 'placed':
        this.place = {
          active: true,
          t: 0,
          done: false,
          fromX: tp.x,
          fromY: tp.y,
          count: w.cake.count,
        };
        break;
      default:
        break;
    }
  }

  update(w: World, dt: number): void {
    this.time += dt;
    this.camera.update(w.waiter.x, w.finished ? 0 : w.waiter.v, dt);
    this.particles.update(dt);
    this.texts.update(dt);
    this.shake.update(dt);
    this.clutchFlash = Math.max(0, this.clutchFlash - dt * 2);
    this.gaspBubbles = Math.max(0, this.gaspBubbles - dt);
    if (w.gasping) this.gaspBubbles = Math.max(this.gaspBubbles, 0.3);

    for (const d of this.debris) {
      if (!d.active) continue;
      d.vy += 520 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.vr * dt;
      if (d.y > FLOOR_Y + 2) {
        d.active = false;
        this.splat(d.x, FLOOR_Y + 2, 26);
        this.shake.add(0.2);
      }
    }

    const tp = this.topple;
    if (tp.active && !tp.splatted) {
      const s = Math.sign(tp.theta) || 1;
      tp.omega += s * 9 * dt;
      tp.theta += tp.omega * dt;
      tp.slide += s * 50 * dt;
      if (Math.abs(tp.theta) > Math.PI / 2) {
        tp.splatted = true;
        const x = w.waiter.x + w.waiter.tray + tp.slide + s * 40;
        this.splat(x - 20 * s, FLOOR_Y + 2, 40);
        this.splat(x, FLOOR_Y + 3, 50);
        this.splat(x + 20 * s, FLOOR_Y + 2, 30);
        this.shake.add(1);
        this.texts.spawn('SPLAT!', x - this.camera.x, FLOOR_Y - 60, INK, 24, 1.4, true);
      }
    }

    const pl = this.place;
    if (pl.active && !pl.done) {
      pl.t += dt;
      if (pl.t >= 0.6) {
        pl.done = true;
        const tx = w.level.TABLE.x;
        for (let i = 0; i < 90; i++)
          this.particles.spawn(
            'confetti',
            tx + (Math.random() - 0.5) * 60,
            80 + Math.random() * 30,
            (Math.random() - 0.5) * 160,
            -60 - Math.random() * 90,
            2.5 + Math.random(),
            CONFETTI[i % CONFETTI.length],
            2,
            90,
            FLOOR_Y + 8,
          );
        for (let i = 0; i < 16; i++)
          this.particles.spawn(
            'petal',
            tx + (Math.random() - 0.5) * 80,
            60,
            (Math.random() - 0.5) * 60,
            10,
            3,
            i % 2 ? '#ff8fb8' : '#ffd6e6',
            2,
            20,
            FLOOR_Y + 8,
          );
        this.shake.add(0.2);
      }
    }
    // Sweat drips when things get hairy.
    if (!w.finished && Math.abs(w.cake.theta) > 0.3 && Math.random() < dt * 4) {
      this.particles.spawn(
        'sweat',
        w.waiter.x + 5,
        FLOOR_Y - 32 - w.waiter.y,
        20 + Math.random() * 20,
        -20,
        0.6,
        '#8fd8ff',
        1,
        300,
      );
    }
  }

  draw(ctx: CanvasRenderingContext2D, w: World, opts: RenderOptions): void {
    const cam = Math.round(this.camera.x);
    ctx.save();
    ctx.fillStyle = '#1a0f1f';
    ctx.fillRect(0, 0, view.w, view.h);
    // Everything below is drawn in scene coordinates, placed inside the (possibly taller) view.
    ctx.translate(this.shake.ox, this.shake.oy + view.sceneY);
    const pirate = w.worldId === 'pirate';
    const space = w.worldId === 'space';
    if (pirate) this.ship.drawBack(ctx, w, cam, this.time, this.gaspBubbles > 0);
    else if (space) this.station.drawBack(ctx, w, cam, this.time, this.gaspBubbles > 0);
    else {
      this.bg.drawFar(ctx, cam, this.time);
      this.bg.drawFloor(ctx, cam, this.time);
      this.bg.drawMid(ctx, cam, this.time, this.gaspBubbles > 0);
    }

    // Floor decals: spill, frosting splats.
    this.drawSpill(ctx, w, cam);
    for (const d of this.decals) {
      const x = Math.round(d.x - cam);
      if (x < -30 || x > view.w + 30) continue;
      ctx.fillStyle = d.color;
      ctx.fillRect(x - Math.round(d.w / 2), Math.round(d.y), Math.round(d.w), 2);
      ctx.fillRect(x - Math.round(d.w / 3), Math.round(d.y) - 1, Math.round((d.w * 2) / 3), 1);
    }

    // Set pieces and obstacles behind the lane, then the waiter, then anything in front.
    if (pirate) this.ship.drawPieces(ctx, cam, this.time);
    else if (space) this.station.drawPieces(ctx, w, cam, this.time);
    else {
      this.drawKitchen(ctx, cam);
      this.drawDJ(ctx, w, cam);
      this.drawTableSet(ctx, cam);
    }
    this.drawTable(ctx, w, cam);
    this.drawObstacles(ctx, w, cam, true);
    if (pirate) this.ship.drawObstacles(ctx, w, cam, this.time, true);
    if (space) this.station.drawObstacles(ctx, w, cam, this.time, true);
    this.drawWaiter(ctx, w, cam);
    this.drawObstacles(ctx, w, cam, false);
    if (pirate) this.ship.drawObstacles(ctx, w, cam, this.time, false);
    if (space) this.station.drawObstacles(ctx, w, cam, this.time, false);
    this.drawBouquetFlight(ctx, w, cam);

    for (const d of this.debris) {
      if (!d.active) continue;
      ctx.save();
      ctx.translate(Math.round(d.x - cam), Math.round(d.y));
      ctx.rotate(d.rot);
      ctx.drawImage(d.img, -d.img.width / 2, -d.img.height / 2);
      ctx.restore();
    }
    this.particles.draw(ctx, cam);
    this.drawAlerts(ctx, w, cam);
    if (!w.finished && !opts.attract) this.drawLeanMeter(ctx, w, cam);
    ctx.restore();

    ctx.save();
    ctx.translate(0, view.sceneY);
    this.texts.draw(ctx, cam, (s) => `${s}px "Press Start 2P", monospace`);
    if (this.gaspBubbles > 0 && !w.finished) {
      const n = pirate
        ? this.ship.visibleGuests(cam, this.guestXs)
        : space
          ? this.station.visibleGuests(cam, this.guestXs)
          : this.bg.visibleGuests(cam, this.guestXs);
      const [a, b] = pirate
        ? ['ARRR!', 'AVAST!']
        : space
          ? ['ZORP!', 'BLEEP!']
          : ['OOOH!', 'OH NO!'];
      for (let i = 0; i < n; i += 2)
        bubble(ctx, i % 4 ? a : b, this.guestXs[i], 150 + (i % 3) * 4, '#9b2d5a');
    }
    if (opts.debug) drawDebug(ctx, w, cam, opts.fps);
    ctx.restore();
    if (this.clutchFlash > 0) {
      ctx.globalAlpha = this.clutchFlash * 0.25;
      ctx.fillStyle = GOLD;
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.globalAlpha = 1;
    }
    drawHud(ctx, w, opts, this.time);
  }

  // ---------------------------------------------------------------- pieces
  private drawSpill(ctx: CanvasRenderingContext2D, w: World, cam: number): void {
    const s = this.ob(w, Spill);
    if (!s) return;
    const x0 = Math.round(s.x0 - cam);
    const x1 = Math.round(s.x1 - cam);
    if (x1 < 0 || x0 > view.w) return;
    const y = FLOOR_Y - 3;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#ffe7a0';
    ctx.fillRect(x0 + 6, y, x1 - x0 - 12, 8);
    ctx.fillRect(x0, y + 2, x1 - x0, 4);
    ctx.fillStyle = '#fff6d0';
    ctx.fillRect(x0 + 10, y + 1, x1 - x0 - 30, 2);
    ctx.globalAlpha = 1;
    // Glints.
    for (let i = 0; i < 5; i++) {
      const gx = x0 + 8 + ((i * 17 + Math.floor(this.time * 3) * 7) % (x1 - x0 - 12));
      if (Math.sin(this.time * 5 + i * 2) > 0.2) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(gx, y + 2, 1, 1);
        ctx.fillRect(gx - 1, y + 3, 3, 1);
        ctx.fillRect(gx, y + 4, 1, 1);
      }
    }
    // The tipped-over bottle at the back.
    const bx = x1 - 12;
    const by = depthY(0.8);
    ctx.fillStyle = '#2f6b3a';
    ctx.fillRect(bx, by - 4, 12, 4);
    ctx.fillRect(bx + 12, by - 3, 4, 2);
    ctx.fillStyle = '#e8c070';
    ctx.fillRect(bx + 14, by - 3, 2, 2);
    ctx.fillStyle = '#fff6d0';
    ctx.fillRect(bx + 3, by - 3, 5, 1);
  }

  private drawKitchen(ctx: CanvasRenderingContext2D, cam: number): void {
    const x = Math.round(24 - cam);
    if (x < -80) return;
    const base = depthY(1.5);
    ctx.fillStyle = '#5b3a2a';
    ctx.fillRect(x - 6, base - 66, 60, 66);
    for (const dx of [0, 25]) {
      const swing = Math.sin(this.time * 1.3 + dx) * 1;
      ctx.fillStyle = '#c9c3bd';
      ctx.fillRect(x + dx + swing, base - 60, 23, 60);
      ctx.fillStyle = '#9aa3ad';
      ctx.fillRect(x + dx + swing, base - 60, 23, 2);
      ctx.fillRect(x + dx + swing + 21, base - 60, 2, 60);
      ctx.fillStyle = '#6fb3d6';
      ctx.fillRect(x + dx + 7 + swing, base - 48, 9, 9);
      ctx.fillStyle = '#e6f6ff';
      ctx.fillRect(x + dx + 8 + swing, base - 47, 3, 2);
    }
    ctx.fillStyle = '#2a1520';
    ctx.fillRect(x - 2, base - 78, 52, 12);
    text(ctx, 'KITCHEN', x + 24, base - 72, 8, GOLD, 'center', false);
  }

  private drawDJ(ctx: CanvasRenderingContext2D, w: World, cam: number): void {
    const x = Math.round(LEVEL.DJ_X - cam);
    if (x < -90 || x > view.w + 90) return;
    const base = depthY(1.6);
    const bd = this.ob(w, BassDrop);
    const pulse = bd && bd.dropped && bd.sinceDrop < 1.5 ? Math.sin(this.time * 30) : 0;
    // DJ behind the booth.
    const dj = this.sprites.guests[5];
    const bob = Math.sin(this.time * 8) > 0 ? 1 : 0;
    ctx.drawImage(dj.upper, x - 6, base - 22 - dj.upper.height + 8 - bob);
    ctx.fillStyle = '#1f1d2b';
    ctx.fillRect(x - 7, base - 22 - dj.upper.height + 9 - bob, 14, 2);
    ctx.fillRect(x - 8, base - 22 - dj.upper.height + 10 - bob, 2, 4);
    ctx.fillRect(x + 6, base - 22 - dj.upper.height + 10 - bob, 2, 4);
    // Booth.
    ctx.fillStyle = '#2b2340';
    ctx.fillRect(x - 32, base - 24, 64, 24);
    ctx.fillStyle = '#b98cff';
    ctx.fillRect(x - 32, base - 24, 64, 2);
    for (let i = 0; i < 8; i++) {
      const on = Math.sin(this.time * 6 + i) > 0 || pulse > 0;
      ctx.fillStyle = on ? ['#ff6fa8', '#6fd3ff', '#ffd36b', '#6be38a'][i % 4] : '#3a2d5c';
      ctx.fillRect(x - 28 + i * 7, base - 16, 5, 3);
    }
    // Speakers.
    for (const sx of [-46, 34]) {
      const k = pulse > 0 ? 1 : 0;
      ctx.fillStyle = '#1b1a26';
      ctx.fillRect(x + sx - k, base - 34 - k, 12 + 2 * k, 34 + k);
      ctx.fillStyle = '#4a4660';
      ctx.fillRect(x + sx + 3, base - 28, 6, 6);
      ctx.fillRect(x + sx + 2, base - 16, 8, 8);
    }
    // Sign with the countdown.
    const sy = base - 70;
    ctx.fillStyle = '#1a0f1f';
    ctx.fillRect(x - 22, sy - 10, 44, 20);
    ctx.fillStyle = bd && bd.count > 0 ? RED : '#b98cff';
    ctx.fillRect(x - 21, sy - 9, 42, 1);
    ctx.fillRect(x - 21, sy + 8, 42, 1);
    if (bd && bd.count > 0)
      text(
        ctx,
        String(bd.count),
        x,
        sy + 1,
        16,
        Math.sin(this.time * 20) > 0 ? RED : INK,
        'center',
        false,
      );
    else if (bd && bd.dropped && bd.sinceDrop < 2)
      text(ctx, 'DROP', x, sy + 1, 8, GOLD, 'center', false);
    else text(ctx, 'DJ', x, sy + 1, 8, '#b98cff', 'center', false);
  }

  /** The wedding's floral arch and cake table. */
  private drawTableSet(ctx: CanvasRenderingContext2D, cam: number): void {
    const x = Math.round(LEVEL.TABLE.x - cam);
    if (x < -100 || x > view.w + 100) return;
    const base = depthY(0.6);
    // Floral arch.
    const archBase = depthY(1.0);
    ctx.fillStyle = '#e8d3b0';
    ctx.fillRect(x - 40, archBase - 96, 3, 96);
    ctx.fillRect(x + 37, archBase - 96, 3, 96);
    for (let a = 0; a <= 20; a++) {
      const t = (a / 20) * Math.PI;
      const fx = x + Math.cos(t) * 38;
      const fy = archBase - 96 - Math.sin(t) * 24;
      ctx.drawImage(this.sprites.flowers[a % 4], Math.round(fx) - 1, Math.round(fy) - 1);
      if (a % 2) {
        ctx.fillStyle = '#3f9b4a';
        ctx.fillRect(Math.round(fx) + 2, Math.round(fy) + 1, 2, 1);
      }
    }
    for (let i = 0; i < 12; i++) {
      ctx.drawImage(this.sprites.flowers[i % 4], x - 41, archBase - 90 + i * 7);
      ctx.drawImage(this.sprites.flowers[(i + 2) % 4], x + 36, archBase - 90 + i * 7);
    }
    ctx.drawImage(this.sprites.heart, x - 2, archBase - 128);
    // Table.
    const top = FLOOR_Y - TRAY_LIFT;
    ctx.fillStyle = '#e9dccb';
    ctx.fillRect(x - 30, top + 3, 60, base - top - 3);
    ctx.fillStyle = '#fffaf2';
    ctx.fillRect(x - 32, top, 64, 4);
    ctx.fillStyle = '#ff8fb8';
    for (let i = -30; i < 30; i += 8) ctx.fillRect(x + i, top + 4, 4, 3);
    ctx.fillStyle = '#d8c7b2';
    for (let i = -28; i < 30; i += 7) ctx.fillRect(x + i, top + 8, 1, base - top - 8);
  }

  /** The set-down zone marker and the cake being placed (both worlds). */
  private drawTable(ctx: CanvasRenderingContext2D, w: World, cam: number): void {
    const table = w.level.TABLE;
    const x = Math.round(table.x - cam);
    if (x < -100 || x > view.w + 100) return;
    const top = FLOOR_Y - TRAY_LIFT;
    // Zone marker on the floor.
    const z0 = Math.round(table.x0 - cam);
    const z1 = Math.round(table.x1 - cam);
    const on = w.inTableZone;
    ctx.globalAlpha = on ? 0.6 : 0.25 + 0.15 * Math.sin(this.time * 4);
    ctx.fillStyle = on ? '#6be38a' : GOLD;
    ctx.fillRect(z0, FLOOR_Y + 1, z1 - z0, 2);
    ctx.fillRect(z0, FLOOR_Y - 2, 2, 5);
    ctx.fillRect(z1 - 2, FLOOR_Y - 2, 2, 5);
    ctx.globalAlpha = 1;
    // A placed cake sits here.
    if (this.place.active) {
      const p = Math.min(1, this.place.t / 0.6);
      const e = 1 - (1 - p) * (1 - p);
      const cx = this.place.fromX + (table.x - this.place.fromX) * e - cam;
      const cy = this.place.fromY + (top - this.place.fromY) * e - Math.sin(p * Math.PI) * 10;
      this.cake.render(T, w.cake, this.sprites.topper, this.topSprite(w), this.topOffset(w));
      ctx.drawImage(this.cake.canvas, Math.round(cx - PIVOT_X), Math.round(cy - PIVOT_Y));
    }
  }

  /** Whatever sits on the top tier: the bouquet, or the captain's parrot. */
  private topSprite(w: World): Sprite | null {
    const b = this.ob(w, Bouquet);
    if (b && b.state === 'landed') return this.sprites.bouquet;
    const p = this.ob(w, Parrot);
    if (p && p.onCake)
      return p.sinceFlap < 0.18 ? this.ship.sprites.parrotFly : this.ship.sprites.parrot;
    return null;
  }

  private topOffset(w: World): number {
    const b = this.ob(w, Bouquet);
    if (b) return Math.round(b.offset);
    const p = this.ob(w, Parrot);
    return p ? p.side * 4 : 0;
  }

  private person(
    ctx: CanvasRenderingContext2D,
    p: PersonSprites,
    x: number,
    feet: number,
    step: boolean,
    hip = 0,
    bob = 0,
  ): void {
    const lower = step ? p.lowerStep : p.lower;
    const lx = Math.round(x - 6 + hip * 4);
    const ly = Math.round(feet - lower.height);
    ctx.drawImage(lower, lx, ly);
    ctx.drawImage(p.upper, Math.round(x - 6 + hip * 1.5), ly - p.upper.height + 1 - bob);
  }

  private drawObstacles(
    ctx: CanvasRenderingContext2D,
    w: World,
    cam: number,
    behind: boolean,
  ): void {
    for (const o of w.obstacles) {
      if (o instanceof Uncle) {
        if (!behind) continue;
        const x = o.x - cam;
        if (x < -40 || x > view.w + 40) continue;
        const hip = o.hipPose(w.time);
        const out = Math.abs(hip) >= 1;
        const depth = out ? 0.35 : 0.9;
        const feet = depthY(depth);
        const bob = Math.sin(this.time * 10) > 0 ? 1 : 0;
        this.person(ctx, this.sprites.uncle, x, feet, bob > 0, hip, bob);
        if (out) {
          ctx.fillStyle = INK;
          for (let i = 0; i < 3; i++)
            ctx.fillRect(
              Math.round(x + hip * 12 + hip * i * 3),
              Math.round(feet - 18 + i * 4),
              4,
              1,
            );
        }
        if (Math.sin(this.time * 3) > 0.6)
          text(ctx, '♪', x + 10, feet - 42 - ((this.time * 20) % 10), 8, GOLD, 'center', false);
      } else if (o instanceof Roomba) {
        const inFront = o.depth < 0.05;
        if (behind === inFront) continue;
        const x = o.x - cam;
        if (x < -20 || x > view.w + 20) continue;
        const y = depthY(o.depth);
        const sprite =
          o.inLaneAt(w.time + 0.6) || o.depth < 0.45
            ? this.sprites.roomba
            : this.sprites.roombaGreen;
        ctx.drawImage(sprite, Math.round(x - 8), Math.round(y - 6));
      } else if (o instanceof Toddler) {
        if (o.state === 'hidden' || o.state === 'gone') continue;
        const inFront = o.depth < 0;
        if (behind === inFront) continue;
        const x = o.x - cam;
        const depth = o.state === 'peek' ? 1.3 : o.depth;
        const y = depthY(depth);
        const frame = o.state === 'run' ? Math.floor(this.time * 14) % 2 : 0;
        const spr = this.sprites.toddler[frame];
        const peekUp = o.state === 'peek' ? Math.round(Math.abs(Math.sin(this.time * 6)) * 3) : 0;
        ctx.drawImage(spr, Math.round(x - 4), Math.round(y - spr.height - peekUp));
        if (o.state === 'peek' && Math.sin(this.time * 7) > 0)
          text(ctx, 'hehe', x, y - 26, 8, INK, 'center');
      } else if (o instanceof Grandma) {
        if (!behind || o.state === 'hidden' || o.state === 'gone') continue;
        const x = o.x - cam;
        if (x < -30 || x > view.w + 30) continue;
        const feet = depthY(o.depth);
        const step = Math.floor(this.time * 3) % 2 === 0;
        this.person(ctx, this.sprites.grandma, x, feet, step);
        // Walker frame.
        ctx.fillStyle = '#9aa3ad';
        ctx.fillRect(Math.round(x + 6), Math.round(feet - 16), 1, 16);
        ctx.fillRect(Math.round(x + 13), Math.round(feet - 16), 1, 16);
        ctx.fillRect(Math.round(x + 6), Math.round(feet - 16), 8, 1);
        ctx.fillRect(Math.round(x + 6), Math.round(feet - 8), 8, 1);
        ctx.fillStyle = '#6b6f78';
        ctx.fillRect(Math.round(x + 5), Math.round(feet - 1), 3, 1);
        ctx.fillRect(Math.round(x + 12), Math.round(feet - 1), 3, 1);
        if (o.pressed > 0.4 && o.state === 'walk')
          bubble(ctx, 'Patience, dear!', x, feet - 44, '#8e5bb5');
      } else if (o instanceof Bouquet) {
        if (!behind) continue;
        const x = o.brideX - cam;
        if (x < -30 || x > view.w + 30) continue;
        const feet = depthY(1.3);
        this.person(ctx, this.sprites.bride, x, feet, false);
        // Veil.
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(Math.round(x - 5), Math.round(feet - 30), 10, 2);
        ctx.fillRect(Math.round(x + 3), Math.round(feet - 29), 3, 14);
        if (o.state === 'idle' || o.state === 'windup') {
          const lift = o.state === 'windup' ? Math.round(Math.min(1, o.stateTime / 0.5) * 8) : 0;
          ctx.drawImage(this.sprites.bouquet, Math.round(x - 10), Math.round(feet - 20 - lift));
        }
      } else if (o instanceof Conga) {
        if (!o.triggered) continue;
        for (let i = 0; i < T.CONGA_COUNT; i++) {
          const d = o.depthOf(i, w.time);
          if (d < -2 || (behind ? d < 0 : d >= 0)) continue;
          const x = o.x - cam + Math.sin(this.time * 6 + i) * 2;
          if (x < -30 || x > view.w + 30) continue;
          const g = this.sprites.guests[(i * 5 + 2) % this.sprites.guests.length];
          const kick = Math.floor(this.time * 4 + i) % 2 === 0;
          this.person(ctx, g, x, depthY(d), kick, kick ? 0.5 : -0.5);
        }
      }
    }
  }

  private drawBouquetFlight(ctx: CanvasRenderingContext2D, w: World, cam: number): void {
    const b = this.ob(w, Bouquet);
    if (!b || b.state !== 'flight') return;
    const p = b.progress;
    const sx = b.brideX;
    const sy = depthY(1.3) - 28;
    const tp = this.trayPos(w);
    const ty = tp.y - w.cake.count * T.TIER_H - 4;
    const x = sx + (b.targetX - sx) * p;
    const y = sy + (ty - sy) * p - Math.sin(p * Math.PI) * 70;
    ctx.save();
    ctx.translate(Math.round(x - cam), Math.round(y));
    ctx.rotate(this.time * 8);
    ctx.drawImage(this.sprites.bouquet, -3, -3);
    ctx.restore();
    if (Math.random() < 0.3)
      this.particles.spawn(
        'petal',
        x,
        y,
        (Math.random() - 0.5) * 20,
        10,
        1,
        '#ff8fb8',
        1,
        30,
        FLOOR_Y + 4,
      );
  }

  private drawWaiter(ctx: CanvasRenderingContext2D, w: World, cam: number): void {
    const wt = w.waiter;
    const x = Math.round(wt.x - cam);
    const floor = FLOOR_Y + Math.round(w.sink);
    const feet = floor - Math.round(wt.y);
    const moving = wt.v > 3;
    const frame = moving ? Math.floor(wt.stride / 4) % 8 : 0;
    const bank =
      w.worldId === 'pirate'
        ? this.ship.sprites
        : w.worldId === 'space'
          ? this.station.sprites
          : this.sprites;
    const spr = moving ? bank.waiter[frame] : bank.waiterIdle;
    const bob = moving && frame % 4 === 2 ? 1 : 0;
    const top = feet - spr.height - bob;
    // Shadow.
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#1a0f1f';
    ctx.fillRect(x - 9, floor, 18, 2);
    ctx.globalAlpha = 1;
    ctx.drawImage(spr, x - 7, top);
    if (w.worldId === 'space') this.station.drawHelmet(ctx, x, top);
    // Sweat drop grows with the lean.
    const lean = Math.abs(w.cake.theta);
    if (lean > 0.08 && !w.won) {
      const s = Math.min(4, 1 + Math.floor((lean / T.TOPPLE_ANGLE) * 4));
      ctx.fillStyle = '#8fd8ff';
      ctx.fillRect(x + 4, top + 3, s, s + 1);
      ctx.fillRect(x + 4 + Math.floor(s / 2), top + 2, 1, 1);
      ctx.fillStyle = '#e6f8ff';
      ctx.fillRect(x + 4, top + 3, 1, 1);
    }

    const cakeGone = (this.topple.active && this.topple.splatted) || this.place.active;
    const tp = this.trayPos(w);
    const tx = Math.round(tp.x - cam);
    const ty = Math.round(tp.y) - bob;
    // Arms up to the tray.
    const sh = top + 11;
    pixelLine(ctx, x - 3, sh, tx - 8, ty + 2, '#fbf7f0', 2);
    pixelLine(ctx, x + 4, sh, tx + 8, ty + 2, '#fbf7f0', 2);
    ctx.fillStyle = '#f2c29b';
    ctx.fillRect(tx - 9, ty + 1, 3, 2);
    ctx.fillRect(tx + 7, ty + 1, 3, 2);
    // Tray.
    ctx.fillStyle = '#8f96a3';
    ctx.fillRect(tx - TRAY_W / 2, ty + 1, TRAY_W, 2);
    ctx.fillStyle = '#e3e7ee';
    ctx.fillRect(tx - TRAY_W / 2, ty, TRAY_W, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(tx - TRAY_W / 2 + 4, ty, 10, 1);

    if (cakeGone) return;
    let theta = w.cake.theta;
    let count = w.cake.count;
    let slideX = 0;
    if (this.topple.active) {
      theta = this.topple.theta;
      count = this.topple.count;
      slideX = this.topple.slide;
    }
    this.cake.render(T, w.cake, this.sprites.topper, this.topSprite(w), this.topOffset(w), count);
    ctx.save();
    ctx.translate(tx + Math.round(slideX), ty);
    ctx.rotate(theta);
    ctx.drawImage(this.cake.canvas, -PIVOT_X, -PIVOT_Y);
    ctx.restore();
  }

  private drawLeanMeter(ctx: CanvasRenderingContext2D, w: World, cam: number): void {
    const tp = this.trayPos(w);
    const cx = tp.x - cam;
    const cy = tp.y;
    const r = w.cake.count * T.TIER_H + 22;
    const max = T.TOPPLE_ANGLE;
    for (let a = -max; a <= max + 1e-6; a += max / 14) {
      const abs = Math.abs(a);
      const col =
        abs < T.GASP_ANGLE * 0.75 ? '#6be38a' : abs < T.CLUTCH_ANGLE ? '#ffb347' : '#ff4f5e';
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(cx + Math.sin(a) * r), Math.round(cy - Math.cos(a) * r), 2, 2);
    }
    ctx.globalAlpha = 1;
    const th = Math.max(-max, Math.min(max, w.cake.theta));
    const abs = Math.abs(th);
    const col =
      abs < T.GASP_ANGLE * 0.75 ? '#6be38a' : abs < T.CLUTCH_ANGLE ? '#ffb347' : '#ff4f5e';
    const px = Math.round(cx + Math.sin(th) * r);
    const py = Math.round(cy - Math.cos(th) * r);
    ctx.fillStyle = '#1a0f1f';
    ctx.fillRect(px - 2, py - 2, 5, 5);
    ctx.fillStyle = col;
    ctx.fillRect(px - 1, py - 1, 3, 3);
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(cx), Math.round(cy - r) - 3, 1, 2);
  }

  private drawAlerts(ctx: CanvasRenderingContext2D, w: World, cam: number): void {
    if (w.finished) return;
    for (const o of w.obstacles) {
      if (o.alert <= 0.05) continue;
      let y = FLOOR_Y - 58;
      if (o instanceof BassDrop) continue;
      const sy =
        w.worldId === 'pirate'
          ? this.ship.alertY(o, w)
          : w.worldId === 'space'
            ? this.station.alertY(o, w)
            : null;
      if (sy !== null) {
        if (sy < 0) continue;
        y = sy;
      }
      if (o instanceof Bouquet) y = depthY(1.3) - 52;
      if (o instanceof Roomba) y = FLOOR_Y - 26;
      if (o instanceof Spill) y = FLOOR_Y - 18;
      if (o instanceof Toddler) y = depthY(1.3) - 34;
      if (o instanceof Conga) y = depthY(1.4) - 50;
      const x = o.alertX - cam;
      if (x < -10 || x > view.w + 10) continue;
      const bob = Math.round(Math.sin(this.time * 10) * 2);
      bubble(ctx, '!', x, y + bob, RED, INK, 0.6 + 0.4 * o.alert);
    }
    const g = this.ob(w, Grandma);
    if (g && g.state === 'enter') bubble(ctx, '...', g.x - cam, depthY(g.depth) - 44, '#8e5bb5');
    const c = this.ob(w, Conga);
    if (c && c.triggered && c.depthOf(T.CONGA_COUNT - 1, w.time) > 0.5)
      text(ctx, 'CONGA!', c.x - cam, depthY(1.4) - 64, 8, PINK);
    void DEPTH_PX;
  }
}
