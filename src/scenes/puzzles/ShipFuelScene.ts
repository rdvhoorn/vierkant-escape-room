import Phaser from "phaser";
import { TwinklingStars } from "../../utils/TwinklingStars";
import { DEBUG } from "../../main";

type Cell = { x: number; y: number };
type Pair = { color: number; a: Cell; b: Cell };

// Symbol types for colorblind accessibility
const COLOR_SYMBOL_TYPES: Map<number, string> = new Map([
  [0x9b59b6, "circle"],   // Purple
  [0xf0c419, "square"],   // Yellow
  [0xe74c3c, "triangle"], // Red
  [0x29abe2, "diamond"],  // Blue
  [0x2ecc71, "star"],     // Green
  [0xe67e22, "plus"],     // Orange
]);

export default class ShipFuelScene extends Phaser.Scene {
  private lines: string[] = [];
  private i = 0;
  private dialogText!: Phaser.GameObjects.Text;
  private twinklingStars?: TwinklingStars;

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
  private flowGfx?: Phaser.GameObjects.Graphics;
  private pairs: Pair[] = [];
  private paths = new Map<number, Cell[]>();
  private lockedColors = new Set<number>();
  private drawingColor?: number;
  private advanceHint!: Phaser.GameObjects.Text;
  private flowOffset = 0;
  private pulseTime = 0;
  private isShortCircuiting = false;
  private shortCircuitingColors = new Set<number>();
  private symbolGfx?: Phaser.GameObjects.Graphics;

  constructor() {
    super("ShipFuelScene");
  }

