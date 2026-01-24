import Phaser from "phaser";
import { createBackButton } from "../../../utils/BackButton";
import { PUZZLE_REWARDS, PuzzleKey } from "../../face_scenes/_FaceConfig";

type Slot = {
  key: string;
  answer: number;
  value: string;

  cell: Phaser.GameObjects.Container;

  iconBox: Phaser.GameObjects.Rectangle;

  fieldRect: Phaser.GameObjects.Rectangle;
  fieldText: Phaser.GameObjects.Text;
  fieldHit: Phaser.GameObjects.Zone;

  upBtn: Phaser.GameObjects.Container;
  downBtn: Phaser.GameObjects.Container;
  upHit: Phaser.GameObjects.Zone;
  downHit: Phaser.GameObjects.Zone;
};

export default class KVQAntwoordenInvullen extends Phaser.Scene {
  private slots: Slot[] = [];
  private activeSlotIndex: number | null = null;
  private solved = false;

  private readonly SAVE_KEY = "kvq_antwoorden_invullen_values";

  private minValue = 0;
  private maxValue = 99;

  private normalStroke = 0x888888;
  private okStroke = 0x2ecc71;
  private activeStroke = 0x2d7cff;

  private okFill = 0xe8f8ef;     // light green
  private normalFill = 0xffffff; // field fill
  private iconFill = 0xf2f2f2;   // icon box fill

  constructor() {
    super("kvq_antwoorden_invullen");
  }

  create() {
    createBackButton(this, "Face7Scene", { entry_from_puzzle: true });

    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    // Background panel
    this.add.rectangle(cx, cy, 560, 380, 0xdddddd, 1).setStrokeStyle(4, 0xb0b0b0);

    const puzzle = [
      { key: "vraagtekens", answer: 7 },
      { key: "driehoek", answer: 27 },
      { key: "vierkant_logo", answer: 6 },
      { key: "fruitmand", answer: 14 },
      { key: "ei", answer: 36 },
      { key: "twelve", answer: 1 },
    ];

    // Layout
    const startX = cx - 160;
    const startY = cy - 120;
    const colW = 170;
    const rowH = 165;

    // Sizes
    const iconBoxW = 90;
    const iconBoxH = 70;

    const fieldW = 90;
    const fieldH = 50;

    const btnW = 34;
    const btnH = 24;

    // Offsets inside each cell (LOCAL coords, since we build a per-cell container)
    const iconY = -15;
    const fieldY = 55;

    const btnX = fieldW / 2 + btnW / 2 + 8; // next to field
    const btnUpY = fieldY - 13;
    const btnDownY = fieldY + 13;

    this.slots = puzzle.map((p, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);

      const cellX = startX + col * colW - 25;
      const cellY = startY + row * rowH + 25;

      // One container per slot (option A)
      const cell = this.add.container(cellX, cellY);

      // --- ICON BOX
      const iconBox = this.add
        .rectangle(0, iconY, iconBoxW, iconBoxH, 0xf2f2f2, 1)
        .setStrokeStyle(3, 0x888888);

      const icon = this.add.image(0, iconY, p.key);
      this.fitImageInBox(icon, iconBoxW - 12, iconBoxH - 12);

      // --- FIELD
      const fieldRect = this.add.rectangle(0, fieldY, fieldW, fieldH, 0xffffff, 1).setStrokeStyle(3, 0x888888);
      const fieldText = this.add
        .text(0, fieldY, "", { fontFamily: "Arial", fontSize: "24px", color: "#333" })
        .setOrigin(0.5);

      // Reliable hit area: Zone (local coords)
      const fieldHit = this.add.zone(0, fieldY, fieldW, fieldH).setOrigin(0.5).setInteractive({ useHandCursor: true });

      fieldHit.on("pointerdown", () => this.setActiveSlot(i));

      // --- BUTTONS (visual)
      const upBtn = this.makeArrowButtonVisual("▲", btnX, btnUpY, btnW, btnH);
      const downBtn = this.makeArrowButtonVisual("▼", btnX, btnDownY, btnW, btnH);

      // Reliable hit areas for buttons (zones)
      const upHit = this.add.zone(btnX, btnUpY, btnW, btnH).setOrigin(0.5).setInteractive({ useHandCursor: true });
      const downHit = this.add.zone(btnX, btnDownY, btnW, btnH).setOrigin(0.5).setInteractive({ useHandCursor: true });

      upHit.on("pointerdown", () => {
        if (this.solved) return;
        this.setActiveSlot(i);
        this.stepSlotValue(i, +1);
        this.saveValues();        
      });

      downHit.on("pointerdown", () => {
        if (this.solved) return;
        this.setActiveSlot(i);
        this.stepSlotValue(i, -1);
        this.saveValues();
      });

      // (Optional hover feedback)
      upHit.on("pointerover", () => (upBtn.list[0] as Phaser.GameObjects.Rectangle).setFillStyle(0xf2f2f2, 1));
      upHit.on("pointerout", () => (upBtn.list[0] as Phaser.GameObjects.Rectangle).setFillStyle(0xffffff, 1));
      downHit.on("pointerover", () => (downBtn.list[0] as Phaser.GameObjects.Rectangle).setFillStyle(0xf2f2f2, 1));
      downHit.on("pointerout", () => (downBtn.list[0] as Phaser.GameObjects.Rectangle).setFillStyle(0xffffff, 1));

      // Add everything to the cell container (local positioning stays correct)
      cell.add([iconBox, icon, fieldRect, fieldText, upBtn, downBtn, fieldHit, upHit, downHit]);

      return {
        key: p.key,
        answer: p.answer,
        value: "",
        cell,
        iconBox,
        fieldRect,
        fieldText,
        fieldHit,
        upBtn,
        downBtn,
        upHit,
        downHit,
      };
    });

