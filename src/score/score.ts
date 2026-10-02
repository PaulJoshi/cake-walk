import { T } from '../game/tuning';
import type { Outcome } from '../game/World';
import type { WorldId } from '../level/worlds';

export type Grade = 'S' | 'A' | 'B' | 'C' | 'F';
export type Mode = 'daily' | 'free';

export interface RoundResult {
  outcome: Outcome;
  tiers: number;
  /** Seconds left on the clock when the round ended. */
  secondsLeft: number;
  clutches: number;
  mode: Mode;
  seed: string;
  /** Defaults to the classic wedding. */
  world?: WorldId;
}

export interface Best {
  score: number;
  grade: Grade;
}

export const FAIL_LINES: Record<
  Exclude<Outcome, 'won' | 'none'>,
  { title: string; joke: string }
> = {
  toppled: { title: 'TOPPLED!', joke: 'The cake has left the building.' },
  cupcake: { title: 'CUPCAKE!', joke: "That's not a wedding cake. That's a cupcake." },
  timeout: { title: "TIME'S UP!", joke: 'The best man toasted an empty table.' },
};

/** The Pirate Ship has its own jokes. */
export const PIRATE_FAIL_LINES: typeof FAIL_LINES = {
  toppled: { title: 'OVERBOARD!', joke: 'The cake walked the plank.' },
  cupcake: { title: 'CUPCAKE!', joke: "That's not a wedding cake. That's a ship's biscuit." },
  timeout: { title: "TIME'S UP!", joke: 'The captain toasted an empty table. Arrr.' },
};

export function failLine(r: RoundResult): { title: string; joke: string } {
  const lines = r.world === 'pirate' ? PIRATE_FAIL_LINES : FAIL_LINES;
  return lines[r.outcome as keyof typeof FAIL_LINES];
}

export const WIN_LINES: Record<Exclude<Grade, 'F'>, string> = {
  S: 'Flawless. The photographer wept.',
  A: 'Beautiful. Nobody saw the wobble.',
  B: 'A little lopsided. Still romantic.',
  C: "It's... rustic. They love it.",
};

export function grade(r: RoundResult): Grade {
  if (r.outcome !== 'won' || r.tiers < T.MIN_TIERS) return 'F';
  if (r.tiers >= T.TIER_COUNT && r.secondsLeft >= T.S_GRADE_SECONDS) return 'S';
  if (r.tiers >= 6) return 'A';
  if (r.tiers === 5) return 'B';
  return 'C';
}

/** Score = tiers x 1000 + floor(seconds left x 100) + 250 per clutch save. Losses score 0. */
export function score(r: RoundResult): number {
  if (r.outcome !== 'won') return 0;
  return (
    r.tiers * T.TIER_POINTS +
    Math.floor(r.secondsLeft * T.TIME_POINTS_PER_S + 1e-6) +
    r.clutches * T.CLUTCH_POINTS
  );
}

const LOSS_WORD: Record<string, string> = {
  toppled: 'cake toppled',
  cupcake: 'cupcake',
  timeout: 'out of time',
};

/** e.g. "🎂 CAKE WALK — Daily Challenge 2026-09-30 — Grade S — 7/7 tiers — 17.3s left — 3 clutch saves" */
export function shareText(r: RoundResult): string {
  const mode = r.mode === 'daily' ? `Daily Challenge ${r.seed}` : `Random #${r.seed}`;
  const g = grade(r);
  const parts = [`🎂 CAKE WALK`, mode, `Grade ${g}`];
  if (r.world === 'pirate') parts.splice(1, 0, 'Pirate Ship');
  if (r.outcome === 'won') {
    parts.push(`${r.tiers}/${T.TIER_COUNT} tiers`, `${r.secondsLeft.toFixed(1)}s left`);
  } else {
    parts.push(LOSS_WORD[r.outcome] ?? 'disaster');
  }
  if (r.clutches > 0) parts.push(`${r.clutches} clutch save${r.clutches === 1 ? '' : 's'}`);
  return parts.join(' — ');
}

const GRADE_RANK: Record<Grade, number> = { F: 0, C: 1, B: 2, A: 3, S: 4 };

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

function storage(): KV | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** The wedding keeps its original keys so existing bests carry over. */
const key = (mode: Mode, world: WorldId = 'wedding') =>
  world === 'wedding' ? `cakewalk:best:${mode}` : `cakewalk:best:${world}:${mode}`;

export function loadBest(
  mode: Mode,
  kv: KV | null = storage(),
  world: WorldId = 'wedding',
): Best | null {
  try {
    const raw = kv?.getItem(key(mode, world));
    if (!raw) return null;
    const b = JSON.parse(raw) as Best;
    return typeof b.score === 'number' && typeof b.grade === 'string' ? b : null;
  } catch {
    return null;
  }
}

/** Save if better than the stored best. Returns true for a new best. */
export function saveBest(r: RoundResult, kv: KV | null = storage()): boolean {
  const s = score(r);
  const g = grade(r);
  const prev = loadBest(r.mode, kv, r.world);
  const better =
    !prev || s > prev.score || (s === prev.score && GRADE_RANK[g] > GRADE_RANK[prev.grade]);
  if (!better || (s === 0 && prev)) return false;
  try {
    kv?.setItem(key(r.mode, r.world), JSON.stringify({ score: s, grade: g } satisfies Best));
  } catch {
    return false;
  }
  return s > 0;
}

const WORLD_KEY = 'cakewalk:world';

/** The world picked on the title screen last time. */
export function loadWorld(kv: KV | null = storage()): WorldId | null {
  try {
    const v = kv?.getItem(WORLD_KEY);
    return v === 'wedding' || v === 'pirate' ? v : null;
  } catch {
    return null;
  }
}

export function saveWorld(world: WorldId, kv: KV | null = storage()): void {
  try {
    kv?.setItem(WORLD_KEY, world);
  } catch {
    /* private mode */
  }
}
