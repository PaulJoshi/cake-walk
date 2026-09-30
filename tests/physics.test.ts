import { describe, expect, it } from 'vitest';
import { T, DEG } from '../src/game/tuning';
import {
  addTopMass,
  applyImpulse,
  createCake,
  recomputeL,
  slideLimit,
  stepCake,
} from '../src/physics/cake';
import { createWaiter, stepWaiter } from '../src/physics/waiter';

const DT = 1 / T.SIM_HZ;
const env = { decelMult: 1, blockX: Infinity, blockV: 0 };

function settle(theta0: number, secs = 6) {
  const c = createCake(T);
  c.theta = theta0;
  let maxAbs = 0;
  for (let i = 0; i < secs * T.SIM_HZ; i++) {
    stepCake(T, c, 0, 0, DT);
    maxAbs = Math.max(maxAbs, Math.abs(c.theta));
  }
  return { c, maxAbs };
}

describe('cake pendulum', () => {
  it('settles from a 3 degree disturbance at rest', () => {
    const { c, maxAbs } = settle(3 * DEG);
    expect(c.toppled).toBe(false);
    expect(Math.abs(c.theta)).toBeLessThan(0.5 * DEG);
    expect(maxAbs).toBeLessThanOrEqual(3 * DEG + 1e-9);
    expect(c.count).toBe(T.TIER_COUNT);
  });

  it('settles from small disturbances in both directions', () => {
    for (const d of [-5, -1, 1, 5]) {
      const { c } = settle(d * DEG);
      expect(c.toppled).toBe(false);
      expect(Math.abs(c.theta)).toBeLessThan(0.5 * DEG);
    }
  });

  it('settles from a small angular-velocity kick', () => {
    const c = createCake(T);
    applyImpulse(c, 0.15, 0);
    for (let i = 0; i < 6 * T.SIM_HZ; i++) stepCake(T, c, 0, 0, DT);
    expect(c.toppled).toBe(false);
    expect(Math.abs(c.theta)).toBeLessThan(0.5 * DEG);
  });

  it('topples once past the topple angle', () => {
    const c = createCake(T);
    c.theta = T.TOPPLE_ANGLE + 0.01;
    stepCake(T, c, 0, 0, DT);
    expect(c.toppled).toBe(true);
  });

  it('falls over from a large lean with no help', () => {
    const { c } = settle(25 * DEG, 4);
    expect(c.toppled).toBe(true);
  });

  it('accelerating tips the cake backward, braking tips it forward', () => {
    const a = createCake(T);
    const b = createCake(T);
    for (let i = 0; i < 20; i++) {
      stepCake(T, a, 200, 0, DT);
      stepCake(T, b, -200, 0, DT);
    }
    expect(a.theta).toBeLessThan(0);
    expect(b.theta).toBeGreaterThan(0);
  });

  it('is stable while walking at constant speed', () => {
    const c = createCake(T);
    const w = createWaiter();
    w.v = T.WALK_MAX;
    c.theta = 2 * DEG;
    const intent = { walk: true, trayTarget: 0 };
    for (let i = 0; i < 8 * T.SIM_HZ; i++) {
      stepWaiter(T, w, intent, env, DT);
      stepCake(T, c, w.aTray, w.aUp, DT);
    }
    expect(c.toppled).toBe(false);
    expect(Math.abs(c.theta)).toBeLessThan(1 * DEG);
  });

  it('a full-throttle start with no balancing is a real threat', () => {
    const c = createCake(T);
    const w = createWaiter();
    const intent = { walk: true, trayTarget: 0 };
    let max = 0;
    for (let i = 0; i < 5 * T.SIM_HZ && !c.toppled; i++) {
      stepWaiter(T, w, intent, env, DT);
      stepCake(T, c, w.aTray, w.aUp, DT);
      max = Math.max(max, Math.abs(c.theta));
    }
    expect(max).toBeGreaterThan(T.GASP_ANGLE);
  });
});

