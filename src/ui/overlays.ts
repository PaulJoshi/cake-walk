import type { Game } from '../game/Game';
import { T } from '../game/tuning';
import { WORLDS, WORLD_IDS, isWorldId, type WorldId } from '../level/worlds';
import {
  WIN_LINES,
  failLine,
  grade,
  loadBest,
  score,
  shareText,
  type Mode,
  type RoundResult,
} from '../score/score';

type Action =
  | 'daily'
  | 'free'
  | 'retry'
  | 'switch'
  | 'share'
  | 'title'
  | 'resume'
  | 'pause'
  | 'controls'
  | 'back'
  | 'mute'
  | 'fullscreen'
  | 'tilt'
  | 'world';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** 16x16 pixel-art scenes for the world picker squares (inline SVG, crisp at any scale). */
const WORLD_ICONS: Record<WorldId, string> = {
  wedding:
    '<rect width="16" height="16" fill="#5a2350"/><rect y="13" width="16" height="3" fill="#3b1636"/>' +
    '<rect x="2" y="2" width="1" height="1" fill="#ffd36b"/><rect x="13" y="3" width="1" height="1" fill="#ffd36b"/><rect x="12" y="1" width="1" height="1" fill="#fff8ec"/><rect x="1" y="7" width="1" height="1" fill="#fff8ec"/>' +
    '<rect x="7" y="2" width="2" height="2" fill="#ff4f7b"/>' +
    '<rect x="6" y="4" width="4" height="2" fill="#fffaf2"/><rect x="6" y="5" width="4" height="1" fill="#ff8fb8"/>' +
    '<rect x="5" y="6" width="6" height="3" fill="#fffaf2"/><rect x="5" y="8" width="6" height="1" fill="#ff8fb8"/>' +
    '<rect x="4" y="9" width="8" height="3" fill="#fffaf2"/><rect x="4" y="11" width="8" height="1" fill="#ff8fb8"/>' +
    '<rect x="2" y="12" width="12" height="1" fill="#e3e7ee"/><rect x="2" y="13" width="12" height="1" fill="#8f96a3"/>',
  pirate:
    '<rect width="16" height="16" fill="#2c1a55"/><rect y="4" width="16" height="3" fill="#9a2f6c"/><rect y="7" width="16" height="2" fill="#ec6a5e"/><rect y="9" width="16" height="1" fill="#ffc35c"/>' +
    '<rect x="11" y="7" width="4" height="3" fill="#ffd36b"/><rect x="12" y="6" width="2" height="1" fill="#ffd36b"/>' +
    '<rect y="10" width="16" height="6" fill="#1f3f6a"/><rect x="1" y="13" width="3" height="1" fill="#3a6a9a"/><rect x="11" y="14" width="3" height="1" fill="#3a6a9a"/>' +
    '<rect x="7" y="1" width="1" height="9" fill="#41210f"/><rect x="8" y="1" width="3" height="2" fill="#141018"/><rect x="9" y="1" width="1" height="1" fill="#fffaf2"/>' +
    '<rect x="3" y="3" width="4" height="5" fill="#f3e6c8"/><rect x="4" y="4" width="2" height="1" fill="#c94040"/>' +
    '<rect x="1" y="9" width="13" height="2" fill="#5b311f"/><rect x="2" y="11" width="11" height="1" fill="#41210f"/><rect x="1" y="9" width="13" height="1" fill="#8f5a36"/>',
  space:
    '<rect width="16" height="16" fill="#0d0b24"/>' +
    '<rect x="2" y="2" width="1" height="1" fill="#fff7d6"/><rect x="13" y="1" width="1" height="1" fill="#fff7d6"/><rect x="4" y="13" width="1" height="1" fill="#fff7d6"/><rect x="14" y="14" width="1" height="1" fill="#b98cff"/><rect x="1" y="9" width="1" height="1" fill="#6fd3ff"/>' +
    '<rect x="9" y="5" width="4" height="1" fill="#6fd3ff"/><rect x="8" y="6" width="6" height="1" fill="#6fd3ff"/><rect x="7" y="7" width="8" height="4" fill="#6fd3ff"/><rect x="8" y="11" width="6" height="1" fill="#6fd3ff"/><rect x="9" y="12" width="4" height="1" fill="#6fd3ff"/>' +
    '<rect x="12" y="6" width="2" height="1" fill="#2e7fd6"/><rect x="13" y="7" width="2" height="4" fill="#2e7fd6"/><rect x="12" y="11" width="2" height="1" fill="#2e7fd6"/><rect x="9" y="7" width="2" height="1" fill="#e6f8ff"/>' +
    '<rect x="4" y="10" width="14" height="1" fill="#ffd36b"/><rect x="3" y="11" width="3" height="1" fill="#ffd36b"/>' +
    '<rect x="2" y="4" width="3" height="1" fill="#6be38a"/><rect x="1" y="5" width="5" height="1" fill="#c9ced8"/><rect x="2" y="6" width="1" height="1" fill="#ffd36b"/><rect x="4" y="6" width="1" height="1" fill="#ffd36b"/>',
};

