/** The only thing the simulation ever sees of the player's input, once per tick. */
export interface Intent {
  /** Walk forward while true. */
  walk: boolean;
  /** Desired tray position in [-1, 1] across the arm reach (0 = centred). */
  trayTarget: number;
}

export function createIntent(): Intent {
  return { walk: false, trayTarget: 0 };
}
