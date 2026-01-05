import Phaser from "phaser";
import FaceBase, { Edge } from "./_FaceBase";
import { getIsDesktop } from "../../ControlsMode";
import { resolveFaceConfig, buildNeighborColorMap } from "./_FaceConfig";

export default class Face1Scene extends FaceBase {
  constructor() {
    super("Face1Scene");
  }

  // Local alias for layers (we fill this from FaceBase.getFaceLayers())
  private layer = {
    bg: null as Phaser.GameObjects.Container | null,
    ground: null as Phaser.GameObjects.Container | null,
    deco: null as Phaser.GameObjects.Container | null,
    actors: null as Phaser.GameObjects.Container | null,
    fx: null as Phaser.GameObjects.Container | null,
    ui: null as Phaser.GameObjects.Container | null,
  };

  private inShipRange = false;
  private inPuzzleRange = false;

  create() {
    console.log("[ENTER]", this.scene.key);
    const { width, height } = this.scale;

    // --- Pull config from faceConfig.ts ---
    const cfg = resolveFaceConfig("Face1Scene");
    const { radius, neighbors, visuals } = cfg;
    const colorMap = buildNeighborColorMap(neighbors);

    this.initStandardFace({
      radius,
      faceTravelTargets: neighbors,
      mainFill: visuals.mainFill,
      neighborFill: visuals.neighborFill,
      colorMap,
      edgeTriggerScale: visuals.edgeTriggerScale,
      backgroundColor: visuals.backgroundColor,
      showLabel: visuals.showLabel, // false for Face1 in config
    });

    // Grab the created layers from FaceBase and map them to our local layer object
    const baseLayers = this.getFaceLayers();
    this.layer.bg = baseLayers.bg;
    this.layer.ground = baseLayers.ground;
    this.layer.deco = baseLayers.deco;
    this.layer.actors = baseLayers.actors;
    this.layer.fx = baseLayers.fx;
    this.layer.ui = baseLayers.ui;

    // Ground texture on the main face
    this.addGrassyGroundTexture(width / 2, height / 2, radius);

    // ---- Crash site / ship
    const center = this.getPolygonCenter(this.poly);
    const shipPos = new Phaser.Math.Vector2(center.x, center.y + 50);

    const ship = this.add
      .image(shipPos.x, shipPos.y, "ship")
      .setOrigin(0.5, 0.6)
      .setDisplaySize(200, 200)
      .setDepth(50);
    ship.setAngle(-18);
    this.layer.actors?.add(ship);

    const shipBlock = this.add.zone(shipPos.x, shipPos.y-80, 70, 150);
    this.physics.add.existing(shipBlock, true);
    this.physics.add.collider(this.player, shipBlock);

    // ---- Ship zone & highlight
    this.makeObjectInteractable(ship, {
      hitRadius: 150,
      paddingX: 0,
      paddingY: 0,
      hintText: "Interactie: " + (getIsDesktop(this) ? "E" : "I"),
      onUse: () => {
        this.scene.start("CockpitScene");
      }
    })

    // Decorations etc.
    this.decorateCrashSite(radius);
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }

  /**
   * Override FaceBase's edge-based proximity:
   * For this scene, "interaction in range" is defined by the ship/puzzle zones,
   * OR a travel edge being active.
   */
  protected isNearEdge(_player: { x: number; y: number }, _e: Edge): boolean {
    // `activeTravelEdge` is managed by baseFaceUpdate() in FaceBase
    return this.inShipRange || this.inPuzzleRange || this.activeTravelEdge !== null;
  }

  // ---------------------------
  // Decorations / visuals
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
    const candidates = ["rock", "tuft1", "tuft2", "debris1", "debris2"].filter((k) =>
      this.textures.exists(k)
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
