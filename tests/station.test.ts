import { describe, expect, it } from 'vitest';
import { Autopilot } from '../src/bot/autopilot';
import { T } from '../src/game/tuning';
import { World, type GameEvent } from '../src/game/World';
import {
  GravityGlitch,
  LaserGate,
  MeteorShower,
  Saucer,
  Teleporter,
  Walkway,
} from '../src/level/obstacles';
import type { Obstacle } from '../src/level/obstacles/types';
import { STATION } from '../src/level/station';

const DT = 1 / T.SIM_HZ;
const find = <K>(w: World, cls: abstract new (...args: never[]) => K) =>
  w.obstacles.find((o) => o instanceof cls) as K;

/** Keep only the given obstacles in the world. */
function only(w: World, ...keep: Obstacle[]) {
  w.obstacles.splice(0, w.obstacles.length, ...keep);
}

/** Step the world, collecting every event. */
function run(w: World, intent: (w: World) => { walk: boolean; trayTarget: number }, secs: number) {
  const events: GameEvent[] = [];
  for (let i = 0; i < secs * T.SIM_HZ && !w.finished; i++) {
    w.step(intent(w), DT);
    events.push(...w.events);
    w.events.length = 0;
  }
  return events;
}

const stand = () => ({ walk: false, trayTarget: 0 });
const walk = () => ({ walk: true, trayTarget: 0 });

