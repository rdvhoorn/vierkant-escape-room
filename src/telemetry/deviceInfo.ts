export interface DeviceInfo {
  userAgent: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
  isMobile: boolean;
  language: string;
}

let cached: DeviceInfo | null = null;

export function getDeviceInfo(): DeviceInfo {
  if (cached) return cached;
  cached = {
    userAgent: navigator.userAgent.slice(0, 300),
    platform: navigator.platform ?? "unknown",
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    isMobile:
      window.matchMedia("(pointer: coarse)").matches ||
      window.screen.width < 768,
    language: navigator.language ?? "unknown",
  };
  return cached;
}
