import { describe, expect, it } from 'vitest';
import { Autopilot } from '../src/bot/autopilot';
import { T } from '../src/game/tuning';
import { World } from '../src/game/World';
import { WORLD_IDS } from '../src/level/worlds';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_IDS,
  newAchievements,
  pastZone,
} from '../src/score/achievements';
import { Profile, type ProfileStore } from '../src/score/profile';
import type { RoundResult } from '../src/score/score';

const round = (o: Partial<RoundResult> = {}): RoundResult => ({
  outcome: 'toppled',
  tiers: 7,
  secondsLeft: 30,
  clutches: 0,
  progress: 0.3,
  cargo: 2.1,
  leanAvg: 0.2,
  hits: 1,
  hitPower: 0.5,
  slips: 0,
  mode: 'daily',
  seed: '2026-10-02',
  world: 'wedding',
  ...o,
});

const win = (o: Partial<RoundResult> = {}) =>
  round({ outcome: 'won', progress: 1, cargo: 7, secondsLeft: 10, ...o });

const ids = (r: RoundResult, have: string[] = []) =>
  newAchievements(r, (id) => have.includes(id)).map((a) => a.id);

const memStore = (initial: unknown = null): ProfileStore => ({
  load: async () => initial,
  save: async () => undefined,
});

describe('achievements', () => {
  it('has unique ids, names and descriptions', () => {
    expect(ACHIEVEMENT_IDS.size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.name.length).toBeGreaterThan(0);
      expect(a.desc.length).toBeGreaterThan(0);
    }
    for (const w of WORLD_IDS) expect(ACHIEVEMENTS.filter((a) => a.world === w)).toHaveLength(3);
  });

  it('puts each signature obstacle part way along its world', () => {
    for (const [w, zone] of [
      ['wedding', 'DJ'],
      ['pirate', 'Kraken'],
      ['space', 'Saucer'],
    ] as const) {
      const p = pastZone(w, zone);
      expect(p).toBeGreaterThan(0.5);
      expect(p).toBeLessThan(1);
    }
    expect(() => pastZone('wedding', 'Table')).toThrow();
  });

  it('awards nothing for a short, ordinary try', () => {
    expect(ids(round())).toEqual([]);
  });

  it('counts getting past the kraken even when the cake is lost later', () => {
    const r = round({ world: 'pirate', progress: pastZone('pirate', 'Kraken') + 0.01 });
    expect(ids(r)).toEqual(['pirate-past']);
    // ...but only in its own world.
    expect(ids({ ...r, world: 'space' })).not.toContain('pirate-past');
  });

  it('awards a flawless delivery its whole set, once', () => {
    const r = win({ secondsLeft: 20, leanAvg: 0.02 });
    const got = ids(r);
    expect(got).toEqual(
      expect.arrayContaining([
        'full-stack',
        'steady',
        'score-low',
        'score-high',
        'wedding-deliver',
        'wedding-past',
        'wedding-s',
      ]),
    );
    expect(got).not.toContain('photo-finish');
    expect(got).not.toContain('globetrotter');
    expect(ids(r, got)).toEqual([]);
  });

  it('has a few for the near misses', () => {
    expect(ids(win({ tiers: 4, secondsLeft: 1, leanAvg: 0.3 }))).toContain('photo-finish');
    expect(ids(round({ outcome: 'cupcake', tiers: 3 }))).toContain('cupcake');
    expect(ids(round({ clutches: T.BADGE_CLUTCHES }))).toContain('nerves');
  });

  it('awards Globetrotter with the last world delivered', () => {
    const have = ['wedding-deliver', 'pirate-deliver'];
    expect(ids(win({ world: 'space' }), have)).toContain('globetrotter');
    expect(ids(win({ world: 'pirate' }), ['wedding-deliver'])).not.toContain('globetrotter');
  });

  it.each(WORLD_IDS)('gives the autopilot its delivery badges in %s', (world) => {
    const w = new World('bot-0', world);
    const bot = new Autopilot();
    while (!w.finished) {
      w.step(bot.update(w), 1 / T.SIM_HZ);
      w.events.length = 0;
    }
    const got = ids({ ...w.stats(), mode: 'daily', seed: 'bot-0', world });
    expect(got).toEqual(expect.arrayContaining([`${world}-deliver`, `${world}-past`]));
  });
});

describe('badges in the profile', () => {
  it('records new badges with the round and keeps them', async () => {
    const p = new Profile(memStore());
    await p.ready;
    const at = new Date('2026-10-02T12:00:00Z');
    const first = p.record(win({ world: 'pirate', secondsLeft: 5, leanAvg: 0.3 }), at);
    expect(first.badges.map((a) => a.id)).toContain('pirate-deliver');
    expect(p.hasBadge('pirate-deliver')).toBe(true);
    expect(p.data.badges['pirate-deliver']).toBe(+at);
    expect(p.record(win({ world: 'pirate', secondsLeft: 5 }), at).badges).toEqual([]);
  });

  it('loads stored badges and drops unknown ones', async () => {
    const p = new Profile(
      memStore({ id: 'abcdefabcdefabcdef', badges: { 'full-stack': 5, nope: 1, steady: 'x' } }),
    );
    await p.ready;
    expect(p.data.badges).toEqual({ 'full-stack': 5 });
  });

  it('keeps badges earned before the stored profile loaded', async () => {
    let release!: (v: unknown) => void;
    const store: ProfileStore = {
      load: () => new Promise((r) => (release = r)),
      save: async () => undefined,
    };
    const p = new Profile(store);
    p.record(win({ world: 'space', secondsLeft: 5 }));
    release({ id: 'abcdefabcdefabcdef', badges: { 'wedding-deliver': 1 } });
    await p.ready;
    expect(p.hasBadge('wedding-deliver')).toBe(true);
    expect(p.hasBadge('space-deliver')).toBe(true);
  });
});
