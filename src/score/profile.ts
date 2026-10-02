import { WORLD_IDS, type WorldId } from '../level/worlds';
import { ACHIEVEMENT_IDS, newAchievements, type Achievement } from './achievements';
import { isoWeek, type RoundStats } from './formula';
import { cleanName, randomName } from './names';
import { grade, score, storage, type Grade, type Mode, type RoundResult } from './score';

/** A personal best, one per world (Daily Challenge and Random share it). */
export interface Best {
  score: number;
  grade: Grade;
  mode: Mode;
  seed: string;
  /** When it was set (ms since epoch). */
  at: number;
}

/** A score waiting to reach the scoreboard (kept until it gets through). */
export interface Submission {
  world: WorldId;
  week: string;
  score: number;
  stats: RoundStats;
}

export interface ProfileData {
  /** Secret player id. The scoreboard only ever stores a hash of it. */
  id: string;
  name: string;
  /** The name changed and the scoreboard hasn't heard yet. */
  nameDirty?: boolean;
  bests: Partial<Record<WorldId, Best>>;
  /** This week's best per world, so only improvements are sent to the scoreboard. */
  weekBests: Partial<Record<WorldId, { week: string; score: number }>>;
  pending: Partial<Record<WorldId, Submission>>;
  /** Earned badges: achievement id -> when (ms since epoch). */
  badges: Record<string, number>;
}

/** Where the profile lives: IndexedDB, else localStorage, else memory. */
export interface ProfileStore {
  load(): Promise<unknown>;
  save(data: ProfileData): Promise<void>;
}

const DB = 'cakewalk';
const STORE = 'kv';
const KEY = 'profile';

function idbRequest<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function openDb(): Promise<IDBDatabase> {
  const req = indexedDB.open(DB, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE);
  return idbRequest(req);
}

export function idbStore(): ProfileStore {
  if (typeof indexedDB === 'undefined') return kvStore();
  let db: Promise<IDBDatabase> | null = null;
  const tx = async (mode: IDBTransactionMode) => {
    db ??= openDb();
    return (await db).transaction(STORE, mode).objectStore(STORE);
  };
  const fallback = kvStore();
  return {
    async load() {
      try {
        return await idbRequest((await tx('readonly')).get(KEY));
      } catch {
        return fallback.load();
      }
    },
    async save(data) {
      try {
        await idbRequest((await tx('readwrite')).put(data, KEY));
      } catch {
        await fallback.save(data);
      }
    },
  };
}

/** localStorage (or memory when storage is blocked). */
export function kvStore(kv = storage()): ProfileStore {
  const k = 'cakewalk:profile';
  let mem: unknown = null;
  return {
    async load() {
      try {
        const raw = kv?.getItem(k);
        return raw ? JSON.parse(raw) : mem;
      } catch {
        return mem;
      }
    },
    async save(data) {
      mem = structuredClone(data);
      try {
        kv?.setItem(k, JSON.stringify(data));
      } catch {
        /* private mode */
      }
    },
  };
}

function newId(rand: () => number): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  let s = '';
  for (let i = 0; i < 32; i++) s += Math.floor(rand() * 16).toString(16);
  return s;
}

function isBest(v: unknown): v is Best {
  const b = v as Best;
  return !!b && typeof b.score === 'number' && typeof b.grade === 'string';
}

/** Keep only well-formed fields from whatever was stored. */
function sanitize(raw: unknown, fresh: ProfileData): ProfileData {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Partial<ProfileData>;
  const out: ProfileData = {
    id: typeof d.id === 'string' && d.id.length >= 16 ? d.id : fresh.id,
    name: cleanName(d.name) ?? fresh.name,
    nameDirty: !!d.nameDirty,
    bests: {},
    weekBests: {},
    pending: {},
    badges: {},
  };
  for (const [id, at] of Object.entries(d.badges ?? {})) {
    if (ACHIEVEMENT_IDS.has(id) && typeof at === 'number') out.badges[id] = at;
  }
  for (const w of WORLD_IDS) {
    if (isBest(d.bests?.[w])) out.bests[w] = d.bests[w];
    const wb = d.weekBests?.[w];
    if (wb && typeof wb.score === 'number' && typeof wb.week === 'string') out.weekBests[w] = wb;
    const p = d.pending?.[w];
    if (p && typeof p.score === 'number' && p.stats) out.pending[w] = p;
  }
  return out;
}

