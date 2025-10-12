import Phaser from "phaser";
import FaceBase from "./_FaceBase";
import type { Edge } from "./_FaceBase";

export default class FaceBottomScene extends FaceBase {
  constructor() {
    super("FaceBottomScene");
  }
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private topEdge!: Edge;

  init(data: { spawnFromTop?: boolean; spawnX?: number; spawnY?: number }) {
    this.data.set("spawnFromTop", data?.spawnFromTop ?? false);
    this.data.set("spawnX", data?.spawnX ?? 0);
    this.data.set("spawnY", data?.spawnY ?? 0);
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0b1020");

    const stars = this.add.graphics();
    for (let i = 0; i < 200; i++) {
      stars.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.15, 0.8));
      stars.fillRect(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 2, 2);
    }

    // Neighbor mapping for this face
    const neighborsByEdge: (string | null)[] = [
      "FaceBottomScene",   // edge 0 (placeholder)
      "FaceBottomScene",   // edge 1 (placeholder)
      "FaceBottomScene",   // edge 2 (placeholder)
      "FaceBottomScene",   // edge 3 (placeholder)
      "FaceTopScene",      // edge 4 is the one we can travel to (back up)
    ];

    const colorMap: Record<string, number> = {
      FaceTopScene: 0x311111,        // top’s color
      FaceBottomScene: 0x133333,     // this face’s neighbor tint
    };

    const neighborStyles = neighborsByEdge.map((key) =>
      key
        ? { fill: colorMap[key], stroke: 0x4b7ad1, alpha: 0.95 }
        : undefined
    );

    this.renderFaceAndNeighbors({
      cx: width / 2,
      cy: height / 2,
      radius: 180,
      fill: 0x1a2338,            // main color for bottom face
      neighborFill: 0x0f1d38,    // default
      neighborStyles,
    });

    // Top edge (index 4) is our portal back up
    this.topEdge = this.edges[4];

    // Spawn
    const fromTop = this.data.get("spawnFromTop") as boolean;
    let spawnX = (this.data.get("spawnX") as number) || width / 2;
    let spawnY = (this.data.get("spawnY") as number) || height / 2;
    if (fromTop) {
      const mid = this.midpoint(this.topEdge);
      const center = this.getPolygonCenter(this.poly);
      const inward = center.clone().subtract(mid).normalize().scale(18);
      spawnX = mid.x + inward.x; spawnY = mid.y + inward.y;
    }
    const spawnPoint = new Phaser.Geom.Point(spawnX, spawnY);
    if (!Phaser.Geom.Polygon.ContainsPoint(this.poly, spawnPoint)) {
      const c = this.getPolygonCenter(this.poly); spawnX = c.x; spawnY = c.y;
    }

    // player & controls
    this.createPlayerAt(spawnX, spawnY);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey("W"),
      A: this.input.keyboard!.addKey("A"),
      S: this.input.keyboard!.addKey("S"),
      D: this.input.keyboard!.addKey("D"),
    };
    this.setupControls();

    // Travel back up on E near edge 4
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("TitleScene"));
    this.input.keyboard?.on("keydown-E", () => {
      if (this.isNearEdge(this.player, this.topEdge)) {
        const mid = this.midpoint(this.topEdge);
        this.scene.start("FaceTopScene", { spawnX: mid.x, spawnY: mid.y });
      }
    });
  }

  update() {
    this.updateMovement(this.cursors, this.wasd);
    if (this.isNearEdge(this.player, this.topEdge)) {
      this.portalHint.setText("Edge access: press E to ascend").setAlpha(1);
    } else {
      this.portalHint.setAlpha(0);
    }
  }

  private isNearEdge(player: Phaser.GameObjects.Image, e: Edge): boolean {
    const p = new Phaser.Math.Vector2(player.x, player.y);
    return this.distanceToEdge(p, e) < 16;
  }
  private midpoint(e: Edge) {
    return new Phaser.Math.Vector2((e.a.x + e.b.x) / 2, (e.a.y + e.b.y) / 2);
  }
}
