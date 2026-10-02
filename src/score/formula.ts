// Shared by the game and the scoreboard API (api/scores.ts), so it imports nothing but the
// tuning constants, with an explicit extension for Node's ESM loader.
import { T } from '../game/tuning.js';

export type FinalOutcome = 'won' | 'toppled' | 'cupcake' | 'timeout';

/** Every world that has a scoreboard. tests/formula.test.ts keeps this in sync with WORLDS. */
export const SCORE_WORLDS = ['wedding', 'pirate', 'space'] as const;
export type ScoreWorld = (typeof SCORE_WORLDS)[number];

/** What a finished round measured. Everything the score is built from. */
export interface RoundStats {
  outcome: FinalOutcome;
  /** Tiers still on the tray at the end. */
  tiers: number;
  /** Seconds left on the clock when the round ended. */
  secondsLeft: number;
  clutches: number;
  /** Furthest the waiter got towards the table (0..1). */
  progress: number;
  /** Tiers carried, weighted by the share of the way each was carried (0..TIER_COUNT). */
  cargo: number;
  /** Average absolute lean over the round (rad). */
  leanAvg: number;
  hits: number;
  /** Sum of hit strengths (each 0..1). */
  hitPower: number;
  slips: number;
}

export interface ScoreParts {
  distance: number;
  cargo: number;
  /** Win bonus + delivered tiers. */
  delivery: number;
  /** Time left (wins) or a little pace (losses). */
  pace: number;
  poise: number;
  clutch: number;
  /** Hits and skids (zero or negative). */
  bumps: number;
  total: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Every try scores, with no ceiling (clutch saves keep adding up). Distance and cargo pay for
 * how far the cake got, delivery and pace for finishing fast, poise for a level tray, and
 * hits and skids cost a little. The parts are rounded so they add up to the total.
 */
export function scoreParts(s: RoundStats): ScoreParts {
  const won = s.outcome === 'won';
  const p = clamp(s.progress, 0, 1);
  const left = clamp(s.secondsLeft, 0, T.ROUND_TIME);
  const parts = {
    distance: Math.round(p * T.SCORE_DISTANCE),
    cargo: Math.round(clamp(s.cargo, 0, T.TIER_COUNT) * T.SCORE_CARGO),
    delivery: won ? T.SCORE_DELIVERY + s.tiers * T.TIER_POINTS : 0,
    pace: Math.round(won ? left * T.TIME_POINTS_PER_S : p * p * left * T.SCORE_LOSS_PACE_PER_S),
    poise: Math.round((T.SCORE_POISE * p) / (1 + Math.max(0, s.leanAvg) / T.SCORE_POISE_HALF)),
    clutch: Math.max(0, s.clutches) * T.CLUTCH_POINTS,
    bumps: -Math.round(
      Math.max(0, s.hitPower) * T.SCORE_HIT_PENALTY + Math.max(0, s.slips) * T.SCORE_SLIP_PENALTY,
    ),
  };
  const sum = Object.values(parts).reduce((a, b) => a + b, 0);
  return { ...parts, total: Math.max(0, sum) };
}

export function totalScore(s: RoundStats): number {
  return scoreParts(s).total;
}

const OUTCOMES: readonly string[] = ['won', 'toppled', 'cupcake', 'timeout'];
const num = (v: unknown, lo: number, hi: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const int = (v: unknown, lo: number, hi: number) => num(v, lo, hi) && Number.isInteger(v);

/**
 * Server-side sanity check of submitted stats: in range and consistent with each other.
 * Returns the reason they look impossible, or null when they're plausible.
 */
export function implausible(v: unknown): string | null {
  if (!v || typeof v !== 'object') return 'stats';
  const s = v as Record<string, unknown>;
  if (typeof s.outcome !== 'string' || !OUTCOMES.includes(s.outcome)) return 'outcome';
  if (!int(s.tiers, 0, T.TIER_COUNT)) return 'tiers';
  if (!num(s.secondsLeft, 0, T.ROUND_TIME)) return 'secondsLeft';
  if (!num(s.progress, 0, 1)) return 'progress';
  if (!num(s.cargo, 0, T.TIER_COUNT + 0.01)) return 'cargo';
  if (!num(s.leanAvg, 0, Math.PI)) return 'leanAvg';
  if (!int(s.hits, 0, 200) || !int(s.slips, 0, 200)) return 'hits';
  if (!num(s.hitPower, 0, s.hits as number)) return 'hitPower';
  const elapsed = T.ROUND_TIME - (s.secondsLeft as number);
  // A clutch is a swing past 30 degrees and back under 10; that takes a while.
  if (!int(s.clutches, 0, Math.ceil(elapsed * 2))) return 'clutches';
  const p = s.progress as number;
  const tiers = s.tiers as number;
  // Tiers only ever fall off, so the cargo sits between the final and the full stack.
  const eps = 0.02;
  if ((s.cargo as number) < tiers * p - eps || (s.cargo as number) > T.TIER_COUNT * p + eps)
    return 'cargo';
  switch (s.outcome) {
    case 'won':
      if (p < 1 || tiers < T.MIN_TIERS || elapsed < T.SCORE_MIN_WIN_TIME) return 'won';
      break;
    case 'cupcake':
      if (tiers >= T.MIN_TIERS) return 'cupcake';
      break;
    case 'timeout':
      if ((s.secondsLeft as number) > 0.05) return 'timeout';
      break;
  }
  return null;
}

/** ISO week in UTC, e.g. "2026-W40". Weekly scoreboards start on Monday 00:00 UTC. */
export function isoWeek(d: Date = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86_400_000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
