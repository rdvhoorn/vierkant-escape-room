import Phaser from "phaser";

export default class ShipFuelScene extends Phaser.Scene {
  private lines: string[] = [];
  private i = 0;
  private dialogText!: Phaser.GameObjects.Text;

  constructor() {
    super("ShipFuelScene");
  }

  create() {
    const { width, height } = this.scale;

    // Background & stars
    this.add.rectangle(0, 0, width, height, 0x0f1630).setOrigin(0);
    const stars = this.add.graphics();
    for (let i = 0; i < 140; i++) {
      stars.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.9));
      stars.fillRect(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 2, 2);
    }

    // Dialog UI
    const box = this.add.rectangle(width / 2, height - 88, width - 80, 120, 0x1b2748, 0.85)
      .setStrokeStyle(2, 0x3c5a99);
    this.dialogText = this.add.text(
      box.x - box.width / 2 + 20,
      box.y - 44,
      "",
      { fontFamily: "sans-serif", fontSize: "18px", color: "#e7f3ff",
        wordWrap: { width: box.width - 40, useAdvancedWrap: true } }
    ).setOrigin(0, 0);
    this.add.text(width - 30, height - 18, "Click / Space →",
      { fontFamily: "sans-serif", fontSize: "14px", color: "#b6d5ff" })
      .setOrigin(1, 1).setAlpha(0.85);

    // Lines to click through
    this.lines = [
      "Impact detected. Hull stable. Navigation nominal.",
      "Fuel’s low, but we’ll figure it out planetside.",
      "Let’s get moving…",
      "DOOO PUZZLE HERE!!!"
    ];
    this.show(this.lines[this.i]);

    // Input
    this.input.on("pointerdown", () => this.advance());
    this.input.keyboard?.on("keydown-SPACE", () => this.advance());
  }

  private show(text: string) {
    this.tweens.killTweensOf(this.dialogText);
    this.dialogText.setAlpha(0).setText(text);
    this.tweens.add({ targets: this.dialogText, alpha: 1, duration: 160, ease: "sine.out" });
  }

  private advance() {
    this.i++;
    if (this.i < this.lines.length) this.show(this.lines[this.i]);
    else this.toNext();
  }

  private toNext() {
    this.cameras.main.fadeOut(200, 0, 0, 0, (_: any, p: number) => {
      if (p === 1) this.scene.start("MoreToComeScene");
    });
  }
}
