// The game-wide scoreboard: a Vercel Function backed by Upstash Redis (free tier).
//
//   GET  /api/scores?world=pirate  -> top 10 this week and all time
//   POST /api/scores {player, name, world, week, score, stats}  -> ranks after submitting
//   POST /api/scores {player, name, action: "name"}  -> rename everywhere
//
// Only the top KEEP scores per board are stored. Players are identified by a SHA-256 of a
// secret id that never leaves their browser otherwise. Submitted stats are range-checked and
// the score is recomputed from them, so a hand-edited score is refused. Without the Redis
// env vars every request answers 503 and the game quietly hides the scoreboard.
import { createHash } from 'node:crypto';
import { SCORE_WORLDS, implausible, isoWeek, totalScore } from '../src/score/formula.js';
import { cleanName } from '../src/score/names.js';

const TOP = 10;
const KEEP = 100;
/** Weekly boards are deleted a while after their week ends. */
const WEEK_TTL_S = 40 * 86_400;
/** Writes per IP per minute. */
const RATE_LIMIT = 20;
const MAX_BODY = 4096;

type Cmd = (string | number)[];
export type Redis = (cmds: Cmd[]) => Promise<unknown[]>;

export interface Entry {
  name: string;
  score: number;
  /** Public player tag (hash of the secret id), so the game can spot its own row. */
  tag: string;
}

/** Upstash REST pipeline. Works with the Vercel Marketplace (KV_*) or plain Upstash vars. */
export function upstash(env: Record<string, string | undefined>, f = fetch): Redis | null {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return async (cmds) => {
    const res = await f(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
    });
    if (!res.ok) throw new Error(`redis ${res.status}`);
    const out = (await res.json()) as { result?: unknown; error?: string }[];
    const err = out.find((r) => r.error);
    if (err) throw new Error(`redis ${err.error}`);
    return out.map((r) => r.result);
  };
}

export const playerTag = (id: string) => createHash('sha256').update(id).digest('hex').slice(0, 24);

const boardKey = (world: string, week?: string) =>
  week ? `cw:week:${week}:${world}` : `cw:all:${world}`;
const NAMES = 'cw:names';

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });

const isWorld = (w: unknown): w is string =>
  typeof w === 'string' && (SCORE_WORLDS as readonly string[]).includes(w);
const isPlayer = (p: unknown): p is string =>
  typeof p === 'string' && /^[A-Za-z0-9-]{16,64}$/.test(p);

/** [member, score, member, score, ...] -> pairs (Upstash returns scores as strings). */
function pairs(flat: unknown): [string, number][] {
  const a = Array.isArray(flat) ? flat : [];
  const out: [string, number][] = [];
  for (let i = 0; i + 1 < a.length; i += 2) out.push([String(a[i]), Number(a[i + 1])]);
  return out;
}

async function board(redis: Redis, world: string, now: Date) {
  const [week, all] = await redis([
    ['ZRANGE', boardKey(world, isoWeek(now)), 0, TOP - 1, 'REV', 'WITHSCORES'],
    ['ZRANGE', boardKey(world), 0, TOP - 1, 'REV', 'WITHSCORES'],
  ]);
  const w = pairs(week);
  const a = pairs(all);
  const tags = [...new Set([...w, ...a].map(([t]) => t))];
  const names = tags.length ? ((await redis([['HMGET', NAMES, ...tags]]))[0] as unknown[]) : [];
  const nameOf = new Map(tags.map((t, i) => [t, String(names[i] ?? '???')]));
  const entries = (p: [string, number][]): Entry[] =>
    p.map(([tag, score]) => ({ name: nameOf.get(tag)!, score, tag }));
  return { world, week: entries(w), all: entries(a) };
}

async function rateLimited(redis: Redis, req: Request): Promise<boolean> {
  const ip =
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  const key = `cw:rl:${ip}`;
  const [n] = await redis([
    ['INCR', key],
    ['EXPIRE', key, 60, 'NX'],
  ]);
  return Number(n) > RATE_LIMIT;
}

async function submit(redis: Redis, body: Record<string, unknown>, now: Date) {
  const { player, world, stats, score } = body;
  const name = cleanName(body.name);
  if (!isPlayer(player) || !name) return json({ error: 'player' }, 400);
  const tag = playerTag(player);

  if (body.action === 'name') {
    const [known] = await redis([['HEXISTS', NAMES, tag]]);
    if (Number(known)) await redis([['HSET', NAMES, tag, name]]);
    return json({ ok: true });
  }

  if (!isWorld(world)) return json({ error: 'world' }, 400);
  const why = implausible(stats);
  if (why) return json({ error: `implausible ${why}` }, 422);
  const total = totalScore(stats as Parameters<typeof totalScore>[0]);
  if (score !== total) return json({ error: 'score mismatch' }, 422);
  if (total <= 0) return json({ score: total, weekRank: null, allRank: null });

  // A score that waited offline past its week only goes on the all-time board.
  const week = isoWeek(now);
  const boards = [boardKey(world)];
  if (body.week === week) boards.push(boardKey(world, week));
  const cmds: Cmd[] = [];
  for (const k of boards) {
    cmds.push(['ZADD', k, 'GT', total, tag], ['ZREMRANGEBYRANK', k, 0, -(KEEP + 1)]);
  }
  cmds.push(['EXPIRE', boardKey(world, week), WEEK_TTL_S]);
  cmds.push(['ZREVRANK', boardKey(world), tag], ['ZREVRANK', boardKey(world, week), tag]);
  const out = await redis(cmds);
  const rank = (v: unknown) => (v === null || v === undefined ? null : Number(v) + 1);
  const [allRank, weekRank] = out.slice(-2).map(rank);
  // Names are only kept for players who made a board.
  if (allRank !== null || weekRank !== null) await redis([['HSET', NAMES, tag, name]]);
  return json({ score: total, weekRank, allRank });
}

/** The whole API, with Redis and the clock injectable for tests. */
export async function handle(req: Request, redis: Redis | null, now = new Date()) {
  if (!redis) return json({ error: 'scoreboard not configured' }, 503);
  try {
    if (req.method === 'GET') {
      const world = new URL(req.url).searchParams.get('world');
      if (!isWorld(world)) return json({ error: 'world' }, 400);
      return json(await board(redis, world, now), 200, {
        'Cache-Control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=50',
      });
    }
    if (req.method === 'POST') {
      const text = await req.text();
      if (text.length > MAX_BODY) return json({ error: 'too big' }, 413);
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        return json({ error: 'json' }, 400);
      }
      if (!body || typeof body !== 'object') return json({ error: 'json' }, 400);
      if (await rateLimited(redis, req)) return json({ error: 'slow down' }, 429);
      return await submit(redis, body as Record<string, unknown>, now);
    }
    return json({ error: 'method' }, 405, { Allow: 'GET, POST' });
  } catch (e) {
    console.error('scoreboard', e);
    return json({ error: 'unavailable' }, 503);
  }
}

export function GET(req: Request): Promise<Response> {
  return handle(req, upstash(process.env));
}

export function POST(req: Request): Promise<Response> {
  return handle(req, upstash(process.env));
}
