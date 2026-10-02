import {
  HAIR,
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

/** Pixel art for the Pirate Ship world, in the same string-map style as sprites.ts. */

const HEAD_BANDANA = [
  '...bbbbbb...',
  '..bbdbbdbb..',
  '..bbbbbbbbbb',
  '...sesses.b.',
  '...ssssss...',
  '...ssmmss...',
  '....ssss....',
];
const HEAD_PATCH = [
  '...bbbbbb...',
  '..bbdbbdbb..',
  '..bbbbbbbbb.',
  '...kkssesb..',
  '...skssss.b.',
  '...ssmmss...',
  '....hhhh....',
];
const HEAD_TRICORN = [
  '..kkkkkkkk..',
  '.kkgkkkkgkk.',
  'kkkkkkkkkkkk',
  '...hssssh...',
  '...kkssesh..',
  '...skmmssh..',
  '...hhhhhh...',
  '....hhhh....',
];
const HEAD_BRIDE = [
  '..kkkkkkkk..',
  '.kkrkkkkrkk.',
  'kkkkkkkkkkkk',
  '..hhsssshh..',
  '..hsesseshh.',
  '..hssssssh..',
  '..hssmmssh..',
  '...hh..hh...',
];
const TORSO_STRIPE = [
  '...wwwwww...',
  '..CCCCCCCC..',
  '..wwwwwwww..',
  '.CCCCCCCCCC.',
  '.wwwwwwwwww.',
  '.sCCCCCCCCs.',
  '.swwwwwwwws.',
  '..CCCCCCCC..',
  '..wwwwwwww..',
  '..CCCCCCCC..',
  '..DDDDDDDD..',
];
const TORSO_COAT = [
  '...CwwwwC...',
  '..CCCwwCCC..',
  '..CCgwwgCC..',
  '.CCCCwwCCCC.',
  '.CCCgwwgCCC.',
  '.sCCCwwCCCs.',
  '.sCCgwwgCCs.',
  '..CCCCCCCC..',
  '..CCCCCCCC..',
  '..CCC..CCC..',
  '..DDDDDDDD..',
];
const TORSO_BRIDE = [
  '....wwww....',
  '...wCCCCw...',
  '..sCCCCCCs..',
  '..sCwCCwCs..',
  '...CCCCCC...',
  '...rrrrrr...',
  '..wwwwwwww..',
  '..wwwwwwww..',
  '.wwwwwwwwww.',
  '.wwwwwwwwww.',
  '.wwwwwwwwww.',
];
const LEGS_PEG = [
  '..DDD..DDD..',
  '..DDD..DDD..',
  '..DDD..DDD..',
  '..DDD..DDD..',
  '..DDD..DDD..',
  '..DDD...p...',
  '..DDD...p...',
  '..DDD...p...',
  '..DDD...p...',
  '..DDD...p...',
  '..kkkk..p...',
];
const LEGS_SKIRT = [
  '.wwwwwwwwww.',
  'wwwwwwwwwwww',
  'wwwwwwwwwwww',
  'wwwwwwwwwwww',
  '.wwwwwwwwww.',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '..kkk..kkk..',
];

const PARROT_SIT = [
  '....rrr...',
  '...rrrrr..',
  '...rwkrkk.',
  '...rrrr.k.',
  '..rrgggr..',
  '.rrggggr..',
  '.rgggbgr..',
  '..ggbbg...',
  '...bbb....',
  '...y.y....',
];
const PARROT_FLY = [
  '.gg....gg.',
  '.bgg..ggb.',
  '..bgrrgb..',
  '...rrrrr..',
  '...rwkrkk.',
  '...rrrr.k.',
  '...rggr...',
  '....bb....',
  '...bbbb...',
  '....bb....',
];
const CANNONBALL = [
  '..kkkk..',
  '.kddddk.',
  'kdwwdddk',
  'kdwddddk',
  'kddddddk',
  'kddddddk',
  '.kddddk.',
  '..kkkk..',
];
const BARREL = [
  '..bbbbbbbb..',
  '.bBBBBBBBBb.',
  'bggggggggggb',
  'bBBBBBBBBBBb',
  'bBBbBBBBbBBb',
  'bBBBrrrrBBBb',
  'bggggggggggb',
  'bBBBBBBBBBBb',
  'bBBbBBBBbBBb',
  'bBBBBBBBBBBb',
  'bggggggggggb',
  '.bBBBBBBBBb.',
  '..bbbbbbbb..',
];
const FIN = ['......g..', '.....gg..', '....gGg..', '..ggGGg..', 'gggGGGGgg', '.wwwwwww.'];
const SKULL = [
  '..wwwww..',
  '.wwwwwww.',
  '.wrwwwrw.',
  '.wwwkwww.',
  '..wwwww..',
  '..w.w.w..',
  'w.......w',
  '.w.....w.',
  '..w...w..',
  '.w.....w.',
  'w.......w',
];
const LANTERN = ['.kk.', 'kyyk', 'yYYy', 'yYYy', 'kyyk', '.kk.'];

export interface ShipSprites {
  waiter: Sprite[];
  waiterIdle: Sprite;
  crew: PersonSprites[];
  captain: PersonSprites;
  bride: PersonSprites;
  parrot: Sprite;
  parrotFly: Sprite;
  cannonball: Sprite;
  barrel: Sprite;
  fin: Sprite;
  skull: Sprite;
  lantern: Sprite;
}

function person(upper: string[], lower: string[], pal: Palette): PersonSprites {
  return {
    upper: makeSprite(upper, pal),
    lower: makeSprite(lower, pal),
    lowerStep: makeSprite(stepLegs(lower), pal),
  };
}

const STRIPES = ['#d6334e', '#3f7fd6', '#1f2a44', '#2e9fc2', '#8a2d2d'];
const BANDANAS = ['#d6334e', '#1f2a44', '#f2a93b', '#4bb38a', '#9b5bd1'];

export function buildShipSprites(): ShipSprites {
  // The waiter gets a red bandana for the high seas.
  const piratePal: Palette = { ...WAITER_PAL, h: '#d6334e' };
  const frames = [
    legs(-2, 2),
    legs(-1, 1),
    legs(0, 0),
    legs(1, -1),
    legs(2, -2),
    legs(1, -1),
    legs(0, 0),
    legs(-1, 1),
  ].map((l) => makeSprite([...WAITER_TOP, ...l], piratePal));
  const waiterIdle = makeSprite([...WAITER_TOP, ...legs(0, 0)], piratePal);

  const crew: PersonSprites[] = [];
  for (let i = 0; i < 10; i++) {
    const pal: Palette = {
      b: BANDANAS[i % BANDANAS.length],
      d: '#fbf7f0',
      h: HAIR[(i * 3 + 1) % HAIR.length],
      s: SKIN[(i * 2 + 1) % SKIN.length],
      e: '#1a1020',
      m: '#b0584a',
      k: '#141018',
      w: '#fbf7f0',
      C: STRIPES[(i * 3) % STRIPES.length],
      D: i % 3 === 0 ? '#5b3a2a' : '#2a2838',
      p: '#8a5a32',
    };
    const head = i % 2 ? HEAD_PATCH : HEAD_BANDANA;
    crew.push(person([...head, ...TORSO_STRIPE], i % 4 === 3 ? LEGS_PEG : LEGS_SUIT, pal));
  }
  const captain = person([...HEAD_TRICORN, ...TORSO_COAT], LEGS_PEG, {
    k: '#141018',
    g: '#e8b93b',
    h: '#2a1a12',
    s: SKIN[2],
    e: '#1a1020',
    m: '#b0584a',
    w: '#fbf7f0',
    C: '#a8263a',
    D: '#2a2838',
    p: '#8a5a32',
  });
  const bride = person([...HEAD_BRIDE, ...TORSO_BRIDE], LEGS_SKIRT, {
    k: '#141018',
    r: '#ff6fa8',
    h: '#8a2d2d',
    s: SKIN[1],
    e: '#1a1020',
    m: '#d0605a',
    w: '#fffaf2',
    C: '#d6334e',
  });
  const parrotPal: Palette = {
    r: '#e8283c',
    g: '#3fbf4a',
    b: '#2e7fd6',
    w: '#fffaf2',
    k: '#1a1020',
    y: '#f2a93b',
  };
  return {
    waiter: frames,
    waiterIdle,
    crew,
    captain,
    bride,
    parrot: makeSprite(PARROT_SIT, parrotPal),
    parrotFly: makeSprite(PARROT_FLY, parrotPal),
    cannonball: makeSprite(CANNONBALL, { k: '#141018', d: '#3b4048', w: '#9aa3ad' }),
    barrel: makeSprite(BARREL, {
      b: '#4a2a16',
      B: '#9a5a2e',
      g: '#5c6470',
      r: '#e8c070',
    }),
    fin: makeSprite(FIN, { g: '#5c6f80', G: '#7f93a6', w: '#e6f6ff' }),
    skull: makeSprite(SKULL, { w: '#fffaf2', r: '#ff4f7b', k: '#141018' }),
    lantern: makeSprite(LANTERN, { k: '#2a1a12', y: '#ffd36b', Y: '#fff2b0' }),
  };
}
