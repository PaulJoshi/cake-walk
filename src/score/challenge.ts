// "Challenge a friend" links: the same world and seed, plus who set the score to beat.
// Shared with the link-preview function in api/, so imports carry an explicit .js extension.
import { SCORE_WORLDS, type ScoreWorld } from './formula.js';
import { cleanName } from './names.js';

export interface Challenge {
  world: ScoreWorld;
  seed: string;
  /** Who sent it. */
  name: string;
  /** The score to beat. */
  score: number;
}

/** World names for the preview text (the function can't import the level code). */
export const CHALLENGE_WORLD_NAMES: Record<ScoreWorld, string> = {
  wedding: 'Wedding Hall',
  pirate: 'Pirate Ship',
  space: 'Space Station',
};

const MAX_SCORE = 1_000_000;

/** Daily Challenge seeds are dates; anything else was a Random round. */
export const isDailySeed = (seed: string) => /^\d{4}-\d{2}-\d{2}$/.test(seed);

/** Read a challenge from link parameters. Anything malformed means no challenge. */
export function parseChallenge(params: URLSearchParams): Challenge | null {
  const world = params.get('world');
  const seed = params.get('seed') ?? '';
  const name = cleanName(params.get('by'));
  const raw = params.get('score') ?? '';
  const score = Number(raw);
  if (!(SCORE_WORLDS as readonly string[]).includes(world ?? '')) return null;
  if (!/^[0-9A-Za-z-]{1,16}$/.test(seed) || !name) return null;
  if (!/^\d{1,7}$/.test(raw) || score > MAX_SCORE) return null;
  return { world: world as ScoreWorld, seed, name, score };
}

/** "/c?world=pirate&seed=2026-10-02&by=WobblyOtter42&score=18402" */
export function challengePath(c: Challenge): string {
  const q = new URLSearchParams({
    world: c.world,
    seed: c.seed,
    by: c.name,
    score: String(Math.max(0, Math.round(c.score))),
  });
  return `/c?${q}`;
}

/** e.g. "Pirate Ship · Daily Challenge 2026-10-02" or "Pirate Ship · Random #K3J9QZ" */
export function challengeRound(c: Challenge): string {
  const round = isDailySeed(c.seed) ? `Daily Challenge ${c.seed}` : `Random #${c.seed}`;
  return `${CHALLENGE_WORLD_NAMES[c.world]} · ${round}`;
}
