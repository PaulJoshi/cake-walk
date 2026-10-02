import type { WorldId } from '../level/worlds';
import type { Profile, Submission } from './profile';

export interface BoardEntry {
  name: string;
  score: number;
  tag: string;
}

export interface Board {
  world: WorldId;
  week: BoardEntry[];
  all: BoardEntry[];
}

export interface Ranks {
  weekRank: number | null;
  allRank: number | null;
}

const API = '/api/scores';
const FRESH_MS = 30_000;
const TIMEOUT_MS = 6000;

/** SHA-256 of the secret id, matching the server's playerTag(). Null without WebCrypto. */
async function tagOf(id: string): Promise<string | null> {
  try {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id));
    return [...new Uint8Array(d)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 24);
  } catch {
    return null;
  }
}

/**
 * Talks to /api/scores. Never throws and never blocks the game: when the scoreboard is
 * missing (local dev, not configured, offline) it reports `available = false` and the UI
 * hides it.
 */
export class Scoreboard {
  /** null until the first answer. */
  available: boolean | null = null;
  myTag: string | null = null;
  private cache = new Map<WorldId, { board: Board; at: number }>();
  private inflight = new Map<WorldId, Promise<Board | null>>();

  constructor(
    private readonly profile: Profile,
    private readonly f: typeof fetch = (...a) => fetch(...a),
  ) {
    void profile.ready.then(async () => (this.myTag = await tagOf(profile.id)));
  }

  private async call(init?: RequestInit, query = ''): Promise<Response | null> {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => ctl?.abort(), TIMEOUT_MS);
    try {
      const res = await this.f(`${API}${query}`, { ...init, signal: ctl?.signal });
      const ok = res.headers.get('content-type')?.includes('application/json') ?? false;
      // A 404 or the SPA's index.html means there's no API here (e.g. `vite dev`).
      if (!ok || res.status === 404 || res.status === 503) this.available = false;
      else this.available = true;
      return ok ? res : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  cached(world: WorldId): Board | null {
    return this.cache.get(world)?.board ?? null;
  }

  /** The boards for a world, from cache if fresh. */
  load(world: WorldId, force = false): Promise<Board | null> {
    const c = this.cache.get(world);
    if (!force && c && Date.now() - c.at < FRESH_MS) return Promise.resolve(c.board);
    let p = this.inflight.get(world);
    if (!p) {
      p = this.call(undefined, `?world=${world}`)
        .then(async (res) => {
          if (!res?.ok) return null;
          const board = (await res.json()) as Board;
          this.cache.set(world, { board, at: Date.now() });
          return board;
        })
        .catch(() => null)
        .finally(() => this.inflight.delete(world));
      this.inflight.set(world, p);
    }
    return p;
  }

  private async post(body: object): Promise<Response | null> {
    return this.call({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    });
  }

  /** Send one score. Resolves with the ranks, or null if it didn't get through. */
  async submit(sub: Submission): Promise<Ranks | null> {
    if (this.available === false) return null;
    const p = this.profile;
    const res = await this.post({ player: p.id, name: p.name, ...sub });
    if (!res) return null;
    // 4xx other than rate limiting will never succeed; don't retry those forever.
    if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)) p.settled(sub);
    if (!res.ok) return null;
    this.cache.delete(sub.world);
    const r = (await res.json().catch(() => null)) as Ranks | null;
    return r && { weekRank: r.weekRank ?? null, allRank: r.allRank ?? null };
  }

  /** Retry scores and a name change that didn't get through earlier. */
  async flush(): Promise<void> {
    await this.profile.ready;
    if (this.available === false) return;
    for (const s of this.profile.pendingSubmissions()) await this.submit(s);
    if (this.profile.data.nameDirty) await this.syncName();
  }

  async syncName(): Promise<void> {
    const p = this.profile;
    const res = await this.post({ player: p.id, name: p.name, action: 'name' });
    if (res?.ok) {
      p.nameSynced();
      this.cache.clear();
    }
  }
}
