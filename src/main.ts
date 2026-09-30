import './style.css';
import { Screen, VIEW_H, VIEW_W } from './render/Screen';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const screen = new Screen(canvas);

function frame(): void {
  const ctx = screen.ctx;
  ctx.fillStyle = '#3a1e2e';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff8ec';
  ctx.font = '16px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CAKE WALK', VIEW_W / 2, VIEW_H / 2);
  screen.present();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
