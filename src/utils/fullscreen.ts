// Fullscreen helper for mobile (Android).
// Requests fullscreen and automatically re-requests it on the next user
// interaction after the browser exits fullscreen (e.g. screen-off, app-switch).

let installed = false;
let restoreListenerActive = false;

// Vendor-compatible fullscreen helpers
function isFullscreen(): boolean {
  return !!(document.fullscreenElement
    || (document as any).webkitFullscreenElement);
}

function request(): void {
  if (isFullscreen()) return;
  const el = document.documentElement as any;
  const fn = el.requestFullscreen ?? el.webkitRequestFullscreen;
  if (fn) fn.call(el).catch(() => {});
}

// Restore listeners — use click + touchend since those are the most
// universally accepted "user activation" events for the Fullscreen API.
const GESTURE_EVENTS = ["click", "touchend"] as const;

function addRestoreListener(): void {
  if (restoreListenerActive) return;
  restoreListenerActive = true;
  for (const evt of GESTURE_EVENTS) {
    document.addEventListener(evt, onInteractionRestore);
  }
}

function removeRestoreListener(): void {
  if (!restoreListenerActive) return;
  restoreListenerActive = false;
  for (const evt of GESTURE_EVENTS) {
    document.removeEventListener(evt, onInteractionRestore);
  }
}

function onInteractionRestore(): void {
  if (!isFullscreen()) request();
}

function onFullscreenChange(): void {
  if (isFullscreen()) {
    removeRestoreListener();
  } else {
    addRestoreListener();
  }
}

function onVisibilityChange(): void {
  // Screen-off / app-switch may silently drop fullscreen without firing
  // fullscreenchange. Arm restore listener when we become visible again.
  if (document.visibilityState === "visible" && !isFullscreen()) {
    addRestoreListener();
  }
}

/**
 * Enter fullscreen and keep re-entering it whenever the browser drops out.
 * Safe to call multiple times; the listeners are installed only once.
 */
export function enterAndKeepFullscreen(): void {
  request();

  if (installed) return;
  installed = true;

  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);
  document.addEventListener("visibilitychange", onVisibilityChange);
}
