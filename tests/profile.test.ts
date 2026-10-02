import { describe, expect, it } from 'vitest';
import { Profile, kvStore, type ProfileData, type ProfileStore } from '../src/score/profile';
import { cleanName, randomName } from '../src/score/names';
import type { RoundResult } from '../src/score/score';

const round = (o: Partial<RoundResult> = {}): RoundResult => ({
  outcome: 'toppled',
  tiers: 7,
  secondsLeft: 30,
  clutches: 0,
  progress: 0.5,
  cargo: 3.5,
  leanAvg: 0.1,
  hits: 1,
  hitPower: 0.5,
  slips: 0,
  mode: 'daily',
  seed: '2026-10-02',
  world: 'wedding',
  ...o,
});

function memStore(initial: unknown = null): ProfileStore & { saved: ProfileData | null } {
  const st = {
    saved: null as ProfileData | null,
    load: async () => initial,
    save: async (d: ProfileData) => void (st.saved = structuredClone(d)),
  };
  return st;
}

const friday = new Date('2026-10-02T12:00:00Z');
const nextWeek = new Date('2026-10-06T12:00:00Z');

describe('names', () => {
  it('makes a default name', () => {
    expect(randomName(() => 0)).toBe('WobblyWaiter10');
    expect(randomName(() => 0.999)).toMatch(/^RapidPretzel99$/);
  });
  it('tidies typed names', () => {
    expect(cleanName('  Cake   Boss  ')).toBe('Cake Boss');
    expect(cleanName('<b>hi</b>')).toBe('bhib');
    expect(cleanName('x')).toBeNull();
    expect(cleanName('A'.repeat(40))).toHaveLength(16);
    expect(cleanName(42)).toBeNull();
    expect(cleanName('Zoë_99')).toBe('Zoë_99');
  });
});

describe('profile', () => {
  it('starts with an id and a name, and saves them', async () => {
    const st = memStore();
    const p = new Profile(st);
    await p.ready;
    expect(p.id.length).toBeGreaterThanOrEqual(16);
    expect(p.name).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d\d$/);
    expect(st.saved?.id).toBe(p.id);
  });

  it('keeps one best per world, from any outcome and either mode', async () => {
    const p = new Profile(memStore());
    await p.ready;
    const first = p.record(round(), friday);
    expect(first.isBest).toBe(true);
    expect(p.best('wedding')?.score).toBe(first.score);
    expect(p.record(round({ progress: 0.2, cargo: 1.4 }), friday).isBest).toBe(false);
    const better = p.record(round({ mode: 'free', progress: 0.7, cargo: 4.9 }), friday);
    expect(better.isBest).toBe(true);
    expect(p.best('wedding')?.mode).toBe('free');
    expect(p.best('pirate')).toBeNull();
    expect(p.record(round({ world: 'pirate' }), friday).isBest).toBe(true);
  });

  it('only queues weekly improvements for the scoreboard', async () => {
    const p = new Profile(memStore());
    await p.ready;
    const a = p.record(round(), friday);
    expect(a.submission?.week).toBe('2026-W40');
    expect(p.record(round({ progress: 0.3, cargo: 2.1 }), friday).submission).toBeNull();
    // A new week: the first score counts again even though it's below the all-time best.
    const b = p.record(round({ progress: 0.3, cargo: 2.1 }), nextWeek);
    expect(b.isBest).toBe(false);
    expect(b.submission?.week).toBe('2026-W41');
    expect(p.pendingSubmissions()).toHaveLength(1);
    p.settled(b.submission!);
    expect(p.pendingSubmissions()).toHaveLength(0);
  });

  it('loads what was stored and drops junk', async () => {
    const stored = {
      id: 'abcdefabcdefabcdef',
      name: 'Cake Boss',
      bests: { wedding: { score: 9000, grade: 'A', mode: 'daily', seed: 'x', at: 1 }, pirate: 7 },
      weekBests: {},
      pending: {},
    };
    const p = new Profile(memStore(stored));
    await p.ready;
    expect(p.id).toBe('abcdefabcdefabcdef');
    expect(p.name).toBe('Cake Boss');
    expect(p.best('wedding')?.score).toBe(9000);
    expect(p.best('pirate')).toBeNull();
  });

  it('renames, rejecting unusable names', async () => {
    const p = new Profile(memStore());
    await p.ready;
    expect(p.setName(' ')).toBeNull();
    expect(p.setName('Tier  Tamer')).toBe('Tier Tamer');
    expect(p.data.nameDirty).toBe(true);
    p.nameSynced();
    expect(p.data.nameDirty).toBe(false);
  });

  it('falls back to localStorage-like storage', async () => {
    const data = new Map<string, string>();
    const kv = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
    const a = new Profile(kvStore(kv));
    await a.ready;
    a.record(round(), friday);
    await new Promise((r) => setTimeout(r, 0));
    const b = new Profile(kvStore(kv));
    await b.ready;
    expect(b.id).toBe(a.id);
    expect(b.best('wedding')?.score).toBe(a.best('wedding')?.score);
  });
});
