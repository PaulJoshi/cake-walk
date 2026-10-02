import type { Audio } from '../audio/Audio';
import type { Input } from '../input/Input';
import type { Intent } from '../input/intent';
import { WORLDS, isWorldId, type WorldId } from '../level/worlds';
import type { Renderer } from '../render/Renderer';
import { view, type Screen } from '../render/Screen';
import {
  grade,
  loadWorld,
  saveBest,
  saveWorld,
  score,
  type Mode,
  type RoundResult,
} from '../score/score';
import type { Overlays } from '../ui/overlays';
import { randomSeed, todaySeed } from './rng';
import { Countdown } from './states/Countdown';
import { Paused } from './states/Paused';
import { Playing } from './states/Playing';
import { Result } from './states/Result';
import type { State, StateName } from './states/State';
import { Title } from './states/Title';
import { T } from './tuning';
import { World } from './World';

export type { Mode };

export interface DrawOpts {
  attract?: boolean;
  countdown?: string | null;
}

/** Orchestrates states, the fixed-timestep simulation, rendering, audio and UI. */
export class Game {
  world: World;
  mode: Mode = 'daily';
  /** The world picked on the title screen (?world= overrides the saved pick). */
  worldId: WorldId;
  seed: string;
  /** Seed forced by ?seed= (overrides Daily Challenge/Random). */
  readonly urlSeed: string | null;
  readonly debug: boolean;
  /** ?bot=1: the autopilot plays the real round (demos, visual checks). */
  readonly botPlay: boolean;
  fps = 60;

  private readonly states: Record<StateName, State>;
  private state: State;
  private acc = 0;
  private slowmo = 0;
  private last = 0;
  private fpsAcc = 0;
  private fpsFrames = 0;