  create() {
    // Reset state when scene restarts
    this.i = 0;
    this.blockAdvance = false;
    this.puzzleActive = false;

    const { width, height } = this.scale;

    // Background & twinkling stars
    this.add.rectangle(0, 0, width, height, 0x0f1630).setOrigin(0);
    this.twinklingStars = new TwinklingStars(this, 150, width, height);

    // Dialog UI
    const box = this.add.rectangle(width / 2, height - 32, width - 80, 50, 0x1b2748, 0.85)
      .setStrokeStyle(2, 0x3c5a99);
    this.dialogText = this.add.text(
      box.x - box.width / 2 + 20,
      box.y - 16,
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

    // Start puzzle immediately
    this.startPuzzle();

    // Input for dialog advance (disabled while puzzle is active)
    this.input.on("pointerdown", () => this.advance());
    this.input.keyboard?.on("keydown-SPACE", () => this.advance());

    //terug met escape (rondlopen)
    this.input.keyboard?.on("keydown-ESC", () => {
      this.scene.stop(this.scene.key);
      this.scene.start("CockpitScene");
    });
  }

  update(_time: number, delta: number) {
    this.twinklingStars?.update(delta);

    // Animate terminal pulsing
    if (this.puzzleActive) {
      this.pulseTime += delta * 0.003;
      this.drawDots(); // redraw terminals for pulsing effect

      // Animate short-circuit flow
      if (this.shortCircuitingColors.size > 0) {
        this.flowOffset += delta * 0.01;
        this.flowGfx?.clear();
        this.drawShortCircuitFlow();
      }
    }
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
    // Set flag that electricity puzzle is solved, then go back to cockpit
    this.registry.set("electricitySolved", true);
    this.cameras.main.fadeOut(200, 0, 0, 0, (_: any, p: number) => {
      if (p === 1) this.scene.start("CockpitScene");
    });
  }

  // =======================
  //        PUZZLE
  // =======================
  private startPuzzle() {
    this.blockAdvance = true;
    this.puzzleActive = true;

    // Define 3 pairs (5x5)
    // 5×5, one pair per row → guaranteed full coverage without overlaps
    // Just change this to change the whole puzzle. Very easy :D
    this.gridSize = 6;
    this.cell = 64; // cell size for 6x6 grid

    // Layout: a centered square grid, shifted up to make room for text box
    const { width, height } = this.scale;
    this.gridOrigin.x = Math.floor((width - this.gridSize * this.cell) / 2);
    this.gridOrigin.y = Math.floor((height - this.gridSize * this.cell) / 2) - 30;

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

    // DEBUG: Skip button (gold) at top-left of grid
    if (DEBUG) {
      const skipBtn = this.add.text(this.gridOrigin.x - 40, this.gridOrigin.y + 20, "⚡", {
        fontFamily: "sans-serif",
        fontSize: "28px",
        color: "#ffd700"
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      skipBtn.on("pointerdown", () => this.solvePuzzle());
    }

    // Graphics
    this.gridGfx = this.add.graphics().setAlpha(0);
    this.pathGfx = this.add.graphics().setAlpha(0);
    this.flowGfx = this.add.graphics().setAlpha(0);
    this.dotGfx = this.add.graphics().setAlpha(0);
    this.drawGrid();
    this.drawDots();
    this.redrawPaths();

    // Colorblind symbols on terminals (drawn with Graphics for consistency)
    this.symbolGfx = this.add.graphics().setAlpha(0);
    this.drawSymbols();

    // Fade in the puzzle and message
    this.show("Trek elektriciteitskabels tussen terminals van dezelfde kleur. Geen overlappende kabels. Vul elk vakje!");
    this.tweens.add({ targets: [this.gridGfx, this.pathGfx, this.flowGfx, this.dotGfx, this.symbolGfx], alpha: 1, duration: 220 });

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
      targets: [this.gridGfx, this.pathGfx, this.flowGfx, this.dotGfx, this.symbolGfx],
      alpha: 0, duration: 200, onComplete: () => {
        this.gridGfx?.destroy(); this.pathGfx?.destroy(); this.flowGfx?.destroy(); this.dotGfx?.destroy();
        this.symbolGfx?.destroy();
      }
    });

    this.advanceHint.setVisible(true);

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
      const isLocked = this.lockedColors.has(p.color);

      for (const c of [p.a, p.b]) {
        const v = this.toWorld(c);
        const size = this.cell * 0.35;

        // If locked/powered, add pulsing glow
        if (isLocked) {
          const pulse = Math.sin(this.pulseTime) * 0.3 + 0.7; // pulsing effect
          g.fillStyle(p.color, 0.3 * pulse);
          g.fillRoundedRect(v.x - size / 2 - 6, v.y - size / 2 - 6, size + 12, size + 12, 6);
        }

        // Draw as electrical terminals (rounded squares)
        // Outer border (darker)
        g.fillStyle(0x000000, 0.4);
        g.fillRoundedRect(v.x - size / 2 - 2, v.y - size / 2 - 2, size + 4, size + 4, 4);

        // Main terminal - duller when not connected
        const colorAlpha = isLocked ? 1 : 0.8;
        g.fillStyle(p.color, colorAlpha);
        g.fillRoundedRect(v.x - size / 2, v.y - size / 2, size, size, 3);

        // Inner highlight - only show when powered/locked
        if (isLocked) {
          g.fillStyle(0xffffff, 0.6);
          g.fillRoundedRect(v.x - size / 2 + 2, v.y - size / 2 + 2, size * 0.5, size * 0.3, 2);
        }
      }
    }
  }

