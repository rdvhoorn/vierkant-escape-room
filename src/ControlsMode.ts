import Phaser from "phaser";

let overrideIsDesktop: boolean | null = null;

/**
 * Single source of truth for "desktop-style controls or touch-style controls?"
 * - Uses override if set.
 * - Otherwise uses a heuristic based on Phaser's device info.
 */
export function getIsDesktop(scene: Phaser.Scene): boolean {
  if (overrideIsDesktop !== null) {
    return overrideIsDesktop;
  }

  const device = scene.sys.game.device;

  const isTouch = device.input.touch;
  const isDesktopOS = device.os.desktop;

  // Heuristic:
  // - If it has touch, prefer "touch" mode by default.
  // - Otherwise, use desktop controls.
  if (isTouch) return false;
  return isDesktopOS;
}

/**
 * Toggle the override between desktop/touch.
 * Called from a secret key (e.g. BACKTICK) for testing or weird devices.
 */
export function toggleControlsMode(scene: Phaser.Scene): boolean {
  const current = getIsDesktop(scene);
  overrideIsDesktop = !current;

  console.log(
    `[ControlsMode] Override -> ${overrideIsDesktop ? "DESKTOP" : "TOUCH"}`
  );

  return overrideIsDesktop;
}

/** Clear override, go back to auto detection (if you ever want that). */
export function clearControlsOverride() {
  overrideIsDesktop = null;
}
