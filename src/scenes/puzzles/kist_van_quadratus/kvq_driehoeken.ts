import Phaser from "phaser";
import { createBackButton } from "../../../utils/BackButton";

export default class KVQDriehoeken extends Phaser.Scene {
  constructor() {
    super("kvq_driehoeken");
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
    const panelHeight = panel.displayHeight;

    // --- Question text ---
    this.add
      .text(centerX, centerY - panelHeight * 0.35, "Hoeveel driehoeken zijn er?", {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#000000",
        align: "center",
        wordWrap: { width: panelWidth * 0.8 },
      })
      .setOrigin(0.5)
      .setDepth(2);

    // --- Triangle puzzle (same as before) ---
    const graphics = this.add.graphics();
    graphics.lineStyle(4, 0x000000, 1);
    graphics.setDepth(2);

    const n = 4; // number of rows of small triangles
    const targetWidth = panelWidth * 0.3;
    const smallSide = targetWidth / n;
    const h = (smallSide * Math.sqrt(3)) / 2;
    const totalHeight = n * h;

    const topX = centerX;
    const topY = centerY - totalHeight * 0.4; // slightly above center

    const nodes: { x: number; y: number }[][] = [];

    for (let r = 0; r <= n; r++) {
      const row: { x: number; y: number }[] = [];
      const rowWidth = r * smallSide;
      const startX = topX - rowWidth / 2;
      const y = topY + r * h;

      for (let k = 0; k <= r; k++) {
        row.push({ x: startX + k * smallSide, y });
      }
      nodes.push(row);
    }

    // horizontal edges
    for (let r = 1; r <= n; r++) {
      for (let k = 0; k < r; k++) {
        const a = nodes[r][k];
        const b = nodes[r][k + 1];
        graphics.lineBetween(a.x, a.y, b.x, b.y);
      }
    }

    // down-left edges
    for (let r = 0; r < n; r++) {
      for (let k = 0; k <= r; k++) {
        const a = nodes[r][k];
        const b = nodes[r + 1][k];
        graphics.lineBetween(a.x, a.y, b.x, b.y);
      }
    }

    // down-right edges
    for (let r = 0; r < n; r++) {
      for (let k = 0; k <= r; k++) {
        const a = nodes[r][k];
        const b = nodes[r + 1][k + 1];
        graphics.lineBetween(a.x, a.y, b.x, b.y);
      }
    }
  }
}
