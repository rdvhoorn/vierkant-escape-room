import Phaser from "phaser";
import { showSceneName } from "../../utils/devHelpers";

export default class WakeUpScene extends Phaser.Scene {
  private dialogText!: Phaser.GameObjects.Text;
  private advanceHint!: Phaser.GameObjects.Text;
  private lines: string[] = [];
  private i = 0;

  constructor() {
    super("WakeUpScene");
  }

  create() {
    // Reset state
    this.i = 0;

    const { width, height } = this.scale;

    // DEV: Show scene name
    showSceneName(this);

    // Background - same capsule interior but with "dust" overlay
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    // Dust/damage overlay effect
    this.add.rectangle(0, 0, width, height, 0x3d3d3d, 0.3).setOrigin(0);

    // Windows (darker/cracked looking)
    this.add.rectangle(100, 150, 120, 180, 0x0a0a15);
    this.add.rectangle(width - 100, 150, 120, 180, 0x0a0a15);

    // Dust particles floating
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const particle = this.add.circle(x, y, 2, 0xcccccc, 0.4);

      // Slow floating animation
      this.tweens.add({
        targets: particle,
        y: y + Phaser.Math.Between(-30, 30),
        x: x + Phaser.Math.Between(-20, 20),
        duration: Phaser.Math.Between(3000, 5000),
        yoyo: true,
        repeat: -1,
        ease: 'sine.inout'
      });
    }

    // Damaged control panel
    this.add.rectangle(width / 2, height - 150, 600, 200, 0x2d4059);
    this.add.rectangle(width / 2, height - 150, 600, 200, 0xff0000, 0.2); // Red overlay (damage)
    this.add.text(width / 2, height - 150, "⚠️ SYSTEM ERROR", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ff4444"
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

    // Dialog lines
    this.lines = [
      "Waar ben ik? Wat is er gebeurd? Waar is iedereen?",
      "Ik weet nog dat we gisteren onze ruimte-missie hebben afgerond en dat we daarna allemaal in onze eigen capsules naar de aarde terug gingen.",
      "Zo te zien ben ik niet op de aarde. Ik moet uitzoeken waar ik ben.",
      "Wacht... het paneel! Alle draden zijn los! Ik moet dit repareren voordat ik verder kan."
    ];

    // Start with fade in from black
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    this.time.delayedCall(1500, () => {
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
      // Transition to puzzle scene
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("ShipFuelScene");
      });
    }
  }
}