    // Restore saved values (if any)
    const saved = this.loadValues();
    if (saved) {
      this.slots.forEach((slot, i) => {
        slot.value = saved[i] ?? "";
        this.refreshSlot(slot);
      });
    }

    // default selection + indicators
    this.setActiveSlot(0);
    this.updateRowIndicators();
    this.checkSolved(); // in case everything was already correct


    // default selection
    this.setActiveSlot(0);
    this.updateRowIndicators();

    // Keyboard typing (selected field)
    this.input.keyboard!.on("keydown", (ev: KeyboardEvent) => {
      if (this.solved) return;
      if (this.activeSlotIndex === null) return;

      const slot = this.slots[this.activeSlotIndex];

      if (ev.key >= "0" && ev.key <= "9") {
        this.appendDigit(slot, ev.key);
        this.refreshSlot(slot);
        this.checkSolved();
        this.updateRowIndicators();
        this.saveValues();
        return;
      }

      if (ev.key === "Backspace") {
        slot.value = slot.value.slice(0, -1);
        this.refreshSlot(slot);
        this.checkSolved();
        this.updateRowIndicators();
        this.saveValues();
        return;
      }

      if (ev.key === "Delete") {
        slot.value = "";
        this.refreshSlot(slot);
        this.checkSolved();
        this.updateRowIndicators();
        this.saveValues();
        return;
      }

      if (ev.key === "ArrowUp") {
        this.stepSlotValue(this.activeSlotIndex, +1);
        this.saveValues();
        return;
      }
      if (ev.key === "ArrowDown") {
        this.stepSlotValue(this.activeSlotIndex, -1);
        this.saveValues();
        return;
      }

      if (ev.key === "Enter") {
        this.checkSolved(true);
      }
    });
  }

  // -------- UI helpers --------

  private setActiveSlot(index: number) {
    if (this.solved) return;

    // if the clicked slot is in a correct row, just deselect
    const top = [0, 1, 2];
    const bottom = [3, 4, 5];

    const rowCorrect =
      (top.includes(index) && this.isRowCorrect(top)) ||
      (bottom.includes(index) && this.isRowCorrect(bottom));

    if (rowCorrect) {
      this.activeSlotIndex = null;
      this.updateRowIndicators();
      return;
    }

    this.activeSlotIndex = index;
    this.updateRowIndicators(); // will apply highlight if allowed
  }


  private applyActiveHighlight(index: number) {
    const s = this.slots[index];
    s.fieldRect.setStrokeStyle(4, this.activeStroke);
  }


  private makeArrowButtonVisual(label: string, x: number, y: number, w: number, h: number) {
    const rect = this.add.rectangle(x, y, w, h, 0xffffff, 1).setStrokeStyle(2, 0x666666);
    const text = this.add.text(x, y, label, { fontFamily: "Arial", fontSize: "16px", color: "#333" }).setOrigin(0.5);
    return this.add.container(0, 0, [rect, text]); // container at 0,0 since children already positioned
  }

  private fitImageInBox(img: Phaser.GameObjects.Image, maxW: number, maxH: number) {
    const texW = img.width;
    const texH = img.height;
    if (!texW || !texH) return;

    const scale = Math.min(maxW / texW, maxH / texH);
    img.setScale(scale);
  }

  // -------- Value logic --------

  private appendDigit(slot: Slot, digit: string) {
    const maxLen = 3;
    if (slot.value.length >= maxLen) return;

    if (slot.value === "0") slot.value = digit;
    else slot.value += digit;

    const n = Number(slot.value);
    if (!Number.isNaN(n)) {
      slot.value = String(Phaser.Math.Clamp(n, this.minValue, this.maxValue));
    }
  }

  private stepSlotValue(index: number, delta: number) {
    if (this.solved) return;

    const slot = this.slots[index];
    const current = slot.value.length ? Number(slot.value) : 0;
    const safe = Number.isNaN(current) ? 0 : current;

    const next = Phaser.Math.Clamp(safe + delta, this.minValue, this.maxValue);
    slot.value = String(next);

    this.refreshSlot(slot);
    this.checkSolved();
    this.updateRowIndicators();
  }

  private refreshSlot(slot: Slot) {
    slot.fieldText.setText(slot.value);
  }

  // -------- Solve logic --------

  private checkSolved(force = false) {
    if (this.solved) return;

    const allFilled = this.slots.every((s) => s.value.length > 0);
    if (!allFilled && !force) return;

    const allCorrect = this.slots.every((s) => Number(s.value) === s.answer);

    if (allCorrect) {
      this.solved = true;
      this.onSolved();
    }
  }

  private onSolved() {
    this.registry.set(PUZZLE_REWARDS[PuzzleKey.KistVanQuadratus].puzzleSolvedRegistryKey, true);
    this.add
      .text(this.cameras.main.centerX, this.cameras.main.centerY + 170, "Hij opent!", {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#2ecc71",
      })
      .setOrigin(0.5);

    this.time.delayedCall(1500, () => {
      this.scene.start("Face7Scene", { entry_from_puzzle: true });
    });
  }

  private updateRowIndicators() {
    const top = [0, 1, 2];
    const bottom = [3, 4, 5];

    const topCorrect = this.isRowCorrect(top);
    const bottomCorrect = this.isRowCorrect(bottom);

    // paint rows
    this.applyRowIndicator(top);
    this.applyRowIndicator(bottom);

    // if active slot is inside a correct row, deselect it
    if (this.activeSlotIndex !== null) {
      const inTop = top.includes(this.activeSlotIndex);
      const inBottom = bottom.includes(this.activeSlotIndex);

      if ((inTop && topCorrect) || (inBottom && bottomCorrect)) {
        this.activeSlotIndex = null; // ✅ deselect
        return; // ✅ do NOT re-apply active highlight
      }

      // otherwise keep highlight
      this.applyActiveHighlight(this.activeSlotIndex);
    }
  }


  private applyRowIndicator(indices: number[]) {
    const rowSlots = indices.map((i) => this.slots[i]);

    const allFilled = rowSlots.every((s) => s.value.length > 0);
    const allCorrect = allFilled && rowSlots.every((s) => Number(s.value) === s.answer);

    for (const s of rowSlots) {
      if (allCorrect) {
        s.fieldRect.setFillStyle(this.okFill, 1);
        s.fieldRect.setStrokeStyle(3, this.okStroke);

        s.iconBox.setFillStyle(0xdff5e7, 1);
        s.iconBox.setStrokeStyle(3, this.okStroke);
      } else {
        // revert to normal row style (selection highlight handled elsewhere)
        s.fieldRect.setFillStyle(this.normalFill, 1);
        s.fieldRect.setStrokeStyle(3, this.normalStroke);

        s.iconBox.setFillStyle(this.iconFill, 1);
        s.iconBox.setStrokeStyle(3, this.normalStroke);
      }
    }
  }

  private isRowCorrect(indices: number[]) {
    const rowSlots = indices.map((i) => this.slots[i]);
    const allFilled = rowSlots.every((s) => s.value.length > 0);
    return allFilled && rowSlots.every((s) => Number(s.value) === s.answer);
  }

  private saveValues() {
    // store in the same order as this.slots
    const values = this.slots.map((s) => s.value);
    this.registry.set(this.SAVE_KEY, values);
  }

  private loadValues(): string[] | null {
    const v = this.registry.get(this.SAVE_KEY);
    if (Array.isArray(v)) return v as string[];
    return null;
  }
}
