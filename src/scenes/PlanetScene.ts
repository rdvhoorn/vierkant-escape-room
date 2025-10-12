import Phaser from "phaser";

type DistrictNode = {
  id: number;
  x: number;
  y: number;
  circle: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
};

export default class PlanetScene extends Phaser.Scene {
  private rover!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; };
  private nodes: DistrictNode[] = [];

  constructor() {
    super("PlanetScene");
  }

  create() {
    const vw = this.scale.width;
    const vh = this.scale.height;

    // World size (bigger than view)
    const WORLD_W = 2000;
    const WORLD_H = 1400;
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // Background
    const bg = this.add.rectangle(0, 0, WORLD_W, WORLD_H, 0x0b1020).setOrigin(0);
    const stars = this.add.graphics();
    stars.fillStyle(0xffffff, 1);
    for (let i = 0; i < 600; i++) {
      const x = Phaser.Math.Between(0, WORLD_W);
      const y = Phaser.Math.Between(0, WORLD_H);
      stars.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.1, 0.7));
      stars.fillRect(x, y, 2, 2);
    }

    // Rover (square)
    this.rover = this.physics.add.image(WORLD_W / 2, WORLD_H / 2, "")
      .setDisplaySize(40, 40)
      .setOrigin(0.5);
    // Use a rectangle as texture substitute
    const gfx = this.add.graphics();
    gfx.fillStyle(0x78e3ff, 1).fillRect(-20, -20, 40, 40).lineStyle(3, 0x134a84).strokeRect(-20, -20, 40, 40);
    const texKey = "roverRect";
    gfx.generateTexture(texKey, 40, 40);
    gfx.destroy();
    this.rover.setTexture(texKey);
    this.rover.setCollideWorldBounds(true);

    // Camera follow
    this.cameras.main.startFollow(this.rover, true, 0.1, 0.1);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey("W"),
      down: this.input.keyboard!.addKey("S"),
      left: this.input.keyboard!.addKey("A"),
      right: this.input.keyboard!.addKey("D"),
    };

    // Instructions (fixed to camera)
    const help = this.add.text(vw - 12, vh - 10,
      "Move: WASD / Arrows   |   ESC: Title",
      { fontFamily: "sans-serif", fontSize: "14px", color: "#b6d5ff" }
    ).setScrollFactor(0).setOrigin(1, 1).setAlpha(0.9);

    // Create 12 placeholder district nodes arranged in a big circle (easy to see)
    const cx = WORLD_W / 2;
    const cy = WORLD_H / 2;
    const R = 450;
    for (let i = 0; i < 12; i++) {
      const angle = Phaser.Math.DegToRad((i / 12) * 360 - 90);
      const x = cx + Math.cos(angle) * R;
      const y = cy + Math.sin(angle) * R;
      const circle = this.add.circle(x, y, 26, 0x1e2a4a, 1).setStrokeStyle(2, 0x66a3ff);
      circle.setInteractive({ useHandCursor: true });

      const label = this.add.text(x, y + 36, `District ${i + 1}`, {
        fontFamily: "sans-serif",
        fontSize: "12px",
        color: "#cfe8ff",
      }).setOrigin(0.5).setAlpha(0.9);

      this.nodes.push({ id: i + 1, x, y, circle, label });

      // simple hover effect
      circle.on("pointerover", () => circle.setFillStyle(0x253459));
      circle.on("pointerout", () => circle.setFillStyle(0x1e2a4a));

      // placeholder click handler
      circle.on("pointerdown", () => {
        this.tweens.add({ targets: circle, scale: { from: 1, to: 1.1 }, yoyo: true, duration: 100 });
        // later: this.scene.start("DistrictScene", { id: i + 1 });
      });
    }

    // ESC back to Title (for iteration)
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("TitleScene"));
  }

  update() {
    const speed = 220;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left?.isDown || this.wasd.left.isDown) vx = -speed;
    else if (this.cursors.right?.isDown || this.wasd.right.isDown) vx = speed;

    if (this.cursors.up?.isDown || this.wasd.up.isDown) vy = -speed;
    else if (this.cursors.down?.isDown || this.wasd.down.isDown) vy = speed;

    this.rover.setVelocity(vx, vy);

    // Face movement direction (tiny rotation for feedback)
    if (vx !== 0 || vy !== 0) {
      this.rover.rotation = Math.atan2(vy, vx);
    }
  }
}
