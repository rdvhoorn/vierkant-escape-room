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
    const quadratus = this.add.image(centerX - 100, centerY + 20, "quadratus");
    quadratus.setScale(0.25);
    actors.add(quadratus);
    this.addSoftShadowBelow(quadratus, 40 * 0.25, 0x000000, 0.3);

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
            { speaker: "Quadratus", text: "De lichten zijn gedoofd. Het signaal is verstuurd." },
            { speaker: "Quadratus", text: "Je hebt het goed gedaan. De ingang blijft nu gesloten." }
          ];
        }

        return [
          { speaker: "Jij", text: "Hoi Quadratus! Wat is dit voor een toren?" },
          { speaker: "Quadratus", text: "Hiermee kunnen we kijken naar de sterren en kunnen we ruimteschepen in de buurt waarnemen." },
          { speaker: "Jij", text: "Is dat ook hoe je zag dat ik neerstortte?" },
          { speaker: "Quadratus", text: "Nou nee, dat was eigenlijk meer geluk of toeval…" },
          { speaker: "Quadratus", text: "Het mechanisme is een aantal jaar geleden kapot gegaan en omdat we de afgelopen eeuw niet zoveel bezoekers meer kregen op Dezonia, vonden we het niet nodig om het te repareren." },
          { speaker: "Jij", text: "O wat jammer! Het leek me super vet als ik mijn vrienden over jullie kon vertellen en dan samen met hen nog een keer terug kon keren." },
          { speaker: "Quadratus", text: "Wat een goed idee! Wat nou als jij ons helpt om het mechanisme in de toren te repareren?" },
          { speaker: "Jij", text: "Maar Quadratus, ik heb toch helemaal geen tijd? Ik moet genoeg energie verzamelen zodat ik naar huis terug kan." },
          { speaker: "Quadratus", text: "Ja natuurlijk, dat snap ik. Wat nou als je energie kunt verdienen voor elke verdieping waarop je het mechanisme repareert?" },
          { speaker: "Quadratus", text: "Je kan dan zelf bepalen wanneer je wilt stoppen. Natuurlijk kun je altijd nog een keer terugkomen om verder te werken zodat je ook genoeg hebt voor je terugkomst naar Dezonia samen met je vrienden." },
          { speaker: "Jij", text: "Ja, dat is goed! Ik ga binnen kijken of ik jullie kan helpen." },
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