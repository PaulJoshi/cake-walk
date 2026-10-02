import { describe, expect, it } from 'vitest';
import { handle, playerTag, upstash, type Redis } from '../api/scores';
import { totalScore, type RoundStats } from '../src/score/formula';

/** Just enough of Redis for the scoreboard: sorted sets, one hash, counters. */
function fakeRedis() {
  const z = new Map<string, Map<string, number>>();
  const h = new Map<string, Map<string, string>>();
  const n = new Map<string, number>();
  const sorted = (k: string) =>
    [...(z.get(k) ?? new Map<string, number>())].sort(
      (a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1),
    );
  const run = (c: (string | number)[]): unknown => {
    const [cmd, key, ...a] = c.map(String);
    switch (cmd) {
      case 'ZADD': {
        const set = z.get(key) ?? new Map<string, number>();
        z.set(key, set);
        const score = Number(a[1]);
        const prev = set.get(a[2]);
        if (prev === undefined || score > prev) set.set(a[2], score);
        return 1;
      }
      case 'ZRANGE': {
        const list = sorted(key).slice(Number(a[0]), Number(a[1]) + 1);
        return list.flatMap(([m, s]) => [m, String(s)]);
      }
      case 'ZREMRANGEBYRANK': {
        const asc = sorted(key).reverse();
        const stop = asc.length + Number(a[1]);
        if (stop < 0) return 0;
        asc.slice(Number(a[0]), stop + 1).forEach(([m]) => z.get(key)!.delete(m));
        return 0;
      }
      case 'ZREVRANK': {
        const i = sorted(key).findIndex(([m]) => m === a[0]);
        return i < 0 ? null : i;
      }
      case 'HSET':
        h.set(key, (h.get(key) ?? new Map()).set(a[0], a[1]));
        return 1;
      case 'HEXISTS':
        return h.get(key)?.has(a[0]) ? 1 : 0;
      case 'HMGET':
        return a.map((f) => h.get(key)?.get(f) ?? null);
      case 'INCR':
        n.set(key, (n.get(key) ?? 0) + 1);
        return n.get(key);
      case 'EXPIRE':
        return 1;
    }
    throw new Error(`unknown ${cmd}`);
  };
  const redis: Redis = async (cmds) => cmds.map(run);
  return { redis, z, h };
}

const now = new Date('2026-10-02T12:00:00Z');
const stats: RoundStats = {
  outcome: 'won',
  tiers: 6,
  secondsLeft: 22.5,
  clutches: 1,
  progress: 1,
  cargo: 6.6,
  leanAvg: 0.05,
  hits: 2,
  hitPower: 0.7,
  slips: 1,
};
const PLAYER = 'player-aaaaaaaaaaaaaaaa';

const post = (body: unknown, ip = '1.2.3.4') =>
  new Request('https://x.test/api/scores', {
    method: 'POST',
    headers: { 'x-real-ip': ip },
    body: JSON.stringify(body),
  });
const get = (world: string) => new Request(`https://x.test/api/scores?world=${world}`);
const submission = (o: Record<string, unknown> = {}) => ({
  player: PLAYER,
  name: 'Cake Boss',
  world: 'pirate',
  week: '2026-W40',
  score: totalScore(stats),
  stats,
  ...o,
});

