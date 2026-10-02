import {
  HEAD_F,
  LEGS_SUIT,
  SKIN,
  WAITER_PAL,
  WAITER_TOP,
  legs,
  makeSprite,
  stepLegs,
  type Palette,
  type PersonSprites,
  type Sprite,
} from './sprites';

/** Pixel art for the Space Station world, in the same string-map style as sprites.ts. */

const HEAD_ASTRO = [
  '...wwwwww...',
  '..wwwwwwww..',
  '.wwvvvvvvww.',
  '.wvVVvvvvvw.',
  '.wvVvvvvvvw.',
  '.wwvvvvvvww.',
  '..wwwwwwww..',
];
const HEAD_ALIEN = [
  '..a......a..',
  '...a....a...',
  '..ssssssss..',
  '.ssssssssss.',
  '.skkssssKks.',
  '.skwssssKws.',
  '..sssmmsss..',
  '...ssssss...',
];
const HEAD_CYCLOPS = [
  '....ssss....',
  '..ssssssss..',
  '.ssssbbssss.',
  '.sssbkwbsss.',
  '.ssssbbssss.',
  '..ssmmmmss..',
  '...ssssss...',
];
const HEAD_ROBOT = [
  '.....r......',
  '.....k......',
  '..kkkkkkkk..',
  '..kMMMMMMk..',
  '..kMyMMyMk..',
  '..kMMMMMMk..',
  '..kMyyyyMk..',
  '..kkkkkkkk..',
];
const TORSO_SUIT = [
  '...wwwwww...',
  '..wwwwwwww..',
  '.wwwrrbbwww.',
  '.wwwrrbbwww.',
  '.wwwwwwwwww.',
  '.gwwwwwwwwg.',
  '.gwwwwwwwwg.',
  '..wwwwwwww..',
  '..wwwwwwww..',
  '..wwwwwwww..',
  '..DDDDDDDD..',
];
const TORSO_TUNIC = [
  '....ssss....',
  '..CCCCCCCC..',
  '.CCCCCCCCCC.',
  '.CCCyCCyCCC.',
  '.CCCCCCCCCC.',
  '.sCCCCCCCCs.',
  '.sCCCCCCCCs.',
  '..CCCCCCCC..',
  '..CCCCCCCC..',
  '..CCCCCCCC..',
  '..DDDDDDDD..',
];
const TORSO_TUX = [
  '....ssss....',
  '...kwwwwk...',
  '..kkkwwkkk..',
  '.kkkkrrkkkk.',
  '.kkkkwwkkkk.',
  '.skkkwwkkks.',
  '.skkkwwkkks.',
  '..kkkwwkkk..',
  '..kkkkkkkk..',
  '..kkkkkkkk..',
  '..DDDDDDDD..',
];
const TORSO_ROBOT = [
  '....kkkk....',
  '..MMMMMMMM..',
  '.MMMMMMMMMM.',
  '.MMkyyyykMM.',
  '.MMkrgbykMM.',
  '.kMkyyyykMk.',
  '.kMMMMMMMMk.',
  '..MMMMMMMM..',
  '..MMMMMMMM..',
  '..kkkkkkkk..',
  '..DDDDDDDD..',
];
const LEGS_ASTRO = [
  '..www..www..',
  '..www..www..',
  '..www..www..',
  '..www..www..',
  '..www..www..',
  '..www..www..',
  '..www..www..',
  '..www..www..',
  '..ggg..ggg..',
  '..ggg..ggg..',
  '..gggg.gggg.',
];
const LEGS_TENTACLE = [
  '..ss....ss..',
  '..ss....ss..',
  '..ss....ss..',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '..ss....ss..',
  '..ss....ss..',
  '.ss......ss.',
  '.ss......ss.',
  'ss........ss',
];
const LEGS_ROBOT = [
  '...MMMMMM...',
  '...k....k...',
  '...k....k...',
  '...k....k...',
  '...k....k...',
  '...k....k...',
  '...k....k...',
  '...k....k...',
  '..kkk..kkk..',
  '.MMMMMMMMMM.',
  '.kMkMkMkMkk.',
];
const LEGS_GOWN = [
  '.wwwwwwwwww.',
  'wwwwwwwwwwww',
  'wwwwwwwwwwww',
  'wwwwwwwwwwww',
  'wwwwwwwwwwww',
  '.wwwwwwwwww.',
  '...gg..gg...',
  '...gg..gg...',
  '...gg..gg...',
  '...gg..gg...',
  '..ggg..ggg..',
];

