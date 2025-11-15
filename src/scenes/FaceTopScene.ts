import Phaser from "phaser";
import FaceBase, { Edge } from "./_FaceBase";
import { TwinklingStars } from "../utils/TwinklingStars";
import { getIsDesktop } from "../ControlsMode";

export default class FaceTopScene extends FaceBase {
  constructor() {
    super("FaceTopScene");
  }

  // Layers (optional; purely visual organization for this face)
  private layer = {
    bg: null as Phaser.GameObjects.Container | null,
    ground: null as Phaser.GameObjects.Container | null,
    deco: null as Phaser.GameObjects.Container | null,
    actors: null as Phaser.GameObjects.Container | null,
    fx: null as Phaser.GameObjects.Container | null,
    ui: null as Phaser.GameObjects.Container | null,
  };

  private shipZone!: Phaser.GameObjects.Zone;              // proximity window
  private shipHighlight!: Phaser.GameObjects.Graphics;     // visual highlight around ship

  private puzzleZone!: Phaser.GameObjects.Zone;            // puzzle proximity
  private puzzleHighlight!: Phaser.GameObjects.Graphics;

  private inShipRange = false;
  private inPuzzleRange = false;

  private twinklingStars?: TwinklingStars;

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0b1020");

    // ---- Scene layers
    this.layer.bg = this.add.container(0, 0).setDepth(0);
    this.layer.ground = this.add.container(0, 0).setDepth(10);
    this.layer.deco = this.add.container(0, 0).setDepth(20);
    this.layer.actors = this.add.container(0, 0).setDepth(30);
    this.layer.fx = this.add.container(0, 0).setDepth(40);
    this.layer.ui = this.add.container(0, 0).setDepth(1000);

    // ---- Twinkling stars (screen space)
    this.twinklingStars = new TwinklingStars(this, 220, width, height);
    this.layer.bg.add(this.twinklingStars.graphics);

    // ---- Registry: energy
    if (this.registry.get("energy") == null) {
      this.registry.set("energy", 0); // start at 0
    }

