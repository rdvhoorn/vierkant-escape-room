import Phaser from "phaser";
import { createBackButton } from "../../../utils/BackButton";

export default class KVQEieren extends Phaser.Scene {
  constructor() {
    super("kvq_eieren");
  }

  create() {
    createBackButton(this, "Face6Scene");

    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // --- Background panel (scaled to ~90% of screen) ---
    const panel = this.add.image(centerX, centerY, "wooden_panel").setOrigin(0.5);

    const targetScreenFraction = 0.9; // 90% of screen in both dimensions
    const scaleX = (width * targetScreenFraction) / panel.width;
    const scaleY = (height * targetScreenFraction) / panel.height;
    const panelScale = Math.min(scaleX, scaleY); // keep aspect ratio

    panel.setScale(panelScale);

    const panelWidth = panel.displayWidth;

    // --- Question text ---
    this.add
      .text(centerX, centerY, "1 kip legt 4 eieren in 3 dagen. Hoeveel eieren leggen 3 kippen in 9 dagen?", {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#000000",
        align: "center",
        wordWrap: { width: panelWidth * 0.6 },
      })
      .setOrigin(0.5)
      .setDepth(2);

  }
}
