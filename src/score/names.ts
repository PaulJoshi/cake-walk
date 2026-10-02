// Player names. Shared with the scoreboard API, so no imports.

const ADJECTIVES = (
  'Wobbly Frosted Tipsy Sprinkled Velvet Caramel Nimble Steady Fondant Buttery' +
  ' Sugared Dizzy Plucky Swanky Jolly Cosmic Salty Zesty Toasty Crumbly Glazed' +
  ' Fancy Brave Sneaky Lucky Spry Dapper Fluffy Gilded Rapid'
).split(' ');

const NOUNS = (
  'Waiter Baker Otter Comet Falcon Macaron Eclair Penguin Parrot Kraken Meteor' +
  ' Muffin Strudel Gecko Walrus Badger Captain Rocket Truffle Pudding Koala Biscuit' +
  ' Lemur Llama Scone Tiger Cupcake Donut Narwhal Pretzel'
).split(' ');

/** A random default name like "WobblyOtter42" (30 x 30 x 90 combinations). */
export function randomName(rand: () => number = Math.random): string {
  const pick = <T>(a: readonly T[]) => a[Math.floor(rand() * a.length) % a.length];
  return `${pick(ADJECTIVES)}${pick(NOUNS)}${10 + (Math.floor(rand() * 90) % 90)}`;
}

export const NAME_MAX = 16;

/**
 * Tidy a typed name: collapse spaces, keep letters, digits, space, _ . - and cap the length.
 * Returns null when nothing usable is left (under 2 characters).
 */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N} _.-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX)
    .trim();
  return s.length >= 2 ? s : null;
}
