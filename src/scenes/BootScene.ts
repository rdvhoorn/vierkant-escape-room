import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  init() {
    // Put global init or registry defaults here if needed later
    this.registry.set("version", "0.1.0");
  }

  preload() {
    // If you ever need tiny inline assets, you could generate them here.
  }

  create() {
    // Immediately move to Preload so we can show a loading bar for future assets.
    this.scene.start("PreloadScene");
  }
}
