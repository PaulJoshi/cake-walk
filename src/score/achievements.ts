import { T } from '../game/tuning';
import { WORLDS, WORLD_IDS, type WorldId } from '../level/worlds';
import { grade, score, type RoundResult } from './score';

/** A badge: earned once, kept forever in the profile. */
export interface Achievement {
  readonly id: string;
  readonly name: string;
  /** What it takes, shown on the badge screen whether it's earned or not. */
  readonly desc: string;
  /** Badges for one world; the rest count in any world. */
  readonly world?: WorldId;
  /** Did this round earn it? `has` says which badges are already earned (this round's included). */
  earned(r: RoundResult, has: (id: string) => boolean): boolean;
}

const won = (r: RoundResult) => r.outcome === 'won';
const inWorld = (r: RoundResult, w: WorldId) => (r.world ?? 'wedding') === w;

/** How far (0..1) the waiter has to get to be past a zone: the start of the zone after it. */
export function pastZone(world: WorldId, zone: string): number {
  const def = WORLDS[world];
  const i = def.zones.findIndex((z) => z.name === zone);
  const next = def.zones[i + 1];
  if (i < 0 || !next) throw new Error(`no zone after ${zone} in ${world}`);
  const { START_X, TABLE } = def.layout;
  return (next.x - START_X) / (TABLE.x0 - START_X);
}

/** Deliver, get past the signature obstacle, and grade S, in each world. */
function worldBadges(
  world: WorldId,
  deliver: string,
  obstacle: { zone: string; name: string; desc: string },
  flawless: string,
): Achievement[] {
  const past = pastZone(world, obstacle.zone);
  const where = WORLDS[world].name;
  return [
    {
      id: `${world}-deliver`,
      name: deliver,
      desc: `Deliver a cake in the ${where}`,
      world,
      earned: (r) => inWorld(r, world) && won(r),
    },
    {
      id: `${world}-past`,
      name: obstacle.name,
      desc: obstacle.desc,
      world,
      earned: (r) => inWorld(r, world) && r.progress >= past,
    },
    {
      id: `${world}-s`,
      name: flawless,
      desc: `Get an S in the ${where}`,
      world,
      earned: (r) => inWorld(r, world) && grade(r) === 'S',
    },
  ];
}

/** Every badge, in the order the badge screen shows them. */
export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'full-stack',
    name: 'Full Stack',
    desc: `Deliver all ${T.TIER_COUNT} tiers`,
    earned: (r) => won(r) && r.tiers >= T.TIER_COUNT,
  },
  {
    id: 'photo-finish',
    name: 'Photo Finish',
    desc: `Deliver with under ${T.BADGE_PHOTO_FINISH_S} seconds left`,
    earned: (r) => won(r) && r.secondsLeft < T.BADGE_PHOTO_FINISH_S,
  },
  {
    id: 'nerves',
    name: 'Nerves of Steel',
    desc: `Make ${T.BADGE_CLUTCHES} clutch saves in one round`,
    earned: (r) => r.clutches >= T.BADGE_CLUTCHES,
  },
  {
    id: 'steady',
    name: 'Steady Hands',
    desc: 'Deliver with the tray almost level all the way',
    earned: (r) => won(r) && r.leanAvg < T.BADGE_STEADY_LEAN,
  },
  {
    id: 'score-low',
    name: 'Five Figures',
    desc: `Score ${T.BADGE_SCORE_LOW.toLocaleString('en-US')} points in one round`,
    earned: (r) => score(r) >= T.BADGE_SCORE_LOW,
  },
  {
    id: 'score-high',
    name: 'Top Tier',
    desc: `Score ${T.BADGE_SCORE_HIGH.toLocaleString('en-US')} points in one round`,
    earned: (r) => score(r) >= T.BADGE_SCORE_HIGH,
  },
  {
    id: 'cupcake',
    name: 'Cupcake Club',
    desc: 'Drop so many tiers it becomes a cupcake',
    earned: (r) => r.outcome === 'cupcake',
  },
  ...worldBadges(
    'wedding',
    'Just Married',
    { zone: 'DJ', name: 'Drop the Beat', desc: 'Make it past the DJ' },
    'The Photographer Wept',
  ),
  ...worldBadges(
    'pirate',
    'Shipshape',
    { zone: 'Kraken', name: 'Beat the Kraken', desc: 'Make it past the kraken' },
    "Captain's Pride",
  ),
  ...worldBadges(
    'space',
    'One Small Step',
    { zone: 'Saucer', name: 'Close Encounter', desc: 'Make it past the flying saucer' },
    'Zero-G Hero',
  ),
  {
    id: 'globetrotter',
    name: 'Globetrotter',
    desc: 'Deliver a cake in every world',
    earned: (_r, has) => WORLD_IDS.every((w) => has(`${w}-deliver`)),
  },
];

export const ACHIEVEMENT_IDS: ReadonlySet<string> = new Set(ACHIEVEMENTS.map((a) => a.id));

export function achievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * The badges this round earns that aren't in `have` yet. Later badges see earlier ones from
 * the same round (Globetrotter can come with the last world's delivery).
 */
export function newAchievements(r: RoundResult, have: (id: string) => boolean): Achievement[] {
  const got = new Set<string>();
  const has = (id: string) => got.has(id) || have(id);
  for (const a of ACHIEVEMENTS) if (!has(a.id) && a.earned(r, has)) got.add(a.id);
  return ACHIEVEMENTS.filter((a) => got.has(a.id));
}
