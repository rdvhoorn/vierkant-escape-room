import Phaser from "phaser";

import {
  PlayerController,
  DEFAULT_IDLE_FRAMES,
  DEFAULT_MOVE_FRAMES,
} from "../../PlanetPlayer";

import { Hud } from "../../PlanetHud";
import { getIsDesktop } from "../../ControlsMode";
import { TwinklingStars } from "../../utils/TwinklingStars";

export type Edge = { a: Phaser.Math.Vector2; b: Phaser.Math.Vector2 };

// Type aliases are TYPES only; do not construct them at runtime.
type V2 = Phaser.Math.Vector2;
type V3 = Phaser.Math.Vector3;

const RAD = Math.PI / 180;
// Regular dodecahedron dihedral angle ~= 116.565051°
const DIHEDRAL = 116.565051 * RAD;

// ---------- New helper types for “standard faces” ----------
type FaceLayers = {
  bg: Phaser.GameObjects.Container;
  ground: Phaser.GameObjects.Container;
  deco: Phaser.GameObjects.Container;
  actors: Phaser.GameObjects.Container;
  fx: Phaser.GameObjects.Container;
  ui: Phaser.GameObjects.Container;
};

type EdgeMeta = {
  start: Phaser.Math.Vector2;
  end: Phaser.Math.Vector2;
  mid: Phaser.Math.Vector2;
  length: number;
};

type TravelEdgeZone = {
  zone: Phaser.GameObjects.Zone;
  target: string;
  gfx: Phaser.GameObjects.Graphics;
  width: number;
  height: number;
};

type StandardFaceConfig = {
  radius: number;
  faceTravelTargets: (string | null)[]; // for the 5 edges, null = no travel

  mainFill?: number;
  neighborFill?: number;
  colorMap?: Record<string, number>;

  edgeTriggerScale?: number;
  backgroundColor?: string;
  showLabel?: boolean;
};

export default abstract class FaceBase extends Phaser.Scene {
  protected world!: Phaser.GameObjects.Container;
  private worldBounds!: Phaser.Geom.Rectangle;

  protected playerController!: PlayerController;
  protected hud!: Hud;

  // Gameplay geometry
  protected poly!: Phaser.Geom.Polygon;
  protected edges: Edge[] = [];

  // ---- ENERGY (shared across faces) ----
  private static readonly ENERGY_KEY = "energy";
  protected maxEnergy = 100;

  // ---- CAMERA & 3D preview fields ----
  private camZ = 1800; // camera position on +Z
  private tilt = -DIHEDRAL; // rotate neighbors away from viewer (negative z)

  // drawing caches
  private gMain!: Phaser.GameObjects.Graphics;      // central face
  private gNeighbors!: Phaser.GameObjects.Graphics; // neighbors ring (behind)

  // ---------- New shared-but-optional helpers ----------
  protected faceLayers?: FaceLayers;
  protected twinklingStars?: TwinklingStars;
  protected travelEdgeZones: TravelEdgeZone[] = [];
  protected activeTravelEdge: string | null = null;

  // ------------------------------------
  // ENERGY helpers
  // ------------------------------------
  /**
   * Ensure energy exists in the registry.
   * Call this in your face `create()` if you want this scene to use energy.
   */
  protected ensureEnergyInitialized(initial: number = 0) {
    const existing = this.registry.get(FaceBase.ENERGY_KEY);
    if (typeof existing !== "number") {
      const clamped = Phaser.Math.Clamp(initial, 0, this.maxEnergy);
      this.registry.set(FaceBase.ENERGY_KEY, clamped);
      this.events.emit("energyChanged", clamped);
    } else {
      // Emit event so HUD can sync to current value when entering this scene
      this.events.emit("energyChanged", this.getEnergy());
    }
  }

