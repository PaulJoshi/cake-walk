import { describe, expect, it } from 'vitest';
import { Autopilot } from '../src/bot/autopilot';
import { T } from '../src/game/tuning';
import { World } from '../src/game/World';
import {
  Barrel,
  Cannonballs,
  Kraken,
  Parrot,
  Plank,
  RogueWave,
  Swell,
} from '../src/level/obstacles';
import { SHIP } from '../src/level/ship';

const DT = 1 / T.SIM_HZ;
const find = <K>(w: World, cls: abstract new (...args: never[]) => K) =>
  w.obstacles.find((o) => o instanceof cls) as K;

function run(w: World, intent: (w: World) => { walk: boolean; trayTarget: number }, secs: number) {
  for (let i = 0; i < secs * T.SIM_HZ && !w.finished; i++) {
    w.step(intent(w), DT);
    w.events.length = 0;
  }
}

describe('pirate ship world', () => {
  it('uses the ship layout and its own obstacles', () => {
    const w = new World('ship', 'pirate');
    expect(w.level).toBe(SHIP);
    const kinds = w.obstacles.map((o) => o.kind);
    expect(kinds).toEqual(['swell', 'cannonballs', 'barrel', 'plank', 'parrot', 'kraken', 'wave']);
  });

  it('varies every obstacle per seed', () => {
    const a = new World('same', 'pirate');
    const b = new World('same', 'pirate');
    const c = new World('other', 'pirate');
    expect(find(a, Swell).period).toBe(find(b, Swell).period);
    expect(find(a, Swell).period).not.toBe(find(c, Swell).period);
    expect(find(a, Barrel).period).toBe(find(b, Barrel).period);
    expect(find(a, Barrel).period).not.toBe(find(c, Barrel).period);
    expect(find(a, Cannonballs).xs).toEqual(find(b, Cannonballs).xs);
    expect(find(a, Cannonballs).xs).not.toEqual(find(c, Cannonballs).xs);
    expect(find(a, Plank).x0).not.toBe(find(c, Plank).x0);
    expect(find(a, Parrot).trigger).not.toBe(find(c, Parrot).trigger);
    expect(find(a, Kraken).x).not.toBe(find(c, Kraken).x);
    expect(find(a, RogueWave).breakAt).not.toBe(find(c, RogueWave).breakAt);
  });

  it('the plank bounces harder the faster you cross it', () => {
    const bounce = (fast: boolean) => {
      const w = new World('plank', 'pirate');
      const p = find(w, Plank);
      w.obstacles.splice(0, w.obstacles.length, p);
      w.skipTo(p.x0 - 60);
      let max = 0;
      for (let i = 0; i < 6 * T.SIM_HZ && w.waiter.x < p.x1; i++) {
        // Slow: feather the walk to stay around a third of full speed.
        const walk = fast || w.waiter.v < T.WALK_MAX / 3;
        w.step({ walk, trayTarget: 0 }, DT);
        w.events.length = 0;
        if (p.isOn(w.waiter.x)) max = Math.max(max, Math.abs(p.z - p.sagAt(w.waiter.x)));
      }
      return max;
    };
    expect(bounce(true)).toBeGreaterThan(bounce(false) * 2);
  });

  it('the parrot perches on the cake, raises its centre of mass, then flies off', () => {
    const w = new World('polly', 'pirate');
    const p = find(w, Parrot);
    const before = w.cake.com;
    const bot = new Autopilot();
    const hold = (w: World) => ({ walk: false, trayTarget: bot.update(w).trayTarget });
    w.skipTo(p.trigger + 1);
    run(w, hold, T.PARROT_CIRCLE + 0.1);
    expect(p.state).toBe('perched');
    expect(w.cake.com).toBeGreaterThan(before);
    run(w, hold, p.perchTime);
    expect(p.state).not.toBe('perched');
    expect(w.cake.com).toBeCloseTo(before, 5);
  });

  it('the kraken blocks the lane, then slams the deck', () => {
    const w = new World('kraken', 'pirate');
    const k = find(w, Kraken);
    w.skipTo(k.trigger + 5);
    run(w, () => ({ walk: true, trayTarget: 0 }), 1.5);
    expect(k.active).toBe(true);
    expect(w.waiter.x).toBeLessThan(k.x);
    let slammed = false;
    const bot = new Autopilot();
    for (let i = 0; i < 6 * T.SIM_HZ && !slammed; i++) {
      w.step({ walk: false, trayTarget: bot.update(w).trayTarget }, DT);
      slammed = w.events.some((e) => e.type === 'slam');
      w.events.length = 0;
    }
    expect(slammed).toBe(true);
  });

  it('the rogue wave breaks at its seeded time and leaves the deck wet', () => {
    const w = new World('wave', 'pirate');
    const r = find(w, RogueWave);
    const bot = new Autopilot();
    let breakAt = -1;
    for (let i = 0; i < 50 * T.SIM_HZ && !w.finished; i++) {
      w.step({ walk: false, trayTarget: bot.update(w).trayTarget }, DT);
      if (w.events.some((e) => e.type === 'wave')) breakAt = w.timeLeft;
      w.events.length = 0;
    }
    expect(breakAt).toBeCloseTo(r.breakAt, 1);
    expect(r.broken).toBe(true);
  });
});
