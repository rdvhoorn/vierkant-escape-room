import Phaser from "phaser";
import { createBackButton } from "../../../utils/BackButton";

export default class KVQSom1 extends Phaser.Scene {
  constructor() {
    super("kvq_som_1");
  }

  create() {
    createBackButton(this, "Face5Scene");

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
      .text(centerX, centerY, "Je moet 3 keer hetzelfde cijfer gebruiken in een plussom waarvan de uitkomst 12 is. Je mag geen andere cijfers gebruiken en ook niet het cijfer 4. Welk cijfer heb je nodig?", {
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
