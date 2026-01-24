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

  // NEW: track if we already solved this puzzle
  protected isSolved = false;

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

  // NEW: subclasses decide what to do when solved (e.g. this.scene.start("NextScene"))
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
   *
   * This is where you can construct your “original tangram square” layout.
   * You define each startX/startY/startRotation individually here.
   */
  protected getDefaultStartLayout(
    width: number,
    height: number
  ): { startX: number; startY: number; startRotation: number }[] {
    const squareCenterX = width * 0.1;
    const squareCenterY = height * 0.35;

    // One entry per piece (in order).
    // Adjust these values to form your canonical starting tangram square.
    return [
      // 0: largeTri
      {
        startX: squareCenterX,
        startY: squareCenterY + 200,
        startRotation: 225,
      },
      // 1: largeTri2
      {
        startX: squareCenterX,
        startY: squareCenterY,
        startRotation: 360-45,
      },
      // 2: square
      {
        startX: squareCenterX+150,
        startY: squareCenterY+50,
        startRotation: 45,
      },
      // 3: smallTri2
      {
        startX: squareCenterX+200,
        startY: squareCenterY,
        startRotation: 45,
      },
      // 4: smallTri1
      {
        startX: squareCenterX+150,
        startY: squareCenterY+151,
        startRotation: 135,
      },
      // 5: mediumTri
      {
        startX: squareCenterX+102,
        startY: squareCenterY+200,
        startRotation: 6*45,
      },
      // 6: parallelogram
      {
        startX: squareCenterX+1,
        startY: squareCenterY+151,
        startRotation: 0,
      },
    ];
  }

  // ---- Phaser lifecycle --------------------------------------------

  create() {
    const { width, height } = this.scale;

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

    // On dragend we don't auto-check; we just let the player press "Check"
    this.input.on(
      "dragend",
      (
        _pointer: Phaser.Input.Pointer,
        _gameObject: Phaser.GameObjects.Image
      ) => {
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
      .text(width * 0.15, height - 60, "Draai stukje (45°)", {
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
    this.input.keyboard!.on("keydown-R", () => {
      if (this.selectedPiece) {
        this.rotateSelectedPiece();
      }
    });

    // NEW: feedback text (replaces the old Check button)
    this.resultText = this.add
      .text(width * 0.5, height - 60, "", {
        fontSize: "20px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setVisible(false); // Hide initially since text is empty
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      // hook for escape if you want to use it in subclasses
    }
  }

  // --- TEXTURES ----------------------------------------------------

  private ensureTangramTextures() {
    // Base size for the small triangle leg
    const SMALL = 70;
    const MEDIUM = Math.round(SMALL * Math.SQRT2); // ≈ 99
    const LARGE = SMALL * 2;                        // = 140
    const SQUARE = SMALL;                           // same as small-triangle leg

    // Parallelogram constructed with sides MEDIUM and SMALL, angle 45°
    const PARA_SKEW = SMALL / Math.SQRT2;           // horizontal/vertical offset of slanted side
    const PARA_W = MEDIUM;                          // horizontal length of top/bottom edge
    const PARA_H = PARA_SKEW;                       // vertical height of the shape

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

      // Coordinates chosen so the sides are:
      // - top/bottom edges: length MEDIUM
      // - left/right slanted edges: length SMALL
      gfx.beginPath();
      gfx.moveTo(PARA_SKEW, 0);                 // top-left
      gfx.lineTo(PARA_SKEW + PARA_W, 0);        // top-right
      gfx.lineTo(PARA_W, PARA_H);               // bottom-right
      gfx.lineTo(0, PARA_H);                    // bottom-left
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

  // Base shapes in local coordinates (matching how textures & silhouette are drawn)
  
  private getBasePolygonPoints(type: TangramPieceType): Phaser.Geom.Point[] {
    const SMALL = 70;
    const MEDIUM = Math.round(SMALL * Math.SQRT2); // ≈ 99
    const LARGE = SMALL * 2;                        // = 140

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

  // --- SILHOUETTE (geometry + draw) --------------------------------

  private buildSilhouetteGeometry(configs: TangramPieceConfig[]) {
    const polys: Phaser.Geom.Polygon[] = [];
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

      worldPoints.forEach((pt) => {
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
      });
    });

    this.silhouettePolygons = polys;
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

    const sprite = this.add
      .image(startX, startY, cfg.textureKey)
      .setInteractive({ draggable: true })
      .setTint(cfg.color);

    sprite.setOrigin(0.0, 0.0);
    sprite.angle = startRotation;

    return {
      config: cfg,
      sprite,
    };
  }

  private setSelectedPiece(piece: TangramPieceInstance | null) {
    if (this.selectedPiece) {
      this.selectedPiece.sprite.clearTint();
      this.selectedPiece.sprite.setTint(this.selectedPiece.config.color);
    }

    this.selectedPiece = piece;

    if (this.selectedPiece) {
      this.selectedPiece.sprite.setTint(0xffffff);
    }
  }

  private rotateSelectedPiece() {
    if (!this.selectedPiece) return;
    const sp = this.selectedPiece.sprite;
    sp.angle = Phaser.Math.Angle.WrapDegrees(sp.angle + 45);

    this.updateCoverageStatus();
  }

  // --- COVERAGE COMPUTATION ----------------------------------------

  protected computeCoveragePercentage(): number {
    if (!this.silhouetteBounds || this.silhouettePolygons.length === 0) {
      return 0;
    }

    const { minX, minY, maxX, maxY } = this.silhouetteBounds;

    // Build current piece polygons in world space
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

    const step = 5; // sampling resolution in pixels (smaller = more accurate, slower)

    let silhouetteCount = 0;
    let coveredCount = 0;

    for (let x = minX; x <= maxX; x += step) {
      for (let y = minY; y <= maxY; y += step) {
        const px = x + step / 2;
        const py = y + step / 2;

        // inside any silhouette polygon?
        let inSilhouette = false;
        for (const sPoly of this.silhouettePolygons) {
          if (Phaser.Geom.Polygon.Contains(sPoly, px, py)) {
            inSilhouette = true;
            break;
          }
        }
        if (!inSilhouette) continue;

        silhouetteCount++;

        // inside any piece polygon?
        let inPiece = false;
        for (const pPoly of piecePolys) {
          if (Phaser.Geom.Polygon.Contains(pPoly, px, py)) {
            inPiece = true;
            break;
          }
        }

        if (inPiece) {
          coveredCount++;
        }
      }
    }

    if (silhouetteCount === 0) return 0;
    return (coveredCount / silhouetteCount) * 100;
  }

  private updateCoverageStatus() {
  if (this.isSolved) {
    // already solved, don't re-trigger
    return;
  }

  const coverage = this.computeCoveragePercentage();
    // console.log("Coverage:", coverage); // optional debug

    if (coverage >= 95) {
      // Solved: you can show a message if you like (optional)
      this.resultText.setText("Goed gedaan!").setVisible(true);
      this.isSolved = true;
      this.onPuzzleSolved();
    } else if (coverage >= 90) {
      // Almost solved
      this.resultText.setText("Bijna goed!").setVisible(true);
    } else {
      // Below 90%: no message
      this.resultText.setText("").setVisible(false);
    }
  }
}
