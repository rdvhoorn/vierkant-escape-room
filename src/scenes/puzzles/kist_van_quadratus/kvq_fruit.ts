import Phaser from "phaser";
import { createBackButton } from "../../../utils/BackButton";

export default class KVQfruit extends Phaser.Scene {
  constructor() {
    super("kvq_fruit");
  }

  create() {
    createBackButton(this, "Face8Scene");

    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // --- Background panel (scaled to ~90% of screen) ---
    const panel = this.add.image(centerX, centerY, "wooden_panel").setOrigin(0.5);

    const targetScreenFraction = 0.9;
    const scaleX = (width * targetScreenFraction) / panel.width;
    const scaleY = (height * targetScreenFraction) / panel.height;
    const panelScale = Math.min(scaleX, scaleY);
    panel.setScale(panelScale);

    const panelLeft = panel.getBounds().left;
    const panelTop = panel.getBounds().top;
    const panelWidth = panel.displayWidth;
    const panelHeight = panel.displayHeight;

    // ---------- helpers ----------
    const makeIconSlot = (x: number, y: number, boxSize: number, textureKey: string) => {
      // Invisible box (for consistent layout). No border, no background.
      this.add
        .rectangle(x, y, boxSize, boxSize, 0x000000, 0) // alpha 0 => invisible fill
        .setOrigin(0.5);

      const img = this.add.image(x, y, textureKey).setOrigin(0.5);

      // Scale image to fit INSIDE the slot without stretching
      const scale = Math.min((boxSize * 0.9) / img.width, (boxSize * 0.9) / img.height);
      img.setScale(scale);

      return img;
    };

    const makeOp = (x: number, y: number, text: string, fontSize: number) => {
      return this.add
        .text(x, y, text, {
          fontFamily: "Arial",
          fontSize: `${fontSize}px`,
          color: "#1b1b1b",
        })
        .setOrigin(0.5);
    };

    const makeAnswer = (x: number, y: number, text: string, fontSize: number) => {
      // Right aligned at a shared X
      return this.add
        .text(x, y, text, {
          fontFamily: "Arial",
          fontSize: `${fontSize}px`,
          color: "#1b1b1b",
        })
        .setOrigin(1, 0.5); // right align
    };

    // ---------- layout ----------
    const MARGIN_X = panelWidth * 0.15;
    const MARGIN_Y = panelHeight * 0.12;

    const ICON_BOX = Math.min(panelWidth, panelHeight) * 0.17; // slightly smaller icons
    const GAP_X = ICON_BOX * 0.55;
    const GAP_Y = ICON_BOX * 0.95;

    const OP_SIZE = Math.round(ICON_BOX * 0.45);
    const ANS_SIZE = Math.round(ICON_BOX * 0.55);

    // Columns (3 icons with operators between them)
    const x1 = panelLeft + MARGIN_X + ICON_BOX * 0.5;
    const xPlus1 = x1 + ICON_BOX * 0.5 + GAP_X;
    const x2 = xPlus1 + GAP_X + ICON_BOX * 0.5;
    const xPlus2 = x2 + ICON_BOX * 0.5 + GAP_X;
    const x3 = xPlus2 + GAP_X + ICON_BOX * 0.5;

    // Shared "=" and right-aligned answers
    const eqX = x3 + ICON_BOX * 0.5 + GAP_X * 0.9;
    const answerX = panelLeft + panelWidth - MARGIN_X; // everything aligns here (right)

    // Rows
    const y1 = panelTop + MARGIN_Y + ICON_BOX * 0.5;
    const y2 = y1 + GAP_Y;
    const y3 = y2 + GAP_Y;
    const y4 = y3 + GAP_Y;

    // --- Row 1: peer + peer + peer = 30
    makeIconSlot(x1, y1, ICON_BOX, "1peer");
    makeOp(xPlus1, y1, "+", OP_SIZE);
    makeIconSlot(x2, y1, ICON_BOX, "1peer");
    makeOp(xPlus2, y1, "+", OP_SIZE);
    makeIconSlot(x3, y1, ICON_BOX, "1peer");
    makeOp(eqX, y1, "=", OP_SIZE);
    makeAnswer(answerX, y1, "30", ANS_SIZE);

    // --- Row 2: peer + 8druiven + 8druiven = 18
    makeIconSlot(x1, y2, ICON_BOX, "1peer");
    makeOp(xPlus1, y2, "+", OP_SIZE);
    makeIconSlot(x2, y2, ICON_BOX, "8druiven");
    makeOp(xPlus2, y2, "+", OP_SIZE);
    makeIconSlot(x3, y2, ICON_BOX, "8druiven");
    makeOp(eqX, y2, "=", OP_SIZE);
    makeAnswer(answerX, y2, "18", ANS_SIZE);

    // --- Row 3: 8druiven - 2kers = 2
    makeIconSlot(x2, y3, ICON_BOX, "8druiven");
    makeOp(xPlus2, y3, "-", OP_SIZE);
    makeIconSlot(x3, y3, ICON_BOX, "2kersen");
    makeOp(eqX, y3, "=", OP_SIZE);
    makeAnswer(answerX, y3, "2", ANS_SIZE);

    // --- Row 4: peer + 6druiven + 1kers = ?
    makeIconSlot(x1, y4, ICON_BOX, "1peer");
    makeOp(xPlus1, y4, "+", OP_SIZE);
    makeIconSlot(x2, y4, ICON_BOX, "6druiven");
    makeOp(xPlus2, y4, "+", OP_SIZE);
    makeIconSlot(x3, y4, ICON_BOX, "1kers");
    makeOp(eqX, y4, "=", OP_SIZE);
    makeAnswer(answerX, y4, "?", ANS_SIZE);
  }
}
