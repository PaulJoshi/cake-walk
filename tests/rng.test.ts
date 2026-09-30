import { describe, expect, it } from 'vitest';
import { createRng, hashString, mulberry32, todaySeed } from '../src/game/rng';

describe('rng', () => {
  it('mulberry32 is deterministic for the same seed', () => {
    const a = mulberry32(1234);
    const b = mulberry32(1234);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('different seeds give different sequences', () => {
    const a = createRng('2026-09-30');
    const b = createRng('2026-10-01');
    const sa = Array.from({ length: 5 }, () => a.next());
    const sb = Array.from({ length: 5 }, () => b.next());
    expect(sa).not.toEqual(sb);
  });

  it('string seeds hash stably', () => {
    expect(hashString('cake')).toBe(hashString('cake'));
    expect(createRng('cake').next()).toBe(createRng('cake').next());
  });

  it('values stay in range', () => {
    const r = createRng(99);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const n = r.int(3, 5);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('formats today seed as YYYY-MM-DD', () => {
    expect(todaySeed(new Date(2026, 8, 30))).toBe('2026-09-30');
  });
});
