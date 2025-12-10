import Phaser from "phaser";
import { createBackButton } from "../../../utils/BackButton";

export default class KVQOneven extends Phaser.Scene {
  constructor() {
    super("kvq_oneven");
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
    const panelHeight = panel.displayHeight;

    // --- Question text ---
    this.add
      .text(centerX, centerY-panelHeight * 0.2, "Ik ben een oneven getal. Haal één letter van mij weg en ik word even. Welk getal ben ik?", {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#000000",
        align: "center",
        wordWrap: { width: panelWidth * 0.6 },
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(centerX, centerY+panelHeight * 0.2, "* Hint: Een even getal is een getal dat je kunt delen door 2 zonder rest over te houden. Een oneven getal heeft rest 1 als je het deelt door 2.", {
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
