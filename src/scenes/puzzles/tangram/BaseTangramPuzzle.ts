import Phaser from "phaser";
import { createBackButton } from "../../../utils/BackButton";

export type TangramPieceType =
  | "largeTri"
  | "largeTri2"
  | "mediumTri"
  | "smallTri1"
  | "smallTri2"
  | "square"
  | "parallelogram";

export interface TangramPieceConfig {
  type: TangramPieceType;
  textureKey: string;

  /**
   * Optional starting placement.
   * If omitted, BaseTangramScene will assign a default starting layout.
   */
  startX?: number;
  startY?: number;
  startRotation?: number;

  /**
   * Target placement used to build the silhouette and to check coverage.
   */
  targetX: number;
  targetY: number;
  targetRotation: number;

  /** Tint color for the sprite */
  color: number;
}

export interface TangramPieceInstance {
  config: TangramPieceConfig;
  sprite: Phaser.GameObjects.Image;
}

/**
 * Abstract base scene that implements all reusable tangram logic.
 * Subclasses only need to provide:
 *   - title + subtitle
 *   - piece configs (with target placement used to build silhouette)
 */
export abstract class BaseTangramScene extends Phaser.Scene {
  protected pieces: TangramPieceInstance[] = [];
  protected selectedPiece: TangramPieceInstance | null = null;

  protected rotateButton!: Phaser.GameObjects.Text;
  protected resultText!: Phaser.GameObjects.Text;
  protected escKey!: Phaser.Input.Keyboard.Key;

  protected silhouettePolygons: Phaser.Geom.Polygon[] = [];
  protected silhouetteBounds:
    | { minX: number; minY: number; maxX: number; maxY: number }
    | null = null;

  // --- NEW: silhouette polygons with AABB bounds for fast pruning ----
  private silhouettePolyBounds: {
    poly: Phaser.Geom.Polygon;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }[] = [];

  protected isSolved = false;

  // --- SOFT SNAP (per-piece fit + overlap penalty) -------------------
  private pieceSampleCache = new Map<TangramPieceType, Phaser.Geom.Point[]>();

  // Performance knobs:
  private pieceSampleStep = 6; // increase for faster, decrease for more accurate
  private maxPieceSamples = 350; // cap samples for stable snap time

  constructor(sceneKey: string) {
    super(sceneKey);
  }

  // ---- Hooks for subclasses ----------------------------------------

  protected abstract getTitleText(): string;
  protected abstract getSubtitleText(): string;
  protected abstract getPieceConfigs(
    width: number,
    height: number
  ): TangramPieceConfig[];

  protected abstract onPuzzleSolved(): void;

  /** Background color of the scene */
  protected getBackgroundColor(): string | number {
    return "#000000";
  }

  /** Fill color of the silhouette shape */
  protected getSilhouetteColor(): { color: number; alpha: number } {
    return { color: 0xebe1c3, alpha: 0.7 };
  }

  /**
   * Default starting layout for the standard 7 tangram pieces.
   * Each entry corresponds to the piece at the same index in getPieceConfigs.
   */
  protected getDefaultStartLayout(
    width: number,
    height: number
  ): { startX: number; startY: number; startRotation: number }[] {
    const squareCenterX = width * 0.25;
    const squareCenterY = height * 0.35;

    return [
      // 0: largeTri
      { startX: squareCenterX, startY: squareCenterY + 200, startRotation: 225 },
      // 1: largeTri2
      { startX: squareCenterX, startY: squareCenterY, startRotation: 360 - 45 },
      // 2: square
      {
        startX: squareCenterX + 150,
        startY: squareCenterY + 50,
        startRotation: 45,
      },
      // 3: smallTri2
      { startX: squareCenterX + 200, startY: squareCenterY, startRotation: 45 },
      // 4: smallTri1
      {
        startX: squareCenterX + 150,
        startY: squareCenterY + 151,
        startRotation: 135,
      },
      // 5: mediumTri
      {
        startX: squareCenterX + 102,
        startY: squareCenterY + 200,
        startRotation: 6 * 45,
      },
      // 6: parallelogram
      { startX: squareCenterX + 1, startY: squareCenterY + 151, startRotation: 0 },
    ];
  }

