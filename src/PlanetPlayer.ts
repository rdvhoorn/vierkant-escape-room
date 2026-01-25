// src/player.ts
import Phaser from "phaser";

export const DEFAULT_IDLE_FRAMES = ["player_normal_4", "player_normal_5"];
export const DEFAULT_MOVE_FRAMES = [
  "player_normal_1",
  "player_normal_2",
  "player_normal_3",
  "player_normal_4",
  "player_normal_5",
];

export interface PlayerInputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export interface PlayerControllerOptions {
  poly: Phaser.Geom.Polygon;               // movement bounds (your face polygon)
  spawnX: number;
  spawnY: number;
  idleFrames?: string[];
  moveFrames?: string[];
}

type V2 = Phaser.Math.Vector2;

type EdgeInfo = {
  start: V2;
  end: V2;
  dir: V2;       // normalized direction along edge
  normal: V2;    // inward-facing normal
};

export class PlayerController {
  public readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

  private readonly poly: Phaser.Geom.Polygon;
  private readonly idleFrames: string[];
  private readonly moveFrames: string[];

  private lastSafePos = new Phaser.Math.Vector2();
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private touchInput: PlayerInputState | null = null;
  private inputEnabled = true;

  // movement tuning
  private readonly accel = 900;
  private readonly moveSpeedThreshold = 20;

  constructor(
    private readonly scene: Phaser.Scene,
    opts: PlayerControllerOptions
  ) {
    this.poly = opts.poly;
    this.idleFrames = opts.idleFrames ?? DEFAULT_IDLE_FRAMES;
    this.moveFrames = opts.moveFrames ?? DEFAULT_MOVE_FRAMES;

    // 1) Ensure fallback texture exists
    this.ensureFallbackTexture();

    // 2) Clamp spawn to polygon if needed
    const spawn = this.clampSpawnToPolygon(
      new Phaser.Math.Vector2(opts.spawnX, opts.spawnY)
    );

    // 3) Create sprite + physics
    const startTexture = this.scene.textures.exists(this.idleFrames[0])
      ? this.idleFrames[0]
      : "playerBox";

    this.sprite = this.scene.physics.add
      .sprite(spawn.x, spawn.y, startTexture)
      .setOrigin(0.5, 0.8)
      .setDisplaySize(120, 120)
      .setDepth(35)
      .setCollideWorldBounds(false);

    // smaller hitbox
    this.sprite.body.setSize(24, 24);
    this.sprite.setDrag(800, 800).setMaxVelocity(240, 240);
    this.lastSafePos.copy(spawn);

    // 4) Input
    this.cursors = this.scene.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.scene.input.keyboard!.addKey("W"),
      A: this.scene.input.keyboard!.addKey("A"),
      S: this.scene.input.keyboard!.addKey("S"),
      D: this.scene.input.keyboard!.addKey("D"),
    };

    // 5) Animations
    this.ensureAnimations();
    if (this.hasAnim("player-idle")) {
      this.sprite.play("player-idle");
    }

