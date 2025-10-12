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

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0b1020");

    // stars
    const stars = this.add.graphics();
    for (let i = 0; i < 200; i++) {
      stars.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.15, 0.8));
      stars.fillRect(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 2, 2);
    }

    // ---- Define neighbor scene keys per edge (0..4) ----
    // For now we only have two real scenes; use FaceBottomScene on edge 2, and mirror FaceTopScene for others.
    const neighborsByEdge: (string | null)[] = [
      "FaceTopScene",      // edge 0 (placeholder)
      "FaceTopScene",      // edge 1 (placeholder)
      "FaceBottomScene",   // edge 2 (the one we travel to)
      "FaceTopScene",      // edge 3 (placeholder)
      "FaceTopScene",      // edge 4 (placeholder)
    ];

    // Assign a color per scene key
    const colorMap: Record<string, number> = {
      FaceTopScene: 0x311111,
      FaceBottomScene: 0x133333,
    };

    // Build neighbor styles array using the color map
    const neighborStyles = neighborsByEdge.map((key) =>
      key
        ? { fill: colorMap[key], stroke: 0x4b7ad1, alpha: 0.95 }
        : undefined
    );

    // Render with per-edge colors
    this.renderFaceAndNeighbors({
      cx: width / 2,
      cy: height / 2,
      radius: 180,
      fill: 0x15284b,            // main face color
      neighborFill: 0x0f1d38,    // default if any neighbor undefined
      neighborStyles,
    });

    // For our orientation, "bottom" edge is index 2 (between points 2-3)
    this.bottomEdge = this.edges[2];

    // player & controls
    this.createPlayerAt(width / 2, height / 2 - 20);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey("W"),
      A: this.input.keyboard!.addKey("A"),
      S: this.input.keyboard!.addKey("S"),
      D: this.input.keyboard!.addKey("D"),
    };
    this.setupControls();

    // ESC for iteration
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("TitleScene"));

    // E to move down through the shared edge
    this.input.keyboard?.on("keydown-E", () => {
      if (this.isNearEdge(this.player, this.bottomEdge)) {
        const mid = this.midpoint(this.bottomEdge);
        this.scene.start("FaceBottomScene", { spawnFromTop: true, spawnX: mid.x, spawnY: mid.y });
      }
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

  private isNearEdge(player: Phaser.GameObjects.Image, e: Edge): boolean {
    const p = new Phaser.Math.Vector2(player.x, player.y);
    return this.distanceToEdge(p, e) < 16;
  }
  private midpoint(e: Edge) {
    return new Phaser.Math.Vector2((e.a.x + e.b.x) / 2, (e.a.y + e.b.y) / 2);
  }
}