  // ---- Phaser lifecycle --------------------------------------------

  create() {
    const { width, height } = this.scale;

    this.input.topOnly = true;

    // Background
    this.cameras.main.setBackgroundColor(this.getBackgroundColor());

    // Back button
    createBackButton(this, "TangramSelectScene");

    // Title & subtitle
    this.add
      .text(width / 2, 40, this.getTitleText(), {
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 75, this.getSubtitleText(), {
        fontSize: "18px",
        color: "#cccccc",
        wordWrap: { width: width * 0.9 },
        align: "center",
      })
      .setOrigin(0.5);

    this.escKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC
    );

    // Create tangram piece textures once
    this.ensureTangramTextures();

    // Let the subclass define target positions
    const rawPieceConfigs = this.getPieceConfigs(width, height);

    // Fill in default starting positions & rotations if missing
    const pieceConfigs = this.applyDefaultStartLayout(
      rawPieceConfigs,
      width,
      height
    );

    // Build & draw silhouette based on target placements
    this.buildSilhouetteGeometry(pieceConfigs);
    this.drawSilhouette();

    // Create draggable pieces
    this.pieces = pieceConfigs.map((cfg) => this.createPieceInstance(cfg));

    // Enable dragging
    this.input.setDraggable(this.pieces.map((p) => p.sprite));

    this.input.on(
      "drag",
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.Image,
        dragX: number,
        dragY: number
      ) => {
        gameObject.x = dragX;
        gameObject.y = dragY;
      }
    );

