import type { Rng } from '../../game/rng';
import { Barrel } from './barrel';
import { BassDrop } from './bassdrop';
import { Bouquet } from './bouquet';
import { Cannonballs } from './cannonballs';
import { Conga } from './conga';
import { Grandma } from './grandma';
import { GravityGlitch } from './gravity';
import { LaserGate } from './laser';
import { MeteorShower } from './meteors';
import { Kraken } from './kraken';
import { Parrot } from './parrot';
import { Plank } from './plank';
import { Roomba } from './roomba';
import { Saucer } from './saucer';
import { Spill } from './spill';
import { Swell } from './swell';
import { Teleporter } from './teleporter';
import { Toddler } from './toddler';
import type { Obstacle } from './types';
import { Uncle } from './uncle';
import { Walkway } from './walkway';
import { RogueWave } from './wave';

export { BassDrop, Bouquet, Conga, Grandma, Roomba, Spill, Toddler, Uncle };
export { Barrel, Cannonballs, Kraken, Parrot, Plank, RogueWave, Swell };
export { GravityGlitch, LaserGate, MeteorShower, Saucer, Teleporter, Walkway };

/** Build the level's obstacles in a fixed order so a seed always gives the same variation. */
export function buildObstacles(rng: Rng): Obstacle[] {
  return [
    new Spill(rng),
    new Uncle(rng),
    new Roomba(rng),
    new Toddler(rng),
    new Grandma(rng),
    new BassDrop(rng),
    new Bouquet(rng),
    new Conga(rng),
  ];
}

/** The Pirate Ship's obstacles, in a fixed order for the same reason. */
export function buildShipObstacles(rng: Rng): Obstacle[] {
  const swell = new Swell(rng);
  return [
    swell,
    new Cannonballs(rng, swell),
    new Barrel(rng),
    new Plank(rng),
    new Parrot(rng),
    new Kraken(rng),
    new RogueWave(rng),
  ];
}

/** The Space Station's obstacles, in a fixed order for the same reason. */
export function buildStationObstacles(rng: Rng): Obstacle[] {
  const walkway = new Walkway(rng);
  const laser = new LaserGate(rng);
  const gravity = new GravityGlitch(rng);
  const teleporter = new Teleporter(rng);
  const meteors = new MeteorShower(rng);
  return [walkway, laser, gravity, teleporter, new Saucer(rng, meteors), meteors];
}
