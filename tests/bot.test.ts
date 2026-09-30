import { describe, expect, it } from 'vitest';
import { Autopilot } from '../src/bot/autopilot';
import { T } from '../src/game/tuning';
import { World } from '../src/game/World';

/**
 * Headless full-round run of the autopilot (no rendering). If this fails, re-tune the level
 * (obstacle timings / strengths in tuning.ts), not the bot.
 */
describe('autopilot across 30 seeds', () => {
  const seeds = Array.from({ length: 30 }, (_, i) => `bot-${i}`);
  it.each(seeds)('wins %s with >= 5 tiers in under 55 s', (seed) => {
    const w = new World(seed);
    const bot = new Autopilot();
    const dt = 1 / T.SIM_HZ;
    while (!w.finished) {
      w.step(bot.update(w), dt);
      w.events.length = 0;
    }
    expect(w.outcome).toBe('won');
    expect(w.cake.count).toBeGreaterThanOrEqual(5);
    expect(w.time).toBeLessThan(55);
  });

  it('is deterministic for a given seed', () => {
    const play = () => {
      const w = new World('determinism');
      const bot = new Autopilot();
      while (!w.finished) {
        w.step(bot.update(w), 1 / T.SIM_HZ);
        w.events.length = 0;
      }
      return [w.time, w.waiter.x, w.cake.theta, w.cake.count];
    };
    expect(play()).toEqual(play());
  });
});