export interface Recorded {
  score: number;
  /** Beat the personal best for this world. */
  isBest: boolean;
  /** A scoreboard submission is due (beat this week's best). */
  submission: Submission | null;
  /** Badges earned for the first time this round. */
  badges: Achievement[];
}

/**
 * The player's local profile: id, name, personal bests and unsent scores. Reads are
 * synchronous from memory; IndexedDB loads in the background and saves are fire-and-forget.
 */
export class Profile {
  data: ProfileData;
  readonly ready: Promise<void>;
  private readonly listeners: Array<() => void> = [];

  constructor(
    private readonly store: ProfileStore = idbStore(),
    rand: () => number = Math.random,
  ) {
    this.data = {
      id: newId(rand),
      name: randomName(rand),
      bests: {},
      weekBests: {},
      pending: {},
      badges: {},
    };
    this.ready = store
      .load()
      .catch(() => null)
      .then((raw) => {
        const fresh = this.data;
        const loaded = raw ? sanitize(raw, fresh) : fresh;
        // Anything recorded while loading wins over older stored values.
        for (const w of WORLD_IDS) {
          const b = fresh.bests[w];
          if (b && (!loaded.bests[w] || b.score > loaded.bests[w]!.score)) loaded.bests[w] = b;
        }
        for (const [id, at] of Object.entries(fresh.badges)) loaded.badges[id] ??= at;
        this.data = loaded;
        if (!raw) this.persist();
        this.emit();
      });
  }

  get id(): string {
    return this.data.id;
  }

  get name(): string {
    return this.data.name;
  }

  best(world: WorldId): Best | null {
    return this.data.bests[world] ?? null;
  }

  hasBadge(id: string): boolean {
    return id in this.data.badges;
  }

  onChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  private persist(): void {
    void this.store.save(this.data).catch(() => undefined);
  }

  /** Record a finished round. Every round scores; only improvements are kept. Awards badges. */
  record(r: RoundResult, now = new Date()): Recorded {
    const world = r.world ?? 'wedding';
    const s = score(r);
    const prev = this.data.bests[world];
    const isBest = !prev || s > prev.score;
    if (isBest) {
      this.data.bests[world] = { score: s, grade: grade(r), mode: r.mode, seed: r.seed, at: +now };
    }
    const week = isoWeek(now);
    const wb = this.data.weekBests[world];
    let submission: Submission | null = null;
    if (s > 0 && (!wb || wb.week !== week || s > wb.score)) {
      this.data.weekBests[world] = { week, score: s };
      const stats: RoundStats = {
        outcome: r.outcome,
        tiers: r.tiers,
        secondsLeft: r.secondsLeft,
        clutches: r.clutches,
        progress: r.progress,
        cargo: r.cargo,
        leanAvg: r.leanAvg,
        hits: r.hits,
        hitPower: r.hitPower,
        slips: r.slips,
      };
      submission = { world, week, score: s, stats };
      this.data.pending[world] = submission;
    }
    const badges = newAchievements(r, (id) => this.hasBadge(id));
    for (const a of badges) this.data.badges[a.id] = +now;
    if (isBest || submission || badges.length) this.persist();
    return { score: s, isBest, submission, badges };
  }

  /** The scoreboard has the score (or refused it for good). */
  settled(sub: Submission): void {
    if (this.data.pending[sub.world] === sub) {
      delete this.data.pending[sub.world];
      this.persist();
    }
  }

  pendingSubmissions(): Submission[] {
    return Object.values(this.data.pending).filter((p): p is Submission => !!p);
  }

  /** Returns the cleaned name, or null if it isn't usable. */
  setName(raw: string): string | null {
    const n = cleanName(raw);
    if (!n) return null;
    if (n !== this.data.name) {
      this.data.name = n;
      this.data.nameDirty = true;
      this.persist();
      this.emit();
    }
    return n;
  }

  nameSynced(): void {
    if (this.data.nameDirty) {
      this.data.nameDirty = false;
      this.persist();
    }
  }
}
