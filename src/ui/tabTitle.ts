import type { WorldId } from '../level/worlds';

/**
 * Animated browser-tab titles, one little show per world. Only document.title changes; nothing on
 * the page does. index.html keeps the full static title for crawlers and link previews, and it is
 * put back when the page is left so history and restored tabs show the real name.
 */

/** A tab title and how long it stays up (ms). Background tabs clamp timers to about 1s per frame. */
export type TitleFrame = readonly [text: string, ms: number];

const NAME = 'CAKE WALK';

/** Wedding Hall: the cake walks in and leaves the name behind it, then the party starts. */
function walkIn(): TitleFrame[] {
  const frames: TitleFrame[] = [];
  for (let i = 0; i <= NAME.length; i++) frames.push([`${NAME.slice(0, i)}🎂`, 220]);
  return frames;
}

/** Pirate Ship: the cake walks the plank, one board at a time. */
function plank(boards = 5): TitleFrame[] {
  const frames: TitleFrame[] = [];
  for (let i = 0; i < boards; i++) {
    frames.push([`☠️ ${'━'.repeat(i)}🎂${'━'.repeat(boards - 1 - i)}🌊`, 300]);
  }
  return frames;
}

/** Space Station: the name beams back in through the teleporter. */
function beamIn(word = 'Cake Walk'): TitleFrame[] {
  const frames: TitleFrame[] = [];
  for (let i = 0; i <= 4; i++) {
    const text = word
      .split(' ')
      .map((w) => w.slice(0, i) + '▒'.repeat(w.length - i))
      .join(' ');
    frames.push([`✨ ${text}`, 180]);
  }
  return frames;
}

export const TAB_TITLES: Record<WorldId, readonly TitleFrame[]> = {
  wedding: [
    ...walkIn(),
    ['🍾 POP!', 450],
    ['🎉 CAKE WALK 🎉', 700],
    ['🥂 Cake Walk 🥂', 700],
    ['💍 Cake Walk 💍', 700],
    ['🎂 Cake Walk', 3500],
  ],
  pirate: [
    ['⚓ Cake Walk', 1200],
    ['☠️ Cake Walk...', 700],
    ['☠️ Cake Walk THE PLANK!', 1300],
    ...plank(),
    ['☠️ ━━━━━🎂❗', 500],
    ['🦜🎂 SAVED IT!', 900],
    ['🦜 SQUAWK! Cake Walk!', 1000],
    ['🌊 CaKe WaLk', 350],
    ['🌊 cAkE wAlK', 350],
    ['🌊 CaKe WaLk', 350],
    ['🌊 cAkE wAlK', 350],
    ['⛵ Cake Walk', 3000],
  ],
  space: [
    ['🚀 3', 550],
    ['🚀 2', 550],
    ['🚀 1', 550],
    ['🚀🔥 LIFTOFF!', 700],
    ['🚀💨', 200],
    ['🚀💨💨', 200],
    ['🚀💨💨💨', 300],
    ['🛸 Cake Walk', 900],
    ['🛸 ZERO G!', 600],
    ['🛸 ʞlɐM ǝʞɐƆ', 900],
    ['🛸 Cake Walk', 500],
    ['🛸 ʞlɐM ǝʞɐƆ', 900],
    ['🌀 ▒▒▒▒ ▒▒▒▒', 300],
    ...beamIn(),
    ['🪐 Cake Walk', 3500],
  ],
};

/** Crawlers and preview renderers that run scripts should keep the static title. */
const CRAWLER = /bot|crawl|spider|slurp|lighthouse|headlesschrome/i;

/**
 * Play the current world's tab title animation for as long as the page is open. `getWorld` is
 * polled so picking another world on the title screen restarts the show straight away. With
 * reduced motion the tab holds each world's last frame instead.
 */
export function animateTabTitle(getWorld: () => WorldId, reducedMotion: boolean): void {
  if (CRAWLER.test(navigator.userAgent)) return;
  const original = document.title;
  let world: WorldId | undefined;
  let frame = 0;
  let next = 0;

  const show = (text: string) => {
    if (document.title !== text) document.title = text;
  };

  const tick = () => {
    const now = performance.now();
    const w = getWorld();
    const frames = TAB_TITLES[w];
    if (reducedMotion) {
      show(frames[frames.length - 1][0]);
      return;
    }
    if (w !== world) {
      world = w;
      frame = 0;
      next = now;
    }
    // Advance at most one frame per tick so throttled background tabs slow down, not skip.
    if (now < next) return;
    const [text, ms] = frames[frame];
    show(text);
    frame = (frame + 1) % frames.length;
    next = now + ms;
  };

  let timer = 0;
  const start = () => {
    world = undefined;
    tick();
    timer = window.setInterval(tick, 100);
  };
  start();
  window.addEventListener('pagehide', () => {
    clearInterval(timer);
    document.title = original;
  });
  // Coming back from the back/forward cache: pick the show up again.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) start();
  });
}
