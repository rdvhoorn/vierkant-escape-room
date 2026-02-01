import Phaser from "phaser";

export const SAVE_KEY = "escaperoom_save";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  init() {
    this.registry.set("version", "0.1.0");

    // Restore saved game state from localStorage
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        for (const [key, value] of Object.entries(data)) {
          this.registry.set(key, value);
        }
      }
    } catch (e) {
      console.error("Failed to restore save:", e);
    }
  }

  preload() {
    // If you ever need tiny inline assets, you could generate them here.
  }

  create() {
    // Auto-save: on every registry set/change, persist to localStorage
    const save = (_parent: unknown, key: string, value: unknown) => {
      if (key === "version" || key.startsWith("debug_")) return;
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        const data: Record<string, unknown> = raw ? JSON.parse(raw) : {};
        data[key] = value;
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      } catch (e) {
        console.error("Failed to save:", e);
      }
    };

    this.registry.events.on("setdata", save);
    this.registry.events.on("changedata", save);

    // Immediately move to Preload so we can show a loading bar for future assets.
    this.scene.start("PreloadScene");
  }
}
