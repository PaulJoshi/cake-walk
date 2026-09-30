import type { Tuning } from '../game/tuning';
import type { Intent } from '../input/intent';

/** Waiter walking + tray model. Pure data + functions. */
export interface WaiterState {
  /** World x of the waiter's centre (px). */
  x: number;
  /** Walking speed (px/s, >= 0: forward only). */
  v: number;
  /** Walking acceleration applied this tick (px/s^2). */
  a: number;
  /** Hop height above the floor (px, + = up) and vertical speed. */
  y: number;
  vy: number;
  vyPrev: number;
  /** Vertical acceleration of the tray this tick (px/s^2, + = up). */
  aUp: number;
  /** Tray offset relative to the hands (px) and its velocity. */
  tray: number;
  trayV: number;
  /** Smoothed world-space tray acceleration fed to the cake (px/s^2). */
  aTray: number;
  /** Distance walked, for footstep phase (px). */
  stride: number;
}

export interface WaiterEnv {
  /** Multiplier on stopping deceleration (1 = normal floor). */
  decelMult: number;
  /** The waiter's centre may not pass this x (Infinity = no blocker). */
  blockX: number;
  /** Speed of the blocker (px/s). */
  blockV: number;
}

export function createWaiter(x = 0): WaiterState {
  return {
    x,
    v: 0,
    a: 0,
    y: 0,
    vy: 0,
    vyPrev: 0,
    aUp: 0,
    tray: 0,
    trayV: 0,
    aTray: 0,
    stride: 0,
  };
}

export function resetWaiter(w: WaiterState, x = 0): void {
  Object.assign(w, createWaiter(x));
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Start a hop (e.g. after running over the Roomba). */
export function hop(w: WaiterState, speed: number): void {
  if (w.y <= 0.01) w.vy = speed;
}

/**
 * Advance the waiter by dt. Walking is forward-only; the tray eases toward the target
 * with limited speed and acceleration. Computes the world-space tray acceleration.
 */
export function stepWaiter(
  t: Tuning,
  w: WaiterState,
  intent: Intent,
  env: WaiterEnv,
  dt: number,
): void {
  const v0 = w.v;
  let v = v0;
  if (intent.walk) v = Math.min(t.WALK_MAX, v + t.WALK_ACCEL * dt);
  else v = Math.max(0, v - t.STOP_DECEL * env.decelMult * dt);

  // Soft block: pressing into a slow blocker (grandma, the table) brakes hard.
  const gap = env.blockX - w.x;
  if (gap < t.BLOCK_SOFT && v > env.blockV) v = Math.max(env.blockV, v - t.BLOCK_DECEL * dt);
  let x = w.x + v * dt;
  if (x > env.blockX) {
    x = Math.max(w.x, env.blockX);
    v = Math.min(v, env.blockV);
  }
  w.a = (v - v0) / dt;
  w.v = v;
  w.stride += x - w.x;
  w.x = x;

  // Hop (vertical jolt). vyPrev includes any launch kick applied since the last step.
  const vy0 = w.vyPrev;
  if (w.y > 0 || w.vy > 0) {
    w.vy -= t.HOP_GRAVITY * dt;
    w.y += w.vy * dt;
    if (w.y <= 0) {
      w.y = 0;
      w.vy = 0;
    }
  }
  w.aUp = (w.vy - vy0) / dt;
  w.vyPrev = w.vy;

  // Tray: speed- and acceleration-limited follower of the target.
  const target = clamp(intent.trayTarget, -1, 1) * t.TRAY_REACH;
  const wantV = clamp((target - w.tray) * t.TRAY_RESPONSE, -t.TRAY_SPEED, t.TRAY_SPEED);
  const dv = clamp(wantV - w.trayV, -t.TRAY_ACCEL * dt, t.TRAY_ACCEL * dt);
  const trayV0 = w.trayV;
  w.trayV += dv;
  w.tray += w.trayV * dt;
  if (Math.abs(w.tray) > t.TRAY_REACH) {
    w.tray = clamp(w.tray, -t.TRAY_REACH, t.TRAY_REACH);
    w.trayV = 0;
  }
  const trayAcc = (w.trayV - trayV0) / dt;

  // World tray acceleration = walking accel + tray offset'' (finite difference, smoothed).
  // The arms absorb part of the walking jolt (ARM_COUPLING), but none of the tray's motion.
  const raw = w.a * t.ARM_COUPLING + trayAcc;
  const k = dt / (t.ACCEL_SMOOTH_TAU + dt);
  w.aTray += (raw - w.aTray) * k;
}
