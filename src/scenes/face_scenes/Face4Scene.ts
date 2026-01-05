import FaceBase from "./_FaceBase";
// We import PuzzleKey and PUZZLE_REWARDS to use the central config
import { getFaceConfig, buildNeighborColorMap, PuzzleKey, PUZZLE_REWARDS } from "./_FaceConfig";

export default class Face4Scene extends FaceBase {
  private readonly birdSize = 20;

  constructor() {
    super("Face4Scene");
  }

  create() {
    console.log("[ENTER]", this.scene.key);

    const cfg = getFaceConfig("Face4Scene");
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

    this.addMorphingEscherPattern(radius);

    if (!this.faceLayers) return;
    const { actors } = this.faceLayers;
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // --- TOWER ASSET ---
    const tower = this.add.image(centerX, centerY + 40, "tower");
    tower.setOrigin(0.5, 1);
    const scaleFactor = 0.3;
    tower.setScale(scaleFactor);
    actors.add(tower);
    this.addSoftShadowBelow(tower, 80 * scaleFactor, 0x000000, 0.35);

    // --- INTERACTION LOGIC ---
    const handle = this.createDialogInteraction(tower, {
      hitRadius: 100,
      hintText: "Druk op E om de toren in te gaan",
      
      // 1. Build Lines
      buildLines: () => {
        // Retrieve the configuration for the Logic Tower
        const rewardConfig = PUZZLE_REWARDS[PuzzleKey.LogicTower];
        
        // Check if "tower_solved" is true in the registry
        const isSolved = !!this.registry.get(rewardConfig.puzzleSolvedRegistryKey);

        if (isSolved) {
          // If solved, try to give the reward using the FaceBase helper
          // This checks "tower_reward_obtained", gives energy if needed, and marks it obtained
          this.addPuzzleRewardIfNotObtained(PuzzleKey.LogicTower);

          // Return the "Closed" dialogue
          return [
            { speaker: "", text: "De lichten van de toren zijn gedoofd." },
            { speaker: "", text: "Het signaal is succesvol verzonden." },
            { speaker: "", text: "De ingang zit stevig op slot." }
          ];
        }

        // If NOT solved, Return the "Open" dialogue
        return [
          { speaker: "", text: "Een mysterieuze toren rijst op uit het niets." },
          { speaker: "", text: "Binnen brandt een flauw licht..." },
          { speaker: "", text: "Durf je naar binnen te gaan?" }
        ];
      },

      // 2. Action on Complete
      onComplete: () => {
        const rewardConfig = PUZZLE_REWARDS[PuzzleKey.LogicTower];
        const isSolved = !!this.registry.get(rewardConfig.puzzleSolvedRegistryKey);

        // Only enter the puzzle scene if it hasn't been solved yet
        if (!isSolved) {
          this.scene.start("LogicTower", { entry_from_face: true });
        }
      },
    });

    tower.setData("dialogHandle", handle);
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }

  // --- VISUALS (Standard Escher Pattern) ---
  private addMorphingEscherPattern(radius: number) {
    if (!this.faceLayers) return;
    const width = this.scale.width;
    const height = this.scale.height;
    const textureKey = "escher_morph";
    if (!this.textures.exists(textureKey)) {
        const graphics = this.make.graphics({ x: 0, y: 0 });
        const colorBg = 0x4a1c35;      
        const colorBird = 0x8a2e55;    
        const colorOutline = 0xff88aa; 
        const colorEye = 0xffffff;    
        graphics.fillStyle(colorBg);
        graphics.fillRect(0, 0, width, height);
        const cols = Math.ceil(width / this.birdSize);
        const rows = Math.ceil(height / this.birdSize);
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * this.birdSize;
                const y = row * this.birdSize;
                const progress = (x + y) / (width + height); 
                this.drawBird(graphics, x, y, this.birdSize, progress, colorBird, colorOutline, colorEye);
            }
        }
        graphics.generateTexture(textureKey, width, height);
        graphics.destroy();
    }
    const patternImg = this.add.image(width / 2, height / 2, textureKey);
    patternImg.setAlpha(0.35); 
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
    patternImg.setMask(mask);
    this.faceLayers.ground.add(patternImg);
  }

  private drawBird(
    g: Phaser.GameObjects.Graphics, 
    x: number, y: number, size: number, 
    simplicity: number, 
    fillColor: number, lineColor: number, eyeColor: number
  ) {
    const half = size / 2;
    const showEye = simplicity < 0.35;
    const showWing = simplicity < 0.35;
    const showStroke = simplicity < 0.65;
    g.fillStyle(fillColor);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + size, y + half);
    g.lineTo(x, y + size);
    g.moveTo(x + size, y);
    g.lineTo(x + half, y + size);
    g.lineTo(x + size, y + size);
    g.closePath();
    g.fill();
    if (showStroke) {
        const thick = showWing ? 2 : 1; 
        g.lineStyle(thick, lineColor, 0.6);
        g.strokePath();
    }
    if (showWing) {
        g.lineStyle(1, lineColor, 0.4);
        g.beginPath();
        g.moveTo(x + 10, y + 10);
        g.lineTo(x + size - 10, y + size - 10);
        g.strokePath();
    }
    if (showEye) {
        g.fillStyle(eyeColor);
        g.fillCircle(x + size * 0.2, y + size * 0.25, 2);
    }
  }
}