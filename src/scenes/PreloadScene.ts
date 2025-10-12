import Phaser from "phaser";

export default class PreloadScene extends Phaser.Scene {
  private progressBox!: Phaser.GameObjects.Rectangle;
  private progressBar!: Phaser.GameObjects.Rectangle;
  private percentText!: Phaser.GameObjects.Text;

  constructor() {
    super("PreloadScene");
  }

  preload() {
    const { width, height } = this.scale;

    // Loading UI
    this.progressBox = this.add.rectangle(width / 2, height / 2, 360, 30, 0x1e2a4a, 0.9).setStrokeStyle(2, 0x3c5a99);
    this.progressBar = this.add.rectangle((width / 2) - 175, height / 2, 0, 20, 0x8fd5ff, 1).setOrigin(0, 0.5);
    this.percentText = this.add.text(width / 2, height / 2 + 40, "0%", {
      fontFamily: "sans-serif",
      fontSize: "14px",
      color: "#cfe8ff",
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 60, "Preparing Launch…", {
      fontFamily: "sans-serif",
      fontSize: "18px",
      color: "#cfe8ff",
    }).setOrigin(0.5);

    // Progress handlers
    this.load.on("progress", (value: number) => {
      this.progressBar.width = 350 * value;
      this.percentText.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on("complete", () => {
      this.time.delayedCall(200, () => {
        this.scene.start("TitleScene");
      });
    });

    // --- Put future asset loads here ---
    // Example (commented, no external files yet):
    // this.load.image('logo', '/assets/logo.png');
    // -----------------------------------
  }

  create() {
    // Nothing else needed; we go to TitleScene in on('complete')
  }
}
