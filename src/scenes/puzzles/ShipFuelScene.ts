import Phaser from "phaser";

type Cell = { x: number; y: number };
type Pair = { color: number; a: Cell; b: Cell };

export default class ShipFuelScene extends Phaser.Scene {
  private lines: string[] = [];
  private i = 0;
  private dialogText!: Phaser.GameObjects.Text;

  // --- gating dialog while puzzle is active
  private blockAdvance = false;

  // --- puzzle state
  private puzzleActive = false;
  private gridOrigin = { x: 0, y: 0 };
  private gridSize = 5;
  private cell = 64; // pixel size
  private gridGfx?: Phaser.GameObjects.Graphics;
  private pathGfx?: Phaser.GameObjects.Graphics;
  private dotGfx?: Phaser.GameObjects.Graphics;
  private pairs: Pair[] = [];
  private paths = new Map<number, Cell[]>(); // color -> path cells
  private lockedColors = new Set<number>();   // finished pairs
  private drawingColor?: number;
  private advanceHint!: Phaser.GameObjects.Text;
  private restartBtn?: Phaser.GameObjects.Text;

  constructor() {
    super("ShipFuelScene");
  }

  create() {
    const { width, height } = this.scale;

    // Background & stars
    this.add.rectangle(0, 0, width, height, 0x0f1630).setOrigin(0);
    const stars = this.add.graphics();
    for (let i = 0; i < 140; i++) {
      stars.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.9));
      stars.fillRect(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 2, 2);
    }

    // Dialog UI
    const box = this.add.rectangle(width / 2, height - 88, width - 80, 120, 0x1b2748, 0.85)
      .setStrokeStyle(2, 0x3c5a99);
    this.dialogText = this.add.text(
      box.x - box.width / 2 + 20,
      box.y - 44,
      "",
      {
        fontFamily: "sans-serif",
        fontSize: "18px",
        color: "#e7f3ff",
        wordWrap: { width: box.width - 40, useAdvancedWrap: true },
      }
    ).setOrigin(0, 0);
    
    this.advanceHint = this.add.text(width - 30, height - 18, "Click / Space →",
      { fontFamily: "sans-serif", fontSize: "14px", color: "#b6d5ff" })
      .setOrigin(1, 1).setAlpha(0.85);

    // Lines to click through
    this.lines = [
      "Impact detected. Hull stable. Navigation nominal.",
      "Fuel’s low, but we’ll figure it out planetside.",
      "Let’s get moving…",
      "DOOO PUZZLE HERE!!!"
    ];
    this.show(this.lines[this.i]);

    // Input for dialog advance (disabled while puzzle is active)
    this.input.on("pointerdown", () => this.advance());
    this.input.keyboard?.on("keydown-SPACE", () => this.advance());
  }

  private show(text: string) {
    this.tweens.killTweensOf(this.dialogText);
    this.dialogText.setAlpha(0).setText(text);
    this.tweens.add({ targets: this.dialogText, alpha: 1, duration: 160, ease: "sine.out" });
  }

  private advance() {
    if (this.blockAdvance) return; // puzzle up; ignore dialog clicks
    this.i++;
    if (this.i < this.lines.length) {
      const line = this.lines[this.i];
      if (line.includes("DOOO PUZZLE HERE!!!")) {
        this.startPuzzle();
      } else {
        this.show(line);
      }
    } else {
      this.toNext();
    }
  }

  private toNext() {
    this.cameras.main.fadeOut(200, 0, 0, 0, (_: any, p: number) => {
      if (p === 1) this.scene.start("MoreToComeScene");
    });
  }

  // =======================
  //        PUZZLE
  // =======================
  private startPuzzle() {
    this.blockAdvance = true;
    this.puzzleActive = true;

    // Layout: a centered square grid
    const { width, height } = this.scale;
    this.gridOrigin.x = Math.floor((width - this.gridSize * this.cell) / 2);
    this.gridOrigin.y = Math.floor((height - this.gridSize * this.cell) / 2) - 20;

    // Define 3 pairs (5x5)
    // 5×5, one pair per row → guaranteed full coverage without overlaps
    // Just change this to change the whole puzzle. Very easy :D 
    this.gridSize = 6;

    this.pairs = [
      { color: 0x9b59b6, a: { x: 0, y: 0 }, b: { x: 0, y: 4 } }, // Purple
      { color: 0xf0c419, a: { x: 2, y: 0 }, b: { x: 0, y: 5 } }, // Yellow
      { color: 0xe74c3c, a: { x: 3, y: 0 }, b: { x: 5, y: 2 } }, // Red
      { color: 0x29abe2, a: { x: 4, y: 1 }, b: { x: 4, y: 3 } }, // Blue
      { color: 0x2ecc71, a: { x: 5, y: 3 }, b: { x: 5, y: 5 } }, // Green
      { color: 0xe67e22, a: { x: 4, y: 2 }, b: { x: 3, y: 4 } }, // Orange
    ];
    this.paths.clear();
    this.lockedColors.clear();
    this.pairs.forEach(p => this.paths.set(p.color, [p.a]));

    // Restart button (↻) at top-right of the grid
    const rx = this.gridOrigin.x + this.gridSize * this.cell + 8;
    const ry = this.gridOrigin.y - 8;
    this.restartBtn = this.add.text(rx, ry, "↻", {
      fontFamily: "sans-serif",
      fontSize: "28px",
      color: "#e7f3ff"
    }).setOrigin(0, 1).setAlpha(0).setInteractive({ useHandCursor: true });

    this.restartBtn.on("pointerdown", () => this.resetPuzzle());
    this.tweens.add({ targets: this.restartBtn, alpha: 1, duration: 220 });

    // Graphics
    this.gridGfx = this.add.graphics().setAlpha(0);
    this.pathGfx = this.add.graphics().setAlpha(0);
    this.dotGfx = this.add.graphics().setAlpha(0);
    this.drawGrid();
    this.drawDots();
    this.redrawPaths();

    // Fade in the puzzle and message
    this.show("Connect matching fuel nodes. Drag to draw paths. Paths can’t overlap—and fill every square!");
    this.tweens.add({ targets: [this.gridGfx, this.pathGfx, this.dotGfx], alpha: 1, duration: 220 });

    // Remove advance hint
    this.advanceHint.setVisible(false);

    // Pointer handling
    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointermove", this.onPointerMove, this);
    this.input.on("pointerup", this.onPointerUp, this);
  }

  private endPuzzle() {
    this.puzzleActive = false;
    this.blockAdvance = false;
    this.input.off("pointerdown", this.onPointerDown, this);
    this.input.off("pointermove", this.onPointerMove, this);
    this.input.off("pointerup", this.onPointerUp, this);

    this.tweens.add({
      targets: [this.gridGfx, this.pathGfx, this.dotGfx],
      alpha: 0, duration: 200, onComplete: () => {
        this.gridGfx?.destroy(); this.pathGfx?.destroy(); this.dotGfx?.destroy();
      }
    });

    this.advanceHint.setVisible(true);

    if (this.restartBtn) {
      this.tweens.add({
        targets: this.restartBtn, alpha: 0, duration: 200,
        onComplete: () => this.restartBtn?.destroy()
      });
    }

    // Continue dialog
    this.i++;
    if (this.i < this.lines.length) this.show(this.lines[this.i]);
    else this.toNext();
  }

  // --- drawing helpers
  private toWorld(c: Cell): Phaser.Math.Vector2 {
    const x = this.gridOrigin.x + c.x * this.cell + this.cell / 2;
    const y = this.gridOrigin.y + c.y * this.cell + this.cell / 2;
    return new Phaser.Math.Vector2(x, y);
  }
  private fromWorld(x: number, y: number): Cell | null {
    const gx = Math.floor((x - this.gridOrigin.x) / this.cell);
    const gy = Math.floor((y - this.gridOrigin.y) / this.cell);
    if (gx < 0 || gy < 0 || gx >= this.gridSize || gy >= this.gridSize) return null;
    return { x: gx, y: gy };
  }
  private equal(a: Cell, b: Cell) { return a.x === b.x && a.y === b.y; }
  private manhattan(a: Cell, b: Cell) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }

  private drawGrid() {
    const g = this.gridGfx!;
    g.clear();
    g.lineStyle(2, 0x2a3b66, 0.9);
    g.fillStyle(0x13203d, 1);
    g.fillRect(this.gridOrigin.x, this.gridOrigin.y, this.gridSize * this.cell, this.gridSize * this.cell);
    for (let i = 0; i <= this.gridSize; i++) {
      const x = this.gridOrigin.x + i * this.cell;
      const y = this.gridOrigin.y + i * this.cell;
      g.lineBetween(this.gridOrigin.x, y, this.gridOrigin.x + this.gridSize * this.cell, y);
      g.lineBetween(x, this.gridOrigin.y, x, this.gridOrigin.y + this.gridSize * this.cell);
    }
  }

  private drawDots() {
    const g = this.dotGfx!;
    g.clear();
    for (const p of this.pairs) {
      g.fillStyle(p.color, 1);
      for (const c of [p.a, p.b]) {
        const v = this.toWorld(c);
        g.fillCircle(v.x, v.y, this.cell * 0.28);
      }
    }
  }

  private redrawPaths() {
    const g = this.pathGfx!;
    g.clear();
    for (const [color, cells] of this.paths) {
      if (cells.length < 1) continue;
      g.lineStyle(this.cell * 0.52, color, 0.95);
      const start = this.toWorld(cells[0]);
      g.beginPath();
      g.moveTo(start.x, start.y);
      for (let i = 1; i < cells.length; i++) {
        const v = this.toWorld(cells[i]);
        g.lineTo(v.x, v.y);
      }
      g.strokePath();
    }
    this.drawDots(); // keep dots on top
  }

  private cellOccupied(target: Cell): number | null {
    for (const [color, cells] of this.paths) {
      if (cells.some(c => this.equal(c, target))) return color;
    }
    return null;
  }

  private findPairByColor(color: number): Pair {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.pairs.find(p => p.color === color)!;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.puzzleActive) return;
    const cell = this.fromWorld(pointer.x, pointer.y);
    if (!cell) return;

    // --- delete a single line if you click any of its segments (but not on a dot)
    const clickedColor = this.getColorAtCell(cell);
    const epInfo = this.isEndpoint(cell);
    if (clickedColor !== null && !(epInfo && epInfo.color === clickedColor)) {
      // clicked somewhere on a path segment (not an endpoint) → clear that line
      this.clearColor(clickedColor);
      return;
    }

    // If you touch a locked color's endpoint or path, ignore
    for (const p of this.pairs) {
      if (this.equal(cell, p.a) || this.equal(cell, p.b)) {
        if (this.lockedColors.has(p.color)) return;
      }
    }
    for (const [color, path] of this.paths) {
      if (this.lockedColors.has(color) && path.some(c => this.equal(c, cell))) return;
    }

    // Start only on a dot or existing path of that color (to continue / backtrack)
    for (const p of this.pairs) {
      if (this.equal(cell, p.a) || this.equal(cell, p.b)) {
        this.drawingColor = p.color;
        this.paths.set(p.color, [cell]); // restart from the endpoint you touched
        this.lockedColors.delete(p.color);
        this.redrawPaths();
        return;
      }
    }

    // Continue an existing path if touching its last cell
    for (const [color, path] of this.paths) {
      if (this.equal(cell, path[path.length - 1])) {
        this.drawingColor = color;
        this.lockedColors.delete(color);
        return;
      }
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.puzzleActive || this.drawingColor == null) return;
    if (this.lockedColors.has(this.drawingColor)) return;
    const next = this.fromWorld(pointer.x, pointer.y);
    if (!next) return;

    const path = this.paths.get(this.drawingColor)!;
    const last = path[path.length - 1];
    if (this.equal(next, last)) return;

    // Only orthogonal steps of length 1
    if (this.manhattan(last, next) !== 1) return;

    // Backtracking (step into the previous cell)
    if (path.length >= 2 && this.equal(next, path[path.length - 2])) {
      path.pop();
      this.paths.set(this.drawingColor, path);
      this.redrawPaths();
      return;
    }

    // Block if another color already occupies the cell
    const occ = this.cellOccupied(next);
    if (occ !== null && occ !== this.drawingColor) return;

    // Don't step onto another color's endpoint
    const ep = this.isEndpoint(next);
    if (ep && ep.color !== this.drawingColor) return;

    // If our own path already has this cell (loop), trim back to it
    const existingIdx = path.findIndex(c => this.equal(c, next));
    if (existingIdx >= 0) path.splice(existingIdx + 1);
    else path.push(next);

    // If we reached the matching endpoint, lock this color
    const pair = this.findPairByColor(this.drawingColor);
    if (this.equal(next, pair.a) || this.equal(next, pair.b)) {
      // Ensure the other endpoint is somewhere in the path (connected)
      const hasA = path.some(c => this.equal(c, pair.a));
      const hasB = path.some(c => this.equal(c, pair.b));
      if (hasA && hasB) {
        this.lockedColors.add(this.drawingColor);
      }

      this.paths.set(this.drawingColor, path);
      this.redrawPaths();
      // stop drawing right away once connected
      this.drawingColor = undefined;
      return;
    }

    this.paths.set(this.drawingColor, path);
    this.redrawPaths();
  }

  private onPointerUp() {
    if (!this.puzzleActive) return;
    this.drawingColor = undefined;

    // Win only when all colors are connected AND every cell is covered
    if (this.lockedColors.size === this.pairs.length && this.isAllCovered()) {
      this.cameras.main.flash(160, 30, 200, 120);
      this.time.delayedCall(300, () => this.endPuzzle());
    }
  }

  private isEndpoint(c: Cell): { color: number; self: boolean } | null {
    for (const p of this.pairs) {
      if (this.equal(c, p.a) || this.equal(c, p.b)) {
        return { color: p.color, self: true };
      }
    }
    return null;
  }

  private isAllCovered(): boolean {
    const used = new Set<string>();
    for (const [, cells] of this.paths) {
      for (const c of cells) used.add(`${c.x},${c.y}`);
    }
    // every grid cell must be used
    return used.size === this.gridSize * this.gridSize;
  }

  private resetPuzzle() {
    this.paths.clear();
    this.lockedColors.clear();
    for (const p of this.pairs) this.paths.set(p.color, [p.a]);
    this.drawingColor = undefined;
    this.redrawPaths();
  }

  private getColorAtCell(c: Cell): number | null {
    for (const [color, cells] of this.paths) {
      if (cells.some(p => this.equal(p, c))) return color;
    }
    return null;
  }

  private clearColor(color: number) {
    // reset path to just its first endpoint
    const pair = this.findPairByColor(color);
    this.paths.set(color, [pair.a]);
    this.lockedColors.delete(color);
    if (this.drawingColor === color) this.drawingColor = undefined;
    this.redrawPaths();
  }
}