  constructor(
    readonly screen: Screen,
    readonly renderer: Renderer,
    readonly input: Input,
    readonly audio: Audio,
    readonly ui: Overlays,
  ) {
    const params = new URLSearchParams(location.search);
    this.debug = params.get('debug') === '1';
    this.botPlay = params.get('bot') === '1';
    this.urlSeed = params.get('seed');
    this.seed = this.urlSeed ?? todaySeed();
    const urlWorld = params.get('world');
    this.worldId = isWorldId(urlWorld) ? urlWorld : (loadWorld() ?? 'wedding');
    this.world = new World(this.seed, this.worldId);
    this.states = {
      title: new Title(),
      countdown: new Countdown(),
      playing: new Playing(),
      paused: new Paused(),
      result: new Result(),
    };
    this.state = this.states.title;
    this.ui.bind(this);
    this.bindInput();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.autoPause();
    });
    window.addEventListener('blur', () => this.autoPause());
  }

  start(initial?: StateName): void {
    if (initial) this.setState(initial);
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  get stateName(): StateName {
    return this.state.name;
  }

  setState(name: StateName): void {
    this.state.exit?.(this);
    this.state = this.states[name];
    this.state.enter?.(this);
  }

  /** Begin a new round in the given mode (instant retry uses the same mode). */
  newRound(mode: Mode = this.mode): void {
    this.mode = mode;
    this.seed = this.urlSeed ?? (mode === 'daily' ? todaySeed() : randomSeed());
    this.world = new World(this.seed, this.worldId);
    this.acc = 0;
    this.slowmo = 0;
    this.renderer.reset(this.world);
    this.audio.unlock();
    this.setState('countdown');
  }

  /** Pick a world on the title screen; the attract run behind it switches straight away. */
  setWorld(id: WorldId): void {
    if (id === this.worldId) return;
    this.worldId = id;
    saveWorld(id);
    if (this.state.name === 'title') (this.states.title as Title).newRun(this);
  }

  /** Step through the worlds (arrow keys on the title screen). */
  cycleWorld(dir: number): WorldId {
    const ids = Object.keys(WORLDS) as WorldId[];
    const i = ids.indexOf(this.worldId);
    this.setWorld(ids[(i + dir + ids.length) % ids.length]);
    return this.worldId;
  }

  private autoPause(): void {
    if (this.state.name === 'playing' || this.state.name === 'countdown') this.setState('paused');
  }

  togglePause(): void {
    if (this.state.name === 'playing' || this.state.name === 'countdown') this.setState('paused');
    else if (this.state.name === 'paused') this.setState('countdown');
  }

  private bindInput(): void {
    this.input.on((a) => {
      const s = this.state.name;
      if ((a === 'prevWorld' || a === 'nextWorld') && s === 'title' && this.ui.screen === 'title') {
        this.cycleWorld(a === 'prevWorld' ? -1 : 1);
        this.ui.showTitle(true);
      } else if (a === 'any' && s === 'title' && this.ui.screen === 'title') this.newRound('daily');
      else if (a === 'retry' && s !== 'title') this.newRound();
      else if (a === 'pause') this.togglePause();
      else if (a === 'mute') this.ui.setMuted(this.audio.toggleMute());
      else if (a === 'fullscreen') this.ui.toggleFullscreen();
      else if (a.startsWith('zone') && this.debug && s === 'playing') {
        const i = Number(a.slice(4));
        const z = WORLDS[this.world.worldId].zones[i === 0 ? 9 : i - 1];
        if (z) this.world.skipTo(z.x);
      }
    });
  }

  /**
   * Advance a world by real time `dt` at the fixed SIM_HZ, applying slow motion and routing
   * simulation events to the renderer and audio.
   */
  simulate(w: World, dt: number, intent: () => Intent, quiet = false): void {
    const step = 1 / T.SIM_HZ;
    let scale = 1;
    if (this.slowmo > 0) {
      this.slowmo -= dt;
      scale = T.SLOWMO_SCALE;
    }
    this.acc += dt * scale;
    let n = 0;
    while (this.acc >= step && n < 24) {
      w.step(intent(), step);
      this.acc -= step;
      n++;
    }
    if (n >= 24) this.acc = 0;
    for (const e of w.events) {
      this.renderer.handleEvent(e, w);
      if (!quiet) {
        this.audio.event(e);
        if (e.type === 'slowmo') this.slowmo = T.SLOWMO_TIME;
      }
    }
    w.events.length = 0;
  }

  draw(w: World, o: DrawOpts): void {
    const touch = this.input.touchSeen;
    const dev = this.input.device;
    this.renderer.draw(this.screen.ctx, w, {
      attract: !!o.attract,
      countdown: o.countdown ?? null,
      walkHint: touch ? 'HOLD RIGHT SIDE TO WALK' : 'HOLD SPACE OR CLICK TO WALK',
      balanceHint:
        dev === 'tilt'
          ? 'TILT TO BALANCE'
          : touch
            ? 'DRAG LEFT SIDE TO BALANCE'
            : dev === 'keyboard'
              ? 'A / D TO BALANCE'
              : 'MOVE MOUSE TO BALANCE',
      debug: this.debug,
      fps: this.fps,
    });
    this.screen.present();
  }

  /** Build the round result, persist the best score and show the results overlay. */
  showResult(): void {
    const w = this.world;
    const r: RoundResult = {
      outcome: w.outcome,
      tiers: w.cake.count,
      secondsLeft: w.finalTimeLeft,
      clutches: w.clutches,
      mode: this.mode,
      seed: this.seed,
      world: this.world.worldId,
    };
    const isNew = w.won && saveBest(r);
    this.ui.showResult(this, r, isNew, this.snapshot(r));
  }

  /** A 2x PNG-ready copy of the final frame with a caption, for sharing. */
  private snapshot(r: RoundResult): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = view.w * 2;
    c.height = view.h * 2;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.screen.buffer, 0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(26,15,31,0.85)';
    ctx.fillRect(0, c.height - 40, c.width, 40);
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd36b';
    ctx.fillText(`CAKE WALK · GRADE ${grade(r)} · ${score(r)}`, c.width / 2, c.height - 20);
    return c;
  }

  private frame(now: number): void {
    const dt = Math.min(T.MAX_FRAME_DT, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.fpsAcc += dt;
    this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      this.fps = this.fpsFrames / this.fpsAcc;
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }
    this.state.update(this, dt);
    this.state.render(this);
    requestAnimationFrame((t) => this.frame(t));
  }
}
