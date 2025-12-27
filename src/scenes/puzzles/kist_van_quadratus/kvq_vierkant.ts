import Phaser from "phaser";
import { createBackButton } from "../../../utils/BackButton";

export default class KVQVierkant extends Phaser.Scene {
  constructor() {
    super("kvq_vierkant");
  }

  create() {
    createBackButton(this, "Face8Scene");

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
      .text(centerX, centerY-80, "Hoeveel vierkanten zijn er?", {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#000000",
        align: "center",
        wordWrap: { width: panelWidth * 0.6 },
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add.image(centerX, centerY + 50, "vierkant_logo").setOrigin(0.5).setScale(0.8);
  }
}
