// import Phaser from "phaser";
// import FaceBase from "./_FaceBase";
// import type { Edge } from "./_FaceBase";

// export default class FaceBottomScene extends FaceBase {
//   constructor() {
//     super("FaceBottomScene");
//   }
//   private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
//   private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
//   private topEdge!: Edge;

//   init(data: { spawnFromTop?: boolean; spawnX?: number; spawnY?: number }) {
//     this.data.set("spawnFromTop", data?.spawnFromTop ?? false);
//     this.data.set("spawnX", data?.spawnX ?? 0);
//     this.data.set("spawnY", data?.spawnY ?? 0);
//   }

//   create() {
//     const { width, height } = this.scale;
//     this.cameras.main.setBackgroundColor("#0b1020");
  
//     const stars = this.add.graphics();
//     for (let i = 0; i < 200; i++) {
//       stars.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.15, 0.8));
//       stars.fillRect(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 2, 2);
//     }
  
//     const neighborsByEdge: (string | null)[] = [
//       "FaceBottomScene","FaceBottomScene","FaceBottomScene","FaceBottomScene","FaceTopScene",
//     ];
//     const colorMap: Record<string, number> = {
//       FaceTopScene: 0x311111,
//       FaceBottomScene: 0x133333,
//     };
    
//     const neighborStyles = neighborsByEdge.map((key) =>
//       key ? { fill: colorMap[key], stroke: 0x4b7ad1, alpha: 0.95 } : undefined
//     );
  
//     // Draw the face in WORLD coords at center of the screen (that’s fine)
//     this.renderFaceAndNeighbors({
//       cx: width / 2,
//       cy: height / 2,
//       radius: 180,
//       fill: 0x1a2338,
//       neighborFill: 0x0f1d38,
//       neighborStyles,
//     });
  
//     // Optional: make stars scroll with the camera (put them into the world container)
//     // If you want that, uncomment next line:
//     // this.world.add(stars);
  
//     // Portal edge
//     this.topEdge = this.edges[4];
  
//     // Compute a valid spawn INSIDE the polygon
//     const fromTop = this.data.get("spawnFromTop") as boolean;
//     let spawnX = (this.data.get("spawnX") as number) || width / 2;
//     let spawnY = (this.data.get("spawnY") as number) || height / 2;
//     if (fromTop) {
//       const mid = this.midpoint(this.topEdge);
//       const center = this.getPolygonCenter(this.poly);
//       const inward = center.clone().subtract(mid).normalize().scale(18);
//       spawnX = mid.x + inward.x; 
//       spawnY = mid.y + inward.y;
//     }
//     // Clamp spawn to inside (use Vector2; no need to wrap in Geom.Point)
//     const tryPos = new Phaser.Geom.Point(spawnX, spawnY);
//     if (!Phaser.Geom.Polygon.ContainsPoint(this.poly, tryPos)) {
//       const c = this.getPolygonCenter(this.poly); 
//       spawnX = c.x; 
//       spawnY = c.y;
//     }
  
//     // ✅ Spawn the player AT THE VALID POSITION (this was the main issue)
//     this.createPlayerAt(spawnX, spawnY);
  
//     // Now bind the camera to the computed world bounds and follow the player
//     this.setCameraToPlayerBounds();
  
//     // Input bindings
//     this.cursors = this.input.keyboard!.createCursorKeys();
//     this.wasd = {
//       W: this.input.keyboard!.addKey("W"),
//       A: this.input.keyboard!.addKey("A"),
//       S: this.input.keyboard!.addKey("S"),
//       D: this.input.keyboard!.addKey("D"),
//     };
//     this.setupControls();
  
//     // Travel back up on E near edge 4
//     this.input.keyboard?.on("keydown-ESC", () => this.scene.start("TitleScene"));
//     this.input.keyboard?.on("keydown-E", () => {
//       if (this.isNearEdge(this.player, this.topEdge)) {
//         const mid = this.midpoint(this.topEdge);
//         this.scene.start("FaceTopScene", { spawnX: mid.x, spawnY: mid.y });
//       }
//     });
//   }


//   update() {
//     if (this.isNearEdge(this.player, this.topEdge)) {
//       this.portalHint.setText("Edge access: press E to ascend").setAlpha(1);
//     } else {
//       this.portalHint.setAlpha(0);
//     }
//   }

//   private isNearEdge(player: Phaser.GameObjects.Image, e: Edge): boolean {
//     const p = new Phaser.Math.Vector2(player.x, player.y);
//     return this.distanceToEdge(p, e) < 16;
//   }
//   private midpoint(e: Edge) {
//     return new Phaser.Math.Vector2((e.a.x + e.b.x) / 2, (e.a.y + e.b.y) / 2);
//   }
// }
