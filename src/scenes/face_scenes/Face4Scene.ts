import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap, PuzzleKey, PUZZLE_REWARDS } from "./_FaceConfig";

export default class Face4Scene extends FaceBase {
  private readonly birdSize = 24; 
  private entry_from_puzzle = false;

  constructor() {
    super("Face4Scene");
  }

  init(data?: any) {
    super.init(data);
    this.entry_from_puzzle = !!data?.entry_from_puzzle;
  }

  create() {
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
      showLabel: visuals.showLabel,
    });

    this.addMorphingEscherPattern(radius);

    if (!this.faceLayers) return;
    const { actors } = this.faceLayers;
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    const tower = this.add.image(centerX, centerY + 40, "tower");
    tower.setOrigin(0.5, 1);
    const scaleFactor = 0.3;
    tower.setScale(scaleFactor);
    actors.add(tower);
    this.addSoftShadowBelow(tower, 80 * scaleFactor, 0x000000, 0.35);

    const rewardConfig = PUZZLE_REWARDS[PuzzleKey.LogicTower];
    const isSolved = !!this.registry.get(rewardConfig.puzzleSolvedRegistryKey);

    if (this.entry_from_puzzle && isSolved) {
      this.addPuzzleRewardIfNotObtained(PuzzleKey.LogicTower);
    }

    const handle = this.createDialogInteraction(tower, {
      hitRadius: 100,
      hintText: "E / spatie: Ga de toren in",

      buildLines: () => {
        const solved = !!this.registry.get(rewardConfig.puzzleSolvedRegistryKey);

        if (solved) {
          return [
            { speaker: "", text: "De lichten van de toren zijn gedoofd." },
            { speaker: "", text: "Het signaal is succesvol verzonden." },
            { speaker: "", text: "De ingang zit stevig op slot." }
          ];
        }

        return [
          { speaker: "", text: "Een mysterieuze toren rijst op uit het niets." },
          { speaker: "", text: "Binnen brandt een flauw licht..." },
          { speaker: "", text: "Durf je naar binnen te gaan?" }
        ];
      },

      onComplete: () => {
        const solved = !!this.registry.get(rewardConfig.puzzleSolvedRegistryKey);
        if (!solved) {
          this.scene.start("LogicTower", { entry_from_face: true });
        }
      },
    });

    tower.setData("dialogHandle", handle);
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }

  private addMorphingEscherPattern(radius: number) {
    if (!this.faceLayers) return;
    const width = this.scale.width;
    const height = this.scale.height;
    const textureKey = "escher_morph_smooth";

    if (!this.textures.exists(textureKey)) {
        const graphics = this.make.graphics({ x: 0, y: 0 });
        
        const colorBird = 0x8a2e55;    
        const colorOutline = 0xff88aa; 
        const colorEye = 0xffffff;     
        
        const cols = Math.ceil(width / this.birdSize) + 2;
        const rows = Math.ceil(height / this.birdSize) + 2;

        for (let row = -1; row < rows; row++) {
            for (let col = -1; col < cols; col++) {
                const x = col * this.birdSize;
                const y = row * this.birdSize;
                
                let rawProgress = (x + y) / (width + height);
                const progress = Phaser.Math.Clamp(rawProgress * 1.5 - 0.25, 0, 1);

                this.drawEscherTile(graphics, x, y, this.birdSize, progress, colorBird, colorOutline, colorEye);
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
//het ziet er nog steeds niet geweldig uit maar tenminste lijkt het nu ergens op i guess. ik wilde het met vogel doen maar das niet echt gelukt :(
  private drawEscherTile(
    g: Phaser.GameObjects.Graphics, 
    x: number, y: number, size: number, 
    t: number, 
    fillColor: number, lineColor: number, eyeColor: number
  ) {
    const lerp = (a: number, b: number) => a + (b - a) * t;
    const rA = { x: size * 0.5, y: 0 };
    const rB = { x: size, y: size * 0.5 };
    const rC = { x: size * 0.5, y: size };
    const rD = { x: 0, y: size * 0.5 };
    const bHead = { x: size * 0.3, y: size * 0.2 }; 
    const bWingTip = { x: size * 0.9, y: size * 0.1 };
    const bTail = { x: size * 0.8, y: size * 0.8 };
    const bChest = { x: size * 0.2, y: size * 0.6 };
    const pTop = { x: lerp(rA.x, bHead.x), y: lerp(rA.y, bHead.y) };
    const pRight = { x: lerp(rB.x, bWingTip.x), y: lerp(rB.y, bWingTip.y) };
    const pBottom = { x: lerp(rC.x, bTail.x), y: lerp(rC.y, bTail.y) };
    const pLeft = { x: lerp(rD.x, bChest.x), y: lerp(rD.y, bChest.y) };
    const anchorTR = { x: size, y: 0 };
    const anchorBL = { x: 0, y: size };
    g.fillStyle(fillColor);
    g.beginPath();
    g.moveTo(pLeft.x + x, pLeft.y + y); 
    g.lineTo(pTop.x + x, pTop.y + y);
    if (t > 0.1) g.lineTo(x + lerp(size*0.5, size*0.7), y + lerp(0, size*0.1)); 
    
    g.lineTo(pRight.x + x, pRight.y + y);
    g.lineTo(pBottom.x + x, pBottom.y + y);
    
    g.closePath();
    g.fill();

    if (t > 0.3) {
        g.lineStyle(1, lineColor, t); 
        g.beginPath();
        g.moveTo(pLeft.x + x + 5, pLeft.y + y - 5);
        g.lineTo(pRight.x + x - 5, pRight.y + y + 10);
        g.strokePath();
        if (t > 0.6) {
            g.fillStyle(eyeColor);
            g.fillCircle(pTop.x + x - 2, pTop.y + y + 5, 1.5 * t);
        }
    }
  }
}