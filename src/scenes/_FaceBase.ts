import Phaser from "phaser";

export type Edge = { a: Phaser.Math.Vector2; b: Phaser.Math.Vector2 };

// Type aliases are TYPES only; do not construct them at runtime.
type V2 = Phaser.Math.Vector2;
type V3 = Phaser.Math.Vector3;

const RAD = Math.PI / 180;
// Regular dodecahedron dihedral angle ~= 116.565051°
const DIHEDRAL = 116.565051 * RAD;

export default abstract class FaceBase extends Phaser.Scene {
  protected world!: Phaser.GameObjects.Container;
  private worldBounds!: Phaser.Geom.Rectangle;

  protected player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  protected poly!: Phaser.Geom.Polygon;
  protected edges: Edge[] = [];
  protected portalHint!: Phaser.GameObjects.Text;
  private lastSafePos = new Phaser.Math.Vector2();

  // ---- CAMERA for pseudo-3D preview ----
  private camZ = 1800;  // camera position on +Z
  private tilt = -DIHEDRAL; // rotate neighbors away from viewer (negative z)

  // drawing caches
  private gMain!: Phaser.GameObjects.Graphics;      // central face
  private gNeighbors!: Phaser.GameObjects.Graphics; // neighbors ring (behind)

  protected createWorldLayer() {
    if (this.world) this.world.destroy();
    this.world = this.add.container(0, 0);
  }

  protected setCameraToPlayerBounds() {
    // Give camera a box to roam: the worldBounds with a small margin
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

  // ------------ Player / Controls / Movement ------------
  protected createPlayerAt(x: number, y: number) {
    if (!this.textures.exists("playerBox")) {
      const g = this.add.graphics();
      g.fillStyle(0x78e3ff, 1).fillRect(0, 0, 24, 24).lineStyle(2, 0x134a84).strokeRect(0, 0, 24, 24);
      g.generateTexture("playerBox", 24, 24);
      g.destroy();
    }

    // BEFORE: this.physics.add.image(...)
    this.player = this.physics.add.sprite(x, y, "playerBox")
      .setOrigin(0.5)
      .setCollideWorldBounds(false);

    this.player.setDrag(800, 800).setMaxVelocity(240, 240);
    this.lastSafePos.set(x, y);
  }


  protected setupControls() {
    this.add
      .text(
        this.scale.width - 12,
        this.scale.height - 10,
        "Move: WASD / Arrows   |   E: Use edge   |   ESC: Title",
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
  }

  protected updateMovement(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: Record<string, Phaser.Input.Keyboard.Key>
  ) {
    const accel = 900;
    let ax = 0, ay = 0;
    if (cursors.left?.isDown || wasd["A"].isDown) ax = -accel;
    else if (cursors.right?.isDown || wasd["D"].isDown) ax = accel;
    if (cursors.up?.isDown || wasd["W"].isDown) ay = -accel;
    else if (cursors.down?.isDown || wasd["S"].isDown) ay = accel;

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

  protected distanceToEdge(p: V2, e: Edge): number {
    const { a, b } = e;
    const ab = b.clone().subtract(a);
    const ap = p.clone().subtract(a);
    const t = Phaser.Math.Clamp(ap.dot(ab) / ab.lengthSq(), 0, 1);
    const closest = a.clone().add(ab.scale(t));
    return Phaser.Math.Distance.Between(p.x, p.y, closest.x, closest.y);
  }

  // ------------ Geometry helpers ------------
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

  protected getPolygonCenter(poly: Phaser.Geom.Polygon): V2 {
    let sx = 0, sy = 0;
    for (const p of poly.points) { sx += p.x; sy += p.y; }
    return new Phaser.Math.Vector2(sx / poly.points.length, sy / poly.points.length);
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

  // ------------ 3D core (for previews) ------------
  private v2to3(p: V2): V3 {
    return new Phaser.Math.Vector3(p.x, p.y, 0);
  }
  private v3(x: number, y: number, z: number): V3 {
    return new Phaser.Math.Vector3(x, y, z);
  }

  private rotateAroundAxis(point: V3, axisPoint: V3, axisDirUnit: V3, angleRad: number): V3 {
    // Rodrigues rotation around axis through axisPoint in direction axisDirUnit
    const v = point.clone().subtract(axisPoint);
    const u = axisDirUnit;
    const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
    const term1 = v.clone().scale(cos);
    const term2 = u.clone().cross(v).scale(sin);
    const term3 = u.clone().scale(u.dot(v) * (1 - cos));
    return axisPoint.clone().add(term1).add(term2).add(term3);
  }

  private project(v: V3): V2 {
    // Perspective projection onto z=0 plane from camera at (0,0,camZ)
    const denom = (this.camZ - v.z);
    const k = this.camZ / denom; // camZ/(camZ - z)
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

  /**
   * Build neighbor faces by rotating a clone of the central face around each edge by the dodecahedron dihedral angle.
   * Returns projected 2D polygons for drawing. The central face stays at z=0; neighbors tilt away (negative z).
   */
  protected buildNeighborsProjected(centerPoly: Phaser.Geom.Polygon): Phaser.Geom.Polygon[] {
    const base3 = this.polygonToV3(centerPoly); // z=0
    const neighbors: Phaser.Geom.Polygon[] = [];

    for (let i = 0; i < 5; i++) {
      const edge = this.edges[i];
      const { p0, dirUnit } = this.edgeAxis3D(edge);

      // rotate whole face around this edge by 'tilt' radians
      const rotated = base3.map((v) => this.rotateAroundAxis(v, p0, dirUnit, this.tilt));

      // Project to screen
      const projected = rotated.map((v3) => this.project(v3));
      neighbors.push(new Phaser.Geom.Polygon(projected.flatMap((p) => [p.x, p.y])));
    }
    return neighbors;
  }

  /**
   * Render current face + 5 neighbors. Neighbors drawn first (behind), then central on top.
   * Keeps this.poly equal to the (unprojected) central 2D polygon for collision & movement (still z=0).
   *
   * neighborStyles: array of 5 styles (edge indices 0..4). If omitted, defaults used.
   * Edge ordering for our regularPentagon() orientation:
   *   edge 0: between vertex 0→1 (upper-right)
   *   edge 1: between vertex 1→2 (right-lower)
   *   edge 2: between vertex 2→3 (bottom)          ⟵ often your “descend” edge
   *   edge 3: between vertex 3→4 (left-lower)
   *   edge 4: between vertex 4→0 (upper-left)      ⟵ often your “ascend” edge
   */
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
  
  // Union of many rectangles → one tight bounding box
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

}