  protected getEnergy(): number {
    let value = this.registry.get(FaceBase.ENERGY_KEY);
    if (typeof value !== "number") {
      value = 0;
      this.registry.set(FaceBase.ENERGY_KEY, value);
    }
    return value;
  }

  protected setEnergy(value: number) {
    const clamped = Phaser.Math.Clamp(value, 0, this.maxEnergy);
    this.registry.set(FaceBase.ENERGY_KEY, clamped);
    this.events.emit("energyChanged", clamped);
  }

  protected addEnergy(delta: number) {
    this.setEnergy(this.getEnergy() + delta);
  }

  // ---------------------------
  // Scene lifecycle helpers
  // ---------------------------
  protected createWorldLayer() {
    if (this.world) this.world.destroy();
    this.world = this.add.container(0, 0);
  }

  protected get player(): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
    if (!this.playerController) {
      throw new Error("Player accessed before PlayerController was created.");
    }
    return this.playerController.sprite;
  }

  protected setCameraToPlayerBounds() {
    // IMPORTANT: guard on playerController, not this.player getter
    if (!this.worldBounds || !this.playerController) return;

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
  // Player: creation & controls
  // ---------------------------
  protected createPlayerAt(x: number, y: number) {
    if (!this.poly) {
      throw new Error(
        "createPlayerAt() called before renderFaceAndNeighbors(). 'poly' is not set."
      );
    }

    this.playerController = new PlayerController(this, {
      poly: this.poly,
      spawnX: x,
      spawnY: y,
      idleFrames: DEFAULT_IDLE_FRAMES,
      moveFrames: DEFAULT_MOVE_FRAMES,
    });

    const isDesktop = getIsDesktop(this);

    this.hud = new Hud(this, this.playerController, {
      getPlayer: () => this.player,
      isDesktop,
      onEscape: () => this.scene.start("TitleScene"),
      // Energy hooks for HUD (optional in subclasses)
      getEnergy: () => this.getEnergy(),
      maxEnergy: this.maxEnergy,
    });

    this.setCameraToPlayerBounds();

    this.events.on("update", () => {
      this.hud.update();
    });
  }

  protected registerInteraction(
    isInRange: (player: { x: number; y: number }) => boolean,
    onUse: () => void,
    options?: { hintText?: string }
  ) {
    if (!this.hud) {
      throw new Error("HUD not created yet, call createPlayerAt() first.");
    }
    this.hud.registerInteraction({
      isInRange,
      onUse,
      hintText: options?.hintText,
    });
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

  protected isNearEdge(player: { x: number; y: number }, e: Edge): boolean {
    const p = new Phaser.Math.Vector2(player.x, player.y);
    return this.distanceToEdge(p, e) < 16;
  }

  protected getPolygonCenter(poly: Phaser.Geom.Polygon): V2 {
    let sx = 0,
      sy = 0;
    for (const p of poly.points) {
      sx += p.x;
      sy += p.y;
    }
    return new Phaser.Math.Vector2(
      sx / poly.points.length,
      sy / poly.points.length
    );
  }

  protected regularPentagon(
    cx: number,
    cy: number,
    radius: number
  ): Phaser.Geom.Polygon {
    const pts: V2[] = [];
    for (let i = 0; i < 5; i++) {
      const deg = -90 + i * 72;
      const rad = deg * RAD;
      pts.push(
        new Phaser.Math.Vector2(
          cx + Math.cos(rad) * radius,
          cy + Math.sin(rad) * radius
        )
      );
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
    for (let i = 1; i < poly.points.length; i++)
      g.lineTo(poly.points[i].x, poly.points[i].y);
    g.closePath();
    g.fillPath();
    if (stroke !== undefined) {
      g.lineStyle(3, stroke, 1);
      g.strokePath();
    }
  }

  // ---------------------------
  // 3D preview core
  // ---------------------------
  private v2to3(p: V2): V3 {
    return new Phaser.Math.Vector3(p.x, p.y, 0);
  }

  private v3(x: number, y: number, z: number): V3 {
    return new Phaser.Math.Vector3(x, y, z);
  }

  private rotateAroundAxis(
    point: V3,
    axisPoint: V3,
    axisDirUnit: V3,
    angleRad: number
  ): V3 {
    const v = point.clone().subtract(axisPoint);
    const u = axisDirUnit;
    const cos = Math.cos(angleRad),
      sin = Math.sin(angleRad);
    const term1 = v.clone().scale(cos);
    const term2 = u.clone().cross(v).scale(sin);
    const term3 = u.clone().scale(u.dot(v) * (1 - cos));
    return axisPoint.clone().add(term1).add(term2).add(term3);
  }

  private project(v: V3): V2 {
    const denom = this.camZ - v.z;
    const k = this.camZ / denom;
    return new Phaser.Math.Vector2(v.x * k, v.y * k);
  }

  private polygonToV3(poly: Phaser.Geom.Polygon): V3[] {
    return poly.points.map((p) =>
      this.v2to3(new Phaser.Math.Vector2(p.x, p.y))
    );
  }

  private edgeAxis3D(edge: Edge): { p0: V3; dirUnit: V3 } {
    const p0 = this.v3(edge.a.x, edge.a.y, 0);
    const p1 = this.v3(edge.b.x, edge.b.y, 0);
    const dir = p1.clone().subtract(p0);
    return { p0, dirUnit: dir.normalize() };
  }

  protected buildNeighborsProjected(
    centerPoly: Phaser.Geom.Polygon
  ): Phaser.Geom.Polygon[] {
    const base3 = this.polygonToV3(centerPoly); // z=0
    const neighbors: Phaser.Geom.Polygon[] = [];

    for (let i = 0; i < 5; i++) {
      const edge = this.edges[i];
      const { p0, dirUnit } = this.edgeAxis3D(edge);
      const rotated = base3.map((v) =>
        this.rotateAroundAxis(v, p0, dirUnit, this.tilt)
      );
      const projected = rotated.map((v3) => this.project(v3));
      neighbors.push(
        new Phaser.Geom.Polygon(projected.flatMap((p) => [p.x, p.y]))
      );
    }
    return neighbors;
  }

  protected renderFaceAndNeighbors(center: {
    cx: number;
    cy: number;
    radius: number;
    fill?: number;
    neighborFill?: number;
    neighborStyles?: Array<
      { fill?: number; stroke?: number; alpha?: number } | undefined
    >;
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
    const rects = allPolys.map((p) => this.getPolyBounds(p));
    this.worldBounds = this.unionRects(rects);
  }

  private getPolyBounds(poly: Phaser.Geom.Polygon): Phaser.Geom.Rectangle {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of poly.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return new Phaser.Geom.Rectangle(
      minX,
      minY,
      maxX - minX,
      maxY - minY
    );
  }

  private unionRects(rects: Phaser.Geom.Rectangle[]): Phaser.Geom.Rectangle {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const r of rects) {
      if (r.x < minX) minX = r.x;
      if (r.y < minY) minY = r.y;
      const rx2 = r.x + r.width;
      const ry2 = r.y + r.height;
      if (rx2 > maxX) maxX = rx2;
      if (ry2 > maxY) maxY = ry2;
    }
    return new Phaser.Geom.Rectangle(
      minX,
      minY,
      maxX - minX,
      maxY - minY
    );
  }

  // ---------------------------
  // Visual util
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
      g.fillStyle(color, (alpha * 0.5) / (i + 1));
      g.fillEllipse(
        0,
        0,
        (radius + i * b) * 2,
        (radius * 0.6 + i * b) * 2
      );
    }
    g.setPosition(obj.x, obj.y + (obj.displayHeight ?? 0) * 0.35);
    g.setDepth((obj.depth ?? 0) - 1);

    // Keep shadow following the object
    this.events.on("update", () => {
      g.setPosition(obj.x, obj.y + (obj.displayHeight ?? 0) * 0.35);
      g.setDepth((obj.depth ?? 0) - 1);
    });
  }

  /** Create standard bg/ground/deco/actors/fx/ui layer containers. */
  protected createStandardLayers(): FaceLayers {
    return {
      bg: this.add.container(0, 0).setDepth(0),
      ground: this.add.container(0, 0).setDepth(10),
      deco: this.add.container(0, 0).setDepth(20),
      actors: this.add.container(0, 0).setDepth(30),
      fx: this.add.container(0, 0).setDepth(40),
      ui: this.add.container(0, 0).setDepth(1000),
    };
  }

  /** Convenience accessor if you want to add stuff to layers in subclasses. */
  protected getFaceLayers(): FaceLayers {
    if (!this.faceLayers) {
      throw new Error("getFaceLayers() called before initStandardFace().");
    }
    return this.faceLayers;
  }

  /** Adds TwinklingStars + static dots to bg layer (if faceLayers exists). */
  protected createSpaceBackground(width: number, height: number) {
    if (!this.faceLayers) return;

    this.twinklingStars = new TwinklingStars(this, 220, width, height);
    this.faceLayers.bg.add(this.twinklingStars.graphics);

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
    this.faceLayers.bg.add(stars);
  }

  /** Edge metadata incl. midpoints + lengths (used by edge-trigger system). */
  protected getEdgesWithMeta(): EdgeMeta[] {
    const pts = this.poly.points as Phaser.Geom.Point[];
    const edges: EdgeMeta[] = [];
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const start = new Phaser.Math.Vector2(p1.x, p1.y);
      const end = new Phaser.Math.Vector2(p2.x, p2.y);
      const mid = new Phaser.Math.Vector2(
        (start.x + end.x) / 2,
        (start.y + end.y) / 2
      );
      const length = Phaser.Math.Distance.Between(
        start.x,
        start.y,
        end.x,
        end.y
      );
      edges.push({ start, end, mid, length });
    }
    return edges;
  }

  /** Create edge-trigger zones & register "travel" interaction. */
  protected setupEdgeTravel(
    faceTravelTargets: (string | null)[],
    EDGE_TRIGGER_SCALE: number = 0.4
  ) {
    if (!this.faceLayers) {
      throw new Error("setupEdgeTravel() requires faceLayers (call initStandardFace()).");
    }

    const edges = this.getEdgesWithMeta();
    this.travelEdgeZones = [];

    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const target = faceTravelTargets[i];
      if (!target) continue;

      const hitWidth = e.length * EDGE_TRIGGER_SCALE;
      const hitHeight = 40 * EDGE_TRIGGER_SCALE;

      const zone = this.add
        .zone(e.mid.x, e.mid.y, hitWidth, hitHeight)
        .setOrigin(0.5);
      this.physics.add.existing(zone, true);

      const gfx = this.add.graphics().setDepth(60);
      gfx.fillStyle(0x4b7ad1, 0.16);
      gfx.lineStyle(2, 0x4b7ad1, 0.9);
      const corner = Math.max(6, Math.round(hitHeight / 2));
      gfx.fillRoundedRect(-hitWidth / 2, -hitHeight / 2, hitWidth, hitHeight, corner);
      gfx.strokeRoundedRect(
        -hitWidth / 2,
        -hitHeight / 2,
        hitWidth,
        hitHeight,
        corner
      );
      gfx.setPosition(e.mid.x, e.mid.y);
      gfx.setRotation(
        Phaser.Math.Angle.Between(e.start.x, e.start.y, e.end.x, e.end.y)
      );

      this.faceLayers.fx.add(gfx);

      this.travelEdgeZones.push({
        zone,
        target,
        gfx,
        width: hitWidth,
        height: hitHeight,
      });
    }

    const isDesktop = getIsDesktop(this);
    const edgeHint = "Ga naar volgende vlak: " + (isDesktop ? "E" : "I");

    this.registerInteraction(
      () => this.activeTravelEdge !== null,
      () => {
        if (this.activeTravelEdge) {
          console.log(`[TRANSITION] ${this.scene.key} → ${this.activeTravelEdge}`);
          this.scene.start(this.activeTravelEdge);
        }
      },
      { hintText: edgeHint }
    );
  }

  /**
   * One-shot setup for a “standard” planet face:
   * - sets background color
   * - creates layers
   * - starfield
   * - render central + neighbor pentagons
   * - spawns player
   * - builds edge travel zones + interaction
   */
  protected initStandardFace(config: StandardFaceConfig) {
    const { width, height } = this.scale;

    const bgColor = config.backgroundColor ?? "#0b1020";
    this.cameras.main.setBackgroundColor(bgColor);

    if (config.showLabel) {
      this.add
        .text(width / 2, 20, this.scene.key, {
          fontFamily: "Arial",
          fontSize: "28px",
          color: "#ffffff",
        })
        .setOrigin(0.5, 0)
        .setDepth(2000);
    }

    // Layers + background
    this.faceLayers = this.createStandardLayers();
    this.createSpaceBackground(width, height);

    // Face geometry
    const mainFill = config.mainFill ?? 0x311111;
    const neighborFill = config.neighborFill ?? mainFill;

    const neighborStyles = config.faceTravelTargets.map((key) => {
      if (!key) return undefined;
      const color =
        config.colorMap && config.colorMap[key] !== undefined
          ? config.colorMap[key]!
          : neighborFill;
      return { fill: color, stroke: 0x4b7ad1, alpha: 0.95 };
    });

    this.renderFaceAndNeighbors({
      cx: width / 2,
      cy: height / 2,
      radius: config.radius,
      fill: mainFill,
      neighborFill,
      neighborStyles,
    });

    // Spawn player
    const spawnX = (this.data.get("spawnX") as number) ?? width / 2;
    const spawnY = (this.data.get("spawnY") as number) ?? height / 2 - 20;
    this.createPlayerAt(spawnX, spawnY);

    // Edge travel
    this.setupEdgeTravel(
      config.faceTravelTargets,
      config.edgeTriggerScale ?? 0.4
    );
  }

  /**
   * Base update for simple faces that only need:
   * - starfield ticking
   * - edge-zone highlighting + activeTravelEdge bookkeeping
   */
  protected baseFaceUpdate(delta: number) {
    this.twinklingStars?.update(delta);

    this.activeTravelEdge = null;
    for (const ez of this.travelEdgeZones) {
      if (this.physics.world.overlap(this.player, ez.zone)) {
        this.activeTravelEdge = ez.target;
        ez.gfx.clear();
        ez.gfx.fillStyle(0x4b7ad1, 0.26);
        ez.gfx.lineStyle(2, 0x4b7ad1, 1.0);
        const corner = Math.max(6, Math.round(ez.height / 2));
        ez.gfx.fillRoundedRect(
          -ez.width / 2,
          -ez.height / 2,
          ez.width,
          ez.height,
          corner
        );
        ez.gfx.strokeRoundedRect(
          -ez.width / 2,
          -ez.height / 2,
          ez.width,
          ez.height,
          corner
        );
      } else {
        ez.gfx.clear();
        ez.gfx.fillStyle(0x4b7ad1, 0.16);
        ez.gfx.lineStyle(2, 0x4b7ad1, 0.9);
        const corner = Math.max(6, Math.round(ez.height / 2));
        ez.gfx.fillRoundedRect(
          -ez.width / 2,
          -ez.height / 2,
          ez.width,
          ez.height,
          corner
        );
        ez.gfx.strokeRoundedRect(
          -ez.width / 2,
          -ez.height / 2,
          ez.width,
          ez.height,
          corner
        );
      }
    }
  }
}
