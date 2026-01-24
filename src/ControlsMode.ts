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

  // Only iOS/Android get touch controls.
  // Everything else (Windows, Mac, Linux, ChromeOS) gets desktop controls,
  // even if they have a touchscreen (e.g. Surface, touchscreen laptops).
  const isMobileOS = device.os.iOS || device.os.android;
  return !isMobileOS;
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
