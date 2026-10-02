import { T } from '../game/tuning';
import type { Outcome } from '../game/World';
import { WORLDS, isWorldId, type WorldId } from '../level/worlds';
import { scoreParts, totalScore, type RoundStats, type ScoreParts } from './formula';

export type Grade = 'S' | 'A' | 'B' | 'C' | 'F';
export type Mode = 'daily' | 'free';

export interface RoundResult extends RoundStats {
  mode: Mode;
  seed: string;
  /** Defaults to the classic wedding. */
  world?: WorldId;
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

/** ...and so does the Space Station. */
export const SPACE_FAIL_LINES: typeof FAIL_LINES = {
  toppled: { title: 'TOPPLED!', joke: 'The cake is now a small moon.' },
  cupcake: { title: 'CUPCAKE!', joke: "That's not a wedding cake. That's astronaut food." },
  timeout: { title: "TIME'S UP!", joke: 'The aliens toasted an empty table. Bleep.' },
};

const WORLD_FAIL_LINES: Record<WorldId, typeof FAIL_LINES> = {
  wedding: FAIL_LINES,
  pirate: PIRATE_FAIL_LINES,
  space: SPACE_FAIL_LINES,
};

export function failLine(r: RoundResult): { title: string; joke: string } {
  const lines = WORLD_FAIL_LINES[r.world ?? 'wedding'];
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

/** Every try scores; see scoreParts in formula.ts for how. */
export function score(r: RoundResult): number {
  return totalScore(r);
}

export function breakdown(r: RoundResult): ScoreParts {
  return scoreParts(r);
}

/** 18402 -> "18,402" (fixed locale so it reads the same everywhere). */
export function fmtScore(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

const LOSS_WORD: Record<string, string> = {
  toppled: 'cake toppled',
  cupcake: 'cupcake',
  timeout: 'out of time',
};

/** e.g. "🎂 CAKE WALK — Daily Challenge 2026-09-30 — 18,402 pts — Grade S — 7/7 tiers — 17.3s left" */
export function shareText(r: RoundResult): string {
  const mode = r.mode === 'daily' ? `Daily Challenge ${r.seed}` : `Random #${r.seed}`;
  const parts = [`🎂 CAKE WALK`, mode, `${fmtScore(score(r))} pts`, `Grade ${grade(r)}`];
  if (r.world && r.world !== 'wedding') parts.splice(1, 0, WORLDS[r.world].name);
  if (r.outcome === 'won') {
    parts.push(`${r.tiers}/${T.TIER_COUNT} tiers`, `${r.secondsLeft.toFixed(1)}s left`);
  } else {
    parts.push(LOSS_WORD[r.outcome] ?? 'disaster', `${Math.round(r.progress * 100)}% of the way`);
  }
  if (r.clutches > 0) parts.push(`${r.clutches} clutch save${r.clutches === 1 ? '' : 's'}`);
  return parts.join(' — ');
}

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export function storage(): KV | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

const WORLD_KEY = 'cakewalk:world';

/** The world picked on the title screen last time. */
export function loadWorld(kv: KV | null = storage()): WorldId | null {
  try {
    const v = kv?.getItem(WORLD_KEY);
    return isWorldId(v) ? v : null;
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
