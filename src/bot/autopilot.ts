import type { World } from '../game/World';
import { createIntent, type Intent } from '../input/intent';
import { Spill } from '../level/obstacles/spill';
import type { Span } from '../level/obstacles/types';

const DEG = Math.PI / 180;

export interface AutopilotOptions {
  /** Proportional gain on the cake-top offset (beyond simply getting under it). */
  beta?: number;
  /** Derivative gain on the cake-top velocity (s). */
  alpha?: number;
  /** Simulated reaction delay (s); 0 for the perfect bot. */
  delay?: number;
  /** Use the segway rule (release walk when leaning back). */
  feather?: boolean;
  /** Feed-forward gain from walking acceleration to tray offset (px per px/s^2). */
  kappa?: number;
  /** Fraction of the tray offset given up per update, drifting it back to centre. */
  center?: number;
}

/**
 * PD-controller bot. Balance: move the tray towards the predicted lean ("get under it").
 * Walking: walk unless walking would run into a predicted lane hazard while braking would
 * not; queue politely behind blockers (grandma, the kraken); stop inside the table zone; ease
 * the tray back towards the centre so there is reach left for the next lean. Used by attract mode
 * and the headless bot test.
 */
export class Autopilot {
  readonly intent: Intent = createIntent();
  private readonly beta: number;
  private readonly alpha: number;
  private readonly feather: boolean;
  private readonly kappa: number;
  private readonly center: number;
  private readonly spans: Span[] = Array.from({ length: 4 }, () => ({ x0: 0, x1: 0 }));
  /** Ring buffer of observed [theta, omega] for the reaction delay. */
  private readonly hist: Float64Array;
  private histPos = 0;
  private histLen = 0;
  private readonly delayTicks: number;

  constructor(opts: AutopilotOptions = {}) {
    this.beta = opts.beta ?? 0.5;
    this.alpha = opts.alpha ?? 0.2;
    this.feather = opts.feather ?? true;
    this.kappa = opts.kappa ?? 0;
    this.center = opts.center ?? 0.03;
    this.delayTicks = Math.round((opts.delay ?? 0) * 120);
    this.hist = new Float64Array((this.delayTicks + 1) * 2);
  }

  update(w: World): Intent {
    const c = w.cake;
    const wt = w.waiter;
    const t = w.t;

    // Observe (possibly with a reaction delay).
    const n = this.delayTicks + 1;
    this.hist[this.histPos * 2] = c.theta;
    this.hist[this.histPos * 2 + 1] = c.omega;
    const newest = this.histPos;
    this.histPos = (this.histPos + 1) % n;
    this.histLen = Math.min(n, this.histLen + 1);
    const idx = this.histLen < n ? 0 : this.histPos;
    const th = this.hist[(this.delayTicks ? idx : newest) * 2];
    const om = this.hist[(this.delayTicks ? idx : newest) * 2 + 1];

    // ---- Balance. y = horizontal offset of the cake top from the hands; keep the tray a bit
    // beyond it so gravity pulls the top back over the hands.
    // Feed-forward: lead with the tray against the walking acceleration (tray back to start).
    const p =
      wt.tray * (1 - this.center) + this.beta * (th + this.alpha * om) * c.L - this.kappa * wt.a;
    this.intent.trayTarget = Math.max(-1, Math.min(1, p / t.TRAY_REACH));

    // ---- Walking.
    let walk = this.wantWalk(w);
    if (this.feather) {
      // Segway rule: stop pushing when the cake leans far back; speed up to catch a forward lean.
      if (walk && th < -12 * DEG) walk = false;
      else if (!walk && th > 14 * DEG && w.waiter.x < w.level.TABLE.x0 - 40 && this.safe(w, true))
        walk = true;
    }
    this.intent.walk = walk;
    return this.intent;
  }

  private wantWalk(w: World): boolean {
    const wt = w.waiter;
    const t = w.t;
    const stopDist = (wt.v * wt.v) / (2 * t.STOP_DECEL * w.env.decelMult);

    // Table: stop in the middle of the zone.
    const table = w.level.TABLE;
    const target = (table.x0 + table.x1) / 2;
    if (wt.x > table.x0 - 200) {
      if (w.inTableZone && wt.v < 3) return false;
      return wt.x + stopDist + 3 < target;
    }

    // Blockers (grandma, the kraken): keep a polite distance.
    for (const o of w.obstacles) {
      if (!o.queueX) continue;
      const gap = o.queueX(w) - wt.x;
      if (gap < stopDist + 10) return false;
    }

    // Don't come to a stop on the champagne.
    const spill = w.obstacles.find((o) => o instanceof Spill);
    if (spill && wt.x > spill.x0 - 5 && wt.x < spill.x1 + 5 && wt.v > 20) {
      if (this.safe(w, true)) return true;
    }

    if (this.safe(w, true)) return true;
    // Walking collides: keep walking a little longer only if we could still brake after.
    if (this.safe(w, false, 0.12)) return true;
    if (this.safe(w, false)) return false;
    // Both collide: power through.
    return true;
  }

  /**
   * Forward-simulate simple waiter kinematics and check the lane hazards.
   * @param walk hold walk (true) or brake (false) for the horizon
   * @param walkFirst when braking, keep walking for this many seconds first
   */
  private safe(w: World, walk: boolean, walkFirst = 0): boolean {
    const t = w.t;
    const half = t.WAITER_HALF_W + 3;
    let x = w.waiter.x;
    let v = w.waiter.v;
    const step = 1 / 40;
    for (let tau = 0; tau < 2.2; tau += step) {
      const walking = walk || tau < walkFirst;
      if (walking) v = Math.min(t.WALK_MAX, v + t.WALK_ACCEL * step);
      else v = Math.max(0, v - t.STOP_DECEL * w.env.decelMult * step);
      x += v * step;
      for (const o of w.obstacles) {
        if (!o.hazards) continue;
        const n = o.hazards(w, tau + step, this.spans);
        for (let i = 0; i < n; i++) {
          const s = this.spans[i];
          if (x - half < s.x1 && s.x0 < x + half) return false;
        }
      }
      if (!walking && v === 0 && tau > 1.2) break;
    }
    return true;
  }
}