  private drawSymbols() {
    if (!this.symbolGfx) return;
    const g = this.symbolGfx;
    g.clear();
    const size = 6.5; // symbol size
    const lineWidth = 1.5;

    for (const p of this.pairs) {
      // Hide symbols for connected (locked) colors
      if (this.lockedColors.has(p.color)) continue;

      const symbolType = COLOR_SYMBOL_TYPES.get(p.color) || "circle";
      g.lineStyle(lineWidth, 0x000000, 0.6);

      for (const c of [p.a, p.b]) {
        const v = this.toWorld(c);

        switch (symbolType) {
          case "circle":
            g.strokeCircle(v.x, v.y, size);
            break;
          case "square":
            g.strokeRect(v.x - size, v.y - size, size * 2, size * 2);
            break;
          case "triangle":
            g.strokeTriangle(
              v.x, v.y - size,           // top
              v.x - size, v.y + size,    // bottom-left
              v.x + size, v.y + size     // bottom-right
            );
            break;
          case "diamond":
            g.beginPath();
            g.moveTo(v.x, v.y - size);       // top
            g.lineTo(v.x + size, v.y);       // right
            g.lineTo(v.x, v.y + size);       // bottom
            g.lineTo(v.x - size, v.y);       // left
            g.closePath();
            g.strokePath();
            break;
          case "star":
            this.drawStar(g, v.x, v.y, 5, size, size * 0.5);
            break;
          case "plus":
            g.beginPath();
            g.moveTo(v.x - size, v.y);
            g.lineTo(v.x + size, v.y);
            g.moveTo(v.x, v.y - size);
            g.lineTo(v.x, v.y + size);
            g.strokePath();
            break;
        }
      }
    }
  }

