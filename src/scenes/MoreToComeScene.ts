import Phaser from "phaser";

export default class MoreToComeScene extends Phaser.Scene {
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
  }
}
