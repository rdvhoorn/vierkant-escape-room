import Phaser from "phaser";
import FaceBase from "./_FaceBase";
import type { Edge } from "./_FaceBase";

export default class FaceTopScene extends FaceBase {
  constructor() {
    super("FaceTopScene");
  }

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private bottomEdge!: Edge;

  // Layers for tidy depth management
  private layer = {
    bg: null as Phaser.GameObjects.Container | null,
    ground: null as Phaser.GameObjects.Container | null,
    deco: null as Phaser.GameObjects.Container | null,
    actors: null as Phaser.GameObjects.Container | null,
    fx: null as Phaser.GameObjects.Container | null,
    ui: null as Phaser.GameObjects.Container | null,
  };

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0b1020");

    // --- choose which frames to use when standing still ---
    const IDLE_FRAMES = ["player_normal_4", "player_normal_5"]; // <- customize
    const MOVE_FRAMES = ["player_normal_1", "player_normal_2", "player_normal_3", "player_normal_4", "player_normal_5"];

    // ---- Scene layers
    this.layer.bg = this.add.container(0, 0).setDepth(0);
    this.layer.ground = this.add.container(0, 0).setDepth(10);
    this.layer.deco = this.add.container(0, 0).setDepth(20);
    this.layer.actors = this.add.container(0, 0).setDepth(30);
    this.layer.fx = this.add.container(0, 0).setDepth(40);
    this.layer.ui = this.add.container(0, 0).setDepth(1000);

