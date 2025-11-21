import Phaser from "phaser";

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
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  targetRotation: number;
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
  protected checkButton!: Phaser.GameObjects.Text;
  protected resultText!: Phaser.GameObjects.Text;
  protected escKey!: Phaser.Input.Keyboard.Key;

  // Precomputed silhouette geometry
  protected silhouettePolygons: Phaser.Geom.Polygon[] = [];
  protected silhouetteBounds:
    | { minX: number; minY: number; maxX: number; maxY: number }
    | null = null;

  constructor(sceneKey: string) {
    super(sceneKey);
  }

  // ---- Hooks for subclasses ----------------------------------------

  /** Main title text shown at top */
  protected abstract getTitleText(): string;

  /** Subtitle/instructions text shown under title */
  protected abstract getSubtitleText(): string;

  /**
   * Subclasses describe their layout by returning the piece configs.
   * targetX/Y/rotation are used to build the silhouette.
   */
  protected abstract getPieceConfigs(
    width: number,
    height: number
  ): TangramPieceConfig[];

  /** Background color of the scene */
  protected getBackgroundColor(): string | number {
    return "#000000";
  }

  /** Fill color of the silhouette shape */
  protected getSilhouetteColor(): { color: number; alpha: number } {
    return { color: 0x333333, alpha: 0.7 };
  }

  // ---- Phaser lifecycle --------------------------------------------

  create() {
    const { width, height } = this.scale;

    // Background
    this.cameras.main.setBackgroundColor(this.getBackgroundColor());

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

    // Let the subclass define positions
    const pieceConfigs = this.getPieceConfigs(width, height);

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
        // Intentionally empty
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
      .text(width * 0.15, height - 60, "Roteren (45°)", {
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

    // Check button
    this.checkButton = this.add
      .text(width * 0.4, height - 60, "Check", {
        fontSize: "20px",
        backgroundColor: "#444444",
        color: "#ffffff",
        padding: { x: 16, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive();

    this.checkButton.on("pointerdown", () => {
      const coverage = this.computeCoveragePercentage();
      this.resultText.setText(`Coverage: ${coverage.toFixed(1)}%`);
      console.log("Coverage:", coverage);
    });

    // Result text
    this.resultText = this.add
      .text(width * 0.7, height - 60, "Coverage: 0.0%", {
        fontSize: "20px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      // hook for escape if you want to use it in subclasses
    }
  }

  // --- TEXTURES ----------------------------------------------------

  private ensureTangramTextures() {
    if (!this.textures.exists("tan_largeTri")) {
      const gfx = this.add.graphics({ x: 0, y: 0 });
      gfx.clear();
      gfx.fillStyle(0xffffff, 1);
      gfx.fillTriangle(0, 140, 140, 140, 0, 0);
      gfx.generateTexture("tan_largeTri", 140, 140);
      gfx.destroy();
    }

    if (!this.textures.exists("tan_mediumTri")) {
      const gfx = this.add.graphics({ x: 0, y: 0 });
      gfx.clear();
      gfx.fillStyle(0xffffff, 1);
      gfx.fillTriangle(0, 100, 100, 100, 0, 0);
      gfx.generateTexture("tan_mediumTri", 100, 100);
      gfx.destroy();
    }

    if (!this.textures.exists("tan_smallTri")) {
      const gfx = this.add.graphics({ x: 0, y: 0 });
      gfx.clear();
      gfx.fillStyle(0xffffff, 1);
      gfx.fillTriangle(0, 70, 70, 70, 0, 0);
      gfx.generateTexture("tan_smallTri", 70, 70);
      gfx.destroy();
    }

    if (!this.textures.exists("tan_square")) {
      const gfx = this.add.graphics({ x: 0, y: 0 });
      gfx.clear();
      gfx.fillStyle(0xffffff, 1);
      gfx.fillRect(0, 0, 80, 80);
      gfx.generateTexture("tan_square", 80, 80);
      gfx.destroy();
    }

    if (!this.textures.exists("tan_parallelogram")) {
      const gfx = this.add.graphics({ x: 0, y: 0 });
      gfx.clear();
      gfx.fillStyle(0xffffff, 1);
      const w = 100;
      const h = 60;
      const skew = 25;
      gfx.beginPath();
      gfx.moveTo(skew, 0);
      gfx.lineTo(skew + w, 0);
      gfx.lineTo(w, h);
      gfx.lineTo(0, h);
      gfx.closePath();
      gfx.fillPath();
      gfx.generateTexture("tan_parallelogram", w + skew, h);
      gfx.destroy();
    }
  }

  // --- GEOMETRY HELPERS --------------------------------------------

  // Base shapes in local coordinates (matching how textures & silhouette are drawn)
  private getBasePolygonPoints(type: TangramPieceType): Phaser.Geom.Point[] {
    switch (type) {
      case "largeTri":
      case "largeTri2":
        return [
          new Phaser.Geom.Point(0, 140),
          new Phaser.Geom.Point(140, 140),
          new Phaser.Geom.Point(0, 0),
        ];
      case "mediumTri":
        return [
          new Phaser.Geom.Point(0, 100),
          new Phaser.Geom.Point(100, 100),
          new Phaser.Geom.Point(0, 0),
        ];
      case "smallTri1":
      case "smallTri2":
        return [
          new Phaser.Geom.Point(0, 70),
          new Phaser.Geom.Point(70, 70),
          new Phaser.Geom.Point(0, 0),
        ];
      case "square":
        return [
          new Phaser.Geom.Point(0, 0),
          new Phaser.Geom.Point(80, 0),
          new Phaser.Geom.Point(80, 80),
          new Phaser.Geom.Point(0, 80),
        ];
      case "parallelogram": {
        const w = 100;
        const h = 60;
        const skew = 25;
        return [
          new Phaser.Geom.Point(skew, 0),
          new Phaser.Geom.Point(skew + w, 0),
          new Phaser.Geom.Point(w, h),
          new Phaser.Geom.Point(0, h),
        ];
      }
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
    const sprite = this.add
      .image(cfg.startX, cfg.startY, cfg.textureKey)
      .setInteractive({ draggable: true })
      .setTint(cfg.color);

    sprite.setOrigin(0.0, 0.0);

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
}
