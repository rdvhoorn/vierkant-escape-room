import Phaser from "phaser";

export default class MoreToComeScene extends Phaser.Scene {
  private NEXT = "TitleScene";
  constructor() { super("MoreToComeScene"); }

  create() {
    const { width, height } = this.scale;

    // Background & stars
    this.add.rectangle(0, 0, width, height, 0x0f1630).setOrigin(0);
    const stars = this.add.graphics();
    for (let i = 0; i < 140; i++) {
      stars.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.9));
      stars.fillRect(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 2, 2);
    }

    // Message
    const title = this.add.text(width/2, height*0.45, "The escape room ends here—for now.", {
      fontFamily: "sans-serif", fontSize: "24px", color: "#e7f3ff"
    }).setOrigin(0.5);
    const sub = this.add.text(width/2, title.y + 36, "More puzzles will be published in January.", {
      fontFamily: "sans-serif", fontSize: "16px", color: "#cfe8ff"
    }).setOrigin(0.5);
    this.add.text(width - 24, height - 18, "Click / Space to continue →", {
      fontFamily: "sans-serif", fontSize: "14px", color: "#b6d5ff"
    }).setOrigin(1,1).setAlpha(0.85);

    // Input
    const next = () => this.cameras.main.fadeOut(200, 0, 0, 0, (_: any, p: number) => { if (p === 1) this.scene.start(this.NEXT); });
    this.input.on("pointerdown", next);
    this.input.keyboard?.on("keydown-SPACE", next);
  }
}
