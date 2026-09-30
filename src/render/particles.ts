/**
 * Fixed-size pools (no allocation in the game loop): pixel particles and floating texts.
 * Coordinates are world x / screen y.
 */
export type ParticleKind = 'blob' | 'petal' | 'confetti' | 'dust' | 'spark' | 'sweat';

class Particle {
  alive = false;
  kind: ParticleKind = 'blob';
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  g = 0;
  drag = 0;
  life = 0;
  max = 1;
  size = 1;
  color = '#fff';
  floorY = 1e9;
  phase = 0;
}

export class Particles {
  private readonly pool: Particle[] = [];
  private next = 0;

  constructor(size = 600) {
    for (let i = 0; i < size; i++) this.pool.push(new Particle());
  }

  spawn(
    kind: ParticleKind,
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    color: string,
    size = 1,
    g = 0,
    floorY = 1e9,
  ): void {
    const p = this.pool[this.next];
    this.next = (this.next + 1) % this.pool.length;
    p.alive = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.max = life;
    p.color = color;
    p.size = size;
    p.g = g;
    p.floorY = floorY;
    p.drag = kind === 'dust' ? 3 : kind === 'petal' || kind === 'confetti' ? 1.6 : 0.3;
    p.phase = Math.random() * 6.28;
  }

  clear(): void {
    for (const p of this.pool) p.alive = false;
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      p.vy += p.g * dt;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d;
      p.vy *= p.kind === 'confetti' || p.kind === 'petal' ? d : 1;
      p.phase += dt * 8;
      p.x +=
        (p.vx + (p.kind === 'confetti' || p.kind === 'petal' ? Math.sin(p.phase) * 12 : 0)) * dt;
      p.y += p.vy * dt;
      if (p.y > p.floorY) {
        p.y = p.floorY;
        p.vy *= -0.2;
        p.vx *= 0.5;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, camX: number): void {
    for (const p of this.pool) {
      if (!p.alive) continue;
      const a =
        p.kind === 'dust' || p.kind === 'spark'
          ? p.life / p.max
          : Math.min(1, (p.life / p.max) * 3);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      const s = p.kind === 'dust' ? Math.ceil(p.size * (1 + (1 - p.life / p.max))) : p.size;
      const w =
        p.kind === 'confetti' ? Math.max(1, Math.round(Math.abs(Math.cos(p.phase)) * 2)) : s;
      ctx.fillRect(Math.round(p.x - camX - s / 2), Math.round(p.y - s / 2), w, s);
    }
    ctx.globalAlpha = 1;
  }
}

class FloatText {
  alive = false;
  text = '';
  x = 0;
  y = 0;
  vy = 0;
  life = 0;
  max = 1;
  color = '#fff';
  size = 8;
  /** Screen-space (not scrolled with the camera). */
  screen = false;
}

export class FloatTexts {
  private readonly pool: FloatText[] = [];
  private next = 0;

  constructor(size = 24) {
    for (let i = 0; i < size; i++) this.pool.push(new FloatText());
  }

  spawn(
    text: string,
    x: number,
    y: number,
    color: string,
    size = 8,
    life = 1.2,
    screen = false,
  ): void {
    const f = this.pool[this.next];
    this.next = (this.next + 1) % this.pool.length;
    f.alive = true;
    f.text = text;
    f.x = x;
    f.y = y;
    f.vy = -22;
    f.life = life;
    f.max = life;
    f.color = color;
    f.size = size;
    f.screen = screen;
  }

  clear(): void {
    for (const f of this.pool) f.alive = false;
  }

  update(dt: number): void {
    for (const f of this.pool) {
      if (!f.alive) continue;
      f.life -= dt;
      f.y += f.vy * dt;
      f.vy *= Math.max(0, 1 - dt * 2);
      if (f.life <= 0) f.alive = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, font: (size: number) => string): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.pool) {
      if (!f.alive) continue;
      const age = 1 - f.life / f.max;
      const pop = age < 0.12 ? 0.6 + (age / 0.12) * 0.5 : 1.1 - Math.min(0.1, (age - 0.12) * 0.5);
      const size = Math.max(8, Math.round((f.size * pop) / 8) * 8);
      ctx.font = font(size);
      ctx.globalAlpha = Math.min(1, f.life * 3);
      const x = Math.round(f.screen ? f.x : f.x - camX);
      const y = Math.round(f.y);
      ctx.fillStyle = '#1a0f1f';
      ctx.fillText(f.text, x + 1, y + 1);
      ctx.fillText(f.text, x - 1, y + 1);
      ctx.fillText(f.text, x, y + 2);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, x, y);
    }
    ctx.globalAlpha = 1;
  }
}

/** Trauma-based screen shake. Disabled when the user prefers reduced motion. */
export class Shake {
  trauma = 0;
  ox = 0;
  oy = 0;
  constructor(public enabled: boolean) {}

  add(amount: number): void {
    if (this.enabled) this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt: number): void {
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const s = this.trauma * this.trauma * 7;
    this.ox = Math.round((Math.random() * 2 - 1) * s);
    this.oy = Math.round((Math.random() * 2 - 1) * s);
  }
}
