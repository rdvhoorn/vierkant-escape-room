import Phaser from "phaser";

export default class MapScene extends Phaser.Scene {
  constructor() {
    super("MapScene");
  }

  create() {
    const { width, height } = this.scale;

    // Simple placeholder background
    this.add.rectangle(0, 0, width * 2, height * 2, 0x0f1630).setOrigin(0);

    // A minimal “planet net” placeholder (just a pentagon now; you’ll swap with a real net later)
    const g = this.add.graphics({ x: width / 2, y: height / 2 });
    g.lineStyle(3, 0x66a3ff, 1);
    const radius = 120;
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = Phaser.Math.DegToRad(-90 + i * 72);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.closePath();
    g.strokePath();

    this.add.text(width / 2, height * 0.2, "Planet Map (WIP)", {
      fontFamily: "sans-serif",
      fontSize: "24px",
      color: "#e7f3ff",
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.85, "Press ESC to return to Title", {
      fontFamily: "sans-serif",
      fontSize: "14px",
      color: "#b6d5ff",
    }).setOrigin(0.5).setAlpha(0.8);

    // Escape back to title for quick iteration
    this.input.keyboard?.on("keydown-ESC", () => {
      this.scene.start("TitleScene");
    });

    // Fade-in for polish
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }
}