function worldIcon(id: WorldId): string {
  return `<svg class="cw-wicon" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${WORLD_ICONS[id]}</svg>`;
}

const REPO_URL = 'https://github.com/PaulJoshi/cake-walk';

/** A faint GitHub mark in the bottom-left corner of the title and pause screens. */
const GITHUB_LINK =
  `<a class="cw-gh" href="${REPO_URL}" target="_blank" rel="noopener" aria-label="Source code on GitHub" title="Source code on GitHub">` +
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg></a>';

function cakes(n: number): string {
  let s = '';
  for (let i = 0; i < T.TIER_COUNT; i++) s += `<span class="cw-cake${i < n ? '' : ' off'}"></span>`;
  return `<div class="cw-cakes" aria-label="${n} of ${T.TIER_COUNT} tiers">${s}</div>`;
}

/** DOM overlays for title, controls, pause, results and share. Plain buttons, keyboard friendly. */
export class Overlays {
  private game: Game | null = null;
  private muted = false;
  private readonly corner: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly touch: HTMLElement;
  private readonly toast: HTMLElement;
  private result: RoundResult | null = null;
  /** The world button that was just pressed. */
  private pickedWorld = '';
  private snapshot: HTMLCanvasElement | null = null;

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <div class="cw-panel" hidden></div>
      <div class="cw-touch" hidden aria-hidden="true">
        <div class="cw-touch-l"><span>DRAG<br>TO BALANCE</span></div>
        <div class="cw-touch-r"><span>HOLD<br>TO WALK</span></div>
      </div>
      <div class="cw-corner">
        <button class="cw-icon" data-action="pause" aria-label="Pause (P)" title="Pause (P)">❚❚</button>
        <button class="cw-icon" data-action="mute" aria-label="Mute (M)" title="Mute (M)">♪</button>
        <button class="cw-icon" data-action="fullscreen" aria-label="Fullscreen (F)" title="Fullscreen (F)">⛶</button>
      </div>
      <div class="cw-toast" role="status" aria-live="polite"></div>`;
    this.panel = root.querySelector('.cw-panel')!;
    this.corner = root.querySelector('.cw-corner')!;
    this.touch = root.querySelector('.cw-touch')!;
    this.toast = root.querySelector('.cw-toast')!;
    root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      let a: Action | null = null;
      if (el) {
        e.stopPropagation();
        a = el.dataset.action as Action;
        this.pickedWorld = el.dataset.world ?? '';
      } else if (this.panel.dataset.screen === 'title' && e.target === this.panel) a = 'daily';
      if (!a) return;
      // iOS: the first tap on the title asks for motion access (it must come from a tap),
      // then carries on with whatever was tapped.
      if (a !== 'tilt' && this.screen === 'title' && this.game?.input.askTiltOnFirstTap) {
        const act = a;
        void this.askTilt().then(() => this.act(act));
      } else this.act(a);
    });
    // Any touch on the title background starts too. The iOS permission prompt only works
    // from a click, so that first tap is left to the click handler.
    this.panel.addEventListener('pointerdown', (e) => {
      if (
        e.pointerType !== 'mouse' &&
        e.target === this.panel &&
        this.panel.dataset.screen === 'title' &&
        !this.game?.input.askTiltOnFirstTap
      )
        this.act('daily');
    });
  }

  bind(game: Game): void {
    this.game = game;
  }

  get screen(): string {
    return this.panel.hidden ? '' : (this.panel.dataset.screen ?? '');
  }

  private act(a: Action): void {
    const g = this.game;
    if (!g) return;
    switch (a) {
      case 'daily':
      case 'free':
        g.newRound(a);
        break;
      case 'retry':
        g.newRound();
        break;
      case 'switch':
        g.newRound(g.mode === 'daily' ? 'free' : 'daily');
        break;
      case 'resume':
      case 'pause':
        g.togglePause();
        break;
      case 'title':
        g.setState('title');
        break;
      case 'controls':
        this.showControls();
        break;
      case 'back':
        this.showTitle();
        break;
      case 'mute':
        this.setMuted(g.audio.toggleMute());
        break;
      case 'fullscreen':
        this.toggleFullscreen();
        break;
      case 'tilt':
        void this.toggleTilt();
        break;
      case 'world':
        if (isWorldId(this.pickedWorld)) {
          g.setWorld(this.pickedWorld);
          this.showTitle(true);
        }
        break;
      case 'share':
        void this.share();
        break;
    }
  }

  /** The default ask on phones that need permission: on if allowed, drag if not. */
  private async askTilt(): Promise<void> {
    const ok = await this.game!.input.enableTilt();
    this.flash(ok ? 'Tilt controls on!' : 'Tilt off. Drag the left side to balance');
    this.refreshTilt();
  }

  /** The Tilt button on the title and pause screens. Asks for permission again if needed. */
  private async toggleTilt(): Promise<void> {
    const input = this.game!.input;
    if (input.tiltEnabled) {
      input.disableTilt();
      this.flash('Tilt off. Drag the left side to balance');
    } else if (!(await input.enableTilt(true))) {
      this.flash('Motion access blocked. Reload the page and tap Allow');
    } else if (!(await input.waitForTilt())) {
      this.flash('No tilt data. Check your motion sensor settings');
    } else {
      this.flash('Tilt controls on!');
    }
    this.refreshTilt();
  }

  private tiltButton(): string {
    if (!this.game?.input.tiltSupported) return '';
    const on = this.game.input.tiltEnabled;
    return `<button data-action="tilt" aria-pressed="${on}">Tilt: ${on ? 'ON' : 'OFF'}</button>`;
  }

  private refreshTilt(): void {
    const b = this.panel.querySelector<HTMLButtonElement>('[data-action="tilt"]');
    if (!b || !this.game) return;
    const on = this.game.input.tiltEnabled;
    b.textContent = `Tilt: ${on ? 'ON' : 'OFF'}`;
    b.setAttribute('aria-pressed', String(on));
  }

  private open(screen: string, html: string, focus?: string): void {
    this.panel.dataset.screen = screen;
    this.panel.innerHTML = html;
    this.panel.hidden = false;
    this.corner.classList.add('no-pause');
    const first =
      (focus ? this.panel.querySelector<HTMLButtonElement>(focus) : null) ??
      this.panel.querySelector<HTMLButtonElement>('button[data-primary]') ??
      this.panel.querySelector('button');
    first?.focus({ preventScroll: true });
  }

  hideAll(): void {
    this.panel.hidden = true;
    this.panel.dataset.screen = '';
    this.panel.innerHTML = '';
    this.corner.classList.remove('no-pause');
  }

  private bestLine(mode: Mode): string {
    const b = loadBest(mode, undefined, this.game?.worldId);
    return b ? `${b.grade} · ${b.score}` : '—';
  }

  /** One square picture button per world; the picked one is lifted and framed in gold. */
  private worldPicker(): string {
    const current = this.game?.worldId ?? 'wedding';
    const tabs = WORLD_IDS.map((id) => {
      const on = id === current;
      const name = WORLDS[id].name;
      return `<button class="cw-world${on ? ' on' : ''}" data-action="world" data-world="${id}" role="radio" aria-checked="${on}" aria-label="${name}" title="${name}">${worldIcon(id)}</button>`;
    }).join('');
    return `<div class="cw-worlds" role="radiogroup" aria-label="World">${tabs}</div>`;
  }

  /** @param focusWorld keep keyboard focus on the world picker (after switching worlds) */
  showTitle(focusWorld = false): void {
    const touch = matchMedia('(pointer: coarse)').matches;
    const world = WORLDS[this.game?.worldId ?? 'wedding'];
    this.open(
      'title',
      `<div class="cw-title" data-world="${world.id}">
        <div class="cw-tag">Night Out with Devin / Game Jam</div>
        <h1 class="cw-logo" aria-label="Cake Walk"><span>CAKE</span><span>WALK</span></h1>
        <p class="cw-sub">${world.tagline}</p>
        <div class="cw-buttons">
          <button data-action="daily" data-primary>Daily Challenge</button>
          <button data-action="free">Random</button>
        </div>
        <div class="cw-buttons small">
          <button data-action="controls">Controls</button>
          <button data-action="mute">${this.muted ? 'Unmute' : 'Mute'}</button>
          <button data-action="fullscreen">Fullscreen</button>
          ${this.tiltButton()}
        </div>
        ${this.worldPicker()}
        <p class="cw-best">Daily best ${this.bestLine('daily')} &nbsp; Random best ${this.bestLine('free')}</p>
        <p class="cw-hint">${touch ? 'Tap anywhere to start' : 'Press any key to start · ← → change world'}</p>
      </div>
      ${GITHUB_LINK}`,
      focusWorld ? '.cw-world.on' : undefined,
    );
  }

  private showControls(): void {
    this.open(
      'controls',
      `<div class="cw-card">
        <h2>Hold to walk. Move to balance.</h2>
        <table class="cw-controls">
          <tr><th>Walk</th><td>Hold Space / W / Up / left mouse<br>Touch: hold the right half</td></tr>
          <tr><th>Balance</th><td>Move the mouse left/right<br>or A / D / Left / Right<br>Touch: tilt, or drag on the left half</td></tr>
          <tr><th>Other</th><td>R retry · P / Esc pause · M mute · F fullscreen</td></tr>
        </table>
        <p class="cw-small">Speeding up tips the cake back. Stopping tips it forward.<br>Slide the tray under the lean. Stop at the cake table and hold still.</p>
        <div class="cw-buttons"><button data-action="back" data-primary>Back</button></div>
      </div>`,
    );
  }

  showPause(): void {
    this.open(
      'pause',
      `<div class="cw-card">
        <h2>PAUSED</h2>
        <div class="cw-buttons">
          <button data-action="resume" data-primary>Resume (P)</button>
          <button data-action="retry">Retry (R)</button>
          <button data-action="title">Title</button>
        </div>
        ${this.game?.input.tiltSupported ? `<div class="cw-buttons small">${this.tiltButton()}</div>` : ''}
      </div>
      ${GITHUB_LINK}`,
    );
  }

  showTouchHints(on: boolean): void {
    this.touch.hidden = !on;
    if (on) {
      this.touch.classList.remove('fade');
      window.setTimeout(() => this.touch.classList.add('fade'), 4000);
      const tilt = this.game?.input.tiltActive;
      const l = this.touch.querySelector('.cw-touch-l span');
      if (l) l.innerHTML = tilt ? 'TILT<br>TO BALANCE' : 'DRAG<br>TO BALANCE';
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    const b = this.corner.querySelector<HTMLButtonElement>('[data-action="mute"]');
    if (b) {
      b.classList.toggle('off', m);
      b.setAttribute('aria-pressed', String(m));
    }
    const tb = this.panel.querySelector<HTMLButtonElement>('.cw-title [data-action="mute"]');
    if (tb) tb.textContent = m ? 'Unmute' : 'Mute';
  }

  toggleFullscreen(): void {
    const d = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => void;
    };
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    try {
      if (document.fullscreenElement || d.webkitFullscreenElement) {
        if (document.exitFullscreen) void document.exitFullscreen();
        else d.webkitExitFullscreen?.();
      } else if (el.requestFullscreen) {
        void el.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined);
      } else el.webkitRequestFullscreen?.();
    } catch {
      /* fullscreen not available */
    }
  }

  private flash(msg: string): void {
    this.toast.textContent = msg;
    this.toast.classList.add('show');
    window.setTimeout(() => this.toast.classList.remove('show'), 1800);
  }

  showResult(g: Game, r: RoundResult, isNewBest: boolean, snapshot: HTMLCanvasElement): void {
    this.result = r;
    this.snapshot = snapshot;
    const gr = grade(r);
    const won = r.outcome === 'won';
    const fail = !won ? failLine(r) : null;
    const best = loadBest(r.mode, undefined, r.world);
    const other = g.mode === 'daily' ? 'Random' : 'Daily Challenge';
    const where = r.world && r.world !== 'wedding' ? `${WORLDS[r.world].name} · ` : '';
    this.open(
      'result',
      `<div class="cw-card cw-result ${won ? 'win' : 'lose'}">
        <div class="cw-mode">${where}${r.mode === 'daily' ? `Daily Challenge ${esc(r.seed)}` : `Random #${esc(r.seed)}`}</div>
        <div class="cw-grade g-${gr}" aria-label="Grade ${gr}">${gr}</div>
        <h2>${won ? 'CAKE DELIVERED!' : esc(fail!.title)}</h2>
        <p class="cw-joke">${esc(won ? WIN_LINES[gr as keyof typeof WIN_LINES] : fail!.joke)}</p>
        ${isNewBest ? '<div class="cw-newbest">NEW BEST!</div>' : ''}
        ${cakes(won ? r.tiers : Math.min(r.tiers, T.TIER_COUNT))}
        <dl class="cw-stats">
          <div><dt>Score</dt><dd>${score(r)}</dd></div>
          <div><dt>Time left</dt><dd>${r.secondsLeft.toFixed(1)}s</dd></div>
          <div><dt>Clutch</dt><dd>${r.clutches}</dd></div>
          <div><dt>Best</dt><dd>${best ? `${best.grade} · ${best.score}` : '—'}</dd></div>
        </dl>
        <div class="cw-buttons">
          <button data-action="retry" data-primary>Retry (R)</button>
          <button data-action="share">Share</button>
          <button data-action="switch">${other}</button>
          <button data-action="title">Title</button>
        </div>
      </div>`,
    );
  }

  private async share(): Promise<void> {
    const r = this.result;
    if (!r) return;
    const url = location.origin + location.pathname;
    const text = shareText(r);
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    try {
      const blob = this.snapshot
        ? await new Promise<Blob | null>((res) => this.snapshot!.toBlob(res, 'image/png'))
        : null;
      const file = blob ? new File([blob], 'cake-walk.png', { type: 'image/png' }) : null;
      if (file && nav.canShare?.({ files: [file] })) {
        await nav.share({ text: `${text}\n${url}`, files: [file] });
        return;
      }
      if (nav.share) {
        await nav.share({ text, url });
        return;
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      this.flash('Copied to clipboard!');
    } catch {
      this.flash(text);
    }
  }
}