    this.input.on(
      "dragend",
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
        const piece = this.pieces.find((p) => p.sprite === gameObject);
        if (piece) {
          this.trySoftSnap(piece);
        }
        this.updateCoverageStatus();
      }
    );

    // Select piece on pointerdown
    this.input.on(
      "gameobjectdown",
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject
      ) => {
        const piece = this.pieces.find((p) => p.sprite === gameObject);
        if (piece) {
          this.setSelectedPiece(piece);
        }
      }
    );

    // Rotate button (45°)
    this.rotateButton = this.add
      .text(width * 0.15, height - 60, "Spatie: Draai stukje 45°", {
        fontSize: "20px",
        backgroundColor: "#222222",
        color: "#ffffff",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive();

    this.rotateButton.on("pointerdown", () => {
      if (this.selectedPiece) {
        this.rotateSelectedPiece();
      }
    });

    // Keyboard R to rotate
    this.input.keyboard!.on("keydown-SPACE", () => {
      if (this.selectedPiece) {
        this.rotateSelectedPiece();
      }
    });

    // feedback text
    this.resultText = this.add
      .text(width * 0.5, height - 60, "", {
        fontSize: "20px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setVisible(false);
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      // optional hook
    }
  }

  // --- TEXTURES ----------------------------------------------------

  private ensureTangramTextures() {
    const SMALL = 70;
    const MEDIUM = Math.round(SMALL * Math.SQRT2); // ≈ 99
    const LARGE = SMALL * 2; // 140
    const SQUARE = SMALL;

    const PARA_SKEW = SMALL / Math.SQRT2;
    const PARA_W = MEDIUM;
    const PARA_H = PARA_SKEW;

    const PARA_TEX_W = Math.ceil(PARA_W + PARA_SKEW);
    const PARA_TEX_H = Math.ceil(PARA_H);

    if (!this.textures.exists("tan_largeTri")) {
      const gfx = this.add.graphics({ x: 0, y: 0 });
      gfx.clear();
      gfx.fillStyle(0xffffff, 1);
      gfx.fillTriangle(0, LARGE, LARGE, LARGE, 0, 0);
      gfx.generateTexture("tan_largeTri", LARGE, LARGE);
      gfx.destroy();
    }

    if (!this.textures.exists("tan_mediumTri")) {
      const gfx = this.add.graphics({ x: 0, y: 0 });
      gfx.clear();
      gfx.fillStyle(0xffffff, 1);
      gfx.fillTriangle(0, MEDIUM, MEDIUM, MEDIUM, 0, 0);
      gfx.generateTexture("tan_mediumTri", MEDIUM, MEDIUM);
      gfx.destroy();
    }

    if (!this.textures.exists("tan_smallTri")) {
      const gfx = this.add.graphics({ x: 0, y: 0 });
      gfx.clear();
      gfx.fillStyle(0xffffff, 1);
      gfx.fillTriangle(0, SMALL, SMALL, SMALL, 0, 0);
      gfx.generateTexture("tan_smallTri", SMALL, SMALL);
      gfx.destroy();
    }

    if (!this.textures.exists("tan_square")) {
      const gfx = this.add.graphics();
      gfx.clear();
      gfx.fillStyle(0xffffff, 1);
      gfx.fillRect(0, 0, SQUARE, SQUARE);
      gfx.generateTexture("tan_square", SQUARE, SQUARE);
      gfx.destroy();
    }

    if (!this.textures.exists("tan_parallelogram")) {
      const gfx = this.add.graphics({ x: 0, y: 0 });
      gfx.clear();
      gfx.fillStyle(0xffffff, 1);

      gfx.beginPath();
      gfx.moveTo(PARA_SKEW, 0);
      gfx.lineTo(PARA_SKEW + PARA_W, 0);
      gfx.lineTo(PARA_W, PARA_H);
      gfx.lineTo(0, PARA_H);
      gfx.closePath();
      gfx.fillPath();

      gfx.generateTexture("tan_parallelogram", PARA_TEX_W, PARA_TEX_H);
      gfx.destroy();
    }
  }

  // --- DEFAULT START LAYOUT MERGE ----------------------------------

  private applyDefaultStartLayout(
    configs: TangramPieceConfig[],
    width: number,
    height: number
  ): TangramPieceConfig[] {
    const defaults = this.getDefaultStartLayout(width, height);

    return configs.map((cfg, idx) => {
      const def = defaults[idx];

      const startX = cfg.startX ?? def?.startX ?? 0;
      const startY = cfg.startY ?? def?.startY ?? 0;
      const startRotation = cfg.startRotation ?? def?.startRotation ?? 0;

      return {
        ...cfg,
        startX,
        startY,
        startRotation,
      };
    });
  }

  // --- GEOMETRY HELPERS --------------------------------------------

  private getBasePolygonPoints(type: TangramPieceType): Phaser.Geom.Point[] {
    const SMALL = 70;
    const MEDIUM = Math.round(SMALL * Math.SQRT2);
    const LARGE = SMALL * 2;

    const PARA_SKEW = SMALL / Math.SQRT2;
    const PARA_W = MEDIUM;
    const PARA_H = PARA_SKEW;

    switch (type) {
      case "largeTri":
      case "largeTri2":
        return [
          new Phaser.Geom.Point(0, LARGE),
          new Phaser.Geom.Point(LARGE, LARGE),
          new Phaser.Geom.Point(0, 0),
        ];

      case "mediumTri":
        return [
          new Phaser.Geom.Point(0, MEDIUM),
          new Phaser.Geom.Point(MEDIUM, MEDIUM),
          new Phaser.Geom.Point(0, 0),
        ];

      case "smallTri1":
      case "smallTri2":
        return [
          new Phaser.Geom.Point(0, SMALL),
          new Phaser.Geom.Point(SMALL, SMALL),
          new Phaser.Geom.Point(0, 0),
        ];

      case "square":
        return [
          new Phaser.Geom.Point(0, 0),
          new Phaser.Geom.Point(SMALL, 0),
          new Phaser.Geom.Point(SMALL, SMALL),
          new Phaser.Geom.Point(0, SMALL),
        ];

      case "parallelogram":
        return [
          new Phaser.Geom.Point(PARA_SKEW, 0),
          new Phaser.Geom.Point(PARA_SKEW + PARA_W, 0),
          new Phaser.Geom.Point(PARA_W, PARA_H),
          new Phaser.Geom.Point(0, PARA_H),
        ];
    }
  }

  private transformPoints(
    points: Phaser.Geom.Point[],
    x: number,
    y: number,
    angleDeg: number
  ): Phaser.Geom.Point[] {
    const rad = Phaser.Math.DegToRad(angleDeg);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return points.map((p) => {
      const tx = p.x * cos - p.y * sin + x;
      const ty = p.x * sin + p.y * cos + y;
      return new Phaser.Geom.Point(tx, ty);
    });
  }

  // --- SILHOUETTE ---------------------------------------------------

  private buildSilhouetteGeometry(configs: TangramPieceConfig[]) {
    const polys: Phaser.Geom.Polygon[] = [];
    const bounds: {
      poly: Phaser.Geom.Polygon;
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    }[] = [];

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    configs.forEach((cfg) => {
      const base = this.getBasePolygonPoints(cfg.type);
      const worldPoints = this.transformPoints(
        base,
        cfg.targetX,
        cfg.targetY,
        cfg.targetRotation
      );

      const poly = new Phaser.Geom.Polygon(worldPoints);
      polys.push(poly);

      // AABB for pruning (fast)
      const aabb = Phaser.Geom.Polygon.GetAABB(poly);
      bounds.push({
        poly,
        minX: aabb.x,
        minY: aabb.y,
        maxX: aabb.right,
        maxY: aabb.bottom,
      });

      // overall bounds for coverage scan
      worldPoints.forEach((pt) => {
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
      });
    });

    this.silhouettePolygons = polys;
    this.silhouettePolyBounds = bounds;
    this.silhouetteBounds = { minX, minY, maxX, maxY };
  }

  private drawSilhouette() {
    const gfx = this.add.graphics();
    const { color, alpha } = this.getSilhouetteColor();
    gfx.fillStyle(color, alpha);

    this.silhouettePolygons.forEach((poly) => {
      gfx.beginPath();
      const pts = poly.points as Phaser.Geom.Point[];
      if (pts.length > 0) {
        gfx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          gfx.lineTo(pts[i].x, pts[i].y);
        }
        gfx.closePath();
        gfx.fillPath();
      }
    });
  }

  // --- PIECES ------------------------------------------------------

  private createPieceInstance(cfg: TangramPieceConfig): TangramPieceInstance {
    const startX = cfg.startX ?? 0;
    const startY = cfg.startY ?? 0;
    const startRotation = cfg.startRotation ?? 0;

    const sprite = this.add.image(startX, startY, cfg.textureKey);
    sprite.setOrigin(0, 0);
    sprite.angle = startRotation;
    sprite.setTint(cfg.color);

    // Polygon hit area in local coords
    const base = this.getBasePolygonPoints(cfg.type);
    const hitPoly = new Phaser.Geom.Polygon(base);
    sprite.setInteractive(hitPoly, Phaser.Geom.Polygon.Contains);

    this.input.setDraggable(sprite);

    return { config: cfg, sprite };
  }

  private setSelectedPiece(piece: TangramPieceInstance | null) {
    if (this.selectedPiece) {
      this.selectedPiece.sprite.setTint(this.selectedPiece.config.color);
    }

    this.selectedPiece = piece;

    if (this.selectedPiece) {
      this.children.bringToTop(this.selectedPiece.sprite);
      this.selectedPiece.sprite.setTint(0xffffff);
    }
  }

  private rotateSelectedPiece() {
    if (!this.selectedPiece) return;
    const sp = this.selectedPiece.sprite;
    sp.angle = Phaser.Math.Angle.WrapDegrees(sp.angle + 45);

    // attempt snap after rotation too
    this.trySoftSnap(this.selectedPiece);

    this.updateCoverageStatus();
  }

  // --- COVERAGE COMPUTATION ----------------------------------------

  protected computeCoveragePercentage(): number {
    if (!this.silhouetteBounds || this.silhouettePolygons.length === 0) {
      return 0;
    }

    const { minX, minY, maxX, maxY } = this.silhouetteBounds;

    const piecePolys: Phaser.Geom.Polygon[] = this.pieces.map((p) => {
      const base = this.getBasePolygonPoints(p.config.type);
      const worldPoints = this.transformPoints(
        base,
        p.sprite.x,
        p.sprite.y,
        p.sprite.angle
      );
      return new Phaser.Geom.Polygon(worldPoints);
    });

    const step = 5;

    let silhouetteCount = 0;
    let coveredCount = 0;

    for (let x = minX; x <= maxX; x += step) {
      for (let y = minY; y <= maxY; y += step) {
        const px = x + step / 2;
        const py = y + step / 2;

        let inSilhouette = false;
        for (const sPoly of this.silhouettePolygons) {
          if (Phaser.Geom.Polygon.Contains(sPoly, px, py)) {
            inSilhouette = true;
            break;
          }
        }
        if (!inSilhouette) continue;

        silhouetteCount++;

        let inPiece = false;
        for (const pPoly of piecePolys) {
          if (Phaser.Geom.Polygon.Contains(pPoly, px, py)) {
            inPiece = true;
            break;
          }
        }

        if (inPiece) coveredCount++;
      }
    }

    if (silhouetteCount === 0) return 0;
    return (coveredCount / silhouetteCount) * 100;
  }

  private updateCoverageStatus() {
    if (this.isSolved) return;

    const coverage = this.computeCoveragePercentage();

    if (coverage >= 95) {
      this.resultText.setText("Goed gedaan!").setVisible(true);
      this.isSolved = true;
      this.onPuzzleSolved();
    } else if (coverage >= 90) {
      this.resultText.setText("Bijna goed!").setVisible(true);
    } else {
      this.resultText.setText("").setVisible(false);
    }
  }

  // --- SOFT SNAP OPTIMIZED -----------------------------------------

  /**
   * Precompute sample points INSIDE the base polygon of a piece type (local coords).
   * These points approximate the area of the piece.
   * (Capped so it can’t explode in size.)
   */
  private getPieceLocalSamplePoints(type: TangramPieceType): Phaser.Geom.Point[] {
    const cached = this.pieceSampleCache.get(type);
    if (cached) return cached;

    const base = this.getBasePolygonPoints(type);
    const poly = new Phaser.Geom.Polygon(base);

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const p of base) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const pts: Phaser.Geom.Point[] = [];
    const step = this.pieceSampleStep;

    // fewer offsets than before (2x2), still stable
    const offsets = [step * 0.33, step * 0.66];

    for (let x = minX; x <= maxX; x += step) {
      for (let y = minY; y <= maxY; y += step) {
        for (const ox of offsets) {
          for (const oy of offsets) {
            const px = x + ox;
            const py = y + oy;

            if (Phaser.Geom.Polygon.Contains(poly, px, py)) {
              pts.push(new Phaser.Geom.Point(px, py));
            }
          }
        }
      }
    }

    // cap samples to keep snap fast
    if (pts.length > this.maxPieceSamples) {
      const picked: Phaser.Geom.Point[] = [];
      const stride = Math.max(1, Math.floor(pts.length / this.maxPieceSamples));
      for (let i = 0; i < pts.length && picked.length < this.maxPieceSamples; i += stride) {
        picked.push(pts[i]);
      }
      this.pieceSampleCache.set(type, picked);
      return picked;
    }

    this.pieceSampleCache.set(type, pts);
    return pts;
  }

  /** Build world polygons + AABBs for all pieces except the one being moved/snapped. */
  private buildOtherPiecePolys(except: TangramPieceInstance): {
    poly: Phaser.Geom.Polygon;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }[] {
    const out: {
      poly: Phaser.Geom.Polygon;
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    }[] = [];

    for (const p of this.pieces) {
      if (p === except) continue;

      const base = this.getBasePolygonPoints(p.config.type);
      const pts = this.transformPoints(base, p.sprite.x, p.sprite.y, p.sprite.angle);
      const poly = new Phaser.Geom.Polygon(pts);
      const aabb = Phaser.Geom.Polygon.GetAABB(poly);

      out.push({
        poly,
        minX: aabb.x,
        minY: aabb.y,
        maxX: aabb.right,
        maxY: aabb.bottom,
      });
    }

    return out;
  }

  /**
   * FAST fit/overlap:
   * - silhouette membership uses AABB prune before Polygon.Contains
   * - overlap uses AABB prune before Polygon.Contains
   * - early-aborts if overlap is already clearly too high
   */
  private computeFitAndOverlapFast(
    pieceType: TangramPieceType,
    worldX: number,
    worldY: number,
    angleDeg: number,
    otherPolys: {
      poly: Phaser.Geom.Polygon;
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    }[]
  ): { fit: number; overlap: number } {
    const localSamples = this.getPieceLocalSamplePoints(pieceType);
    const denom = localSamples.length;
    if (!denom) return { fit: 0, overlap: 0 };

    const rad = Phaser.Math.DegToRad(angleDeg);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    let insideSil = 0;
    let overlapCount = 0;

    // early abort if overlap is already awful
    const EARLY_OVERLAP_ABORT = 0.3;
    const maxOverlapCount = Math.ceil(denom * EARLY_OVERLAP_ABORT);

    for (let i = 0; i < denom; i++) {
      const lp = localSamples[i];

      const wx = lp.x * cos - lp.y * sin + worldX;
      const wy = lp.x * sin + lp.y * cos + worldY;

      // ---- silhouette union: AABB prune ----
      let inSil = false;
      for (const s of this.silhouettePolyBounds) {
        if (wx < s.minX || wx > s.maxX || wy < s.minY || wy > s.maxY) continue;
        if (Phaser.Geom.Polygon.Contains(s.poly, wx, wy)) {
          inSil = true;
          break;
        }
      }
      if (inSil) insideSil++;

      // ---- overlap: AABB prune ----
      for (const o of otherPolys) {
        if (wx < o.minX || wx > o.maxX || wy < o.minY || wy > o.maxY) continue;
        if (Phaser.Geom.Polygon.Contains(o.poly, wx, wy)) {
          overlapCount++;
          break;
        }
      }

      if (overlapCount > maxOverlapCount) {
        // return partial estimate (good enough for pruning during search)
        const used = i + 1;
        return { fit: insideSil / used, overlap: overlapCount / used };
      }
    }

    return { fit: insideSil / denom, overlap: overlapCount / denom };
  }

  /**
   * Soft snap that:
   * - optimizes per-piece fit to the silhouette union
   * - penalizes overlap with other pieces
   *
   * Uses hill-climb search (fast) + micro-polish (pixel-perfect finish).
   */
  private trySoftSnap(piece: TangramPieceInstance) {
    const sp = piece.sprite;
    const type = piece.config.type;

    // ---- TUNING ----
    const TRIGGER_FIT = 0.84;
    const FINAL_FIT = 0.985;
    const MAX_OVERLAP = 0.06;
    const OVERLAP_WEIGHT = 1.5;
    const MIN_SCORE_IMPROVEMENT = 0.01;
    const MAX_SNAP_DISTANCE = 24; // slightly larger since we polish in-place
    // ----------------

    if (this.silhouettePolygons.length === 0) return;

    const otherPolys = this.buildOtherPiecePolys(piece);
    const scoreOf = (fit: number, overlap: number) => fit - OVERLAP_WEIGHT * overlap;

    const current = this.computeFitAndOverlapFast(type, sp.x, sp.y, sp.angle, otherPolys);
    if (current.fit < TRIGGER_FIT) return;

    const currentScore = scoreOf(current.fit, current.overlap);

    // ---- Hill-climb search (FAST) ----
    const hillClimb = (
      startX: number,
      startY: number,
      startAngle: number,
      angles: number[],
      stepSizes: number[],
      maxItersPerStep = 22
    ) => {
      let bestX = startX;
      let bestY = startY;
      let bestA = startAngle;

      let bestEval = this.computeFitAndOverlapFast(type, bestX, bestY, bestA, otherPolys);
      let bestScore = scoreOf(bestEval.fit, bestEval.overlap);

      const dirs = (step: number) => [
        [0, 0],
        [step, 0],
        [-step, 0],
        [0, step],
        [0, -step],
        [step, step],
        [step, -step],
        [-step, step],
        [-step, -step],
      ] as const;

      for (const step of stepSizes) {
        let improved = true;
        let iters = 0;

        while (improved && iters++ < maxItersPerStep) {
          improved = false;

          let localBestScore = bestScore;
          let localBestX = bestX;
          let localBestY = bestY;
          let localBestA = bestA;

          for (const a of angles) {
            for (const [dx, dy] of dirs(step)) {
              const cx = bestX + dx;
              const cy = bestY + dy;

              const evalRes = this.computeFitAndOverlapFast(type, cx, cy, a, otherPolys);
              if (evalRes.overlap > 0.25) continue;

              const sc = scoreOf(evalRes.fit, evalRes.overlap);
              if (sc > localBestScore) {
                localBestScore = sc;
                localBestX = cx;
                localBestY = cy;
                localBestA = a;
                improved = true;
              }
            }
          }

          if (improved) {
            bestScore = localBestScore;
            bestX = localBestX;
            bestY = localBestY;
            bestA = localBestA;
          }
        }
      }

      const finalEval = this.computeFitAndOverlapFast(type, bestX, bestY, bestA, otherPolys);
      return {
        x: bestX,
        y: bestY,
        angle: bestA,
        fit: finalEval.fit,
        overlap: finalEval.overlap,
        score: scoreOf(finalEval.fit, finalEval.overlap),
      };
    };

    // ---- Micro-polish (pixel-perfect finish) ----
    const microPolish = (centerX: number, centerY: number, centerAngle: number) => {
      let bestX = centerX;
      let bestY = centerY;
      let bestA = centerAngle;

      let bestEval = this.computeFitAndOverlapFast(type, bestX, bestY, bestA, otherPolys);
      let bestScore = scoreOf(bestEval.fit, bestEval.overlap);

      const R = 4; // radius in pixels
      const STEP = 1;

      // keep angle fixed for polish (fast + stable). If you want, change to: [centerAngle, ...angleCandidates]
      const angles = [centerAngle];

      for (const a of angles) {
        for (let dx = -R; dx <= R; dx += STEP) {
          for (let dy = -R; dy <= R; dy += STEP) {
            const x = centerX + dx;
            const y = centerY + dy;

            const e = this.computeFitAndOverlapFast(type, x, y, a, otherPolys);
            if (e.overlap > 0.25) continue;

            const sc = scoreOf(e.fit, e.overlap);
            if (sc > bestScore) {
              bestScore = sc;
              bestX = x;
              bestY = y;
              bestA = a;
            }
          }
        }
      }

      const finalEval = this.computeFitAndOverlapFast(type, bestX, bestY, bestA, otherPolys);
      return {
        x: bestX,
        y: bestY,
        angle: bestA,
        fit: finalEval.fit,
        overlap: finalEval.overlap,
        score: bestScore,
      };
    };

    // 1) fast local solve
    const angleCandidates = [sp.angle];
    let best = hillClimb(sp.x, sp.y, sp.angle, angleCandidates, [6, 2, 1]);

    // 2) pixel-level polish around the best result
    best = microPolish(best.x, best.y, best.angle);

    const dist = Phaser.Math.Distance.Between(sp.x, sp.y, best.x, best.y);
    const improved = best.score >= currentScore + MIN_SCORE_IMPROVEMENT;

    if (
      improved &&
      best.fit >= FINAL_FIT &&
      best.overlap <= MAX_OVERLAP &&
      dist <= MAX_SNAP_DISTANCE
    ) {
      this.tweens.add({
        targets: sp,
        x: best.x,
        y: best.y,
        angle: best.angle,
        duration: 120,
        ease: "Sine.easeOut",
        onComplete: () => this.updateCoverageStatus(),
      });
    }
  }
}
