import { T } from '../game/tuning';
import { createIntent, type Intent } from './intent';

export type { Intent } from './intent';

export type BalanceDevice = 'mouse' | 'keyboard' | 'touch' | 'tilt';
export type InputAction = 'retry' | 'pause' | 'mute' | 'any' | 'fullscreen' | `zone${number}`;

const WALK_KEYS = new Set(['Space', 'KeyW', 'ArrowUp']);
const LEFT_KEYS = new Set(['KeyA', 'ArrowLeft']);
const RIGHT_KEYS = new Set(['KeyD', 'ArrowRight']);
/** Keys that never count as "press any key to start". */
const NOT_ANY = new Set([
  'KeyM',
  'KeyF',
  'Tab',
  'ShiftLeft',
  'ShiftRight',
  'Escape',
  'KeyP',
  'MetaLeft',
  'MetaRight',
  'AltLeft',
  'AltRight',
  'ControlLeft',
  'ControlRight',
]);
/** Tilt angle (degrees) that maps to a full tray offset. */
const TILT_RANGE = 16;
/** Horizontal drag distance (CSS px) that maps to a full tray offset on touch. */
const DRAG_RANGE = 70;
/** Mouse: the central fraction of the canvas width spans the full tray range. */
const MOUSE_SPAN = 0.8;
/** localStorage key for an explicit tilt on/off choice ('1' / '0'). */
const TILT_KEY = 'cakewalk.tilt';

type PermissionDOE = { requestPermission?: () => Promise<'granted' | 'denied'> };

/** iOS Safari: orientation events need a permission prompt from a user tap. */
const tiltNeedsPermission = (): boolean =>
  typeof (window.DeviceOrientationEvent as unknown as PermissionDOE | undefined)
    ?.requestPermission === 'function';

function loadTiltPref(): boolean | null {
  try {
    const v = localStorage.getItem(TILT_KEY);
    return v === '1' ? true : v === '0' ? false : null;
  } catch {
    return null;
  }
}

function saveTiltPref(on: boolean): void {
  try {
    localStorage.setItem(TILT_KEY, on ? '1' : '0');
  } catch {
    /* storage unavailable */
  }
}

interface TouchInfo {
  side: 'walk' | 'balance';
  x0: number;
  x: number;
}

const clamp1 = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);

/**
 * Collects keyboard, mouse, touch and device tilt and reduces them to one Intent per tick.
 * The simulation never sees raw input.
 */
export class Input {
  readonly intent: Intent = createIntent();
  device: BalanceDevice = 'mouse';
  enabled = true;
  /** The player wants tilt; it steers once the device reports orientation. */
  tiltEnabled = false;
  /** True once any touch has been seen (show touch hints). */
  touchSeen = false;

