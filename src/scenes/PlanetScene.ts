import Phaser from "phaser";
import { buildDodecaNet, locateFace, pointInPolygon } from "../geom/DodecaNet";
import type { DodecaNet } from "../geom/DodecaNet";

export default class PlanetScene extends Phaser.Scene {
  private net!: DodecaNet;
  private player!: Phaser.GameObjects.Arc;
  private playerPos = new Phaser.Math.Vector2();
  private lastValidPos = new Phaser.Math.Vector2();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; };

  constructor() {
    super("PlanetScene");
  }

  create() {
    const { width, height } = this.scale;

    // Build the net
    const R = 90; // pentagon radius
    this.net = buildDodecaNet(0, 0, R);

    // Create a big render layer centered on screen
    const layer = this.add.container(width / 2, height / 2);

    // Background
    const spaceBG = this.add.rectangle(0, 0, this.net.bounds.width + 600, this.net.bounds.height + 600, 0x091020).setOrigin(0.5);
    layer.add(spaceBG);

    // Draw faces
    const g = this.add.graphics();
    g.lineStyle(3, 0x66a3ff, 1);
    for (const face of this.net.faces) {
      // fill
      g.fillStyle(0x131f3a, 1);
      g.beginPath();
      g.moveTo(face.points[0].x, face.points[0].y);
      for (let i = 1; i < face.points.length; i++) g.lineTo(face.points[i].x, face.points[i].y);
      g.closePath();
      g.fillPath();
      g.strokePath();

      // label
      const cx = face.center.x;
      const cy = face.center.y;
      const label = this.add.text(cx, cy, `Face ${face.id}`, {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "#cfe8ff",
      }).setOrigin(0.5);
      layer.add(label);
    }
    layer.add(g);

    // Player
    this.playerPos.set(this.net.faces[0].center.x, this.net.faces[0].center.y);
    this.lastValidPos.copy(this.playerPos);
    this.player = this.add.circle(this.playerPos.x, this.playerPos.y, 8, 0xffe28a).setStrokeStyle(2, 0x344b7a);
    layer.add(this.player);

    // Camera follow (we move the camera by panning to the player's world position within the layer)
    this.cameras.main.setBackgroundColor("#0b1020");
    this.cameras.main.setZoom(1.0);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey("W"),
      down: this.input.keyboard!.addKey("S"),
      left: this.input.keyboard!.addKey("A"),
      right: this.input.keyboard!.addKey("D"),
    };

    // HUD
    this.add.text(12, 10, "Walk the dodecahedron (WASD/Arrows). You can’t leave the net.", {
      fontFamily: "sans-serif",
      fontSize: "14px",
      color: "#b6d5ff",
    }).setScrollFactor(0);

    this.add.text(width - 12, height - 10, "ESC: Title", {
      fontFamily: "sans-serif",
      fontSize: "12px",
      color: "#8fb3ff",
    }).setOrigin(1, 1).setScrollFactor(0);

    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("TitleScene"));

    // Store the layer for camera panning use in update
    (this.cameras.main as any).layer = layer;
  }

  update(_: number, dt: number) {
    const layer: Phaser.GameObjects.Container = (this.cameras.main as any).layer;
    const speed = 160; // px/s
    const step = (speed * dt) / 1000;

    // Movement vector
    let vx = 0, vy = 0;
    if (this.cursors.left?.isDown || this.wasd.left.isDown) vx -= 1;
    if (this.cursors.right?.isDown || this.wasd.right.isDown) vx += 1;
    if (this.cursors.up?.isDown || this.wasd.up.isDown) vy -= 1;
    if (this.cursors.down?.isDown || this.wasd.down.isDown) vy += 1;

    const vlen = Math.hypot(vx, vy);
    if (vlen > 0) { vx /= vlen; vy /= vlen; }

    // Proposed new position
    const next = new Phaser.Math.Vector2(this.playerPos.x + vx * step, this.playerPos.y + vy * step);

    // Stay on the planet: accept the move only if inside ANY face polygon
    const insideAny = this.net.faces.some(f => pointInPolygon(next, f.points));
    if (insideAny) {
      this.playerPos.copy(next);
      this.lastValidPos.copy(next);
    } else {
      // Try sliding along axis if diagonal blocked (very simple, feels better than hard stop)
      if (vlen > 0) {
        const tryX = new Phaser.Math.Vector2(this.playerPos.x + vx * step, this.playerPos.y);
        const tryY = new Phaser.Math.Vector2(this.playerPos.x, this.playerPos.y + vy * step);
        const xOk = this.net.faces.some(f => pointInPolygon(tryX, f.points));
        const yOk = this.net.faces.some(f => pointInPolygon(tryY, f.points));
        if (xOk) this.playerPos.copy(tryX);
        else if (yOk) this.playerPos.copy(tryY);
        // else blocked; stay put
      }
    }

    // Render player
    this.player.setPosition(this.playerPos.x, this.playerPos.y);

    // Camera pan to player (since faces are drawn in a centered container, just pan container offset)
    const cam = this.cameras.main;
    const targetX = this.scale.width / 2 - this.playerPos.x;
    const targetY = this.scale.height / 2 - this.playerPos.y;
    // Smoothly approach target
    const lerp = 0.12;
    layer.setPosition(
      Phaser.Math.Linear(layer.x, targetX, lerp),
      Phaser.Math.Linear(layer.y, targetY, lerp)
    );

    // Optional: show which face we’re on (debug)
    const onId = locateFace(this.playerPos, this.net.faces);
    cam.setName(`on face ${onId}`);
  }
}
