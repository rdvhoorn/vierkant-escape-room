import Phaser from "phaser";

import {
  PlayerController,
  DEFAULT_IDLE_FRAMES,
  DEFAULT_MOVE_FRAMES,
} from "../../PlanetPlayer";

import { Hud } from "../../PlanetHud";
import { getIsDesktop } from "../../ControlsMode";
import { TwinklingStars } from "../../utils/TwinklingStars";
import { PUZZLE_REWARDS, PuzzleKey } from "./_FaceConfig";
import { DialogManager, DialogLine } from "../../ui/DialogManager";

export type Edge = { a: Phaser.Math.Vector2; b: Phaser.Math.Vector2 };

// Type aliases are TYPES only; do not construct them at runtime.
type V2 = Phaser.Math.Vector2;
type V3 = Phaser.Math.Vector3;
type WithBounds = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.GetBounds;


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
  target: string;
  gfx: Phaser.GameObjects.Graphics;
  width: number;
  height: number;
  edge: Edge;              // real segment (a->b)
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

  // ---- SPAWN DATA (from scene transitions) ----
  protected incomingSpawnX?: number;
  protected incomingSpawnY?: number;
  protected cameFromScene?: string;

  // ---- ENERGY (shared across faces) ----
  private static readonly ENERGY_KEY = "energy";
  protected maxEnergy = 100;

  // ---- CAMERA & 3D preview fields ----
  private camZ = 2200; // camera position on +Z
  private tilt = -DIHEDRAL; // rotate neighbors away from viewer (negative z)

  // drawing caches
  private gMain!: Phaser.GameObjects.Graphics;      // central face
  private gNeighbors!: Phaser.GameObjects.Graphics; // neighbors ring (behind)
  protected faceLayers?: FaceLayers;
  protected twinklingStars?: TwinklingStars;
  protected travelEdgeZones: TravelEdgeZone[] = [];
  protected activeTravelEdge: string | null = null;
  // @ts-ignore - reserved for stripe pattern feature
  private faceStripeOverlay?: Phaser.GameObjects.TileSprite;
  // @ts-ignore - reserved for stripe pattern feature
  private faceStripeMaskGfx?: Phaser.GameObjects.Graphics;

  // ---- Debug hitbox visualization ----
  private hitboxDebugGfx?: Phaser.GameObjects.Graphics;

  // ---- Interaction highlights ----
  private interactableHighlights: {
    getCenter: () => Phaser.Math.Vector2;
    radius: number;
    highlight: Phaser.GameObjects.Graphics;
  }[] = [];

  // ---- Shared dialog system ----
  protected dialogManager?: DialogManager;

  // ------------------------------------
  // Lifecycle
  // ------------------------------------

  /**
   * Capture spawn data from scene transitions.
   * Subclasses can override this but should call super.init(data).
   */
  init(data?: { spawnX?: number; spawnY?: number; cameFromScene?: string; [key: string]: any }) {
    this.incomingSpawnX = data?.spawnX;
    this.incomingSpawnY = data?.spawnY;
    this.cameFromScene = data?.cameFromScene;
  }

  // ------------------------------------
  // ENERGY helpers
  // ------------------------------------
  /**
   * Ensure energy exists in the registry.
   * Call this in your face `create()` if you want this scene to use energy.
   */
  protected getEnergy(): number {
    let value = this.registry.get(FaceBase.ENERGY_KEY);
    if (typeof value !== "number") {
      value = 0;
      this.registry.set(FaceBase.ENERGY_KEY, value);
    }
    return value;
  }

  protected setEnergy(value: number) {
    // Allow values > maxEnergy (number can exceed 100, but bar fill is capped visually)
    const clamped = Math.max(0, value);
    this.registry.set(FaceBase.ENERGY_KEY, clamped);
    this.events.emit("energyChanged", clamped);
  }

  protected addEnergy(delta: number) {
    this.setEnergy(this.getEnergy() + delta);
  }

  protected addPuzzleRewardIfNotObtained(
    puzzleKey: PuzzleKey
  ) {
    const rewardInfo = PUZZLE_REWARDS[puzzleKey];
    if (!rewardInfo) return;
    const obtainedKey = rewardInfo.rewardObtainedRegistryKey;
    if (!this.registry.get(obtainedKey)) {
      this.registry.set(obtainedKey, true);
      // Don't add energy immediately - the animation will do it gradually
      this.playEnergyRewardAnimation(rewardInfo.rewardEnergy);
    }
  }

  private playEnergyRewardAnimation(amount: number) {
    // Get player screen position (center of screen since camera follows player)
    const playerScreenX = this.scale.width / 2;
    const playerScreenY = this.scale.height / 2;

    // Energy bar position (left edge of bar)
    const barX = this.scale.width - 180 - 16; // bar width + margin
    const barY = 35 + 22; // bar top + half height

    // Create floating text at player position
    const text = this.add.text(playerScreenX, playerScreenY - 50, `+${amount}`, {
      fontFamily: "sans-serif",
      fontSize: "28px",
      color: "#00ff00",
      stroke: "#003300",
      strokeThickness: 4,
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    // Fly towards energy bar
    this.tweens.add({
      targets: text,
      x: barX + 30,
      y: barY,
      scale: 0.7,
      duration: 1600,
      ease: "Power2",
      onComplete: () => {
        text.destroy();
        // Start counting up the energy
        this.countUpEnergy(amount);
      },
    });
  }

  private countUpEnergy(amount: number) {
    let added = 0;
    const interval = Math.max(30, 500 / amount); // Faster for larger amounts, min 30ms

    const timer = this.time.addEvent({
      delay: interval,
      callback: () => {
        added++;
        this.addEnergy(1);
        if (added >= amount) {
          timer.destroy();
        }
      },
      repeat: amount - 1,
    });
  }

  // Debug method to test the reward animation from debug menu
  public debugTestRewardAnimation(amount: number) {
    this.playEnergyRewardAnimation(amount);
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
      getPlayer: () => {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        return body.center;
      },
      isDesktop,
      onEscape: () => this.scene.start("TitleScene"),
      // Energy hooks for HUD (optional in subclasses)
      getEnergy: () => this.getEnergy(),
      maxEnergy: this.maxEnergy,
    });

    // Initialize dialog manager for face scenes (bottom position)
    this.dialogManager = new DialogManager(this, {
      position: "bottom",
      showOverlay: false,
      ownKeyboardInput: false,
      speakerStyles: {
        Jij: "#4bff72ff",
        Quadratus: "#ffb74cff",
      },
    });

    this.setCameraToPlayerBounds();

    this.events.on("update", () => {
      this.hud.update();
    });

    // Clean up HUD and DialogManager when scene shuts down
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.hud?.destroy();
      this.dialogManager?.destroy();
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

  // Only used in face1scene??
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
      const a = style?.alpha ?? 1;
      this.drawPolygon(this.gNeighbors, n, f, a, s);
    }

    // central face last
    this.drawPolygon(this.gMain, poly2D, mainFill, 1, 0x66a3ff);

    // compute world bounds from central + neighbors
    const allPolys = [poly2D, ...neighbors];
    const rects = allPolys.map((p) => this.getPolyBounds(p));
    this.worldBounds = this.unionRects(rects);
  }

  protected getPolyBounds(poly: Phaser.Geom.Polygon): Phaser.Geom.Rectangle {
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

  // ------------------------------------
  // Dialog helpers (shared across faces)
  // ------------------------------------

    /**
   * Convenience: attach a dialog sequence to an object.
   *
   * - E/tap near object = starts dialog if not active
   * - E/tap during dialog = advances dialog
   */
    /**
   * Convenience: attach a dialog sequence to an object.
   *
   * - E/tap near object = starts dialog if not active
   * - E/tap during dialog = advances dialog
   *
   * Returns a small handle so you can start the dialog from code
   * (e.g. after coming back from a puzzle).
   */
  protected createDialogInteraction(
    target: WithBounds,
    config: {
      hitRadius?: number;
      hintText?: string;
      paddingX?: number;
      paddingY?: number;
      buildLines: () => DialogLine[];      // called each time you start talking
      onComplete?: () => void;         // called after dialog finishes
    }
  ): { start: () => void } {
    const start = () => {
      if (this.isDialogActive()) return; // already in a dialog, ignore
      const lines = config.buildLines();
      this.startDialog(lines, config.onComplete);
    };

    this.makeObjectInteractable(target, {
      hitRadius: config.hitRadius,
      hintText: config.hintText,
      paddingX: config.paddingX,
      paddingY: config.paddingY,
      onUse: () => {
        if (this.isDialogActive()) {
          this.advanceDialog();
        } else {
          start();
        }
      },
    });

    return { start };
  }


    /**
   * Make a game object interactable:
   * - draws a highlight around it
   * - registers a proximity-based HUD interaction
   */
  protected makeObjectInteractable(
    target: WithBounds,
    config: {
      hitRadius?: number;
      hintText?: string;
      paddingX?: number;
      paddingY?: number;
      onUse: () => void;
    }
  ) {
    const layers = this.getFaceLayers(); // ensures initStandardFace() was called

    const bounds = target.getBounds();
    const padX = config.paddingX ?? 15;
    const padY = config.paddingY ?? 15;

    // Highlight graphics
    const highlight = this.add.graphics().setDepth(51).setVisible(false);
    highlight.lineStyle(2, 0xffffff, 0.6);
    highlight.strokeRoundedRect(
      bounds.x - padX,
      bounds.y - padY,
      bounds.width + padX * 2,
      bounds.height + padY * 2,
      6
    );
    highlight.setAlpha(0.8);

    layers.fx.add(highlight);

    const getCenter = () => {
      const b = target.getBounds();
      return new Phaser.Math.Vector2(b.centerX, b.centerY);
    };

    const hitRadius =
      config.hitRadius ??
      Math.max(bounds.width, bounds.height) * 0.75;

    // Track highlight so baseFaceUpdate can toggle visibility
    this.interactableHighlights.push({
      getCenter,
      radius: hitRadius,
      highlight,
    });

    // HUD interaction
    this.registerInteraction(
      (player) => {
        const c = getCenter();
        const dist = Phaser.Math.Distance.Between(
          player.x,
          player.y,
          c.x,
          c.y
        );
        return dist < hitRadius;
      },
      config.onUse,
      { hintText: config.hintText }
    );
  }


  protected isDialogActive(): boolean {
    return this.dialogManager?.isActive() ?? false;
  }

  protected startDialog(lines: DialogLine[], onComplete?: () => void) {
    if (!lines.length) return;

    this.playerController.setInputEnabled(false);
    this.dialogManager?.show(lines, () => {
      this.playerController.setInputEnabled(true);
      onComplete?.();
    });
  }

  protected advanceDialog() {
    this.dialogManager?.advance();
  }

  protected endDialog() {
    this.dialogManager?.close();
    this.playerController.setInputEnabled(true);
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

  /** Create edge-trigger zones (visual only, no interaction yet). */
  protected createEdgeZones(
    faceTravelTargets: (string | null)[],
    EDGE_TRIGGER_SCALE: number = 0.4
  ) {
    if (!this.faceLayers) {
      throw new Error("createEdgeZones() requires faceLayers.");
    }

    const edges = this.getEdgesWithMeta();
    this.travelEdgeZones = [];

    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const target = faceTravelTargets[i];
      if (!target) continue;

      const hitWidth = e.length * EDGE_TRIGGER_SCALE;
      const hitHeight = 40 * EDGE_TRIGGER_SCALE;

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

      // DEV: Add label showing target scene name
      const center = this.getPolygonCenter(this.poly);
      const dx = e.mid.x - center.x;
      const dy = e.mid.y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const pushDistance = 25;
      const labelX = e.mid.x + (dx / dist) * pushDistance;
      const labelY = e.mid.y + (dy / dist) * pushDistance;

      const labelText = target.replace("Scene", "");

      const label = this.add.text(labelX, labelY, labelText, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#00ff00",
        backgroundColor: "#000000",
        padding: { x: 4, y: 2 }
      })
      .setOrigin(0.5)
      .setDepth(61);
      this.faceLayers.ui.add(label);

      const edge: Edge = { a: e.start, b: e.end };

      this.travelEdgeZones.push({
        target,
        gfx,
        width: hitWidth,
        height: hitHeight,
        edge,
      });
    }
  }

  /** Register edge travel interaction (call AFTER createPlayerAt). */
  protected registerEdgeTravelInteraction() {
    const isDesktop = getIsDesktop(this);
    const edgeHint = isDesktop ? "E / spatie: Ga naar buurvlak" : "I: Ga naar buurvlak";

    this.registerInteraction(
      () => this.activeTravelEdge !== null,
      () => {
        if (this.activeTravelEdge) {
          // Pass which scene we came FROM, so the target can spawn near the correct edge
          this.scene.start(this.activeTravelEdge, {
            cameFromScene: this.scene.key
          });
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
      return { fill: color, stroke: 0x4b7ad1, alpha: 1 };
    });

    this.renderFaceAndNeighbors({
      cx: width / 2,
      cy: height / 2,
      radius: config.radius,
      fill: mainFill,
      neighborFill,
      neighborStyles,
    });

    // Create edge zones first (without interaction) to determine spawn position
    this.createEdgeZones(config.faceTravelTargets, config.edgeTriggerScale ?? 0.4);

    // Spawn player - default to center
    let spawnX = this.incomingSpawnX ?? width / 2;
    let spawnY = this.incomingSpawnY ?? (height / 2 - 20);

    // If we came from another scene via edge travel, spawn near the edge that leads back
    if (this.cameFromScene && !this.incomingSpawnX) {
      const returnEdge = this.travelEdgeZones.find(
        (ez) => ez.target === this.cameFromScene
      );

      if (returnEdge) {
        const center = this.getPolygonCenter(this.poly);

        // Midpoint of the actual edge segment
        const edgeX = (returnEdge.edge.a.x + returnEdge.edge.b.x) / 2;
        const edgeY = (returnEdge.edge.a.y + returnEdge.edge.b.y) / 2;

        const dx = center.x - edgeX;
        const dy = center.y - edgeY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const inwardRatio = 0.15;
        spawnX = edgeX + (dx / dist) * dist * inwardRatio;
        spawnY = edgeY + (dy / dist) * dist * inwardRatio;
      }
    }


    this.createPlayerAt(spawnX, spawnY);

    // Now register edge travel interaction (requires HUD to exist)
    this.registerEdgeTravelInteraction();
  }

  /**
   * Base update for simple faces that only need:
   * - starfield ticking
   * - edge-zone highlighting + activeTravelEdge bookkeeping
   * - interactable object highlighting
   */
  protected baseFaceUpdate(delta: number) {
    this.twinklingStars?.update(delta);

    // ----- Edge travel highlighting -----
    this.activeTravelEdge = null;
    for (const ez of this.travelEdgeZones) {
      const active = this.doesPlayerOverlapEdgeTrigger(ez);

      if (active) {
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

    // ----- Interactable object highlight -----
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    for (const h of this.interactableHighlights) {
      const c = h.getCenter();
      const dist = Phaser.Math.Distance.Between(playerBody.center.x, playerBody.center.y, c.x, c.y);
      const inRange = dist < h.radius;

      // Simple on/off; you can add fancier effects later
      h.highlight.setVisible(inRange && !this.isDialogActive());
    }

    // ----- Debug hitbox visualization -----
    this.drawDebugHitboxes();
  }

  protected addDiagonalStripesInFace(options?: {
    textureKey?: string;
    tileSize?: number;
    stripeWidth?: number;
    gap?: number;
    stripeColor?: number;
    stripeAlpha?: number;
    overlayAlpha?: number;
    angleDeg?: number;
    depth?: number;
  }) {
    const {
      textureKey = "__diag_stripes",
      tileSize = 256,     // bigger tile = less chance you notice repetition
      stripeWidth = 10,
      gap = 22,
      stripeColor = 0xffffff,
      stripeAlpha = 0.12,
      overlayAlpha = 0.18,
      angleDeg = -18,
      depth = 11,
    } = options ?? {};

    // 1) Build a seamless stripe tile (angle is baked in)
    if (!this.textures.exists(textureKey)) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.clear();

      const a = Phaser.Math.DegToRad(angleDeg);
      const dir = new Phaser.Math.Vector2(Math.cos(a), Math.sin(a)); // stripe direction
      const nrm = new Phaser.Math.Vector2(-dir.y, dir.x);            // perpendicular

      g.lineStyle(stripeWidth, stripeColor, stripeAlpha);

      const c = new Phaser.Math.Vector2(tileSize / 2, tileSize / 2);
      const L = tileSize * 3; // long enough to cover tile at any angle

      // Draw stripes by sliding along the perpendicular direction (nrm).
      // This tiles cleanly because the pattern is periodic along nrm.
      for (let t = -tileSize * 2; t <= tileSize * 2; t += gap) {
        const p0 = c.clone().add(nrm.clone().scale(t)).subtract(dir.clone().scale(L));
        const p1 = c.clone().add(nrm.clone().scale(t)).add(dir.clone().scale(L));

        g.beginPath();
        g.moveTo(p0.x, p0.y);
        g.lineTo(p1.x, p1.y);
        g.strokePath();
      }

      g.generateTexture(textureKey, tileSize, tileSize);
      g.destroy();

      // Optional: if you're doing pixel-art and want crisp sampling:
      // this.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    // 2) Big tiling overlay (NOT rotated)
    const bounds = this.getPolyBounds(this.poly); // make getPolyBounds protected
    const pad = 200;

    const overlay = this.add
      .tileSprite(
        bounds.x - pad,
        bounds.y - pad,
        bounds.width + pad * 2,
        bounds.height + pad * 2,
        textureKey
      )
      .setOrigin(0, 0)
      .setAlpha(overlayAlpha)
      .setDepth(depth);

    // 3) Mask to the pentagon
    const maskGfx = this.make.graphics({ x: 0, y: 0 });
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.beginPath();
    maskGfx.moveTo(this.poly.points[0].x, this.poly.points[0].y);
    for (let i = 1; i < this.poly.points.length; i++) {
      maskGfx.lineTo(this.poly.points[i].x, this.poly.points[i].y);
    }
    maskGfx.closePath();
    maskGfx.fillPath();

    overlay.setMask(maskGfx.createGeometryMask());

    this.faceLayers?.ground.add(overlay);

    return overlay;
  }

  /**
   * Draw debug hitboxes for player and edge zones.
   * Toggle via debug menu: "Show Hitboxes"
   */
  private drawDebugHitboxes() {
    const showHitboxes = this.registry.get("debug_showHitboxes");

    if (!showHitboxes) {
      if (this.hitboxDebugGfx) {
        this.hitboxDebugGfx.destroy();
        this.hitboxDebugGfx = undefined;
      }
      return;
    }

    if (!this.hitboxDebugGfx) {
      this.hitboxDebugGfx = this.add.graphics().setDepth(9999);
    }

    const gfx = this.hitboxDebugGfx;
    gfx.clear();

    // Draw player hitbox (physics body)
    if (this.playerController) {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      gfx.lineStyle(2, 0x00ff00, 1);
      gfx.strokeRect(body.x, body.y, body.width, body.height);
    }

    // Draw edge zone hitboxes (physics zones - axis aligned)
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const p = new Phaser.Math.Vector2(body.center.x, body.center.y);

    gfx.fillStyle(0xffff00, 1);
    gfx.fillCircle(p.x, p.y, 3);

    for (const ez of this.travelEdgeZones) {
      const a = ez.edge.a;
      const b = ez.edge.b;

      const mid = new Phaser.Math.Vector2((a.x + b.x) / 2, (a.y + b.y) / 2);
      const dir = new Phaser.Math.Vector2(b.x - a.x, b.y - a.y).normalize();
      const nrm = new Phaser.Math.Vector2(-dir.y, dir.x);

      const halfW = ez.width * 0.5;
      const halfH = ez.height * 0.5;

      // corners of rotated rectangle (OBB)
      const c1 = mid.clone().add(dir.clone().scale(-halfW)).add(nrm.clone().scale(-halfH));
      const c2 = mid.clone().add(dir.clone().scale( halfW)).add(nrm.clone().scale(-halfH));
      const c3 = mid.clone().add(dir.clone().scale( halfW)).add(nrm.clone().scale( halfH));
      const c4 = mid.clone().add(dir.clone().scale(-halfW)).add(nrm.clone().scale( halfH));

      const active = this.doesPlayerOverlapEdgeTrigger(ez);

      gfx.lineStyle(2, active ? 0x00ff00 : 0xff00ff, 1);
      gfx.beginPath();
      gfx.moveTo(c1.x, c1.y);
      gfx.lineTo(c2.x, c2.y);
      gfx.lineTo(c3.x, c3.y);
      gfx.lineTo(c4.x, c4.y);
      gfx.closePath();
      gfx.strokePath();

      // also draw the edge line
      gfx.lineStyle(1, 0xffffff, 0.6);
      gfx.beginPath();
      gfx.moveTo(a.x, a.y);
      gfx.lineTo(b.x, b.y);
      gfx.strokePath();
    }
  }

  protected doesPlayerOverlapEdgeTrigger(ez: TravelEdgeZone): boolean {
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // Player AABB in world space
    const px = body.x;
    const py = body.y;
    const pw = body.width;
    const ph = body.height;

    // Edge trigger OBB basis
    const a = ez.edge.a;
    const b = ez.edge.b;

    const mid = new Phaser.Math.Vector2((a.x + b.x) / 2, (a.y + b.y) / 2);
    const dir = new Phaser.Math.Vector2(b.x - a.x, b.y - a.y).normalize(); // u axis
    const nrm = new Phaser.Math.Vector2(-dir.y, dir.x);                    // v axis

    const halfW = ez.width * 0.5;   // along edge
    const halfH = ez.height * 0.5;  // thickness

    // Convert player AABB corners into OBB local space (u,v)
    const corners = [
      new Phaser.Math.Vector2(px, py),
      new Phaser.Math.Vector2(px + pw, py),
      new Phaser.Math.Vector2(px + pw, py + ph),
      new Phaser.Math.Vector2(px, py + ph),
    ];

    let minU = Infinity, maxU = -Infinity;
    let minV = Infinity, maxV = -Infinity;

    for (const c of corners) {
      const d = c.clone().subtract(mid);
      const u = d.dot(dir);
      const v = d.dot(nrm);
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }

    // Overlap test between:
    // - player AABB projected onto (u,v)
    // - OBB local box [-halfW..halfW] x [-halfH..halfH]
    const overlapU = !(maxU < -halfW || minU > halfW);
    const overlapV = !(maxV < -halfH || minV > halfH);

    return overlapU && overlapV;
  }


}
