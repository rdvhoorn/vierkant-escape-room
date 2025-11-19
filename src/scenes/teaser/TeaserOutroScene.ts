import Phaser from "phaser";
import { showSceneName } from "../../utils/devHelpers";

export default class TeaserOutroScene extends Phaser.Scene {
  private dialogText!: Phaser.GameObjects.Text;
  private advanceHint!: Phaser.GameObjects.Text;
  private lines: string[] = [];
  private i = 0;

  constructor() {
    super("TeaserOutroScene");
  }

  create() {
    // Reset state
    this.i = 0;

    const { width, height } = this.scale;

    // DEV: Show scene name
    showSceneName(this);

    // Part 1: Back in cockpit - checking systems
    // Background - cockpit interior (similar to WakeUpScene but cleaner)
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    // Windows showing stars
    this.add.rectangle(100, 150, 120, 180, 0x0a0a15);
    this.add.rectangle(width - 100, 150, 120, 180, 0x0a0a15);

    // Stars visible through windows
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(50, 160);
      const y = Phaser.Math.Between(80, 220);
      this.add.circle(x, y, 1, 0xffffff, 0.8);

      const x2 = Phaser.Math.Between(width - 160, width - 50);
      const y2 = Phaser.Math.Between(80, 220);
      this.add.circle(x2, y2, 1, 0xffffff, 0.8);
    }

    // Control panel (now working but fuel empty)
    this.add.rectangle(width / 2, height - 150, 600, 200, 0x2d4059);

    // Green indicator (systems online)
    this.add.circle(width / 2 - 200, height - 150, 12, 0x00ff00);
    this.add.text(width / 2 - 180, height - 155, "SYSTEMS", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#00ff00"
    });

    // Fuel meter (RED - empty!)
    this.add.text(width / 2, height - 170, "FUEL", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffffff"
    }).setOrigin(0.5);

    // Fuel bar (empty/red)
    this.add.rectangle(width / 2, height - 140, 200, 20, 0x330000).setStrokeStyle(2, 0xff0000);
    this.add.rectangle(width / 2 - 95, height - 140, 10, 16, 0xff0000); // Tiny bit of fuel

    this.add.text(width / 2, height - 115, "0%", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ff0000"
    }).setOrigin(0.5);

    // Dialog UI
    const box = this.add.rectangle(width / 2, height - 88, width - 80, 120, 0x1b2748, 0.9)
      .setStrokeStyle(2, 0x3c5a99);

    this.dialogText = this.add.text(
      box.x - box.width / 2 + 20,
      box.y - 44,
      "",
      {
        fontFamily: "sans-serif",
        fontSize: "18px",
        color: "#e7f3ff",
        wordWrap: { width: box.width - 40, useAdvancedWrap: true },
      }
    ).setOrigin(0, 0);

    this.advanceHint = this.add.text(width - 30, height - 18, "Click / Space →",
      { fontFamily: "sans-serif", fontSize: "14px", color: "#b6d5ff" })
      .setOrigin(1, 1).setAlpha(0.85);

    // Dialog lines - In cockpit (then go to planet)
    this.lines = [
      "Yes! De systemen werken weer!",
      "Maar... de brandstof is helemaal op. Ik kan niet meer verder vliegen.",
      "Ik moet uitstappen en onderzoeken waar ik ben."
    ];

    // Fade in
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    this.time.delayedCall(1000, () => {
      this.show(this.lines[this.i]);
    });

    // Input handlers
    this.input.on("pointerdown", () => this.advance());
    this.input.keyboard?.on("keydown-SPACE", () => this.advance());
  }

  private show(text: string) {
    this.tweens.killTweensOf(this.dialogText);
    this.dialogText.setAlpha(0).setText(text);
    this.tweens.add({
      targets: this.dialogText,
      alpha: 1,
      duration: 160,
      ease: "sine.out"
    });
  }

  private advance() {
    this.i++;
    if (this.i < this.lines.length) {
      this.show(this.lines[this.i]);
    } else {
      // Go to planet scene
      // Mark that we're in teaser mode
      this.registry.set("isTeaser", true);

      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("FaceTopScene");
      });
    }
  }
}