    // ---- Stars (screen space)
    const stars = this.add.graphics();
    for (let i = 0; i < 200; i++) {
      stars.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.15, 0.8));
      stars.fillRect(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 2, 2);
    }
    this.layer.bg.add(stars);

    // ---- Neighbor mapping
    const neighborsByEdge: (string | null)[] = [
      "FaceTopScene","FaceTopScene","FaceBottomScene","FaceTopScene","FaceTopScene",
    ];
    const colorMap: Record<string, number> = { FaceTopScene: 0x311111, FaceBottomScene: 0x133333 };
    const neighborStyles = neighborsByEdge.map((key) =>
      key ? { fill: colorMap[key], stroke: 0x4b7ad1, alpha: 0.95 } : undefined
    );

    // ---- Render face + neighbors
    const radius = 180;
    this.renderFaceAndNeighbors({
      cx: width / 2,
      cy: height / 2,
      radius,
      fill: 0x15284b,
      neighborFill: 0x0f1d38,
      neighborStyles,
    });

    // Ground
    this.addGrassyGroundTexture(width / 2, height / 2, radius);

    // Portal edge (downwards): index 2
    this.bottomEdge = this.edges[2];

    // ---- Valid spawn position
    let spawnX = (this.data.get("spawnX") as number) ?? width / 2;
    let spawnY = (this.data.get("spawnY") as number) ?? (height / 2 - 20);
    const tryPos = new Phaser.Geom.Point(spawnX, spawnY);
    if (!Phaser.Geom.Polygon.ContainsPoint(this.poly, tryPos)) {
      const c = this.getPolygonCenter(this.poly);
      spawnX = c.x; spawnY = c.y - 20;
    }

    // ---- Player (Arcade SPRITE; FaceBase now uses sprite)
    this.createPlayerAt(spawnX, spawnY);
    this.player
      .setTexture(IDLE_FRAMES[0]) // start on first idle frame
      .setDisplaySize(24, 24)
      .setOrigin(0.5, 0.8)
      .setDepth(35);

    this.setCameraToPlayerBounds();

    // Shadow under player
    this.addSoftShadowBelow(this.player as unknown as Phaser.GameObjects.Sprite, 8, 0x000000, 0.25);

    // ---- Inputs
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey("W"),
      A: this.input.keyboard!.addKey("A"),
      S: this.input.keyboard!.addKey("S"),
      D: this.input.keyboard!.addKey("D"),
    };
    this.setupControls();

    // ---- Animations
    if (!this.anims.exists("player-idle")) {
      this.anims.create({
        key: "player-idle",
        frames: IDLE_FRAMES.map(key => ({ key })),
        frameRate: 3,          // gentle breathing
        repeat: -1,
        yoyo: true,
      });
    }
    if (!this.anims.exists("player-move")) {
      this.anims.create({
        key: "player-move",
        frames: MOVE_FRAMES.map(key => ({ key })),
        frameRate: 10,         // quicker while moving
        repeat: -1,
        yoyo: false,
      });
    }

    // ---- ESC back to Title
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("TitleScene"));

    // ---- E to move down through the shared edge
    this.input.keyboard?.on("keydown-E", () => {
      if (this.isNearEdge(this.player as unknown as Phaser.GameObjects.Image, this.bottomEdge)) {
        const mid = this.midpoint(this.bottomEdge);
        this.scene.start("FaceBottomScene", { spawnFromTop: true, spawnX: mid.x, spawnY: mid.y });
      }
    });

    // ---- Spaceship crash site
    // Choose a spot near the downward portal edge midpoint, pushed inward a bit
    const center = this.getPolygonCenter(this.poly);
    const edgeMid = this.midpoint(this.bottomEdge);
    const dir = new Phaser.Math.Vector2(center.x - edgeMid.x, center.y - edgeMid.y).normalize();
    const shipPos = new Phaser.Math.Vector2(edgeMid.x, edgeMid.y - 50).add(dir.scale(40));

    // Spaceship
    const ship = this.add.image(shipPos.x, shipPos.y, "ship").setOrigin(0.5, 0.6).setDisplaySize(48, 48).setDepth(50);
    ship.setAngle(-18); // came in hot
    this.addSoftShadowBelow(ship, 22, 0x000000, 0.28);

    const shipBlock = this.add.zone(shipPos.x, shipPos.y, 44, 28); // width/height: tweak to your art
    this.physics.add.existing(shipBlock, true); // true = static body
    this.physics.add.collider(this.player, shipBlock);

    // ---- Crash site dressing
    this.decorateCrashSite(radius);

    // ---- Orientation + animation switching
    const ANGLE_LEFT = -10;
    const ANGLE_RIGHT = 10;
    const MOVE_SPEED_THRESHOLD = 20; // px/sec to consider "moving"

    // start idle
    (this.player as Phaser.Physics.Arcade.Sprite).play("player-idle");

    this.events.on("update", () => {
      // mirror/tilt like before
      const left  = !!(this.cursors.left?.isDown || this.wasd.A.isDown);
      const right = !!(this.cursors.right?.isDown || this.wasd.D.isDown);
      const up    = !!(this.cursors.up?.isDown || this.wasd.W.isDown);
      const down  = !!(this.cursors.down?.isDown || this.wasd.S.isDown);

      const spr = this.player as Phaser.Physics.Arcade.Sprite;

      spr.setFlipX(left && !right);

      if (left || up)       spr.setAngle(ANGLE_LEFT);
      else if (right || down) spr.setAngle(ANGLE_RIGHT);
      else                  spr.setAngle(0);

      // speed-based animation gating
      const body = spr.body as Phaser.Physics.Arcade.Body;
      const speed = body.velocity.length();

      const want = speed > MOVE_SPEED_THRESHOLD ? "player-move" : "player-idle";
      if (spr.anims.currentAnim?.key !== want) {
        spr.play(want);
      }

      // optional: scale animation speed with velocity (feels great)
      // 1.0 at ~120px/s, clamps to [0.6, 1.6]
      const t = Phaser.Math.Clamp(speed / 120, 0.6, 1.6);
      spr.anims.timeScale = t;
    });
  }




  update() {
    this.updateMovement(this.cursors, this.wasd);

    if (this.isNearEdge(this.player, this.bottomEdge)) {
      this.portalHint.setText("Edge access: press E to descend").setAlpha(1);
    } else {
      this.portalHint.setAlpha(0);
    }
  }

  // ---------------------------
  // Helpers
  // ---------------------------

  private isNearEdge(player: Phaser.GameObjects.Image, e: Edge): boolean {
    const p = new Phaser.Math.Vector2(player.x, player.y);
    return this.distanceToEdge(p, e) < 16;
  }

  private midpoint(e: Edge) {
    return new Phaser.Math.Vector2((e.a.x + e.b.x) / 2, (e.a.y + e.b.y) / 2);
  }

  private addGrassyGroundTexture(cx: number, cy: number, radius: number) {
    // 1) Create a canvas texture with noisy green grass
    const key = "grassTexFaceTop";
    const size = 512;
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, size, size);
      if (tex === null) return;

      const ctx = tex.getContext();

      // Base gradient
      const g = ctx.createLinearGradient(0, 0, size, size);
      g.addColorStop(0, "#1f4a2b");
      g.addColorStop(1, "#2c6b3b");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);

      // Speckle noise
      for (let i = 0; i < 5000; i++) {
        const a = Math.random() * 0.08 + 0.02;
        ctx.fillStyle = `rgba(${30 + (Math.random() * 50)|0}, ${80 + (Math.random() * 80)|0}, ${40 + (Math.random() * 40)|0}, ${a})`;
        const x = (Math.random() * size) | 0;
        const y = (Math.random() * size) | 0;
        const s = Math.random() < 0.7 ? 1 : 2;
        ctx.fillRect(x, y, s, s);
      }

      // A few blade clusters
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

    // 2) Place the grass image scaled to the face
    const img = this.add.image(cx, cy, key);
    const scale = (radius * 2.2) / 256; // tweak fill coverage
    img.setScale(scale);

    // 3) Mask the grass using the pentagon polygon
    const maskGfx = this.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.beginPath();
    const pts = (this.poly.points as Phaser.Geom.Point[]).map(p => new Phaser.Math.Vector2(p.x, p.y));
    maskGfx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) maskGfx.lineTo(pts[i].x, pts[i].y);
    maskGfx.closePath();
    maskGfx.fillPath();
    const mask = maskGfx.createGeometryMask();
    img.setMask(mask);
    maskGfx.setVisible(false);

    // 4) Soft edge highlight for depth
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

    // Sprinkle decorations (rocks/tufts/debris) if available
    const candidates = ["rock", "tuft1", "tuft2", "debris1", "debris2"].filter(k => this.textures.exists(k));
    const count = Phaser.Math.Between(6, 10);
    for (let i = 0; i < count; i++) {
      const p = this.randomPointInPolygon(this.poly, center, radius * 0.75);
      const key = candidates.length ? Phaser.Utils.Array.GetRandom(candidates) : null;
      if (!key) break;

      const s = this.add.image(p.x, p.y, key);
      s.setScale(Phaser.Math.FloatBetween(0.8, 1.15));
      s.setAngle(Phaser.Math.Between(-15, 15));
      s.setAlpha(0.95);
      this.layer.deco?.add(s);
      this.addSoftShadowBelow(s, 10, 0x000000, 0.2);
    }
  }

  private addSoftShadowBelow(
    obj: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
    radius: number,
    color: number,
    alpha: number
  ) {
    const g = this.add.graphics();
    const b = 1; // blur-ish by layering circles
    for (let i = 0; i < 4; i++) {
      g.fillStyle(color, alpha * (0.5 / (i + 1)));
      g.fillEllipse(0, 0, (radius + i * b) * 2, (radius * 0.6 + i * b) * 2);
    }
    g.setPosition(obj.x, obj.y + obj.displayHeight * 0.35);
    g.setDepth((obj.depth ?? 0) - 1);
    this.layer.ground?.add(g);

    // Keep shadow following the object
    this.events.on("update", () => {
      g.setPosition(obj.x, obj.y + obj.displayHeight * 0.35);
    });
  }

  private randomPointInPolygon(poly: Phaser.Geom.Polygon, center: Phaser.Math.Vector2, maxR: number) {
    // rejection sample inside polygon, biased a bit toward center
    for (let tries = 0; tries < 200; tries++) {
      const r = Phaser.Math.FloatBetween(maxR * 0.2, maxR);
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const x = center.x + Math.cos(a) * r;
      const y = center.y + Math.sin(a) * r;
      if (Phaser.Geom.Polygon.Contains(poly, x, y)) return new Phaser.Math.Vector2(x, y);
    }
    // fallback: center
    return center.clone();
  }
}
