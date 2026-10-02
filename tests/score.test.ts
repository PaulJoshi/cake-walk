import { describe, expect, it } from 'vitest';
import {
  fmtScore,
  grade,
  loadWorld,
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
  progress: 1,
  cargo: 7,
  leanAvg: 0.05,
  hits: 2,
  hitPower: 0.8,
  slips: 1,
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
  it('scores every try, wins well above losses', () => {
    const won = score(base);
    const toppled = score(r({ outcome: 'toppled', progress: 0.8, cargo: 5.6, secondsLeft: 20 }));
    const early = score(r({ outcome: 'toppled', progress: 0.05, cargo: 0.35, secondsLeft: 57 }));
    expect(early).toBeGreaterThan(0);
    expect(toppled).toBeGreaterThan(early);
    expect(won).toBeGreaterThan(toppled);
  });
});

describe('share text', () => {
  const pts = fmtScore(score(base));
  it('leads with the score', () => {
    expect(shareText(base)).toBe(
      `🎂 CAKE WALK — Daily Challenge 2026-09-30 — ${pts} pts — Grade S — 7/7 tiers — 17.3s left — 3 clutch saves`,
    );
  });
  it('singular clutch, no clutch, random and losses', () => {
    expect(shareText(r({ clutches: 1 }))).toMatch(/— 1 clutch save$/);
    expect(shareText(r({ clutches: 0 }))).toMatch(/17\.3s left$/);
    expect(shareText(r({ mode: 'free', seed: 'ABC' }))).toContain('Random #ABC');
    const lost = r({ outcome: 'toppled', clutches: 0, progress: 0.42 });
    expect(shareText(lost)).toBe(
      `🎂 CAKE WALK — Daily Challenge 2026-09-30 — ${fmtScore(score(lost))} pts — Grade F — cake toppled — 42% of the way`,
    );
  });
  it('names the world', () => {
    expect(shareText(r({ world: 'pirate', clutches: 0 }))).toMatch(
      /^🎂 CAKE WALK — Pirate Ship — Daily Challenge 2026-09-30 — [\d,]+ pts — Grade S/,
    );
    expect(shareText(r({ world: 'space' }))).toContain('— Space Station —');
  });
});

describe('saved world', () => {
  it('remembers the picked world', () => {
    const kv = memory();
    expect(loadWorld(kv)).toBeNull();
    saveWorld('pirate', kv);
    expect(loadWorld(kv)).toBe('pirate');
    saveWorld('space', kv);
    expect(loadWorld(kv)).toBe('space');
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
    expect(loadWorld(bad)).toBeNull();
    expect(() => saveWorld('pirate', bad)).not.toThrow();
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
