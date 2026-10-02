import type { World } from '../../game/World';

export type ObstacleKind =
  | 'spill'
  | 'uncle'
  | 'roomba'
  | 'toddler'
  | 'grandma'
  | 'bassdrop'
  | 'bouquet'
  | 'conga'
  | 'table'
  | 'swell'
  | 'cannonballs'
  | 'barrel'
  | 'plank'
  | 'parrot'
  | 'kraken'
  | 'wave';

/** A horizontal interval in the waiter's lane, used for hitboxes and bot prediction. */
export interface Span {
  x0: number;
  x1: number;
}

export interface Obstacle {
  readonly kind: ObstacleKind;
  /** Telegraph bubble strength (0 = hidden, 1 = fully shown). */
  alert: number;
  /** World position of the telegraph bubble. */
  alertX: number;
  alertY: number;
  update(w: World, dt: number): void;
  /**
   * Lane hazards at `dt` seconds in the future (for the bot and debug hitboxes). Writes into
   * `out` and returns the count. Only needs to be accurate for the next couple of seconds.
   */
  hazards?(w: World, dt: number, out: Span[]): number;
  /** Optional blocker: the waiter's centre may not pass this x. */
  blockX?(w: World): number;
  blockV?(w: World): number;
  /** Optional: where a polite waiter (the bot) should queue behind a blocker. */
  queueX?(w: World): number;
}

/** Waiter body span in the lane. */
export function waiterSpan(x: number, halfW: number, out: Span): Span {
  out.x0 = x - halfW;
  out.x1 = x + halfW;
  return out;
}

export function overlaps(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && b0 < a1;
}