    // ---- Static starfield background
    const stars = this.add.graphics();
    for (let i = 0; i < 200; i++) {
      stars.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.15, 0.8));
      stars.fillRect(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        2,
        2
      );
    }
    this.layer.bg.add(stars);

    // ---- Planet face geometry
    const radius = 180;
    const neighborsByEdge: (string | null)[] = [
      "FaceTopScene",
      "FaceTopScene",
      "FaceBottomScene",
      "FaceTopScene",
      "FaceTopScene",
    ];
    const colorMap: Record<string, number> = {
      FaceTopScene: 0x311111,
      FaceBottomScene: 0x311111,
    };
    const neighborStyles = neighborsByEdge.map((key) =>
      key
        ? { fill: colorMap[key], stroke: 0x4b7ad1, alpha: 0.95 }
        : undefined
    );
    this.renderFaceAndNeighbors({
      cx: width / 2,
      cy: height / 2,
      radius,
      fill: 0x311111,
      neighborFill: 0x311111,
      neighborStyles,
    });

    this.addGrassyGroundTexture(width / 2, height / 2, radius);

    // ---- Player
    const spawnX = (this.data.get("spawnX") as number) ?? width / 2;
    const spawnY = (this.data.get("spawnY") as number) ?? height / 2 - 20;
    this.createPlayerAt(spawnX, spawnY);

    // ---- Crash site / ship
    const center = this.getPolygonCenter(this.poly);
    const shipPos = new Phaser.Math.Vector2(center.x, center.y + 50);

    const ship = this.add
      .image(shipPos.x, shipPos.y, "ship")
      .setOrigin(0.5, 0.6)
      .setDisplaySize(48, 48)
      .setDepth(50);
    ship.setAngle(-18);
    this.addSoftShadowBelow(ship, 22, 0x000000, 0.28);

    const shipBlock = this.add.zone(shipPos.x, shipPos.y, 44, 28);
    this.physics.add.existing(shipBlock, true);
    this.physics.add.collider(this.player, shipBlock);

    // ---- Ship zone & highlight
    this.shipZone = this.add
      .zone(shipPos.x, shipPos.y, 90, 70)
      .setOrigin(0.5);
    this.physics.add.existing(this.shipZone, true);

    this.shipHighlight = this.add.graphics().setDepth(51).setVisible(false);
    this.shipHighlight.lineStyle(2, 0xffffff, 0.6);
    this.shipHighlight.strokeRoundedRect(
      shipPos.x - 45,
      shipPos.y - 35,
      90,
      70,
      10
    );
    this.shipHighlight.setAlpha(0.8);
    this.layer.fx?.add(this.shipHighlight);

    // ---- Puzzle zone near ship
    const puzzlePos = new Phaser.Math.Vector2(shipPos.x + 100, shipPos.y - 80);

    this.puzzleZone = this.add
      .zone(puzzlePos.x, puzzlePos.y, 80, 80)
      .setOrigin(0.5);
    this.physics.add.existing(this.puzzleZone, true);

    this.puzzleHighlight = this.add.graphics().setDepth(51).setVisible(false);
    this.puzzleHighlight.lineStyle(2, 0xffff00, 0.6);
    this.puzzleHighlight.strokeRoundedRect(
      puzzlePos.x - 40,
      puzzlePos.y - 40,
      80,
      80,
      8
    );
    this.puzzleHighlight.setAlpha(0.8);
    this.layer.fx?.add(this.puzzleHighlight);

    const puzzleImage = this.add
      .image(puzzlePos.x, puzzlePos.y, "letter")
      .setOrigin(0.5, 0.5)
      .setDisplaySize(48, 48)
      .setDepth(50);
    this.addSoftShadowBelow(puzzleImage, 22, 0x000000, 0.28);
    this.layer.actors?.add(puzzleImage);

    const isDesktop = getIsDesktop(this);
    const hintText = "Interactie: " + (isDesktop ? "E" : "I");

    this.registerInteraction(
      () => this.inShipRange || this.inPuzzleRange,
      () => {
        if (this.inShipRange) {
          this.scene.start("ShipFuelScene");
        } else if (this.inPuzzleRange) {
          if (this.registry.get("logic1Solved")) {
            this.scene.start("PuzzleLogicTwoScene");
          } else {
            this.scene.start("PuzzleLogicOneScene");
          }
        }
      },
      { hintText }
    );

    // ---- Energy bar in top-right corner
    const energyBg = this.add.graphics();
    energyBg.fillStyle(0x222222, 0.7);
    energyBg.fillRect(0, 0, 104, 24);

    const energyBar = this.add.graphics();
    energyBar.fillStyle(0x00ff00, 1);
    energyBar.fillRect(2, 2, this.registry.get("energy"), 20);

    const energyContainer = this.add
      .container(this.scale.width - 120, 28, [energyBg, energyBar])
      .setScrollFactor(0)
      .setDepth(20);

    this.layer.ui?.add(energyContainer);

    // Helper to update bar
    this.events.on("updateEnergy", (newEnergy: number) => {
      energyBar.clear();
      energyBar.fillStyle(0x00ff00, 1);
      energyBar.fillRect(2, 2, Math.min(newEnergy, 100), 20);
    });

    this.decorateCrashSite(radius);
  }

  update(_time: number, delta: number) {
    this.twinklingStars?.update(delta);

    // ---- Ship overlap
    const isOverlappingShip = this.physics.world.overlap(
      this.player,
      this.shipZone
    );
    this.inShipRange = isOverlappingShip;
    this.shipHighlight.setVisible(this.inShipRange);

    // ---- Puzzle overlap
    const isOverlappingPuzzle = this.physics.world.overlap(
      this.player,
      this.puzzleZone
    );
    this.inPuzzleRange = isOverlappingPuzzle;
    this.puzzleHighlight.setVisible(this.inPuzzleRange);

    // HUD update is already subscribed via FaceBase (events.on("update"))
    // so we don't call this.hud.update() here.
  }

  /**
   * Override FaceBase's edge-based proximity:
   * For this scene, "interaction in range" is defined by the ship/puzzle zones,
   * NOT actual polygon edges.
   *
   * We ignore the actual edge and just say:
   *   "There's an interaction whenever you're in ship OR puzzle range".
   */
  protected isNearEdge(
    _player: { x: number; y: number },
    _e: Edge
  ): boolean {
    return this.inShipRange || this.inPuzzleRange;
  }

  // ---------------------------
  // Decorations / visuals (unchanged)
  // ---------------------------

  private addGrassyGroundTexture(cx: number, cy: number, radius: number) {
    const key = "grassTexFaceTop";
    const size = 512;
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, size, size);
      if (tex === null) return;

      const ctx = tex.getContext();
      const g = ctx.createLinearGradient(0, 0, size, size);
      g.addColorStop(0, "#1f4a2b");
      g.addColorStop(1, "#2c6b3b");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);

      for (let i = 0; i < 5000; i++) {
        const a = Math.random() * 0.08 + 0.02;
        ctx.fillStyle = `rgba(${(30 + (Math.random() * 50) | 0)}, ${
          80 + ((Math.random() * 80) | 0)
        }, ${(40 + (Math.random() * 40) | 0)}, ${a})`;
        const x = (Math.random() * size) | 0;
        const y = (Math.random() * size) | 0;
        const s = Math.random() < 0.7 ? 1 : 2;
        ctx.fillRect(x, y, s, s);
      }

      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 300; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const len = 3 + Math.random() * 8;
        ctx.beginPath();
        ctx.moveTo(x, y + 2);
        ctx.lineTo(x + (Math.random() * 2 - 1), y - len);
        ctx.stroke();
      }

      tex.refresh();
    }

    const img = this.add.image(cx, cy, key);
    const scale = (radius * 2.2) / 256;
    img.setScale(scale);

    const maskGfx = this.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.beginPath();
    const pts = (this.poly.points as Phaser.Geom.Point[]).map(
      (p) => new Phaser.Math.Vector2(p.x, p.y)
    );
    maskGfx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) maskGfx.lineTo(pts[i].x, pts[i].y);
    maskGfx.closePath();
    maskGfx.fillPath();
    const mask = maskGfx.createGeometryMask();
    img.setMask(mask);
    maskGfx.setVisible(false);

    const edge = this.add.graphics();
    edge.lineStyle(2, 0x0a3918, 0.8);
    edge.beginPath();
    edge.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) edge.lineTo(pts[i].x, pts[i].y);
    edge.closePath();
    edge.strokePath();

    this.layer.ground?.add([img, edge, maskGfx]);
  }

  private decorateCrashSite(radius: number) {
    const center = this.getPolygonCenter(this.poly);
    const candidates = ["rock", "tuft1", "tuft2", "debris1", "debris2"].filter(
      (k) => this.textures.exists(k)
    );
    const count = Phaser.Math.Between(6, 10);
    for (let i = 0; i < count; i++) {
      const p = this.randomPointInPolygon(this.poly, center, radius * 0.75);
      const key = candidates.length
        ? Phaser.Utils.Array.GetRandom(candidates)
        : null;
      if (!key) break;

      const s = this.add.image(p.x, p.y, key);
      s.setScale(Phaser.Math.FloatBetween(0.8, 1.15));
      s.setAngle(Phaser.Math.Between(-15, 15));
      s.setAlpha(0.95);
      this.layer.deco?.add(s);
      this.addSoftShadowBelow(s, 10, 0x000000, 0.2);
    }
  }

  private randomPointInPolygon(
    poly: Phaser.Geom.Polygon,
    center: Phaser.Math.Vector2,
    maxR: number
  ) {
    for (let tries = 0; tries < 200; tries++) {
      const r = Phaser.Math.FloatBetween(maxR * 0.2, maxR);
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const x = center.x + Math.cos(a) * r;
      const y = center.y + Math.sin(a) * r;
      if (Phaser.Geom.Polygon.Contains(poly, x, y))
        return new Phaser.Math.Vector2(x, y);
    }
    return center.clone();
  }
}