describe('tiers', () => {
  it('the pendulum gets shorter when tiers are lost', () => {
    const c = createCake(T);
    const full = c.L;
    c.count = 4;
    recomputeL(T, c);
    expect(c.L).toBeLessThan(full);
  });

  it('bouquet mass on top raises the centre of mass', () => {
    const c = createCake(T);
    const before = c.com;
    addTopMass(T, c, T.BOUQUET_MASS);
    expect(c.com).toBeGreaterThan(before);
    expect(c.L).toBeGreaterThan(0);
  });

  it('removes a sliding tier and every tier above it', () => {
    const c = createCake(T);
    c.tiers[4].s = slideLimit(T, c, 4) + 1;
    const fell = stepCake(T, c, 0, 0, DT);
    expect(fell).toBe(4);
    expect(c.count).toBe(4);
  });

  it('removes the top tier alone when only it slides off', () => {
    const c = createCake(T);
    const top = T.TIER_COUNT - 1;
    c.tiers[top].sv = 400;
    let fell = -1;
    for (let i = 0; i < 60 && fell < 0; i++) fell = stepCake(T, c, 0, 0, DT);
    expect(fell).toBe(top);
    expect(c.count).toBe(top);
  });

  it('tier widths taper from bottom to top', () => {
    const c = createCake(T);
    expect(c.tiers[0].w).toBe(T.TIER_W_BOTTOM);
    expect(c.tiers[T.TIER_COUNT - 1].w).toBe(T.TIER_W_TOP);
    for (let j = 1; j < T.TIER_COUNT; j++) expect(c.tiers[j].w).toBeLessThan(c.tiers[j - 1].w);
  });

  it('hits push the top tiers more than the lower ones', () => {
    const c = createCake(T);
    applyImpulse(c, 0, 50);
    expect(Math.abs(c.tiers[6].sv)).toBeGreaterThan(Math.abs(c.tiers[1].sv));
  });
});

describe('waiter', () => {
  it('accelerates to max speed while walking and stops when released', () => {
    const w = createWaiter();
    for (let i = 0; i < 2 * T.SIM_HZ; i++) stepWaiter(T, w, { walk: true, trayTarget: 0 }, env, DT);
    expect(w.v).toBeCloseTo(T.WALK_MAX, 5);
    for (let i = 0; i < 1 * T.SIM_HZ; i++)
      stepWaiter(T, w, { walk: false, trayTarget: 0 }, env, DT);
    expect(w.v).toBe(0);
  });

  it('never walks backwards', () => {
    const w = createWaiter(100);
    for (let i = 0; i < T.SIM_HZ; i++) stepWaiter(T, w, { walk: false, trayTarget: -1 }, env, DT);
    expect(w.x).toBe(100);
  });

  it('keeps the tray within arm reach', () => {
    const w = createWaiter();
    for (let i = 0; i < 2 * T.SIM_HZ; i++)
      stepWaiter(T, w, { walk: false, trayTarget: 5 }, env, DT);
    expect(w.tray).toBeCloseTo(T.TRAY_REACH, 3);
  });

  it('slides further when stopping on the spill', () => {
    const run = (mult: number) => {
      const w = createWaiter();
      w.v = T.WALK_MAX;
      const e = { decelMult: mult, blockX: Infinity, blockV: 0 };
      for (let i = 0; i < 3 * T.SIM_HZ; i++)
        stepWaiter(T, w, { walk: false, trayTarget: 0 }, e, DT);
      return w.x;
    };
    expect(run(T.SPILL_DECEL_MULT)).toBeGreaterThan(run(1) * 2);
  });

  it('cannot pass a blocker', () => {
    const w = createWaiter();
    const e = { decelMult: 1, blockX: 50, blockV: 0 };
    for (let i = 0; i < 3 * T.SIM_HZ; i++) stepWaiter(T, w, { walk: true, trayTarget: 0 }, e, DT);
    expect(w.x).toBeLessThanOrEqual(50);
  });
});
