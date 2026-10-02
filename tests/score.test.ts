import { describe, expect, it } from 'vitest';
import {
  grade,
  loadBest,
  loadWorld,
  saveBest,
  saveWorld,
  score,
  shareText,
  type KV,
  type RoundResult,
} from '../src/score/score';
import { formatTimer } from '../src/render/hud';

const base: RoundResult = {
  outcome: 'won',
  tiers: 7,
  secondsLeft: 17.3,
  clutches: 3,
  mode: 'daily',
  seed: '2026-09-30',
};
const r = (o: Partial<RoundResult>): RoundResult => ({ ...base, ...o });

function memory(): KV & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('grades', () => {
  it('S needs 7 tiers and at least 15 s left', () => {
    expect(grade(r({ tiers: 7, secondsLeft: 15 }))).toBe('S');
    expect(grade(r({ tiers: 7, secondsLeft: 14.99 }))).toBe('A');
  });
  it('A for 6+, B for 5, C for 4', () => {
    expect(grade(r({ tiers: 6, secondsLeft: 30 }))).toBe('A');
    expect(grade(r({ tiers: 5 }))).toBe('B');
    expect(grade(r({ tiers: 4 }))).toBe('C');
  });
  it('F for any loss', () => {
    expect(grade(r({ outcome: 'toppled' }))).toBe('F');
    expect(grade(r({ outcome: 'cupcake', tiers: 3 }))).toBe('F');
    expect(grade(r({ outcome: 'timeout' }))).toBe('F');
  });
});

describe('score', () => {
  it('tiers x 1000 + floor(seconds x 100) + 250 per clutch', () => {
    expect(score(base)).toBe(7000 + 1730 + 750);
    expect(score(r({ tiers: 4, secondsLeft: 0.019, clutches: 0 }))).toBe(4001);
  });
  it('losses score 0', () => {
    expect(score(r({ outcome: 'toppled' }))).toBe(0);
  });
});

describe('share text', () => {
  it('matches the spec example', () => {
    expect(shareText(base)).toBe(
      '🎂 CAKE WALK — Daily Challenge 2026-09-30 — Grade S — 7/7 tiers — 17.3s left — 3 clutch saves',
    );
  });
  it('singular clutch, no clutch, random and losses', () => {
    expect(shareText(r({ clutches: 1 }))).toMatch(/— 1 clutch save$/);
    expect(shareText(r({ clutches: 0 }))).toMatch(/17\.3s left$/);
    expect(shareText(r({ mode: 'free', seed: 'ABC' }))).toContain('Random #ABC');
    expect(shareText(r({ outcome: 'toppled', clutches: 0 }))).toBe(
      '🎂 CAKE WALK — Daily Challenge 2026-09-30 — Grade F — cake toppled',
    );
  });
  it('names the pirate ship', () => {
    expect(shareText(r({ world: 'pirate', clutches: 0 }))).toBe(
      '🎂 CAKE WALK — Pirate Ship — Daily Challenge 2026-09-30 — Grade S — 7/7 tiers — 17.3s left',
    );
  });
});

describe('best scores', () => {
  it('stores per mode and reports new bests', () => {
    const kv = memory();
    expect(loadBest('daily', kv)).toBeNull();
    expect(saveBest(r({ tiers: 5 }), kv)).toBe(true);
    expect(saveBest(r({ tiers: 4 }), kv)).toBe(false);
    expect(saveBest(base, kv)).toBe(true);
    expect(loadBest('daily', kv)?.grade).toBe('S');
    expect(loadBest('free', kv)).toBeNull();
  });
  it('keeps the pirate ship bests apart from the wedding', () => {
    const kv = memory();
    expect(saveBest(r({ world: 'pirate' }), kv)).toBe(true);
    expect(loadBest('daily', kv)).toBeNull();
    expect(loadBest('daily', kv, 'pirate')?.grade).toBe('S');
    expect(saveBest(base, kv)).toBe(true);
    expect(loadBest('daily', kv)?.grade).toBe('S');
  });
  it('remembers the picked world', () => {
    const kv = memory();
    expect(loadWorld(kv)).toBeNull();
    saveWorld('pirate', kv);
    expect(loadWorld(kv)).toBe('pirate');
  });
  it('survives broken storage', () => {
    const bad: KV = {
      getItem: () => {
        throw new Error('nope');
      },
      setItem: () => {
        throw new Error('nope');
      },
    };
    expect(loadBest('daily', bad)).toBeNull();
    expect(saveBest(base, bad)).toBe(false);
  });
});

describe('timer format', () => {
  it('shows 00:60 at the start and tenths under 10 s', () => {
    expect(formatTimer(60)).toBe('00:60');
    expect(formatTimer(59.5)).toBe('00:60');
    expect(formatTimer(42.2)).toBe('00:43');
    expect(formatTimer(9.44)).toBe('00:09.4');
    expect(formatTimer(0)).toBe('00:00.0');
  });
});
