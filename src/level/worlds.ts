import type { Rng } from '../game/rng';
import { LEVEL, ZONES } from './level';
import { buildObstacles, buildShipObstacles } from './obstacles';
import type { Obstacle } from './obstacles/types';
import { SHIP, SHIP_ZONES } from './ship';

export type WorldId = 'wedding' | 'pirate';

/** The parts of a level layout that the world, bot, camera and HUD share. */
export interface Layout {
  readonly LENGTH: number;
  readonly START_X: number;
  /** Tutorial hints show until the waiter passes this x. */
  readonly KITCHEN_END: number;
  readonly TABLE: { readonly x0: number; readonly x1: number; readonly x: number };
}

export interface WorldDef {
  readonly id: WorldId;
  /** Name on the title screen's world picker and the result card. */
  readonly name: string;
  /** Title screen subtitle. */
  readonly tagline: string;
  /** Set-down hint near the end. */
  readonly tableHint: string;
  readonly layout: Layout;
  readonly zones: readonly { name: string; x: number }[];
  /** Build the obstacles in a fixed order so a seed always gives the same variation. */
  build(rng: Rng): Obstacle[];
}

export const WORLDS: Record<WorldId, WorldDef> = {
  wedding: {
    id: 'wedding',
    name: 'Wedding Hall',
    tagline: '60 seconds to save the wedding',
    tableHint: 'STOP AT THE CAKE TABLE',
    layout: LEVEL,
    zones: ZONES,
    build: buildObstacles,
  },
  pirate: {
    id: 'pirate',
    name: 'Pirate Ship',
    tagline: '60 seconds to save the pirate wedding',
    tableHint: "STOP AT THE CAPTAIN'S TABLE",
    layout: SHIP,
    zones: SHIP_ZONES,
    build: buildShipObstacles,
  },
};

/** Worlds in picker order. The classic wedding comes first. */
export const WORLD_IDS: readonly WorldId[] = ['wedding', 'pirate'];

export function isWorldId(s: unknown): s is WorldId {
  return typeof s === 'string' && (WORLD_IDS as readonly string[]).includes(s);
}
