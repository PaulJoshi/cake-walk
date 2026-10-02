import type { Game } from '../game/Game';
import { T } from '../game/tuning';
import { WORLDS, WORLD_IDS, isWorldId, type WorldId } from '../level/worlds';
import { ACHIEVEMENTS, type Achievement } from '../score/achievements';
import type { Board, BoardEntry, Ranks } from '../score/board';
import { isoWeek } from '../score/formula';
import { NAME_MAX } from '../score/names';
import {
  WIN_LINES,
  breakdown,
  failLine,
  fmtScore,
  grade,
  shareText,
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
  | 'world'
  | 'scores'
  | 'boardWorld'
  | 'boardWeek'
  | 'boardAll'
  | 'editName'
  | 'badges';

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

/** A tiny pixel trophy for the scoreboard link. */
const TROPHY =
  '<svg class="cw-trophy" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true"><g fill="currentColor">' +
  '<rect x="1" y="0" width="6" height="3"/><rect x="0" y="1" width="1" height="1"/><rect x="7" y="1" width="1" height="1"/>' +
  '<rect x="2" y="3" width="4" height="1"/><rect x="3" y="4" width="2" height="2"/><rect x="2" y="6" width="4" height="2"/></g></svg>';

/** A tiny pixel medal for badges (earned ones in gold, the rest dimmed). */
function medal(on = true): string {
  return (
    `<svg class="cw-medal${on ? '' : ' off'}" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">` +
    '<g fill="#ff6fa8"><rect x="1" y="0" width="2" height="3"/><rect x="5" y="0" width="2" height="3"/></g>' +
    '<g fill="currentColor"><rect x="2" y="3" width="4" height="5"/><rect x="1" y="4" width="6" height="3"/></g>' +
    '<rect x="3" y="4" width="1" height="1" fill="#fff8ec"/></svg>'
  );
}

const PART_LABELS: Record<string, string> = {
  distance: 'Distance',
  cargo: 'Cargo',
  delivery: 'Delivery',
  pace: 'Pace',
  poise: 'Poise',
  clutch: 'Clutch',
  bumps: 'Bumps',
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
  private readonly badgeToast: HTMLElement;
  private badgeTimers: number[] = [];
  private result: RoundResult | null = null;
  /** The world button that was just pressed. */
  private pickedWorld = '';
  private snapshot: HTMLCanvasElement | null = null;
  /** The snapshot as a PNG, made ahead so Share responds straight away. */
  private snapshotPng: Blob | null = null;
  /** Scoreboard screen: which world and which board. */
  private boardWorld: WorldId = 'wedding';
  private boardTab: 'week' | 'all' = 'week';
  private boardFailed = false;
  /** The scoreboard footer is showing the name field. */
  private editingName = false;

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
      <div class="cw-toast" role="status" aria-live="polite"></div>
      <div class="cw-badge-toast" role="status" aria-live="polite"></div>`;
    this.panel = root.querySelector('.cw-panel')!;
    this.corner = root.querySelector('.cw-corner')!;
    this.touch = root.querySelector('.cw-touch')!;
    this.toast = root.querySelector('.cw-toast')!;
    this.badgeToast = root.querySelector('.cw-badge-toast')!;
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
    root.addEventListener('submit', (e) => {
      const form = (e.target as HTMLElement).closest<HTMLFormElement>('form[data-form="name"]');
      if (!form) return;
      e.preventDefault();
      this.saveName(form);
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
    // The profile loads from IndexedDB a moment after start: fill in the best when it lands.
    game.profile.onChange(() => {
      if (this.screen === 'title') this.refreshTitleScores();
    });
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
      case 'scores':
        this.boardWorld = g.worldId;
        this.editingName = false;
        this.showScores();
        break;
      case 'boardWorld':
        if (isWorldId(this.pickedWorld)) {
          this.boardWorld = this.pickedWorld;
          this.showScores();
        }
        break;
      case 'boardWeek':
      case 'boardAll':
        this.boardTab = a === 'boardWeek' ? 'week' : 'all';
        this.showScores();
        break;
      case 'editName':
        this.editingName = true;
        this.fillBoardFoot();
        break;
      case 'badges':
        this.showBadges();
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
    // A badge toast never carries on into the next round.
    this.hideBadgeToast();
  }

  private bestText(world: WorldId): string {
    const b = this.game?.profile.best(world);
    return b ? fmtScore(b.score) : '—';
  }

  /** The scoreboard link's label: the world's top score once it is known. */
  private topText(world: WorldId): string {
    const top = this.game?.scoreboard.cached(world)?.all[0];
    return top ? `Top ${fmtScore(top.score)}` : 'Scoreboard';
  }

  private badgeCount(): string {
    const got = ACHIEVEMENTS.filter((a) => this.game?.profile.hasBadge(a.id)).length;
    return `${got}/${ACHIEVEMENTS.length}`;
  }

  /** Personal best plus quiet links to the scoreboard (hidden when there isn't one) and badges. */
  private bestLine(): string {
    const world = this.game?.worldId ?? 'wedding';
    const hide = this.game?.scoreboard.available === false ? ' hidden' : '';
    return `<div class="cw-best">
      <span>Best <b class="cw-pb">${this.bestText(world)}</b></span>
      <button class="cw-link cw-toplink" data-action="scores" title="Scoreboard"${hide}>${TROPHY}<span class="cw-top">${this.topText(world)}</span></button>
      <button class="cw-link" data-action="badges" title="Badges" aria-label="Badges">${medal()}<span class="cw-badge-n">${this.badgeCount()}</span></button>
    </div>`;
  }

  /** Update the title's best and top score in place (no re-render, focus stays put). */
  private refreshTitleScores(): void {
    const g = this.game;
    if (!g) return;
    const world = g.worldId;
    const pb = this.panel.querySelector('.cw-pb');
    if (pb) pb.textContent = this.bestText(world);
    const bn = this.panel.querySelector('.cw-badge-n');
    if (bn) bn.textContent = this.badgeCount();
    void g.scoreboard.load(world).then(() => {
      if (this.screen !== 'title' || g.worldId !== world) return;
      const link = this.panel.querySelector<HTMLElement>('.cw-toplink');
      const top = this.panel.querySelector('.cw-top');
      if (link) link.hidden = g.scoreboard.available === false;
      if (top) top.textContent = this.topText(world);
    });
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
        ${this.bestLine()}
        <p class="cw-hint">${touch ? 'Tap anywhere to start' : 'Press any key to start · ← → change world'}</p>
      </div>
      ${GITHUB_LINK}`,
      focusWorld ? '.cw-world.on' : undefined,
    );
    this.refreshTitleScores();
  }

  /** Inline name field (scoreboard footer and the Controls card). */
  private nameForm(): string {
    const name = esc(this.game?.profile.name ?? '');
    return `<form class="cw-name" data-form="name">
      <input name="name" value="${name}" maxlength="${NAME_MAX}" aria-label="Your name" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done">
      <button type="submit">Save</button>
    </form>`;
  }

  private saveName(form: HTMLFormElement): void {
    const g = this.game;
    const input = form.elements.namedItem('name') as HTMLInputElement | null;
    if (!g || !input) return;
    const n = g.profile.setName(input.value);
    if (!n) {
      this.flash('Use at least 2 letters or digits');
      return;
    }
    input.value = n;
    input.blur();
    this.flash(`Saved! You're ${n}`);
    void g.scoreboard
      .syncName()
      .then(() => g.scoreboard.load(this.boardWorld, true))
      .then(() => {
        if (this.screen === 'scores') this.fillBoard();
      });
    if (this.screen === 'scores') {
      this.editingName = false;
      this.fillBoardFoot();
      this.panel.querySelector<HTMLElement>('[data-action="editName"]')?.focus();
    }
  }

  private rows(list: BoardEntry[], mine: number | null): string {
    const tag = this.game?.scoreboard.myTag;
    const items = list.map(
      (e, i) =>
        `<li${e.tag === tag ? ' class="me"' : ''}><span class="cw-r">${i + 1}</span><span class="cw-n">${esc(e.name)}</span><span class="cw-s">${fmtScore(e.score)}</span></li>`,
    );
    if (mine !== null && !list.some((e) => e.tag === tag)) {
      items.push(
        `<li class="me off"><span class="cw-r">-</span><span class="cw-n">You</span><span class="cw-s">${fmtScore(mine)}</span></li>`,
      );
    }
    return `<ol class="cw-ranks">${items.join('')}</ol>`;
  }

  /** Top 10 for a world, this week or all time, with the player's own row highlighted. */
  showScores(): void {
    const g = this.game;
    if (!g) return;
    const world = this.boardWorld;
    const week = this.boardTab === 'week';
    const worlds = WORLD_IDS.map((id) => {
      const on = id === world;
      const name = WORLDS[id].name;
      return `<button class="cw-world${on ? ' on' : ''}" data-action="boardWorld" data-world="${id}" role="radio" aria-checked="${on}" aria-label="${name}" title="${name}">${worldIcon(id)}</button>`;
    }).join('');
    const active = document.activeElement as HTMLElement | null;
    const keep = active?.dataset?.action
      ? `[data-action="${active.dataset.action}"]${active.dataset.world ? `[data-world="${active.dataset.world}"]` : ''}`
      : undefined;
    this.open(
      'scores',
      `<div class="cw-card cw-board">
        <h2>SCOREBOARD</h2>
        <div class="cw-worlds small" role="radiogroup" aria-label="World">${worlds}</div>
        <div class="cw-mode">${WORLDS[world].name}</div>
        <div class="cw-tabs" role="tablist">
          <button class="cw-tab" role="tab" data-action="boardWeek" aria-selected="${week}">This week</button>
          <button class="cw-tab" role="tab" data-action="boardAll" aria-selected="${!week}">All time</button>
        </div>
        <div class="cw-board-body" aria-live="polite"></div>
        <div class="cw-board-foot"></div>
        <div class="cw-buttons"><button data-action="back" data-primary>Back</button></div>
      </div>`,
      this.editingName ? undefined : keep,
    );
    this.fillBoard();
    this.fillBoardFoot();
    const cached = g.scoreboard.cached(world);
    void g.scoreboard.load(world).then((b) => {
      if (this.screen !== 'scores' || this.boardWorld !== world) return;
      this.boardFailed = !b;
      if (b !== cached) this.fillBoard();
    });
  }

  private fillBoard(): void {
    const g = this.game;
    const el = this.panel.querySelector('.cw-board-body');
    if (!g || !el) return;
    const world = this.boardWorld;
    const week = this.boardTab === 'week';
    const p = g.profile.data;
    const wb = p.weekBests[world];
    const mine = week
      ? wb && wb.week === isoWeek()
        ? wb.score
        : null
      : (p.bests[world]?.score ?? null);
    const board: Board | null = g.scoreboard.cached(world);
    const list = board ? (week ? board.week : board.all) : null;
    el.innerHTML = list
      ? list.length
        ? this.rows(list, mine)
        : `<p class="cw-empty">No scores yet${week ? ' this week' : ''}. Be the first!</p>`
      : `<p class="cw-empty">${this.boardFailed ? 'The scoreboard is offline right now.' : 'Loading...'}</p>`;
  }

  private fillBoardFoot(): void {
    const g = this.game;
    const el = this.panel.querySelector('.cw-board-foot');
    if (!g || !el) return;
    el.innerHTML = this.editingName
      ? this.nameForm()
      : `<p class="cw-small">Playing as <b>${esc(g.profile.name)}</b> <button class="cw-link" data-action="editName">Change</button></p>`;
    if (this.editingName) {
      const input = el.querySelector<HTMLInputElement>('input');
      input?.focus({ preventScroll: true });
      input?.select();
    }
  }

  private badgeItem(a: Achievement): string {
    const on = !!this.game?.profile.hasBadge(a.id);
    return `<li class="${on ? 'on' : 'off'}">${medal(on)}<span><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></span><span class="cw-sr">${on ? 'earned' : 'not earned yet'}</span></li>`;
  }

  /** Every badge, earned ones in gold: the game-wide ones first, then each world's. */
  private showBadges(): void {
    const groups = [
      { title: 'Any world', icon: '', list: ACHIEVEMENTS.filter((a) => !a.world) },
      ...WORLD_IDS.map((id) => ({
        title: WORLDS[id].name,
        icon: worldIcon(id),
        list: ACHIEVEMENTS.filter((a) => a.world === id),
      })),
    ];
    const body = groups
      .map(
        (g) =>
          `<h3>${g.icon}${g.title}</h3><ul class="cw-badges">${g.list.map((a) => this.badgeItem(a)).join('')}</ul>`,
      )
      .join('');
    this.open(
      'badges',
      `<div class="cw-card cw-badgecard">
        <button class="cw-close" data-action="back" aria-label="Close" title="Close">✕</button>
        <h2>BADGES</h2>
        <p class="cw-small">${this.badgeCount()} earned</p>
        <div class="cw-badge-body">${body}</div>
        <div class="cw-buttons"><button data-action="back" data-primary>Back</button></div>
      </div>`,
    );
  }

  private hideBadgeToast(): void {
    for (const t of this.badgeTimers) window.clearTimeout(t);
    this.badgeTimers = [];
    this.badgeToast.classList.remove('show');
  }

  /** A quiet note about new badges, a moment after the result card lands. */
  private showBadgeToast(badges: Achievement[]): void {
    this.hideBadgeToast();
    if (!badges.length) return;
    const names = badges.slice(0, 2).map((a) => esc(a.name));
    if (badges.length > 2) names.push(`+${badges.length - 2} more`);
    const head = badges.length === 1 ? 'BADGE UNLOCKED' : `${badges.length} BADGES UNLOCKED`;
    this.badgeTimers.push(
      window.setTimeout(() => {
        this.badgeToast.innerHTML = `${medal()}<span><small>${head}</small>${names.join(' · ')}</span>`;
        this.badgeToast.classList.add('show');
      }, 900),
      window.setTimeout(() => this.badgeToast.classList.remove('show'), 900 + 4200),
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
        <div class="cw-namebox"><span>Your name</span>${this.nameForm()}</div>
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

  showResult(
    g: Game,
    r: RoundResult,
    isNewBest: boolean,
    snapshot: HTMLCanvasElement,
    badges: Achievement[] = [],
  ): void {
    this.result = r;
    this.snapshot = snapshot;
    this.snapshotPng = null;
    snapshot.toBlob((b) => {
      if (this.snapshot === snapshot) this.snapshotPng = b;
    }, 'image/png');
    const gr = grade(r);
    const won = r.outcome === 'won';
    const fail = !won ? failLine(r) : null;
    const best = g.profile.best(r.world ?? 'wedding');
    const other = g.mode === 'daily' ? 'Random' : 'Daily Challenge';
    const where = r.world && r.world !== 'wedding' ? `${WORLDS[r.world].name} · ` : '';
    const parts = breakdown(r);
    const partLine = Object.entries(PART_LABELS)
      .filter(([k]) => parts[k as keyof typeof parts] !== 0)
      .map(([k, label]) => {
        const v = parts[k as keyof typeof parts];
        return `<span>${label} ${v < 0 ? '−' : ''}${fmtScore(Math.abs(v))}</span>`;
      })
      .join('');
    this.open(
      'result',
      `<div class="cw-card cw-result ${won ? 'win' : 'lose'}">
        <div class="cw-mode">${where}${r.mode === 'daily' ? `Daily Challenge ${esc(r.seed)}` : `Random #${esc(r.seed)}`}</div>
        <div class="cw-headline">
          <div class="cw-grade g-${gr}" aria-label="Grade ${gr}">${gr}</div>
          <div class="cw-score"><span class="cw-score-n">${fmtScore(parts.total)}</span><span class="cw-score-l">points</span></div>
        </div>
        <h2>${won ? 'CAKE DELIVERED!' : esc(fail!.title)}</h2>
        <p class="cw-joke">${esc(won ? WIN_LINES[gr as keyof typeof WIN_LINES] : fail!.joke)}</p>
        ${isNewBest ? '<div class="cw-newbest">NEW BEST!</div>' : ''}
        ${cakes(won ? r.tiers : Math.min(r.tiers, T.TIER_COUNT))}
        <dl class="cw-stats">
          <div><dt>Best</dt><dd>${best ? fmtScore(best.score) : '—'}</dd></div>
          <div><dt>Way</dt><dd>${Math.floor(r.progress * 100)}%</dd></div>
          <div><dt>Time left</dt><dd>${r.secondsLeft.toFixed(1)}s</dd></div>
          <div><dt>Clutch</dt><dd>${r.clutches}</dd></div>
        </dl>
        <p class="cw-parts" aria-label="Score breakdown">${partLine}</p>
        <p class="cw-rank" aria-live="polite"></p>
        <div class="cw-buttons">
          <button data-action="retry" data-primary>Retry (R)</button>
          <button data-action="share">Share</button>
          <button data-action="switch">${other}</button>
          <button data-action="title">Title</button>
        </div>
      </div>`,
    );
    this.showBadgeToast(badges);
  }

  /** Scoreboard placings for the round just shown (arrive a moment after the result). */
  showRanks(r: Ranks): void {
    const el = this.panel.querySelector('.cw-rank');
    if (!el) return;
    const bits = [];
    if (r.weekRank) bits.push(`#${r.weekRank} this week`);
    if (r.allRank) bits.push(`#${r.allRank} all time`);
    el.innerHTML = bits.length ? `${TROPHY}${bits.join(' · ')}` : '';
  }

  private async share(): Promise<void> {
    const r = this.result;
    if (!r) return;
    const url = location.origin + location.pathname;
    const text = shareText(r);
    const full = `${text}\n${url}`;
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    const blob =
      this.snapshotPng ??
      (this.snapshot
        ? await new Promise<Blob | null>((res) => this.snapshot!.toBlob(res, 'image/png'))
        : null);
    // 1. Phones (and some desktops): the share sheet with the score card image.
    try {
      const file = blob ? new File([blob], 'cake-walk-score.png', { type: 'image/png' }) : null;
      if (file && nav.canShare?.({ files: [file] })) {
        await nav.share({ text: full, files: [file] });
        return;
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
    }
    // 2. Desktop: the image (and text where allowed) on the clipboard, ready to paste.
    if (blob && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      const text = new Blob([full], { type: 'text/plain' });
      const items: Record<string, Blob>[] = [
        { 'image/png': blob, 'text/plain': text },
        { 'image/png': blob },
      ];
      for (const item of items) {
        try {
          await navigator.clipboard.write([new ClipboardItem(item)]);
          this.flash('Score card copied! Paste it anywhere');
          return;
        } catch {
          /* try the next combination */
        }
      }
    }
    // 3. Text share, else copy the text and save the image.
    try {
      if (nav.share) {
        await nav.share({ text, url });
        return;
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
    }
    let copied = false;
    try {
      await navigator.clipboard.writeText(full);
      copied = true;
    } catch {
      /* no clipboard */
    }
    if (blob) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'cake-walk-score.png';
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      this.flash(copied ? 'Score card saved, text copied!' : 'Score card saved!');
    } else this.flash(copied ? 'Copied to clipboard!' : text);
  }
}
