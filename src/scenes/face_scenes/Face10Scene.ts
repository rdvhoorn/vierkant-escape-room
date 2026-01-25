import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap, PuzzleKey } from "./_FaceConfig";

export default class Face10Scene extends FaceBase {
  private entry_from_puzzle = false;

  constructor() {
    super("Face10Scene");
  }

  init(data?: any) {
    super.init(data);
    this.entry_from_puzzle = !!data?.entry_from_puzzle;
  }

  preload() {
    this.load.image("energycube", "assets/decor/energycube.png");
  }

  create() {
    console.log("[ENTER]", this.scene.key);
    const cfg = getFaceConfig("Face10Scene");
    const { radius, neighbors, visuals } = cfg;
    const colorMap = buildNeighborColorMap(neighbors);

    this.initStandardFace({
      radius,
      faceTravelTargets: neighbors,
      mainFill: 0x1a1a2e, 
      neighborFill: visuals.neighborFill ?? visuals.mainFill,
      colorMap,
      edgeTriggerScale: visuals.edgeTriggerScale,
      backgroundColor: visuals.backgroundColor,
      showLabel: visuals.showLabel ?? true,
    });

    this.drawIntertwinedCables(radius);
    if (!this.faceLayers) return;
    const { actors, deco } = this.faceLayers;
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    //cube
    const energyCube = this.add.image(centerX, centerY, "energycube");
    const scaleFactor = 0.4; 
    energyCube.setScale(scaleFactor);
    this.tweens.add({
        targets: energyCube,
        y: centerY - 10,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    actors.add(energyCube);
    this.addSoftShadowBelow(energyCube, 70 * scaleFactor, 0x00ffff, 0.5);

    // 
    // quadratus
    const quadX = centerX + 120; 
    const quadY = centerY + 30;
    const quadratus = this.add.image(quadX, quadY, "quadratus_small")
      .setDepth(50).setDisplaySize(-200/2, 336/2); //negatieve width voor kijkrichting?
    deco.add(quadratus);

    //sudokuscene tijd
    const handle = this.createDialogInteraction(energyCube, {
      hitRadius: 120,
      paddingX: -60,
      hintText: "Druk op E om te verbinden",
      buildLines: () => [
        { text: "Hè, waarom trilt de grond zo?", speaker: "Jij" },
        { text: "Hmm, dat is een vreemd ding! Het lijkt wel alsof er een kaars in brandt.", speaker: "Jij" },
        { text: "Ah, je hebt onze Energiekubus gevonden!", speaker: "Quadratus" },
        { text: "Wat IS dat ding?", speaker: "Jij" },
        { text: "Dezonia slaat energie op in patronen, slimme patronen.", speaker: "Quadratus" },
        { text: "Deze Energiekubus is een oud beveiligingssysteem. Hij geeft alleen energie af wanneer je het getallenraster herstelt.", speaker: "Quadratus" },
        { text: "Maar dit lijkt net een Sudoku!", speaker: "Jij" },
        { text: "Precies! De Energiekubus blijft stabiel door de getallen. Vier getallen zijn extra belangrijk, dit zijn de sleutel-symbolen", speaker: "Quadratus" },
      { text: "Als je het goed oplost, dan verschijnen er vier symbolen boven speciale vakjes. Deze getallen vormen de code.", speaker: "Quadratus" },
        { text: "Je loopt naar de kubus toe, legt je hand er op. De kubus wordt warm en de symbolen beginnen te gloeien", speaker: "" },
        { text: "Oké, tijd om de code te kraken en energie te krijgen!", speaker: "Jij" },
      ],
      
      onComplete: () => {
        this.scene.start("SudokuScene", { returnScene: "Face10Scene" });
      },
    });

    energyCube.setData("dialogHandle", handle);

    // Give reward if returning from solved puzzle
    if (this.entry_from_puzzle && this.registry.get("sudoku_solved")) {
      this.addPuzzleRewardIfNotObtained(PuzzleKey.Sudoku);
    }
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }

//custom visual voor de lines
  private drawIntertwinedCables(radius: number) {
    if (!this.faceLayers || !this.poly) return
    const graphics = this.add.graphics();
    this.faceLayers.ground.add(graphics); 
    const { width, height } = this.scale;
    const center = { x: width / 2, y: height / 2 };
    const colors = [0xff0055, 0x00ffaa, 0x5500ff, 0xffff00, 0x00ffff, 0xffaa00];
    const vertices = this.poly.points;
    const edgePoints: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < vertices.length; i++) {
        const p1 = vertices[i];
        const p2 = vertices[(i + 1) % vertices.length];
        for(let j = 0; j <= 4; j++) {
             edgePoints.push(new Phaser.Math.Vector2(
                 Phaser.Math.Interpolation.Linear([p1.x, p2.x], j/4),
                 Phaser.Math.Interpolation.Linear([p1.y, p2.y], j/4)
             ));
        }
    }
    const numCables = 20; //40 is misschien nog wat veel maar prima voor nu
    for (let i = 0; i < numCables; i++) {
        const start = Phaser.Utils.Array.GetRandom(edgePoints);
        let end = Phaser.Utils.Array.GetRandom(edgePoints);
        //start en einde niet hetzelfde punt
        while (start === end) {
             end = Phaser.Utils.Array.GetRandom(edgePoints);
        }
        const color = Phaser.Utils.Array.GetRandom(colors);
        const thickness = Phaser.Math.Between(2, 5);
        const alpha = Phaser.Math.FloatBetween(0.6, 0.9);
        const controlVariance = radius * 1.2;
        const cp1x = center.x + Phaser.Math.Between(-controlVariance, controlVariance);
        const cp1y = center.y + Phaser.Math.Between(-controlVariance, controlVariance);
        const cp2x = center.x + Phaser.Math.Between(-controlVariance, controlVariance);
        const cp2y = center.y + Phaser.Math.Between(-controlVariance, controlVariance);
        const curve = new Phaser.Curves.CubicBezier(
            new Phaser.Math.Vector2(start.x, start.y),
            new Phaser.Math.Vector2(cp1x, cp1y),
            new Phaser.Math.Vector2(cp2x, cp2y),
            new Phaser.Math.Vector2(end.x, end.y)
        );
        graphics.lineStyle(thickness, color, alpha);
        curve.draw(graphics);
    }
    //niet erbuiten laten zien :)
    const maskGraphics = this.make.graphics({});
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillPoints(this.poly.points, true);
    const mask = maskGraphics.createGeometryMask();
    graphics.setMask(mask);
  }
}