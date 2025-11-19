import Phaser from "phaser";
import { showSceneName } from "../../utils/devHelpers";

export default class CrashIntroScene extends Phaser.Scene {
  constructor() {
    super("CrashIntroScene");
  }

  create() {
    const { width, height } = this.scale;

    // DEV: Show scene name
    showSceneName(this);

    // Background - dark blue/grey for capsule interior
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    // Simple "windows" showing stars/space
    const windowLeft = this.add.rectangle(100, 150, 120, 180, 0x0a0a15);
    const windowRight = this.add.rectangle(width - 100, 150, 120, 180, 0x0a0a15);

    // Add some "stars" in windows
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(50, 160);
      const y = Phaser.Math.Between(80, 220);
      this.add.circle(x, y, 1, 0xffffff, 0.8);

      const x2 = Phaser.Math.Between(width - 160, width - 50);
      const y2 = Phaser.Math.Between(80, 220);
      this.add.circle(x2, y2, 1, 0xffffff, 0.8);
    }

    // Control panel suggestion
    this.add.rectangle(width / 2, height - 150, 600, 200, 0x2d4059);
    this.add.text(width / 2, height - 150, "🚀 Control Panel", {
      fontFamily: "sans-serif",
      fontSize: "18px",
      color: "#888888"
    }).setOrigin(0.5);

    // Status text
    const statusText = this.add.text(width / 2, height / 2, "APPROACHING DESTINATION...", {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#00ff00"
    }).setOrigin(0.5);

    // Sequence: normal → shake → crash → black
    this.time.delayedCall(1000, () => {
      statusText.setText("⚠️ WARNING: COLLISION DETECTED");
      statusText.setColor("#ff0000");

      // Camera shake
      this.cameras.main.shake(800, 0.02);

      // Flash effect
      this.time.delayedCall(400, () => {
        this.cameras.main.flash(200, 255, 100, 0);
      });
    });

    // Fade to black and move to next scene
    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
    });

    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("WakeUpScene");
    });
  }
}
