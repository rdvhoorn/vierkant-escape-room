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
      showLabel: visuals.showLabel,
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

    const door = this.add.image(width / 2, height / 2 + 30, "mazedoor");
    door.setOrigin(0.5, 1);
    door.setScale(this.doorScale);
    layers.actors.add(door);

    const solved = !!this.registry.get("streak_maze_solved");

    const handle = this.createDialogInteraction(door, {
      hitRadius: 100,
      hintText: "Inspecteer deurtje: E / spatie",
      buildLines: () => {
        // 1) Returned from puzzle + solved
        if (this.entry_from_puzzle && solved) {
          return [];
        }

        // 2) Returned from puzzle + not solved
        if (this.entry_from_puzzle && !solved) {
          return [
            { speaker: "Jij", text: "Pfoe, ik ben weer buiten. Misschien dat ik het later nog eens kan proberen..." },
          ];
        }

        // 3) Not from puzzle + solved already
        if (!this.entry_from_puzzle && solved) {
          return [
            { speaker: "Jij", text: "Oh! hier ben ik al geweest!" },
          ];
        }

        // 4) Not from puzzle + not solved (first time)
        return [
          { speaker: "", text: "Je staat voor een klein deurtje in de hoge heg." },
          { speaker: "", text: "Het lijkt op slot… of misschien toch niet?" },
          { speaker: "", text: "Je bent nieuwsgierig en gaat naar binnen..." },
        ];
      },

      onComplete: () => {
        // scenario 1: reward after returning solved
        if (this.entry_from_puzzle && solved) {
          this.addPuzzleRewardIfNotObtained(PuzzleKey.StreakMaze);
        }

        // scenario 4: first time -> enter puzzle
        if (!this.entry_from_puzzle && !solved) {
          this.scene.start("StreakMaze", { entry_from_face: true });
        }

        // always clear entry flag if we came from puzzle
        if (this.entry_from_puzzle) {
          this.entry_from_puzzle = false;
        }
      },
    });

    this.doorDialogHandle = handle;

    // Auto-start dialog if returning from puzzle (both solved and not solved)
    if (this.entry_from_puzzle) {
      this.time.delayedCall(50, () => this.doorDialogHandle?.start());
    }
  }


  update(_time: number, delta: number) { this.baseFaceUpdate(delta); }
}