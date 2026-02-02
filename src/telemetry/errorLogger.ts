import { getDeviceInfo } from "./deviceInfo";
import { sessionId, getCurrentSceneKey } from "./session";
import { submitError } from "./telemetryFirestore";

const MAX_ERRORS = 10;
let errorCount = 0;

export function initErrorLogger(): void {
  window.addEventListener("error", (event) => {
    if (errorCount >= MAX_ERRORS) return;
    errorCount++;

    submitError({
      message: (event.message ?? "Unknown error").slice(0, 500),
      stack: (event.error?.stack ?? "").slice(0, 2000),
      type: "error",
      currentScene: getCurrentSceneKey(),
      sessionId,
      deviceInfo: getDeviceInfo(),
      url: window.location.href,
    }).catch(() => {});
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (errorCount >= MAX_ERRORS) return;
    errorCount++;

    const reason = event.reason;
    const message =
      reason?.message ?? String(reason ?? "Unknown rejection");
    const stack = reason?.stack ?? "";

    submitError({
      message: message.slice(0, 500),
      stack: stack.slice(0, 2000),
      type: "unhandledrejection",
      currentScene: getCurrentSceneKey(),
      sessionId,
      deviceInfo: getDeviceInfo(),
      url: window.location.href,
    }).catch(() => {});
  });
}
