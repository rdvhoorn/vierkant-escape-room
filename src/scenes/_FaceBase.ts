import Phaser from "phaser";

export type Edge = { a: Phaser.Math.Vector2; b: Phaser.Math.Vector2 };

// Type aliases are TYPES only; do not construct them at runtime.
type V2 = Phaser.Math.Vector2;
type V3 = Phaser.Math.Vector3;

const RAD = Math.PI / 180;
// Regular dodecahedron dihedral angle ~= 116.565051°
const DIHEDRAL = 116.565051 * RAD;

type EdgeAction = {
  edge: Edge;
  hintText?: string;
  key?: string;               // default "E"
  onUse: () => void;
};

export default abstract class FaceBase extends Phaser.Scene {
  protected world!: Phaser.GameObjects.Container;
  private worldBounds!: Phaser.Geom.Rectangle;

  // Player & controls (now fully owned by FaceBase)
  protected player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private lastSafePos = new Phaser.Math.Vector2();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;

  // Player animations: defaults (no per-face config needed)
  // If these frames don't exist in your atlas, we'll gracefully fall back to a simple box texture.
  private readonly IDLE_FRAMES = ["player_normal_4", "player_normal_5"];
  private readonly MOVE_FRAMES = ["player_normal_1", "player_normal_2", "player_normal_3", "player_normal_4", "player_normal_5"];

  // Gameplay geometry
  protected poly!: Phaser.Geom.Polygon;
  protected edges: Edge[] = [];

  // Portal hint & edge actions
  protected portalHint!: Phaser.GameObjects.Text;
  private edgeActions: EdgeAction[] = [];
  private edgeKey?: Phaser.Input.Keyboard.Key;

  // ---- CAMERA for pseudo-3D preview ----
  private camZ = 1800;  // camera position on +Z
  private tilt = -DIHEDRAL; // rotate neighbors away from viewer (negative z)

  // drawing caches
  private gMain!: Phaser.GameObjects.Graphics;      // central face
  private gNeighbors!: Phaser.GameObjects.Graphics; // neighbors ring (behind)

  // ---------------------------
  // Scene lifecycle helpers
  // ---------------------------
  protected createWorldLayer() {
    if (this.world) this.world.destroy();
    this.world = this.add.container(0, 0);
  }

  protected setCameraToPlayerBounds() {
    if (!this.worldBounds || !this.player) return;
    const pad = 80;
    const b = new Phaser.Geom.Rectangle(
      this.worldBounds.x - pad,
      this.worldBounds.y - pad,
      this.worldBounds.width + pad * 2,
      this.worldBounds.height + pad * 2
    );
    this.cameras.main.setBounds(b.x, b.y, b.width, b.height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12); // smooth follow
  }

  // ---------------------------
  // Player: creation & controls (all generic)
  // ---------------------------
  /**
   * Call this AFTER you've called renderFaceAndNeighbors() so worldBounds is known.
   * If the requested spawn is outside the polygon, we tuck the player to a safe center spot.
   */
  protected createPlayerAt(x: number, y: number) {
    // Ensure a fallback texture exists in case your intended frames aren't loaded.
    if (!this.textures.exists("playerBox")) {
      const g = this.add.graphics();
      g.fillStyle(0x78e3ff, 1).fillRect(0, 0, 24, 24).lineStyle(2, 0x134a84).strokeRect(0, 0, 24, 24);
      g.generateTexture("playerBox", 24, 24);
      g.destroy();
    }

    // Clamp to inside polygon if needed
    const tryPt = new Phaser.Geom.Point(x, y);
    if (!Phaser.Geom.Polygon.ContainsPoint(this.poly, tryPt)) {
      const c = this.getPolygonCenter(this.poly);
      x = c.x; y = c.y - 20;
    }

    // Create sprite
    const startTexture = this.textures.exists(this.IDLE_FRAMES[0]) ? this.IDLE_FRAMES[0] : "playerBox";
    this.player = this.physics.add.sprite(x, y, startTexture)
      .setOrigin(0.5, 0.8)
      .setDisplaySize(48, 48)
      .setDepth(35)
      .setCollideWorldBounds(false);

    // Smaller hitbox than visual sprite (24x24 instead of 48x48)
    this.player.body.setSize(24, 24);
    this.player.setDrag(800, 800).setMaxVelocity(240, 240);
    this.lastSafePos.set(x, y);

    // Input setup (stored internally)
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey("W"),
      A: this.input.keyboard!.addKey("A"),
      S: this.input.keyboard!.addKey("S"),
      D: this.input.keyboard!.addKey("D"),
    };