  private drawStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, points: number, outerR: number, innerR: number) {
    g.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI / points) - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.strokePath();
  }

  private redrawPaths() {
    const g = this.pathGfx!;
    g.clear();
    for (const [color, cells] of this.paths) {
      if (cells.length < 1) continue;
      const lineWidth = this.cell * 0.15; // 3x smaller (was 0.45)
      const start = this.toWorld(cells[0]);
      const isLocked = this.lockedColors.has(color);
      const cableAlpha = isLocked ? 1 : 0.8; // duller when not connected

      // Draw cables with outline (gives them depth like real cables)
      // Outer black outline
      g.lineStyle(lineWidth + 2, 0x000000, 0.4 * cableAlpha);
      g.beginPath();
      g.moveTo(start.x, start.y);
      for (let i = 1; i < cells.length; i++) {
        const v = this.toWorld(cells[i]);
        g.lineTo(v.x, v.y);
      }
      g.strokePath();

      // Main cable color
      g.lineStyle(lineWidth, color, cableAlpha);
      g.beginPath();
      g.moveTo(start.x, start.y);
      for (let i = 1; i < cells.length; i++) {
        const v = this.toWorld(cells[i]);
        g.lineTo(v.x, v.y);
      }
      g.strokePath();

      // Inner highlight line (makes cables look 3D/shiny)
      g.lineStyle(lineWidth * 0.3, 0xffffff, 0.4 * cableAlpha);
      g.beginPath();
      g.moveTo(start.x, start.y);
      for (let i = 1; i < cells.length; i++) {
        const v = this.toWorld(cells[i]);
        g.lineTo(v.x, v.y);
      }
      g.strokePath();
    }
    this.drawDots(); // keep terminals on top
    this.drawSymbols(); // update symbols based on locked state
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
    if (!this.puzzleActive || this.drawingColor == null || this.isShortCircuiting) return;
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

    // SHORT CIRCUIT if trying to connect to wrong terminal! (check FIRST before blocking)
    const ep = this.isEndpoint(next);
    if (ep && ep.color !== this.drawingColor) {
      // Allow the path to visually reach the wrong terminal before exploding
      path.push(next);
      this.paths.set(this.drawingColor, path);
      this.redrawPaths();

      const worldPos = this.toWorld(next);
      this.triggerShortCircuit(worldPos.x, worldPos.y);
      return;
    }

    // Block if another color already occupies the cell
    const occ = this.cellOccupied(next);
    if (occ !== null && occ !== this.drawingColor) return;

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
      this.triggerVictory();
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

  // DEBUG: Instantly solve the puzzle
  private solvePuzzle() {
    // Hardcoded solution for the 6x6 puzzle
    this.paths.set(0x9b59b6, [ // Purple
      { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }
    ]);
    this.paths.set(0xf0c419, [ // Yellow
      { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 1, y: 4 }, { x: 1, y: 5 }, { x: 0, y: 5 }
    ]);
    this.paths.set(0xe74c3c, [ // Red
      { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }
    ]);
    this.paths.set(0x29abe2, [ // Blue
      { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 0 }, { x: 4, y: 0 }, { x: 3, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }
    ]);
    this.paths.set(0x2ecc71, [ // Green
      { x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 }
    ]);
    this.paths.set(0xe67e22, [ // Orange
      { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }, { x: 2, y: 4 }, { x: 3, y: 4 }
    ]);

    // Lock all colors
    for (const p of this.pairs) {
      this.lockedColors.add(p.color);
    }

    this.redrawPaths();
    this.triggerVictory();
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

  private drawShortCircuitFlow() {
    const g = this.flowGfx!;

    // Draw wild flashing electricity on short-circuiting cables
    for (const color of this.shortCircuitingColors) {
      const cells = this.paths.get(color);
      if (!cells || cells.length < 2) continue;

      const lineWidth = this.cell * 0.2;

      // Random flickering colors (red/orange/yellow/white)
      const colors = [0xff0000, 0xff6600, 0xffff00, 0xffffff];
      const flickerColor = Phaser.Utils.Array.GetRandom(colors);
      const flickerAlpha = Phaser.Math.FloatBetween(0.5, 1.0);

      // Draw bright glowing outline
      g.lineStyle(lineWidth + 4, flickerColor, flickerAlpha * 0.4);
      g.beginPath();
      const start = this.toWorld(cells[0]);
      g.moveTo(start.x, start.y);
      for (let i = 1; i < cells.length; i++) {
        const v = this.toWorld(cells[i]);
        g.lineTo(v.x, v.y);
      }
      g.strokePath();

      // Draw core lightning bolt effect with fast moving dashes
      g.lineStyle(lineWidth * 0.6, 0xffffff, flickerAlpha);
      for (let i = 0; i < cells.length - 1; i++) {
        const segStart = this.toWorld(cells[i]);
        const segEnd = this.toWorld(cells[i + 1]);

        const dx = segEnd.x - segStart.x;
        const dy = segEnd.y - segStart.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(dist / 8);

        for (let j = 0; j < steps; j++) {
          const t1 = (j / steps) + (this.flowOffset / 8); // faster flow
          const t2 = ((j + 0.4) / steps) + (this.flowOffset / 8); // shorter dashes

          // Randomize which dashes appear for chaotic effect
          if ((Math.floor(t1 * 3) + Math.floor(this.flowOffset * 10)) % 2 === 0) {
            const x1 = segStart.x + dx * (t1 % 1);
            const y1 = segStart.y + dy * (t1 % 1);
            const x2 = segStart.x + dx * (t2 % 1);
            const y2 = segStart.y + dy * (t2 % 1);

            g.beginPath();
            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
            g.strokePath();
          }
        }
      }
    }
  }

  private triggerShortCircuit(x: number, y: number) {
    this.isShortCircuiting = true;
    const faultyColor = this.drawingColor;
    this.drawingColor = undefined;

    // Start flashing electricity on the faulty cable immediately
    if (faultyColor !== undefined) {
      this.shortCircuitingColors.add(faultyColor);
    }

    // Camera shake (immediate)
    this.cameras.main.shake(400, 0.015);

    // Initial explosion at wrong terminal
    this.createExplosion(x, y, 30);

    // Track which colors we've already scheduled to avoid duplicates
    const scheduledColors = new Set<number>();
    if (faultyColor !== undefined) {
      scheduledColors.add(faultyColor);
    }

    // Explosions at other terminals (250-450ms, random timing)
    for (const p of this.pairs) {
      for (const c of [p.a, p.b]) {
        const v = this.toWorld(c);
        // Skip if this is the current explosion point
        if (Math.abs(v.x - x) < 5 && Math.abs(v.y - y) < 5) continue;

        const delay = Phaser.Math.Between(250, 450);
        this.time.delayedCall(delay, () => {
          this.createExplosion(v.x, v.y, 20);

          // Start flashing electricity on this cable when its terminals explode
          if (!scheduledColors.has(p.color)) {
            const path = this.paths.get(p.color);
            if (path && path.length > 1) {
              this.shortCircuitingColors.add(p.color);
            }
            scheduledColors.add(p.color);
          }
        });
      }
    }

    // Extra explosion at the wrong terminal at 400ms
    this.time.delayedCall(400, () => {
      this.createExplosion(x, y, 25);
    });

    // Cables disappear at 450ms (but flashing continues)
    this.time.delayedCall(450, () => {
      this.pathGfx?.clear(); // cables disappear
    });

    // Red flash at 600ms
    this.time.delayedCall(600, () => {
      this.cameras.main.flash(800, 255, 50, 0); // red flash starts
    });

    // Flashing electricity stops at 800ms
    this.time.delayedCall(800, () => {
      this.shortCircuitingColors.clear();
      this.flowGfx?.clear();
    });

    // Message
    this.show("⚡ KORTSLUITING! De puzzel is gereset...");

    // Reset puzzle logic at 1000ms
    this.time.delayedCall(1000, () => {
      this.resetPuzzle();
      this.isShortCircuiting = false;
      this.show("Trek elektriciteitskabels tussen terminals van dezelfde kleur. Geen overlappende kabels. Vul elk vakje!");
    });
  }

  private createExplosion(x: number, y: number, particleCount: number) {
    const colors = [0xff0000, 0xff6600, 0xffff00, 0xffffff];
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = Phaser.Math.Between(100, 300);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const particle = this.add.circle(x, y, Phaser.Math.Between(2, 5), Phaser.Utils.Array.GetRandom(colors));

      this.tweens.add({
        targets: particle,
        x: x + vx * 0.5,
        y: y + vy * 0.5,
        alpha: 0,
        duration: Phaser.Math.Between(300, 600),
        ease: 'cubic.out',
        onComplete: () => particle.destroy()
      });
    }
  }

  private triggerVictory() {
    this.isShortCircuiting = true; // block input during celebration

    // Green/gold flash
    this.cameras.main.flash(300, 100, 255, 100);

    // Confetti explosion from grid center
    const { width } = this.scale;
    const cx = width / 2;
    const cy = this.gridOrigin.y + (this.gridSize * this.cell) / 2;

    // Multiple waves of confetti
    const confettiColors = [0xffd700, 0x00ff00, 0x00ffff, 0xff00ff, 0xffffff, 0xffff00];

    // First big burst
    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 * i) / 60 + Phaser.Math.FloatBetween(-0.1, 0.1);
      const speed = Phaser.Math.Between(150, 400);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 200; // bias upward

      const particle = this.add.circle(
        cx, cy,
        Phaser.Math.Between(3, 7),
        Phaser.Utils.Array.GetRandom(confettiColors)
      );

      this.tweens.add({
        targets: particle,
        x: cx + vx * 0.8,
        y: cy + vy * 0.8,
        alpha: 0,
        angle: Phaser.Math.Between(0, 360),
        duration: Phaser.Math.Between(800, 1200),
        ease: 'cubic.out',
        onComplete: () => particle.destroy()
      });
    }

    // Second wave after 200ms
    this.time.delayedCall(200, () => {
      for (let i = 0; i < 40; i++) {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const speed = Phaser.Math.Between(100, 250);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 150;

        const particle = this.add.circle(
          cx, cy,
          Phaser.Math.Between(2, 5),
          Phaser.Utils.Array.GetRandom(confettiColors)
        );

        this.tweens.add({
          targets: particle,
          x: cx + vx * 0.6,
          y: cy + vy * 0.6,
          alpha: 0,
          angle: Phaser.Math.Between(0, 360),
          duration: Phaser.Math.Between(600, 1000),
          ease: 'cubic.out',
          onComplete: () => particle.destroy()
        });
      }
    });

    // Success message
    this.show("✨ GELUKT! De elektriciteit stroomt weer!");

    // End puzzle after celebration
    this.time.delayedCall(1200, () => this.endPuzzle());
  }
}
