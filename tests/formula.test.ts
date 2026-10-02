import { describe, expect, it } from 'vitest';
import { Autopilot } from '../src/bot/autopilot';
import { T } from '../src/game/tuning';
import { World } from '../src/game/World';
import { WORLD_IDS } from '../src/level/worlds';
import {
  SCORE_WORLDS,
  implausible,
  isoWeek,
  scoreParts,
  totalScore,
  type RoundStats,
} from '../src/score/formula';

const win: RoundStats = {
  outcome: 'won',
  tiers: 7,
  secondsLeft: 25,
  clutches: 1,
  progress: 1,
  cargo: 7,
  leanAvg: 0.04,
  hits: 2,
  hitPower: 0.9,
  slips: 2,
};
const s = (o: Partial<RoundStats>): RoundStats => ({ ...win, ...o });

/** Play a whole round headless; `naive` walks straight ahead without balancing. */
function play(seed: string, world = WORLD_IDS[0], naive = false): World {
  const w = new World(seed, world);
  const bot = new Autopilot();
  while (!w.finished) {
    const intent = bot.update(w);
    w.step(naive ? { walk: true, trayTarget: 0 } : intent, 1 / T.SIM_HZ);
    w.events.length = 0;
  }
  return w;
}

describe('score formula', () => {
  it('adds up its parts', () => {
    const p = scoreParts(win);
    const { total, ...parts } = p;
    expect(Object.values(parts).reduce((a, b) => a + b, 0)).toBe(total);
    expect(p.delivery).toBe(T.SCORE_DELIVERY + 7 * T.TIER_POINTS);
    expect(p.pace).toBe(25 * T.TIME_POINTS_PER_S);
    expect(p.bumps).toBeLessThan(0);
  });

  it('every part of play moves the score', () => {
    const base = totalScore(win);
    expect(totalScore(s({ secondsLeft: 24.9 }))).toBeLessThan(base);
    expect(totalScore(s({ leanAvg: 0.05 }))).toBeLessThan(base);
    expect(totalScore(s({ hitPower: 1.2 }))).toBeLessThan(base);
    expect(totalScore(s({ slips: 3 }))).toBeLessThan(base);
    expect(totalScore(s({ tiers: 6, cargo: 6.8 }))).toBeLessThan(base);
    expect(totalScore(s({ clutches: 2 }))).toBeGreaterThan(base);
  });

  it('two losses at the same spot still differ by quality and time', () => {
    const a = s({ outcome: 'toppled', progress: 0.6, cargo: 4.2, secondsLeft: 30, leanAvg: 0.1 });
    expect(totalScore(a)).toBeGreaterThan(0);
    expect(totalScore({ ...a, leanAvg: 0.12 })).not.toBe(totalScore(a));
    expect(totalScore({ ...a, secondsLeft: 28 })).not.toBe(totalScore(a));
  });

  it('a win beats any loss', () => {
    const bestLoss = s({
      outcome: 'timeout',
      progress: 0.999,
      cargo: 7,
      secondsLeft: 0,
      leanAvg: 0,
    });
    const worstWin = s({
      tiers: 4,
      cargo: 4,
      secondsLeft: 0.1,
      clutches: 0,
      leanAvg: 0.5,
      hitPower: 5,
    });
    expect(totalScore(worstWin)).toBeGreaterThan(totalScore(bestLoss));
  });

  it('has no ceiling', () => {
    expect(totalScore(s({ clutches: 80 }))).toBeGreaterThan(totalScore(s({ clutches: 40 })));
  });

  it('never goes negative', () => {
    expect(totalScore(s({ outcome: 'toppled', progress: 0, cargo: 0, hitPower: 3 }))).toBe(0);
  });
});

describe('scoreboard sanity checks', () => {
  it('knows every world', () => {
    expect([...SCORE_WORLDS].sort()).toEqual([...WORLD_IDS].sort());
  });

  it('accepts real rounds, won and lost, in every world', () => {
    for (const world of WORLD_IDS) {
      for (let i = 0; i < 4; i++) {
        const w = play(`sane-${i}`, world, i === 3);
        expect(implausible(w.stats()), `${world} ${i} ${w.outcome}`).toBeNull();
        expect(totalScore(w.stats())).toBeGreaterThan(0);
      }
    }
  });

  it('refuses impossible stats', () => {
    expect(implausible(null)).toBe('stats');
    expect(implausible(s({ outcome: 'none' as never }))).toBe('outcome');
    expect(implausible(s({ tiers: 8 }))).toBe('tiers');
    expect(implausible(s({ tiers: 2.5 }))).toBe('tiers');
    expect(implausible(s({ secondsLeft: 61 }))).toBe('secondsLeft');
    expect(implausible(s({ secondsLeft: 50 }))).toBe('won');
    expect(implausible(s({ progress: 0.9 }))).toBe('cargo');
    expect(implausible(s({ progress: 0.9, cargo: 6.3 }))).toBe('won');
    expect(implausible(s({ cargo: 6 }))).toBe('cargo');
    expect(implausible(s({ hitPower: 3 }))).toBe('hitPower');
    expect(implausible(s({ clutches: 500 }))).toBe('clutches');
    expect(implausible(s({ outcome: 'cupcake', tiers: 5 }))).toBe('cupcake');
    expect(implausible(s({ outcome: 'timeout', secondsLeft: 3 }))).toBe('timeout');
    expect(implausible(s({ leanAvg: Number.NaN }))).toBe('leanAvg');
    expect(implausible({ ...win, hits: '2' })).toBe('hits');
  });
});

describe('weeks', () => {
  it('uses ISO weeks in UTC', () => {
    expect(isoWeek(new Date('2026-10-02T11:00:00Z'))).toBe('2026-W40');
    expect(isoWeek(new Date('2026-10-04T23:59:59Z'))).toBe('2026-W40');
    expect(isoWeek(new Date('2026-10-05T00:00:00Z'))).toBe('2026-W41');
    expect(isoWeek(new Date('2027-01-01T12:00:00Z'))).toBe('2026-W53');
    expect(isoWeek(new Date('2024-12-30T12:00:00Z'))).toBe('2025-W01');
  });
});
