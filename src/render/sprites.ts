/**
 * Procedural pixel art: every sprite is a string-array pixel map plus a palette, rendered
 * once to an offscreen canvas at load time. '.' is transparent.
 */
export type Palette = Record<string, string>;
export type Sprite = HTMLCanvasElement;

export function makeSprite(rows: readonly string[], pal: Palette): Sprite {
  const h = rows.length;
  const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

/** Horizontally mirrored copy of a pixel map. */
export function mirror(rows: readonly string[]): string[] {
  return rows.map((r) => r.split('').reverse().join(''));
}

// ------------------------------------------------------------------ palettes
export const SKIN = ['#f6cfa8', '#e8b48a', '#c98b5e', '#9c6541', '#6e4428'];
export const HAIR = ['#2a1a12', '#5a3620', '#a8662e', '#e6c15a', '#c9c3bd', '#1c1c2a', '#8a2d2d'];
export const OUTFIT = [
  '#e0476b',
  '#3f7fd6',
  '#f2a93b',
  '#4bb38a',
  '#9b5bd1',
  '#ef6f3c',
  '#2e9fc2',
  '#d94fa6',
  '#6f8f2e',
  '#355070',
];

// ------------------------------------------------------------------ waiter
const WAITER_TOP = [
  '.....hhhh.....',
  '....hhhhhhh...',
  '...hhhhhhhhh..',
  '...hhsssssh...',
  '...hssssesss..',
  '...hsssssssss.',
  '....sssssss...',
  '....sssmmss...',
  '.....ssss.....',
  '.....wwww.....',
  '....wwbbww....',
  '...vvwwwwvv...',
  '...vvwwwwvv...',
  '...vvVwwVvv...',
  '...vvvwwvvv...',
  '...vvvwwvvv...',
  '...vvvvvvvv...',
  '...vvvvvvvv...',
  '...vvvvvvvv...',
  '...pppppppp...',
  '...pppppppp...',
];

/** Generate leg rows: each leg is 3 px wide and slants by dx pixels over its length. */
function legs(dxBack: number, dxFront: number, rows = 14): string[] {
  const out: string[] = [];
  for (let r = 0; r < rows; r++) {
    const row = new Array(14).fill('.');
    const f = r / (rows - 1);
    const shoe = r >= rows - 2;
    const b = Math.round(3 + dxBack * f);
    const fr = Math.round(8 + dxFront * f);
    for (let i = 0; i < 3; i++) {
      const bx = b + i;
      const fx = fr + i;
      if (bx >= 0 && bx < 14) row[bx] = shoe ? 'k' : 'p';
      if (fx >= 0 && fx < 14) row[fx] = shoe ? 'k' : 'p';
    }
    if (shoe) {
      const bt = b + 3;
      const ft = fr + 3;
      if (bt < 14) row[bt] = 'k';
      if (ft < 14) row[ft] = 'k';
    }
    out.push(row.join(''));
  }
  return out;
}

const WAITER_PAL: Palette = {
  h: '#3b2416',
  s: '#f2c29b',
  e: '#1a1020',
  m: '#b0584a',
  w: '#fbf7f0',
  b: '#d6334e',
  v: '#24222f',
  V: '#46425e',
  p: '#1b1a26',
  k: '#0b0a10',
};

// ------------------------------------------------------------------ people (guests etc.)
const HEAD_M = [
  '....hhhh....',
  '...hhhhhh...',
  '...hssssh...',
  '...sesses...',
  '...ssssss...',
  '...ssmmss...',
  '....ssss....',
];
const HEAD_F = [
  '...hhhhhh...',
  '..hhhhhhhh..',
  '..hhsssshh..',
  '..hsesseshh.',
  '..hssssssh..',
  '..hssmmssh..',
  '..h.ssss.h..',
];
const HEAD_BUN = [
  '.....hh.....',
  '....hhhh....',
  '...hhhhhh...',
  '..hggssggh..',
  '..hgeggegh..',
  '...ssssss...',
  '...ssmmss...',
];
const TORSO_SUIT = [
  '...CwwwwC...',
  '..CCCwwCCC..',
  '..CCCttCCC..',
  '.CCCCttCCCC.',
  '.CCCCttCCCC.',
  '.sCCCCCCCCs.',
  '.sCCCCCCCCs.',
  '..CCCCCCCC..',
  '..CCCCCCCC..',
  '..CCCCCCCC..',
  '..DDDDDDDD..',
];
const TORSO_DRESS = [
  '....CCCC....',
  '...CCCCCC...',
  '..sCCCCCCs..',
  '..sCCCCCCs..',
  '...CCCCCC...',
  '...CLLLLC...',
  '..CCCCCCCC..',
  '..CCCCCCCC..',
  '.CCCCCCCCCC.',
  '.CCCCCCCCCC.',
  '.CCCCCCCCCC.',
];
const LEGS_SUIT = [
  '..DDD..DDD..',
  '..DDD..DDD..',
  '..DDD..DDD..',
  '..DDD..DDD..',
  '..DDD..DDD..',
  '..DDD..DDD..',
  '..DDD..DDD..',
  '..DDD..DDD..',
  '..DDD..DDD..',
  '..DDD..DDD..',
  '..kkkk.kkkk.',
];
const LEGS_DRESS = [
  '.CCCCCCCCCC.',
  'CCCCCCCCCCCC',
  'CCCCCCCCCCCC',
  'CCCCCCCCCCCC',
  '.CCCCCCCCCC.',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '..kkk..kkk..',
];
/** Loud Hawaiian-shirt uncle torso (flowers = F). */
const TORSO_UNCLE = [
  '...CCwwCC...',
  '..CFCwwCFC..',
  '..CCCCCFCC..',
  '.CFCCFCCCCC.',
  '.CCCCCCCFCC.',
  '.sCFCCCFCCs.',
  '.sCCCFCCCCs.',
  '..CCCCCCFC..',
  '..FCCFCCCC..',
  '..CCCCCCCC..',
  '..DDDDDDDD..',
];
const TORSO_GRANNY = [
  '....CCCC....',
  '...CwwwwC...',
  '..CCCwwCCC..',
  '..CCCCCCCC..',
  '.sCCCCCCCCs.',
  '.sCCCCCCCCs.',
  '..CCCCCCCC..',
  '..DDDDDDDD..',
  '..DDDDDDDD..',
  '..DDDDDDDD..',
  '.DDDDDDDDDD.',
];
const LEGS_GRANNY = [
  '.DDDDDDDDDD.',
  '.DDDDDDDDDD.',
  '..DDDDDDDD..',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '..kkk..kkk..',
];

export interface PersonLook {
  female: boolean;
  skin: string;
  hair: string;
  outfit: string;
}

export interface PersonSprites {
  /** Head + torso. */
  upper: Sprite;
  /** Legs (idle). */
  lower: Sprite;
  /** Legs mid-step (for walking dancers). */
  lowerStep: Sprite;
}

function darken(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function stepLegs(rows: string[]): string[] {
  // Shift the right leg one pixel out and the left leg one pixel in for a stride.
  return rows.map((r, i) => (i < rows.length / 2 ? r : `.${r.slice(0, -1)}`));
}

export function makePerson(look: PersonLook): PersonSprites {
  const pal: Palette = {
    h: look.hair,
    s: look.skin,
    e: '#1a1020',
    m: '#b0584a',
    w: '#fbf7f0',
    t: darken(look.outfit, 0.55),
    C: look.outfit,
    L: darken(look.outfit, 0.8),
    D: look.female ? look.outfit : '#2a2838',
    k: '#141018',
  };
  const upper = [...(look.female ? HEAD_F : HEAD_M), ...(look.female ? TORSO_DRESS : TORSO_SUIT)];
  const lower = look.female ? LEGS_DRESS : LEGS_SUIT;
  return {
    upper: makeSprite(upper, pal),
    lower: makeSprite(lower, pal),
    lowerStep: makeSprite(stepLegs(lower), pal),
  };
}

// ------------------------------------------------------------------ toddler
const TODDLER_TOP = [
  '..hhhh..',
  '.hhhhhh.',
  '.hsssss.',
  '.sesess.',
  '.ssssss.',
  '..smms..',
  '..CCCC..',
  '.sCCCCs.',
  '.sCCCCs.',
  '..CCCC..',
  '..DDDD..',
];
const TODDLER_LEGS_A = ['.s...s..', '.s...s..', 'kk...kk.'];
const TODDLER_LEGS_B = ['..s.s...', '..s.s...', '..kkk...'];

// ------------------------------------------------------------------ props
const ROOMBA = [
  '....gggggggg....',
  '..gGGGGGGGGGGg..',
  '.gGGGGGrrGGGGGg.',
  'gggggggggggggggg',
  'dddddddddddddddd',
  '.dd..........dd.',
];
const BOUQUET = ['.pRpYp.', 'pRpYpRp', '.YpRpY.', '..gGg..', '...G...', '..wWw..', '...G...'];
const TOPPER = ['.kk..yy.', '.ss.ysy.', 'kbbkywwy', '.bb.wwww', '.bb.wwww', '.kk.wwww', 'dddddddd'];
const FLOWER = ['.p.', 'pYp', '.p.'];
const HEART = ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'];
const BULB = ['y'];

export interface SpriteBank {
  waiter: Sprite[];
  waiterIdle: Sprite;
  toddler: Sprite[];
  roomba: Sprite;
  roombaGreen: Sprite;
  bouquet: Sprite;
  topper: Sprite;
  flowers: Sprite[];
  heart: Sprite;
  bulb: Sprite;
  uncle: PersonSprites;
  grandma: PersonSprites;
  bride: PersonSprites;
  guests: PersonSprites[];
}

export function buildSprites(): SpriteBank {
  const waiterFrames = [
    legs(-2, 2),
    legs(-1, 1),
    legs(0, 0),
    legs(1, -1),
    legs(2, -2),
    legs(1, -1),
    legs(0, 0),
    legs(-1, 1),
  ].map((l) => makeSprite([...WAITER_TOP, ...l], WAITER_PAL));
  const waiterIdle = makeSprite([...WAITER_TOP, ...legs(0, 0)], WAITER_PAL);

  const kidPal: Palette = {
    h: '#a8662e',
    s: '#f6cfa8',
    e: '#1a1020',
    m: '#d0605a',
    C: '#ffd23f',
    D: '#3f7fd6',
    k: '#e0476b',
  };
  const toddler = [TODDLER_LEGS_A, TODDLER_LEGS_B].map((l) =>
    makeSprite([...TODDLER_TOP, ...l], kidPal),
  );

  const roombaPal: Palette = { g: '#9aa3ad', G: '#c9d1d9', r: '#ff3b3b', d: '#3b4048' };
  const bouquetPal: Palette = {
    p: '#ff8fb8',
    R: '#e0294f',
    Y: '#ffe066',
    g: '#3f9b4a',
    G: '#2f7a39',
    w: '#ffffff',
    W: '#f3d0e0',
  };
  const topperPal: Palette = {
    k: '#2a1a12',
    y: '#ffffff',
    s: '#f6cfa8',
    b: '#1f1d2b',
    w: '#fffaf2',
    d: '#e8b93b',
  };

  const unclePal: Palette = {
    h: '#5a3620',
    s: '#e8b48a',
    e: '#1a1020',
    m: '#b0584a',
    w: '#fbf7f0',
    C: '#27b5a3',
    F: '#ffd23f',
    D: '#f0e6d2',
    k: '#6b3b1f',
  };
  const uncleUpper = [...HEAD_M, ...TORSO_UNCLE];
  const uncle: PersonSprites = {
    upper: makeSprite(uncleUpper, unclePal),
    lower: makeSprite(LEGS_SUIT, unclePal),
    lowerStep: makeSprite(stepLegs(LEGS_SUIT), unclePal),
  };
  const grannyPal: Palette = {
    h: '#d7d2cc',
    g: '#8a7f9c',
    s: '#f0c8a4',
    e: '#1a1020',
    m: '#b0584a',
    w: '#fbf7f0',
    C: '#8e5bb5',
    D: '#6a86b8',
    k: '#2b2230',
  };
  const grandma: PersonSprites = {
    upper: makeSprite([...HEAD_BUN, ...TORSO_GRANNY], grannyPal),
    lower: makeSprite(LEGS_GRANNY, grannyPal),
    lowerStep: makeSprite(stepLegs(LEGS_GRANNY), grannyPal),
  };
  const bride = makePerson({ female: true, skin: SKIN[0], hair: HAIR[3], outfit: '#fffaf2' });

  const guests: PersonSprites[] = [];
  for (let i = 0; i < 12; i++) {
    guests.push(
      makePerson({
        female: i % 2 === 0,
        skin: SKIN[(i * 3) % SKIN.length],
        hair: HAIR[(i * 5 + 1) % HAIR.length],
        outfit: OUTFIT[i % OUTFIT.length],
      }),
    );
  }

  return {
    waiter: waiterFrames,
    waiterIdle,
    toddler,
    roomba: makeSprite(ROOMBA, roombaPal),
    roombaGreen: makeSprite(ROOMBA, { ...roombaPal, r: '#3bff7a' }),
    bouquet: makeSprite(BOUQUET, bouquetPal),
    topper: makeSprite(TOPPER, topperPal),
    flowers: ['#ff8fb8', '#ffffff', '#ffd23f', '#e0476b'].map((p) =>
      makeSprite(FLOWER, { p, Y: '#ffe9a8' }),
    ),
    heart: makeSprite(HEART, { r: '#ff4f7b' }),
    bulb: makeSprite(BULB, { y: '#ffe9a8' }),
    uncle,
    grandma,
    bride,
    guests,
  };
}
