import type { Rng } from '../../game/rng';
import { BassDrop } from './bassdrop';
import { Bouquet } from './bouquet';
import { Conga } from './conga';
import { Grandma } from './grandma';
import { Roomba } from './roomba';
import { Spill } from './spill';
import { Toddler } from './toddler';
import type { Obstacle } from './types';
import { Uncle } from './uncle';

export { BassDrop, Bouquet, Conga, Grandma, Roomba, Spill, Toddler, Uncle };

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
