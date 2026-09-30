/** Ease an alert value towards on/off. */
export function easeAlert(current: number, on: boolean, dt: number): number {
  return on ? Math.min(1, current + dt * 6) : Math.max(0, current - dt * 3);
}