    this.setupControlsUI();
    this.ensurePlayerAnimations();
    if (this.hasAnim("player-idle")) {
      (this.player as Phaser.Physics.Arcade.Sprite).play("player-idle");
    }

    // Soft shadow under player (generic)
    this.addSoftShadowBelow(this.player as unknown as Phaser.GameObjects.Sprite, 8, 0x000000, 0.25);

    // Follow cam now that both worldBounds & player exist
    this.setCameraToPlayerBounds();

    // Per-frame behavior: movement, orientation, animation switching, edge hints/usage
    this.events.on("update", this.basePerFrameUpdate, this);
  }

  private hasAnim(key: string): boolean {
    return !!this.anims.exists(key);
  }

  private ensurePlayerAnimations() {
    // Only create if the frames exist; otherwise the fallback "playerBox" doesn't need anims.
    const framesExist = this.IDLE_FRAMES.every(k => this.textures.exists(k)) && this.MOVE_FRAMES.every(k => this.textures.exists(k));

    if (framesExist && !this.anims.exists("player-idle")) {
      this.anims.create({
        key: "player-idle",
        frames: this.IDLE_FRAMES.map(key => ({ key })),
        frameRate: 3,
        repeat: -1,
        yoyo: true,
      });
    }
    if (framesExist && !this.anims.exists("player-move")) {
      this.anims.create({
        key: "player-move",
        frames: this.MOVE_FRAMES.map(key => ({ key })),
        frameRate: 10,
        repeat: -1,
        yoyo: false,
      });
    }
  }

  private setupControlsUI() {
    this.add
      .text(
        this.scale.width - 12,
        this.scale.height - 10,
        "Lopen: WASD / Pijltjes   |  E:  Actie   |  ESC: Titel Scherm",
        { fontFamily: "sans-serif", fontSize: "14px", color: "#b6d5ff" }
      )
      .setScrollFactor(0)
      .setOrigin(1, 1)
      .setAlpha(0.9);

    this.portalHint = this.add
      .text(this.scale.width / 2, 28, "", { fontFamily: "sans-serif", fontSize: "16px", color: "#cfe8ff" })
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setAlpha(0);

    // ESC: go back to Title (generic)
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("TitleScene"));
  }

  private basePerFrameUpdate() {
    // 1) Movement
    this.updateMovement();

    // 2) Orientation & animation switching
    const spr = this.player as Phaser.Physics.Arcade.Sprite;
    const left  = !!(this.cursors.left?.isDown || this.wasd.A.isDown);
    const right = !!(this.cursors.right?.isDown || this.wasd.D.isDown);
    const up    = !!(this.cursors.up?.isDown || this.wasd.W.isDown);
    const down  = !!(this.cursors.down?.isDown || this.wasd.S.isDown);

    spr.setFlipX(left && !right);

    // tilt
    const ANGLE_LEFT = -10;
    const ANGLE_RIGHT = 10;
    if (left || up) spr.setAngle(ANGLE_LEFT);
    else if (right || down) spr.setAngle(ANGLE_RIGHT);
    else spr.setAngle(0);

    // speed-based animation gating
    const MOVE_SPEED_THRESHOLD = 20;
    const body = spr.body as Phaser.Physics.Arcade.Body;
    const speed = body.velocity.length();

    const want = speed > MOVE_SPEED_THRESHOLD ? "player-move" : "player-idle";
    if (this.hasAnim(want) && spr.anims.currentAnim?.key !== want) spr.play(want);

    // scale anim speed with velocity
    const t = Phaser.Math.Clamp(speed / 120, 0.6, 1.6);
    spr.anims.timeScale = t;

    // 3) Edge hint + E-to-use
    const active = this.edgeActions.find(a => this.isNearEdge(this.player, a.edge));
    if (active) {
      const hint = active.hintText ?? "Edge access: press E";
      this.portalHint.setText(hint).setAlpha(1);
    } else {
      this.portalHint.setAlpha(0);
    }
  }

  private updateMovement() {
    const accel = 900;
    let ax = 0, ay = 0;
    if (this.cursors.left?.isDown || this.wasd["A"].isDown) ax = -accel;
    else if (this.cursors.right?.isDown || this.wasd["D"].isDown) ax = accel;
    if (this.cursors.up?.isDown || this.wasd["W"].isDown) ay = -accel;
    else if (this.cursors.down?.isDown || this.wasd["S"].isDown) ay = accel;

    this.player.setAcceleration(ax, ay);
    if (ax === 0 && ay === 0) this.player.setAcceleration(0, 0);

    const pos = new Phaser.Math.Vector2(this.player.x, this.player.y);
    const point = new Phaser.Geom.Point(pos.x, pos.y);
    if (Phaser.Geom.Polygon.ContainsPoint(this.poly, point)) {
      this.lastSafePos.copy(pos);
    } else {
      this.player.setVelocity(0, 0);
      this.player.x = this.lastSafePos.x;
      this.player.y = this.lastSafePos.y;
    }
  }

  // Public helper to register an actionable edge (e.g., “descend”/“ascend”).
  protected registerEdgeAction(edge: Edge, onUse: () => void, options?: { hintText?: string; key?: string }) {
    this.edgeActions.push({
      edge,
      onUse,
      hintText: options?.hintText,
      key: (options?.key ?? "E").toUpperCase(),
    });

    // Bind key once (first registration wins)
    const useKey = (options?.key ?? "E").toUpperCase();
    if (!this.edgeKey) {
      this.edgeKey = this.input.keyboard?.addKey(useKey);
      this.input.keyboard?.on(`keydown-${useKey}`, () => {
        const active = this.edgeActions.find(a => this.isNearEdge(this.player, a.edge));
        if (active) active.onUse();
      });
    }
  }

  // ---------------------------
  // Geometry & proximity helpers
  // ---------------------------
  protected distanceToEdge(p: V2, e: Edge): number {
    const { a, b } = e;
    const ab = b.clone().subtract(a);
    const ap = p.clone().subtract(a);
    const t = Phaser.Math.Clamp(ap.dot(ab) / ab.lengthSq(), 0, 1);
    const closest = a.clone().add(ab.scale(t));
    return Phaser.Math.Distance.Between(p.x, p.y, closest.x, closest.y);
  }

  protected isNearEdge(player: Phaser.GameObjects.Image, e: Edge): boolean {
    const p = new Phaser.Math.Vector2(player.x, player.y);
    return this.distanceToEdge(p, e) < 16;
  }

  protected getPolygonCenter(poly: Phaser.Geom.Polygon): V2 {
    let sx = 0, sy = 0;
    for (const p of poly.points) { sx += p.x; sy += p.y; }
    return new Phaser.Math.Vector2(sx / poly.points.length, sy / poly.points.length);
  }

  protected regularPentagon(cx: number, cy: number, radius: number): Phaser.Geom.Polygon {
    const pts: V2[] = [];
    for (let i = 0; i < 5; i++) {
      const deg = -90 + i * 72;
      const rad = deg * RAD;
      pts.push(new Phaser.Math.Vector2(cx + Math.cos(rad) * radius, cy + Math.sin(rad) * radius));
    }
    const poly = new Phaser.Geom.Polygon(pts.flatMap((p) => [p.x, p.y]));
    this.edges = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      this.edges.push({ a, b });
    }
    return poly;
  }

  protected drawPolygon(
    g: Phaser.GameObjects.Graphics,
    poly: Phaser.Geom.Polygon,
    fill: number,
    alpha: number,
    stroke?: number
  ) {
    g.fillStyle(fill, alpha);
    g.beginPath();
    g.moveTo(poly.points[0].x, poly.points[0].y);
    for (let i = 1; i < poly.points.length; i++) g.lineTo(poly.points[i].x, poly.points[i].y);
    g.closePath();
    g.fillPath();
    if (stroke !== undefined) {
      g.lineStyle(3, stroke, 1);
      g.strokePath();
    }
  }

  // ---------------------------
  // 3D preview core (unchanged)
  // ---------------------------
  private v2to3(p: V2): V3 {
    return new Phaser.Math.Vector3(p.x, p.y, 0);
  }
  private v3(x: number, y: number, z: number): V3 {
    return new Phaser.Math.Vector3(x, y, z);
  }

  private rotateAroundAxis(point: V3, axisPoint: V3, axisDirUnit: V3, angleRad: number): V3 {
    const v = point.clone().subtract(axisPoint);
    const u = axisDirUnit;
    const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
    const term1 = v.clone().scale(cos);
    const term2 = u.clone().cross(v).scale(sin);
    const term3 = u.clone().scale(u.dot(v) * (1 - cos));
    return axisPoint.clone().add(term1).add(term2).add(term3);
  }

  private project(v: V3): V2 {
    const denom = (this.camZ - v.z);
    const k = this.camZ / denom;
    return new Phaser.Math.Vector2(v.x * k, v.y * k);
  }

  private polygonToV3(poly: Phaser.Geom.Polygon): V3[] {
    return poly.points.map((p) => this.v2to3(new Phaser.Math.Vector2(p.x, p.y)));
  }

  private edgeAxis3D(edge: Edge): { p0: V3; dirUnit: V3 } {
    const p0 = this.v3(edge.a.x, edge.a.y, 0);
    const p1 = this.v3(edge.b.x, edge.b.y, 0);
    const dir = p1.clone().subtract(p0);
    return { p0, dirUnit: dir.normalize() };
  }

  protected buildNeighborsProjected(centerPoly: Phaser.Geom.Polygon): Phaser.Geom.Polygon[] {
    const base3 = this.polygonToV3(centerPoly); // z=0
    const neighbors: Phaser.Geom.Polygon[] = [];

    for (let i = 0; i < 5; i++) {
      const edge = this.edges[i];
      const { p0, dirUnit } = this.edgeAxis3D(edge);
      const rotated = base3.map((v) => this.rotateAroundAxis(v, p0, dirUnit, this.tilt));
      const projected = rotated.map((v3) => this.project(v3));
      neighbors.push(new Phaser.Geom.Polygon(projected.flatMap((p) => [p.x, p.y])));
    }
    return neighbors;
  }

  protected renderFaceAndNeighbors(center: {
    cx: number; cy: number; radius: number;
    fill?: number; neighborFill?: number;
    neighborStyles?: Array<{ fill?: number; stroke?: number; alpha?: number } | undefined>;
  }) {
    const { cx, cy, radius } = center;
    const mainFill = center.fill ?? 0x15284b;
    const defaultNeighFill = center.neighborFill ?? 0x0f1d38;

    // fresh polygon at z=0 (WORLD coordinates!)
    const poly2D = this.regularPentagon(cx, cy, radius);
    this.poly = poly2D;

    // (Re)create world layer and graphics inside it
    this.createWorldLayer();
    this.gNeighbors = this.add.graphics();
    this.gMain = this.add.graphics();
    this.world.add([this.gNeighbors, this.gMain]);

    // neighbors (projected into WORLD coords since we use absolute numbers)
    const neighbors = this.buildNeighborsProjected(poly2D);
    for (let i = 0; i < neighbors.length; i++) {
      const n = neighbors[i];
      const style = center.neighborStyles?.[i];
      const f = style?.fill ?? defaultNeighFill;
      const s = style?.stroke ?? 0x4b7ad1;
      const a = style?.alpha ?? 0.95;
      this.drawPolygon(this.gNeighbors, n, f, a, s);
    }
    this.gNeighbors.setAlpha(0.88);

    // central face last
    this.drawPolygon(this.gMain, poly2D, mainFill, 1, 0x66a3ff);

    // compute world bounds from central + neighbors
    const allPolys = [poly2D, ...neighbors];
    const rects = allPolys.map(p => this.getPolyBounds(p));
    this.worldBounds = this.unionRects(rects);
  }

  private getPolyBounds(poly: Phaser.Geom.Polygon): Phaser.Geom.Rectangle {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of poly.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return new Phaser.Geom.Rectangle(minX, minY, maxX - minX, maxY - minY);
  }

  private unionRects(rects: Phaser.Geom.Rectangle[]): Phaser.Geom.Rectangle {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of rects) {
      if (r.x < minX) minX = r.x;
      if (r.y < minY) minY = r.y;
      const rx2 = r.x + r.width;
      const ry2 = r.y + r.height;
      if (rx2 > maxX) maxX = rx2;
      if (ry2 > maxY) maxY = ry2;
    }
    return new Phaser.Geom.Rectangle(minX, minY, maxX - minX, maxY - minY);
  }

  // ---------------------------
  // Visual util moved to base (no layer coupling)
  // ---------------------------
  protected addSoftShadowBelow(
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
    g.setPosition(obj.x, obj.y + (obj.displayHeight ?? 0) * 0.35);
    g.setDepth((obj.depth ?? 0) - 1);

    // Keep shadow following the object
    this.events.on("update", () => {
      g.setPosition(obj.x, obj.y + (obj.displayHeight ?? 0) * 0.35);
      g.setDepth((obj.depth ?? 0) - 1);
    });
  }
}
