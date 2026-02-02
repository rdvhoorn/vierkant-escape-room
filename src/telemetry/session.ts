import Phaser from "phaser";
import { checkAndReserveBudget } from "./telemetryFirestore";
import { initErrorLogger } from "./errorLogger";
import { initAnalytics } from "./analytics";
import { BugReportButton } from "./bugReportButton";

// Session ID: unique per page load
export const sessionId: string =
  crypto.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

let gameRef: Phaser.Game | null = null;

export function getCurrentSceneKey(): string {
  return gameRef?.scene.getScenes(true)[0]?.scene.key ?? "unknown";
}

/**
 * Main entry point for all telemetry.
 * Call once after Phaser game creation.
 */
export async function initTelemetry(game: Phaser.Game): Promise<void> {
  gameRef = game;

  // Bug report button always active (not gated by budget)
  new BugReportButton(game);

  // Check budget — this is async (Firestore read), which also ensures
  // BootScene has finished restoring saved state by the time we init analytics
  let budgetOk = false;
  try {
    budgetOk = await checkAndReserveBudget(10);
  } catch {
    // Firestore error — enable optimistically
    budgetOk = true;
  }

  if (budgetOk) {
    initErrorLogger();
    initAnalytics(game);
  }
}