const SAUCER = [
  '.......ggggg.......',
  '......gGGaGGg......',
  '.....gGwGaaGGg.....',
  '..mmmmmmmmmmmmmmm..',
  '.mMMMMMMMMMMMMMMMm.',
  'mMyMMyMMyMMyMMyMMym',
  '.mMMMMMMMMMMMMMMMm.',
  '...mmmmmmmmmmmmm...',
];
const METEOR = ['..rrr.', '.rRRrr', 'rRkRRr', 'rRRRkr', '.rrRr.', '..rr..'];
const HEART = ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'];

export interface SpaceSprites {
  waiter: Sprite[];
  waiterIdle: Sprite;
  crew: PersonSprites[];
  bride: PersonSprites;
  groom: PersonSprites;
  saucer: Sprite;
  meteor: Sprite;
  heart: Sprite;
}

function person(upper: string[], lower: string[], pal: Palette): PersonSprites {
  return {
    upper: makeSprite(upper, pal),
    lower: makeSprite(lower, pal),
    lowerStep: makeSprite(stepLegs(lower), pal),
  };
}

const ACCENTS = ['#d6334e', '#3f7fd6', '#f2a93b', '#6be38a', '#b98cff'];
const ALIENS = ['#6be38a', '#b98cff', '#4fd1c5', '#f28fd0', '#a8d65a'];
const TUNICS = ['#3f7fd6', '#d6334e', '#f2a93b', '#1f2a44', '#9b5bd1'];

export function buildSpaceSprites(): SpaceSprites {
  // The waiter wears a silver mess jacket and a green bow tie (the helmet is drawn on top).
  const pal: Palette = { ...WAITER_PAL, h: '#2a1a12', b: '#6be38a', v: '#c9ced8', V: '#8f96a3' };
  const frames = [
    legs(-2, 2),
    legs(-1, 1),
    legs(0, 0),
    legs(1, -1),
    legs(2, -2),
    legs(1, -1),
    legs(0, 0),
    legs(-1, 1),
  ].map((l) => makeSprite([...WAITER_TOP, ...l], pal));
  const waiterIdle = makeSprite([...WAITER_TOP, ...legs(0, 0)], pal);

  const crew: PersonSprites[] = [];
  for (let i = 0; i < 10; i++) {
    const kind = i % 5;
    if (kind === 0 || kind === 3) {
      crew.push(
        person([...HEAD_ASTRO, ...TORSO_SUIT], LEGS_ASTRO, {
          w: '#e3e7ee',
          v: '#2e3f6a',
          V: '#9fe0f0',
          r: ACCENTS[i % ACCENTS.length],
          b: ACCENTS[(i + 2) % ACCENTS.length],
          g: '#8f96a3',
          D: '#5c6470',
        }),
      );
    } else if (kind === 4) {
      crew.push(
        person([...HEAD_ROBOT, ...TORSO_ROBOT], LEGS_ROBOT, {
          k: '#2a2838',
          M: i % 2 ? '#c9ced8' : '#e8b93b',
          y: '#6fd3ff',
          r: '#ff4f5e',
          g: '#6be38a',
          b: '#3f7fd6',
          D: '#5c6470',
        }),
      );
    } else {
      const skin = ALIENS[(i * 3) % ALIENS.length];
      crew.push(
        person([...(kind === 1 ? HEAD_ALIEN : HEAD_CYCLOPS), ...TORSO_TUNIC], LEGS_TENTACLE, {
          s: skin,
          a: skin,
          k: '#141018',
          K: '#141018',
          w: '#fffaf2',
          b: '#fffaf2',
          m: '#3a1a3a',
          C: TUNICS[i % TUNICS.length],
          y: '#ffd36b',
          D: '#2a2838',
        }),
      );
    }
  }
  const bride = person([...HEAD_F, ...TORSO_SUIT], LEGS_GOWN, {
    h: '#5a3620',
    s: SKIN[2],
    e: '#1a1020',
    m: '#d0605a',
    w: '#fffaf2',
    r: '#ff6fa8',
    b: '#ff6fa8',
    g: '#c9ced8',
    D: '#ff6fa8',
  });
  const groom = person([...HEAD_ALIEN, ...TORSO_TUX], LEGS_SUIT, {
    s: '#6be38a',
    a: '#6be38a',
    k: '#141018',
    K: '#141018',
    w: '#fffaf2',
    m: '#3a1a3a',
    r: '#d6334e',
    D: '#141018',
  });
  return {
    waiter: frames,
    waiterIdle,
    crew,
    bride,
    groom,
    saucer: makeSprite(SAUCER, {
      g: '#9ff0c0',
      G: '#6fd3ff',
      w: '#e6f8ff',
      a: '#6be38a',
      m: '#5c6470',
      M: '#c9ced8',
      y: '#ffd36b',
    }),
    meteor: makeSprite(METEOR, { r: '#7a4a3a', R: '#a86a4a', k: '#41210f' }),
    heart: makeSprite(HEART, { r: '#ff6fa8' }),
  };
}
