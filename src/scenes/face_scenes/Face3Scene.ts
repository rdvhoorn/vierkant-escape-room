import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap, PuzzleKey } from "./_FaceConfig";

export default class Face3Scene extends FaceBase {
  private entry_from_puzzle: boolean = false;
  private doorDialogHandle?: { start: () => void };

  // --- CONFIGURATION ---
  private readonly doorScale = 0.2; 

  // Grass Visuals
  // 0.5 = Smaller blades (more detailed), 1.0 = Larger blades
  private readonly grassZoom = 1;
  // 0.2 = Subtle texture, 0.5 = High contrast
  private readonly grassOpacity = 0.5;

  constructor() { super("Face3Scene"); }

  init(data?: any) {
    super.init(data);
    this.entry_from_puzzle = !!data?.entry_from_puzzle;
  }

  preload() {
    this.load.image("mazedoor", "assets/decor/mazedoor.png");
  }

  create() {
    console.log("[ENTER]", this.scene.key);

    const cfg = getFaceConfig("Face3Scene");
    const { radius, neighbors, visuals } = cfg;
    const colorMap = buildNeighborColorMap(neighbors);

    this.initStandardFace({
      radius,
      faceTravelTargets: neighbors,
      mainFill: visuals.mainFill,
      neighborFill: visuals.neighborFill ?? visuals.mainFill,
      colorMap,
      edgeTriggerScale: visuals.edgeTriggerScale,
      backgroundColor: visuals.backgroundColor,
      showLabel: visuals.showLabel ?? true,
    });

    // 1. Add the Grass Pattern (Background)
    this.addGrassPattern(radius);

    // 2. Add the Door (Foreground)
    this.addDoorNpc();

    // 3. Give reward if returning from solved puzzle
    if (this.entry_from_puzzle && this.registry.get("streak_maze_solved")) {
      this.addPuzzleRewardIfNotObtained(PuzzleKey.StreakMaze);
    }
  }

  /**
   * Generates a simple grassy noise texture and masks it to the pentagon.
   */
  private addGrassPattern(radius: number) {
    if (!this.faceLayers) return;

    const width = this.scale.width;
    const height = this.scale.height;
    const textureKey = "grass_pattern";

    // A. Generate Grass Texture (if not already created)
    if (!this.textures.exists(textureKey)) {
        const graphics = this.make.graphics({ x: 0, y: 0 });
        
        // Base color (Darker green to blend with face color)
        graphics.fillStyle(0x1f3b24); 
        graphics.fillRect(0, 0, 64, 64);

        // Draw random grass blades
        graphics.lineStyle(2, 0x3d6e3d, 0.6); // Lighter green blades
        
        for (let i = 0; i < 40; i++) {
            const x = Phaser.Math.Between(2, 62);
            const y = Phaser.Math.Between(5, 62);
            const bladeHeight = Phaser.Math.Between(4, 8);
            
            // Draw a small vertical-ish line
            graphics.beginPath();
            graphics.moveTo(x, y);
            graphics.lineTo(x + Phaser.Math.Between(-2, 2), y - bladeHeight);
            graphics.strokePath();
        }

        graphics.generateTexture(textureKey, 64, 64);
        graphics.destroy();
    }

    // B. Create Tiling Sprite
    const grassBg = this.add.tileSprite(width / 2, height / 2, width, height, textureKey);
    grassBg.setAlpha(this.grassOpacity);
    grassBg.setTileScale(this.grassZoom);

    // C. Mask to Pentagon
    const shape = this.make.graphics({ x: 0, y: 0 });
    shape.fillStyle(0xffffff);
    
    const points: {x:number, y:number}[] = [];
    for (let i = 0; i < 5; i++) {
        const deg = -90 + i * 72;
        const rad = Phaser.Math.DegToRad(deg);
        points.push({
            x: width / 2 + Math.cos(rad) * radius,
            y: height / 2 + Math.sin(rad) * radius
        });
    }
    
    shape.beginPath();
    shape.moveTo(points[0].x, points[0].y);
    for(let i=1; i<points.length; i++) shape.lineTo(points[i].x, points[i].y);
    shape.closePath();
    shape.fillPath();

    const mask = shape.createGeometryMask();
    grassBg.setMask(mask);

    // Add to 'ground' layer (behind the door)
    this.faceLayers.ground.add(grassBg);
  }

  private addDoorNpc() {
    const { width, height } = this.scale;
    const layers = this.getFaceLayers();

    // --- REPLACED RECTANGLE WITH IMAGE ---
    const door = this.add.image(width / 2, height / 2 + 30, "mazedoor");
    
    // Set origin to bottom-center (0.5, 1) so it stands nicely on the Y coordinate
    door.setOrigin(0.5, 1);
    door.setScale(this.doorScale);

    layers.actors.add(door);

    // Add interaction to the image
    const handle = this.createDialogInteraction(door, {
      hitRadius: 100, 
      hintText: "Inspecteer deurtje: E",
      buildLines: () => {
        const solved = !!this.registry.get("streak_maze_solved");
        if (solved) return [{ speaker: "", text: "Het deurtje staat open. Je bent hier al geweest." }];
        return [
          { speaker: "", text: "Je staat voor een klein deurtje in de hoge heg." },
          { speaker: "", text: "Het lijkt op slot… of misschien toch niet?" },
          { speaker: "", text: "Je bent nieuwsgierig en gaat naar binnen..." },
        ];
      },
      onComplete: () => {
        const solved = !!this.registry.get("streak_maze_solved");
        if (!solved) this.scene.start("StreakMaze", { entry_from_face: true });
      },
    });

    this.doorDialogHandle = handle;

    if (this.entry_from_puzzle && !this.registry.get("streak_maze_solved")) {
      this.time.delayedCall(50, () => this.doorDialogHandle?.start());
    }
  }

  update(_time: number, delta: number) { this.baseFaceUpdate(delta); }
}