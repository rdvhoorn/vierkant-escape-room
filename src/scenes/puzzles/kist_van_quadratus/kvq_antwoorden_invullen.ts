import Phaser from "phaser";
import { createBackButton } from "../../../utils/BackButton";
import { PUZZLE_REWARDS, PuzzleKey } from "../../face_scenes/_FaceConfig";

type Slot = {
  key: string;
  answer: number;
  value: string;

  cell: Phaser.GameObjects.Container;

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

  private minValue = 0;
  private maxValue = 99;

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
      });

      downHit.on("pointerdown", () => {
        if (this.solved) return;
        this.setActiveSlot(i);
        this.stepSlotValue(i, -1);
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
        fieldRect,
        fieldText,
        fieldHit,
        upBtn,
        downBtn,
        upHit,
        downHit,
      };
    });

    // default selection
    this.setActiveSlot(0);

    // Keyboard typing (selected field)
    this.input.keyboard!.on("keydown", (ev: KeyboardEvent) => {
      if (this.solved) return;
      if (this.activeSlotIndex === null) return;

      const slot = this.slots[this.activeSlotIndex];

      if (ev.key >= "0" && ev.key <= "9") {
        this.appendDigit(slot, ev.key);
        this.refreshSlot(slot);
        this.checkSolved();
        return;
      }

      if (ev.key === "Backspace") {
        slot.value = slot.value.slice(0, -1);
        this.refreshSlot(slot);
        this.checkSolved();
        return;
      }

      if (ev.key === "Delete") {
        slot.value = "";
        this.refreshSlot(slot);
        this.checkSolved();
        return;
      }

      if (ev.key === "ArrowUp") {
        this.stepSlotValue(this.activeSlotIndex, +1);
        return;
      }
      if (ev.key === "ArrowDown") {
        this.stepSlotValue(this.activeSlotIndex, -1);
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

    this.activeSlotIndex = index;

    for (const s of this.slots) {
      s.fieldRect.setStrokeStyle(3, 0x888888);
    }
    this.slots[index].fieldRect.setStrokeStyle(4, 0x2d7cff);
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
}