describe('space station world', () => {
  it('uses the station layout and its own obstacles', () => {
    const w = new World('station', 'space');
    expect(w.level).toBe(STATION);
    const kinds = w.obstacles.map((o) => o.kind);
    expect(kinds).toEqual(['walkway', 'laser', 'gravity', 'teleporter', 'ufo', 'meteors']);
  });

  it('varies every obstacle per seed', () => {
    const a = new World('same', 'space');
    const b = new World('same', 'space');
    const c = new World('other', 'space');
    expect(find(a, Walkway).speed).toBe(find(b, Walkway).speed);
    expect(find(a, Walkway).speed).not.toBe(find(c, Walkway).speed);
    expect(find(a, LaserGate).period).toBe(find(b, LaserGate).period);
    expect(find(a, LaserGate).period).not.toBe(find(c, LaserGate).period);
    expect(find(a, GravityGlitch).period).not.toBe(find(c, GravityGlitch).period);
    expect(find(a, Teleporter).jump).not.toBe(find(c, Teleporter).jump);
    expect(find(a, Saucer).trigger).not.toBe(find(c, Saucer).trigger);
    expect(find(a, MeteorShower).strikeAt).toBe(find(b, MeteorShower).strikeAt);
    expect(find(a, MeteorShower).strikeAt).not.toBe(find(c, MeteorShower).strikeAt);
  });

  it('the moving walkway carries a waiter who stands still', () => {
    const w = new World('belt', 'space');
    const belt = find(w, Walkway);
    only(w, belt);
    w.skipTo(belt.x0 + T.WALKWAY_RAMP + 1);
    const before = w.waiter.x;
    run(w, stand, 1);
    expect(w.waiter.x - before).toBeGreaterThan(belt.speed * 0.5);
    w.skipTo(belt.x1 + 10);
    const after = w.waiter.x;
    run(w, stand, 1);
    expect(w.waiter.x).toBe(after);
  });

  it('the laser zaps only while it is on', () => {
    const w = new World('laser', 'space');
    const laser = find(w, LaserGate);
    only(w, laser);
    // Park the waiter in the beam and wait for it to switch on.
    w.skipTo(laser.x);
    const bot = new Autopilot();
    let zappedWhileOn = 0;
    let zappedWhileOff = 0;
    for (let i = 0; i < laser.period * 2 * T.SIM_HZ && !w.finished; i++) {
      w.step({ walk: false, trayTarget: bot.update(w).trayTarget }, DT);
      for (const e of w.events) {
        if (e.type === 'zap') {
          if (laser.onAt(w.time)) zappedWhileOn++;
          else zappedWhileOff++;
        }
      }
      w.events.length = 0;
    }
    expect(zappedWhileOn).toBeGreaterThan(0);
    expect(zappedWhileOff).toBe(0);
  });

  it('the gravity glitch cycles light and heavy gravity inside its zone', () => {
    const w = new World('gravity', 'space');
    const g = find(w, GravityGlitch);
    only(w, g);
    w.skipTo((g.x0 + g.x1) / 2);
    const seen = new Set<number>();
    let minUp = 0;
    let maxUp = 0;
    for (let i = 0; i < g.period * T.SIM_HZ * 1.1; i++) {
      w.step({ walk: false, trayTarget: 0 }, DT);
      for (const e of w.events) if (e.type === 'gravity') seen.add(e.mult);
      w.events.length = 0;
      minUp = Math.min(minUp, w.floorAUp);
      maxUp = Math.max(maxUp, w.floorAUp);
      w.cake.theta = 0;
      w.cake.omega = 0;
    }
    expect(seen.has(T.GRAVITY_LOW)).toBe(true);
    expect(seen.has(g.heavy)).toBe(true);
    expect(minUp).toBeCloseTo((T.GRAVITY_LOW - 1) * T.G, 0);
    expect(maxUp).toBeCloseTo((g.heavy - 1) * T.G, 0);
    // Outside the zone gravity is normal.
    w.skipTo(g.x1 + 50);
    w.step({ walk: false, trayTarget: 0 }, DT);
    expect(w.floorAUp).toBe(0);
  });

  it('the teleporter beams the waiter down the corridor once', () => {
    const w = new World('beam', 'space');
    const tp = find(w, Teleporter);
    only(w, tp);
    w.skipTo(tp.x - 5);
    const events = run(w, walk, 0.5);
    const jump = events.find((e) => e.type === 'teleport');
    expect(jump).toBeDefined();
    expect(w.waiter.x).toBeGreaterThan(tp.exitX);
    expect(tp.used).toBe(true);
    expect(events.filter((e) => e.type === 'teleport')).toHaveLength(1);
  });

  it('the saucer beams the cake, then flees when the meteor alarm sounds', () => {
    const w = new World('ufo', 'space');
    const ufo = find(w, Saucer);
    const meteors = find(w, MeteorShower);
    only(w, ufo, meteors);
    const bot = new Autopilot();
    const hold = (w: World) => ({ walk: false, trayTarget: bot.update(w).trayTarget });
    w.skipTo(ufo.trigger + 1);
    run(w, hold, T.UFO_ARRIVE + 0.3);
    expect(ufo.beaming).toBe(true);
    expect(w.floorAUp).toBeLessThan(0);
    // Jump the clock to just after the alarm starts.
    w.time = T.ROUND_TIME - meteors.strikeAt - 3.2;
    run(w, hold, 0.5);
    expect(meteors.count).toBeGreaterThan(0);
    expect(ufo.beaming).toBe(false);
  });

  it('meteors count down, strike, breach the hull and the shutters close', () => {
    const w = new World('meteors', 'space');
    const m = find(w, MeteorShower);
    only(w, m);
    const bot = new Autopilot();
    w.time = T.ROUND_TIME - m.strikeAt - 4;
    const events = run(w, (w) => ({ walk: false, trayTarget: bot.update(w).trayTarget }), 8);
    const types = events.map((e) => e.type);
    const alarms = events.flatMap((e) => (e.type === 'alarm' ? [e.n] : []));
    expect(alarms).toEqual([3, 2, 1]);
    expect(types.filter((t) => t === 'meteor')).toHaveLength(m.impacts.length);
    expect(types.indexOf('breach')).toBeGreaterThan(types.lastIndexOf('meteor'));
    expect(types).toContain('shutters');
    expect(m.breaching).toBe(false);
  });
});