    // 6) Visual extras (shadow)
    this.addSoftShadowBelow(this.sprite, 8, 0x000000, 0.25);
  }

  // Called each frame from the Scene
  update() {
    if (this.inputEnabled) {
      this.updateMovement();
      this.updateOrientationAndAnimation();
    }
  }

  public setTouchInput(state: PlayerInputState | null) {
    this.touchInput = state;
  }

  public setInputEnabled(enabled: boolean) {
    this.inputEnabled = enabled;

    if (!enabled) {
      this.sprite.setAcceleration(0, 0);
      this.sprite.setVelocity(0, 0);
      this.sprite.play("player-idle");
      this.sprite.anims.timeScale = 0.6;
      this.sprite.setAngle(0);
    }
  }

  // --------- internal helpers ----------
  private ensureFallbackTexture() {
    if (this.scene.textures.exists("playerBox")) return;

    const g = this.scene.add.graphics();
    g.fillStyle(0x78e3ff, 1)
      .fillRect(0, 0, 24, 24)
      .lineStyle(2, 0x134a84)
      .strokeRect(0, 0, 24, 24);

    g.generateTexture("playerBox", 24, 24);
    g.destroy();
  }

  private clampSpawnToPolygon(spawn: V2): V2 {
    const point = new Phaser.Geom.Point(spawn.x, spawn.y);
    if (Phaser.Geom.Polygon.ContainsPoint(this.poly, point)) {
      return spawn;
    }
    // fallback: polygon "center-ish"
    let sx = 0,
      sy = 0;
    for (const p of this.poly.points) {
      sx += p.x;
      sy += p.y;
    }
    const center = new Phaser.Math.Vector2(
      sx / this.poly.points.length,
      sy / this.poly.points.length
    );
    return new Phaser.Math.Vector2(center.x, center.y - 20);
  }

  private hasAnim(key: string): boolean {
    return !!this.scene.anims.exists(key);
  }

  private ensureAnimations() {
    const framesExist =
      this.idleFrames.every((k) => this.scene.textures.exists(k)) &&
      this.moveFrames.every((k) => this.scene.textures.exists(k));

    if (framesExist && !this.scene.anims.exists("player-idle")) {
      this.scene.anims.create({
        key: "player-idle",
        frames: this.idleFrames.map((key) => ({ key })),
        frameRate: 3,
        repeat: -1,
        yoyo: true,
      });
    }

    if (framesExist && !this.scene.anims.exists("player-move")) {
      this.scene.anims.create({
        key: "player-move",
        frames: this.moveFrames.map((key) => ({ key })),
        frameRate: 10,
        repeat: -1,
        yoyo: false,
      });
    }
  }

  private updateMovement() {
    let ax = 0, ay = 0;

    // 1) keyboard intent
    const kbLeft  = !!(this.cursors.left?.isDown || this.wasd["A"].isDown);
    const kbRight = !!(this.cursors.right?.isDown || this.wasd["D"].isDown);
    const kbUp    = !!(this.cursors.up?.isDown || this.wasd["W"].isDown);
    const kbDown  = !!(this.cursors.down?.isDown || this.wasd["S"].isDown);

    // 2) touch intent (if present)
    const t = this.touchInput;
    const left  = kbLeft  || !!t?.left;
    const right = kbRight || !!t?.right;
    const up    = kbUp    || !!t?.up;
    const down  = kbDown  || !!t?.down;

    if (left && !right)  ax = -this.accel;
    else if (right && !left) ax = this.accel;

    if (up && !down)     ay = -this.accel;
    else if (down && !up) ay = this.accel;

    this.sprite.setAcceleration(ax, ay);

    const pos = new Phaser.Math.Vector2(this.sprite.x, this.sprite.y);
    const point = new Phaser.Geom.Point(pos.x, pos.y);

    if (Phaser.Geom.Polygon.ContainsPoint(this.poly, point)) {
      // Inside polygon - save as safe position
      this.lastSafePos.copy(pos);
    } else {
      // Outside polygon - apply wall sliding
      const edge = this.findClosestEdge(pos);

      if (edge) {
        const velocity = new Phaser.Math.Vector2(
          this.sprite.body.velocity.x,
          this.sprite.body.velocity.y
        );

        // Project velocity onto edge direction (tangent) for sliding
        const slideSpeed = velocity.dot(edge.dir);
        const slideVel = edge.dir.clone().scale(slideSpeed);

        // Apply the slide velocity
        this.sprite.setVelocity(slideVel.x, slideVel.y);

        // Place player at closest point on edge, pushed slightly inward
        // This is smoother than going back to lastSafePos
        const pushDist = 1;
        this.sprite.x = edge.closestPoint.x + edge.normal.x * pushDist;
        this.sprite.y = edge.closestPoint.y + edge.normal.y * pushDist;

        // Update lastSafePos to the new position
        this.lastSafePos.set(this.sprite.x, this.sprite.y);
      } else {
        // Fallback: no edge found, use old behavior
        this.sprite.setVelocity(0, 0);
        this.sprite.x = this.lastSafePos.x;
        this.sprite.y = this.lastSafePos.y;
      }
    }
  }

  private updateOrientationAndAnimation() {
    const spr = this.sprite as Phaser.Physics.Arcade.Sprite;

    const left = !!(
      this.cursors.left?.isDown || this.wasd.A.isDown
    );
    const right = !!(
      this.cursors.right?.isDown || this.wasd.D.isDown
    );
    const up = !!(this.cursors.up?.isDown || this.wasd.W.isDown);
    const down = !!(
      this.cursors.down?.isDown || this.wasd.S.isDown
    );

    spr.setFlipX(left && !right);

    const ANGLE_LEFT = -10;
    const ANGLE_RIGHT = 10;
    if (left || up) spr.setAngle(ANGLE_LEFT);
    else if (right || down) spr.setAngle(ANGLE_RIGHT);
    else spr.setAngle(0);

    const body = spr.body as Phaser.Physics.Arcade.Body;
    const speed = body.velocity.length();
    const want = speed > this.moveSpeedThreshold ? "player-move" : "player-idle";

    if (this.hasAnim(want) && spr.anims.currentAnim?.key !== want) {
      spr.play(want);
    }

    const t = Phaser.Math.Clamp(speed / 120, 0.6, 1.6);
    spr.anims.timeScale = t;
  }

  private addSoftShadowBelow(
    obj: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
    radius: number,
    color: number,
    alpha: number
  ) {
    const g = this.scene.add.graphics();
    const b = 1; // pseudo-blur

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

    // keep it following the sprite
    this.scene.events.on("update", () => {
      g.setPosition(obj.x, obj.y + (obj.displayHeight ?? 0) * 0.35);
      g.setDepth((obj.depth ?? 0) - 1);
    });
  }

  private getPolygonCenter(): V2 {
    let sx = 0, sy = 0;
    for (const p of this.poly.points) {
      sx += p.x;
      sy += p.y;
    }
    return new Phaser.Math.Vector2(
      sx / this.poly.points.length,
      sy / this.poly.points.length
    );
  }

  /**
   * Find the closest edge to a point and return edge info with:
   * - inward-facing normal
   * - the closest point on that edge
   * - the edge index (for travel triggers)
   */
  private findClosestEdge(pos: V2): (EdgeInfo & { closestPoint: V2; edgeIndex: number }) | null {
    const pts = this.poly.points;
    if (pts.length < 3) return null;

    const center = this.getPolygonCenter();
    let closestEdge: (EdgeInfo & { closestPoint: V2; edgeIndex: number }) | null = null;
    let closestDist = Infinity;

    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];

      const start = new Phaser.Math.Vector2(p1.x, p1.y);
      const end = new Phaser.Math.Vector2(p2.x, p2.y);
      const edgeVec = end.clone().subtract(start);
      const edgeLen = edgeVec.length();
      if (edgeLen === 0) continue;

      const dir = edgeVec.clone().normalize();

      // Project pos onto edge line to find closest point
      const toPos = pos.clone().subtract(start);
      const t = Phaser.Math.Clamp(toPos.dot(dir) / edgeLen, 0, 1);
      const closestPoint = start.clone().add(dir.clone().scale(t * edgeLen));
      const dist = pos.distance(closestPoint);

      if (dist < closestDist) {
        closestDist = dist;

        // Calculate normal (perpendicular to edge)
        // We want the inward-facing normal
        let normal = new Phaser.Math.Vector2(-dir.y, dir.x);

        // Check if normal points toward center (inward)
        const edgeMid = start.clone().add(end).scale(0.5);
        const toCenter = center.clone().subtract(edgeMid);
        if (toCenter.dot(normal) < 0) {
          normal.negate();
        }

        closestEdge = { start, end, dir, normal, closestPoint, edgeIndex: i };
      }
    }

    return closestEdge;
  }
}
