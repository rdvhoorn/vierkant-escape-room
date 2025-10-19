import Phaser from "phaser";

export default class IntroScene extends Phaser.Scene {
  private lines = [
    "Impact detected. Hull stable. Navigation nominal.",
    "Fuel’s low, but we’ll figure it out planetside.",
    "Let’s get moving…",
  ];
  private i = 0;
  private ship!: Phaser.GameObjects.Image;
  private dialogText!: Phaser.GameObjects.Text;

  constructor() { super("IntroScene"); }

  create() {
    const { width, height } = this.scale;

    // Background & stars
    this.add.rectangle(0, 0, width, height, 0x0f1630).setOrigin(0);
    const stars = this.add.graphics();
    for (let i = 0; i < 140; i++) {
      stars.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.9));
      stars.fillRect(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 2, 2);
    }

    // Square ship

    this.ship = this.add.image(width * 0.22, height * 0.6, "ship")
      .setOrigin(0.5)
      .setDisplaySize(84, 84);
    this.tweens.add({
      targets: this.ship, angle: { from: -2, to: 2 },
      duration: 900, yoyo: true, repeat: -1, ease: "sine.inOut"
    });

    // Dialog UI
    const box = this.add.rectangle(width / 2, height - 92, width - 80, 124, 0x1b2748, 0.85)
      .setStrokeStyle(2, 0x3c5a99);
    this.dialogText = this.add.text(
      box.x - box.width / 2 + 20, box.y - 48, "",
      { fontFamily: "sans-serif", fontSize: "18px", color: "#e7f3ff",
        wordWrap: { width: box.width - 40, useAdvancedWrap: true } }
    ).setOrigin(0, 0);
    this.add.text(width - 30, height - 20, "Click / Space →",
      { fontFamily: "sans-serif", fontSize: "14px", color: "#b6d5ff" })
      .setOrigin(1, 1).setAlpha(0.85);

    this.show(this.lines[this.i]);

    // Input
    const next = () => this.advance();
    this.input.on("pointerdown", next);
    this.input.keyboard?.on("keydown-SPACE", next);
  }

  private show(t: string) {
    this.tweens.killTweensOf(this.dialogText);
    this.dialogText.setAlpha(0).setText(t);
    this.tweens.add({ targets: this.dialogText, alpha: 1, duration: 160, ease: "sine.out" });
  }

  private advance() {
    this.i++;
    if (this.i < this.lines.length) this.show(this.lines[this.i]);
    else this.cameras.main.fadeOut(200, 0, 0, 0, (_: any, p: number) => {
      if (p === 1) this.scene.start("FaceTopScene");
    });
  }
}
