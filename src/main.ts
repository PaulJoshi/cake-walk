import './style.css';
import { Audio } from './audio/Audio';
import { Game } from './game/Game';
import { Input } from './input/Input';
import { Renderer } from './render/Renderer';
import { Screen } from './render/Screen';
import { Overlays } from './ui/overlays';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui') as HTMLElement;
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const screen = new Screen(canvas);
const renderer = new Renderer(reducedMotion);
const input = new Input(canvas);
const audio = new Audio();
const ui = new Overlays(uiRoot);
const game = new Game(screen, renderer, input, audio, ui);

// Wait briefly for the pixel font so canvas text doesn't flash the fallback.
const fontReady = document.fonts?.load('16px "Press Start 2P"').catch(() => undefined);
Promise.race([fontReady, new Promise((r) => setTimeout(r, 1500))]).then(() => {
  game.newRound('daily');
  game.start();
});

// Expose for debugging and the smoke test.
(window as unknown as { cakeWalk: Game }).cakeWalk = game;
