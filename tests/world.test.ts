import { describe, expect, it } from 'vitest';
import { World } from '../src/game/World';
import { T, DEG } from '../src/game/tuning';
import { LEVEL } from '../src/level/level';
import { Autopilot } from '../src/bot/autopilot';
import { BassDrop, Bouquet, Grandma, Toddler, Uncle } from '../src/level/obstacles';

const DT = 1 / T.SIM_HZ;
const idle = { walk: false, trayTarget: 0 };

function run(w: World, intent: (w: World) => { walk: boolean; trayTarget: number }, secs = 70) {
  for (let i = 0; i < secs * T.SIM_HZ && !w.finished; i++) {
    w.step(intent(w), DT);
    w.events.length = 0;
  }
}

describe('world outcomes', () => {
  it('times out when the waiter never moves', () => {
    const w = new World('timeout');
    const bot = new Autopilot();
    run(w, (w) => ({ walk: false, trayTarget: bot.update(w).trayTarget }));
    expect(w.outcome).toBe('timeout');
    expect(w.timeLeft).toBe(0);
  });

  it('topples when the lean exceeds the limit', () => {
    const w = new World('topple');
    w.cake.theta = T.TOPPLE_ANGLE * 0.99;
    w.cake.omega = 1;
    run(w, () => idle, 2);
    expect(w.outcome).toBe('toppled');
  });

  it('is a cupcake with fewer than 4 tiers', () => {
    const w = new World('cupcake');
    w.cake.tiers[3].s = 100;
    run(w, () => idle, 1);
    expect(w.outcome).toBe('cupcake');
  });

  it('wins by holding still in the table zone', () => {
    const w = new World('win');
    w.skipTo((LEVEL.TABLE.x0 + LEVEL.TABLE.x1) / 2);
    run(w, () => idle, 2);
    expect(w.outcome).toBe('won');
    expect(w.finalTimeLeft).toBeGreaterThan(0);
  });

  it('does not set down while leaning too far', () => {
    const w = new World('lean');
    w.skipTo((LEVEL.TABLE.x0 + LEVEL.TABLE.x1) / 2);
    w.cake.theta = T.SET_DOWN_ANGLE + 2 * DEG;
    w.step(idle, DT);
    expect(w.setDownHold).toBe(0);
  });

  it('cannot walk through the cake table', () => {
    const w = new World('wall');
    w.skipTo(LEVEL.TABLE.x - 20);
    run(w, () => ({ walk: true, trayTarget: 0 }), 3);
    expect(w.waiter.x).toBeLessThanOrEqual(LEVEL.TABLE.x);
  });

  it('the same seed gives the same obstacle variation', () => {
    const a = new World('same');
    const b = new World('same');
    const c = new World('different');
    const ua = a.obstacles.find((o) => o instanceof Uncle) as Uncle;
    const ub = b.obstacles.find((o) => o instanceof Uncle) as Uncle;
    const uc = c.obstacles.find((o) => o instanceof Uncle) as Uncle;
    expect(ua.beats).toEqual(ub.beats);
    expect(ua.beats).not.toEqual(uc.beats);
    expect(ua.x).toBe(ub.x);
    expect(ua.x).not.toBe(uc.x);
    const ta = a.obstacles.find((o) => o instanceof Toddler) as Toddler;
    const tb = b.obstacles.find((o) => o instanceof Toddler) as Toddler;
    expect(ta.minDelay).toBe(tb.minDelay);
  });

  it('bass drop fires at its seeded time, around 20 seconds remaining', () => {
    const w = new World('bass');
    const b = w.obstacles.find((o) => o instanceof BassDrop) as BassDrop;
    expect(Math.abs(b.dropAt - LEVEL.BASS_DROP_AT)).toBeLessThanOrEqual(T.BASS_DROP_SHIFT);
    let dropAt = -1;
    for (let i = 0; i < 50 * T.SIM_HZ && !w.finished; i++) {
      w.step(idle, DT);
      if (w.events.some((e) => e.type === 'bassDrop')) dropAt = w.timeLeft;
      w.events.length = 0;
    }
    expect(dropAt).toBeCloseTo(b.dropAt, 1);
  });

  it('the bouquet lands on the cake and raises its centre of mass', () => {
    const w = new World('bouquet');
    const bot = new Autopilot();
    const before = w.cake.com;
    const b = w.obstacles.find((o) => o instanceof Bouquet) as Bouquet;
    for (let i = 0; i < 60 * T.SIM_HZ && b.state !== 'landed' && !w.finished; i++) {
      w.step(bot.update(w), DT);
      w.events.length = 0;
    }
    expect(b.state).toBe('landed');
    expect(w.cake.com).toBeGreaterThan(before);
  });

  it('grandma blocks the lane while she is in it', () => {
    const w = new World('granny');
    const g = w.obstacles.find((o) => o instanceof Grandma) as Grandma;
    w.skipTo(g.trigger + 5);
    run(w, () => ({ walk: true, trayTarget: 0 }), 1.5);
    expect(g.active).toBe(true);
    expect(w.waiter.x).toBeLessThan(g.x);
  });
});