  private readonly keys = new Set<string>();
  private mouseDown = false;
  private mouseTarget = 0;
  private keyTarget = 0;
  private readonly touches = new Map<number, TouchInfo>();
  private touchTarget = 0;
  private tiltRaw = 0;
  private tiltZero = 0;
  private tiltSeen = false;
  /** iOS permission prompt state for this page load. */
  private tiltAsked = false;
  private listeners: ((a: InputAction) => void)[] = [];

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.releaseAll());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e.clientX));
    // The whole screen (including letterbox bars) is the touch surface, but never
    // steal events from overlay buttons.
    const surface = canvas.parentElement ?? canvas;
    const onSurface = (e: Event) => e.target === canvas || e.target === surface;
    surface.addEventListener('pointerdown', (e) => onSurface(e) && this.onPointerDown(e));
    window.addEventListener(
      'pointerdown',
      (e) => {
        if (e.pointerType !== 'mouse') this.touchSeen = true;
      },
      true,
    );
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    window.addEventListener('mouseup', () => (this.mouseDown = false));
    surface.addEventListener('contextmenu', (e) => onSurface(e) && e.preventDefault());
    // Stop iOS double-tap zoom / scroll / long-press on the play area.
    const block = (e: TouchEvent) => {
      if (onSurface(e)) e.preventDefault();
    };
    surface.addEventListener('touchstart', block, { passive: false });
    surface.addEventListener('touchmove', block, { passive: false });
    window.addEventListener('deviceorientation', (e) => this.onOrientation(e));
    // Phones default to tilt unless the player turned it off. Where no permission is
    // needed (Android) it starts right away; iOS asks on the first tap (see askTiltOnFirstTap).
    if (this.tiltSupported && loadTiltPref() !== false && !tiltNeedsPermission())
      this.tiltEnabled = true;
  }

  /** A touch-first device that can report orientation. */
  get tiltSupported(): boolean {
    return (
      (window.matchMedia?.('(pointer: coarse)').matches ?? false) &&
      'DeviceOrientationEvent' in window
    );
  }

  /** Tilt is on and actually steering (orientation data has arrived). */
  get tiltActive(): boolean {
    return this.tiltEnabled && this.tiltSeen;
  }

  /** True until the first tap on a phone that needs the iOS motion permission prompt. */
  get askTiltOnFirstTap(): boolean {
    return (
      !this.tiltAsked &&
      !this.tiltEnabled &&
      this.tiltSupported &&
      tiltNeedsPermission() &&
      loadTiltPref() !== false
    );
  }

  on(fn: (a: InputAction) => void): void {
    this.listeners.push(fn);
  }

  private emit(a: InputAction): void {
    for (const fn of this.listeners) fn(a);
  }

  releaseAll(): void {
    this.keys.clear();
    this.mouseDown = false;
    this.touches.clear();
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const target = e.target as HTMLElement | null;
    const onButton = target && (target.tagName === 'BUTTON' || target.tagName === 'A');
    const code = e.code;
    const gameKey = WALK_KEYS.has(code) || LEFT_KEYS.has(code) || RIGHT_KEYS.has(code);
    // Let Space/Enter activate focused buttons in overlays.
    if (onButton && (code === 'Space' || code === 'Enter')) return;
    if (gameKey) e.preventDefault();
    if (down) {
      if (e.repeat) return;
      this.keys.add(code);
      if (LEFT_KEYS.has(code) || RIGHT_KEYS.has(code)) this.device = 'keyboard';
      if (code === 'KeyR') this.emit('retry');
      else if (code === 'KeyP' || code === 'Escape') this.emit('pause');
      else if (code === 'KeyM') this.emit('mute');
      else if (code === 'KeyF') this.emit('fullscreen');
      else if (/^Digit\d$/.test(code)) this.emit(`zone${Number(code.slice(5))}`);
      if (!NOT_ANY.has(code) && !e.metaKey && !e.ctrlKey && !e.altKey) this.emit('any');
    } else this.keys.delete(code);
  }

  private onMouseMove(clientX: number): void {
    const r = this.canvas.getBoundingClientRect();
    if (r.width === 0) return;
    const rel = (clientX - r.left) / r.width; // 0..1 across the canvas
    this.mouseTarget = clamp1(((rel - 0.5) * 2) / MOUSE_SPAN);
    this.device = 'mouse';
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.pointerType === 'mouse') {
      if (e.button === 0) {
        this.mouseDown = true;
        this.onMouseMove(e.clientX);
      }
      this.emit('any');
      return;
    }
    this.touchSeen = true;
    const side = e.clientX > window.innerWidth / 2 ? 'walk' : 'balance';
    this.touches.set(e.pointerId, { side, x0: e.clientX, x: e.clientX });
    if (side === 'balance' && !this.tiltEnabled) this.device = 'touch';
    this.emit('any');
  }

  private onPointerMove(e: PointerEvent): void {
    const t = this.touches.get(e.pointerId);
    if (!t) return;
    t.x = e.clientX;
    if (t.side === 'balance') {
      this.touchTarget = clamp1((t.x - t.x0) / DRAG_RANGE);
      this.device = 'touch';
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (e.pointerType === 'mouse') {
      this.mouseDown = false;
      return;
    }
    this.touches.delete(e.pointerId);
  }

  private onOrientation(e: DeviceOrientationEvent): void {
    if (e.gamma == null || e.beta == null) return;
    const angle = screen.orientation?.angle ?? (window.orientation as number | undefined) ?? 0;
    // Left/right tilt relative to the screen, whatever the orientation.
    let v: number;
    if (angle === 90) v = e.beta;
    else if (angle === -90 || angle === 270) v = -e.beta;
    else if (angle === 180) v = -e.gamma;
    else v = e.gamma;
    this.tiltRaw = v;
    this.tiltSeen = true;
    if (this.tiltEnabled) this.device = 'tilt';
  }

  /** Whether the device has reported orientation data. */
  get hasTilt(): boolean {
    return this.tiltSeen;
  }

  /**
   * Turn tilt on. On iOS this shows the motion permission prompt, so call it straight from
   * a tap handler. `remember` stores the choice (an explicit toggle, not the default).
   */
  async enableTilt(remember = false): Promise<boolean> {
    if (remember) saveTiltPref(true);
    const DOE = window.DeviceOrientationEvent as unknown as PermissionDOE | undefined;
    try {
      if (DOE && typeof DOE.requestPermission === 'function') {
        this.tiltAsked = true;
        const res = await DOE.requestPermission();
        if (res !== 'granted') return false;
      }
    } catch {
      return false;
    }
    this.tiltEnabled = true;
    if (this.tiltSeen) this.device = 'tilt';
    this.calibrateTilt();
    return true;
  }

  /** Turn tilt off and balance by dragging; remembered so phones stop defaulting to it. */
  disableTilt(): void {
    saveTiltPref(false);
    this.tiltEnabled = false;
    if (this.device === 'tilt') this.device = 'touch';
  }

  /** Resolves true once orientation data arrives, false after `ms` without any. */
  waitForTilt(ms = 1000): Promise<boolean> {
    if (this.tiltSeen) return Promise.resolve(true);
    return new Promise((res) => {
      const t0 = performance.now();
      const poll = () => {
        if (this.tiltSeen) res(true);
        else if (performance.now() - t0 > ms) res(false);
        else window.setTimeout(poll, 100);
      };
      poll();
    });
  }

  /** Zero the tilt at the current angle (called at countdown). */
  calibrateTilt(): void {
    this.tiltZero = this.tiltRaw;
  }

  /** Reduce everything to this tick's Intent. */
  update(dt: number): Intent {
    const it = this.intent;
    let walkTouch = false;
    let balanceTouch = false;
    for (const t of this.touches.values()) {
      if (t.side === 'walk') walkTouch = true;
      else balanceTouch = true;
    }
    let walkKey = false;
    for (const k of WALK_KEYS) if (this.keys.has(k)) walkKey = true;
    it.walk = this.enabled && (walkKey || this.mouseDown || walkTouch);

    // Keyboard tray target: move at a fixed rate, ease back to 0 when released.
    let dir = 0;
    for (const k of LEFT_KEYS) if (this.keys.has(k)) dir -= 1;
    for (const k of RIGHT_KEYS) if (this.keys.has(k)) dir += 1;
    if (dir !== 0) this.keyTarget = clamp1(this.keyTarget + dir * T.KEY_TRAY_RATE * dt);
    else {
      const step = T.KEY_TRAY_RETURN * dt;
      this.keyTarget =
        Math.abs(this.keyTarget) <= step ? 0 : this.keyTarget - Math.sign(this.keyTarget) * step;
    }
    if (!balanceTouch) {
      const step = T.KEY_TRAY_RETURN * dt;
      this.touchTarget =
        Math.abs(this.touchTarget) <= step
          ? 0
          : this.touchTarget - Math.sign(this.touchTarget) * step;
    }

    let target: number;
    switch (this.device) {
      case 'keyboard':
        target = this.keyTarget;
        break;
      case 'touch':
        target = this.touchTarget;
        break;
      case 'tilt':
        target = balanceTouch
          ? this.touchTarget
          : clamp1((this.tiltRaw - this.tiltZero) / TILT_RANGE);
        break;
      default:
        target = this.mouseTarget;
    }
    it.trayTarget = this.enabled ? target : 0;
    return it;
  }

  /** Raw walk key state for UI hints. */
  get walkHeld(): boolean {
    return this.intent.walk;
  }
}