describe('scoreboard API', () => {
  it('answers 503 without Redis, so the game hides the scoreboard', async () => {
    expect(upstash({})).toBeNull();
    expect((await handle(get('wedding'), null)).status).toBe(503);
  });

  it('records a score on the weekly and all-time boards', async () => {
    const { redis } = fakeRedis();
    const res = await handle(post(submission()), redis, now);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ score: totalScore(stats), weekRank: 1, allRank: 1 });
    const board = await (await handle(get('pirate'), redis, now)).json();
    const row = { name: 'Cake Boss', score: totalScore(stats), tag: playerTag(PLAYER) };
    expect(board).toEqual({ world: 'pirate', week: [row], all: [row] });
    // Other worlds are separate.
    expect((await (await handle(get('space'), redis, now)).json()).all).toEqual([]);
  });

  it('keeps each player best and ranks them', async () => {
    const { redis } = fakeRedis();
    await handle(post(submission()), redis, now);
    const worse = { ...stats, secondsLeft: 21 };
    const r1 = await handle(
      post(submission({ stats: worse, score: totalScore(worse) })),
      redis,
      now,
    );
    expect((await r1.json()).allRank).toBe(1);
    const other = { ...stats, secondsLeft: 30 };
    const r2 = await handle(
      post(
        submission({
          player: 'player-bbbbbbbbbbbbbbbb',
          name: 'Tier Tamer',
          stats: other,
          score: totalScore(other),
        }),
      ),
      redis,
      now,
    );
    expect(await r2.json()).toMatchObject({ weekRank: 1, allRank: 1 });
    const board = await (await handle(get('pirate'), redis, now)).json();
    expect(board.all.map((e: { name: string }) => e.name)).toEqual(['Tier Tamer', 'Cake Boss']);
    expect(board.all[1].score).toBe(totalScore(stats));
  });

  it('refuses tampered or impossible scores', async () => {
    const { redis } = fakeRedis();
    const tampered = await handle(post(submission({ score: 99999 })), redis, now);
    expect(tampered.status).toBe(422);
    const fast = { ...stats, secondsLeft: 55 };
    expect(
      (await handle(post(submission({ stats: fast, score: totalScore(fast) })), redis, now)).status,
    ).toBe(422);
    expect((await handle(post(submission({ world: 'moon' })), redis, now)).status).toBe(400);
    expect((await handle(post(submission({ player: 'short' })), redis, now)).status).toBe(400);
    expect((await handle(post(submission({ name: '!' })), redis, now)).status).toBe(400);
    const junk = new Request('https://x.test/api/scores', { method: 'POST', body: '{nope' });
    expect((await handle(junk, redis, now)).status).toBe(400);
    expect((await handle(get('pirate'), redis, now)).status).toBe(200);
  });

  it('puts a score from an old week on the all-time board only', async () => {
    const { redis } = fakeRedis();
    const res = await handle(post(submission({ week: '2026-W39' })), redis, now);
    expect(await res.json()).toMatchObject({ allRank: 1, weekRank: null });
  });

  it('renames a player who is on a board, and only them', async () => {
    const { redis, h } = fakeRedis();
    await handle(
      post({ player: 'player-cccccccccccccccc', name: 'Ghost', action: 'name' }),
      redis,
      now,
    );
    expect(h.get('cw:names')?.size ?? 0).toBe(0);
    await handle(post(submission()), redis, now);
    await handle(post({ player: PLAYER, name: 'New Name', action: 'name' }), redis, now);
    const board = await (await handle(get('pirate'), redis, now)).json();
    expect(board.all[0].name).toBe('New Name');
  });

  it('keeps only the top 100', async () => {
    const { redis, z } = fakeRedis();
    for (let i = 0; i < 105; i++) {
      const st = { ...stats, secondsLeft: 10 + i / 10 };
      const id = `player-${String(i).padStart(16, '0')}`;
      await handle(
        post(submission({ player: id, stats: st, score: totalScore(st) }), `10.0.0.${i}`),
        redis,
        now,
      );
    }
    expect(z.get('cw:all:pirate')?.size).toBe(100);
    const board = await (await handle(get('pirate'), redis, now)).json();
    expect(board.all).toHaveLength(10);
  });

  it('rate limits writes per IP', async () => {
    const { redis } = fakeRedis();
    const codes = [];
    for (let i = 0; i < 22; i++) codes.push((await handle(post(submission()), redis, now)).status);
    expect(codes.at(-1)).toBe(429);
  });

  it('talks to Upstash over REST', async () => {
    const calls: { url: string; body: unknown; auth: string | null }[] = [];
    const f = (async (url: string, init: RequestInit) => {
      calls.push({
        url,
        body: JSON.parse(String(init.body)),
        auth: new Headers(init.headers).get('authorization'),
      });
      return new Response(JSON.stringify([{ result: 'OK' }]));
    }) as typeof fetch;
    const r = upstash({ KV_REST_API_URL: 'https://db.upstash.io/', KV_REST_API_TOKEN: 't0k' }, f)!;
    expect(await r([['PING']])).toEqual(['OK']);
    expect(calls[0]).toEqual({
      url: 'https://db.upstash.io/pipeline',
      body: [['PING']],
      auth: 'Bearer t0k',
    });
    expect(
      upstash({ UPSTASH_REDIS_REST_URL: 'u', UPSTASH_REDIS_REST_TOKEN: 't' }, f),
    ).not.toBeNull();
  });
});
