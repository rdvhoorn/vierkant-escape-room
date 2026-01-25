import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap, PuzzleKey } from "./_FaceConfig";

export default class Face12Scene extends FaceBase {
  private entry_from_puzzle = false;

  constructor() {
    super("Face12Scene");
  }

  init(data?: any) {
    super.init(data);
    this.entry_from_puzzle = !!data?.entry_from_puzzle;
  }

  preload() {
    this.load.image("plok", "assets/decor/plok.png");
  }

  create() {
    console.log("[ENTER]", this.scene.key);
    const cfg = getFaceConfig("Face12Scene");
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

    this.addSubtleDominoPattern(radius);

    if (!this.faceLayers) return;
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    const offsetX = 25;
    const offsetY = -15;
    const plok = this.add.image(centerX + offsetX, centerY + offsetY, "plok");
    const plokScale = 0.4;
    plok.setScale(plokScale);
    this.faceLayers.actors.add(plok);
    
    //yay movement
    this.tweens.add({
      targets: plok,
      scaleY: plokScale * 1.05,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.addSoftShadowBelow(plok, 40 * plokScale, 0x000000, 0.3);

    const isSolved = this.registry.get("domino_solved");

    let dialogLines = [];

    if (isSolved) {
        //dialoog opgelost
        dialogLines = [
            { text: "Wauw! Het is je gelukt!", speaker: "Plok" },
            { text: "Ik snapte er helemaal niks van. Jij bent echt slim.", speaker: "Plok" },
            { text: "Je hebt er weer 10 energie bij. Bedankt voor het oplossen!", speaker: "Plok" }
        ];
    } else {
        //dialoog onopgelost
        dialogLines = [
            { text: "Hoi!", speaker: "Jij" },
            { text: "O, hallo! Eindelijk iemand anders, fijn!", speaker: "Plok" },
            { text: "Wie ben jij?", speaker: "Jij" },
            { text: "Ik ben Plok en ik woon hier helemaal alleen. Dat is soms best eenzaam.", speaker: "Plok" },
            { text: "Vaak maak ik een domino puzzel om de tijd te doden, maar vandaag lukt dat niet.", speaker: "Plok" },
            { text: "Ik zie allemaal gekleurde vakken en met getallen, maar ik snap niet wat de bedoeling is.", speaker: "Jij" },
            { text: "Bij dit spel moet ik de dominostenen precies goed neerleggen.", speaker: "Plok" },
            { text: "Vakjes met dezelfde kleur horen bij elkaar en de getallen geven informatie. Als het goed is, werkt alles samen.", speaker: "Plok" },
            { text: "Bijvoorbeeld het = teken betekent dat er in het gekleurde vak alleen maar dezelfde getallen mogen staan, bijvoorbeeld alleen maar vijfen.", speaker: "Plok" },
            { text: "En  < zegt dat de som van de domino’s in het gekleurde vak kleiner moet zijn dan het getal dat er staat.", speaker: "Plok" },
            { text: "Als je een cijfer ziet staan, zonder teken, dan weet je dat het gekleurde vak óf dit getal bevat, óf dat de som van de getallen in het vak gelijk is aan het cijfer.", speaker: "Plok" },
            { text: "Hier, probeer het maar. Dit zijn de stenen die bij deze puzzel horen.", speaker: "Plok" },
            { text: "Eigenlijk moet ik een weg terugvinden naar huis, mijn raket is leeg en ik heb nieuwe energie nodig zodat ik weer terug naar de Aarde kan.", speaker: "Jij" },
            { text: "Als jij de puzzel oplost, mag je mijn energie hebben. Ik heb het toch niet allemaal nodig.", speaker: "Plok" },
            { text: "Oké, in dat geval help ik je graag met de puzzel!", speaker: "Jij" }
        ];
    }

    const handle = this.createDialogInteraction(plok, {
      hitRadius: 60,
      hintText: isSolved ? "Praat met Plok" : "Druk op E",
      
      buildLines: () => dialogLines,
      
      onComplete: () => {
        if (!isSolved) {
            this.scene.start("DominoScene", { returnScene: "Face12Scene" });
        }
      },
    });

    plok.setData("dialogHandle", handle);

    // Give reward if returning from solved puzzle
    if (this.entry_from_puzzle && isSolved) {
      this.addPuzzleRewardIfNotObtained(PuzzleKey.Domino);
    }
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }

  private addSubtleDominoPattern(radius: number) {
    if (!this.faceLayers || !this.poly) return;
    const graphics = this.add.graphics();
    this.faceLayers.ground.add(graphics);
    const { width, height } = this.scale;
    const center = { x: width / 2, y: height / 2 };
    const tileColor = 0xffffff; 
    const tileAlpha = 0.08; //tranasparancy (of hoe je dat ook speldt)

    for (let i = 0; i < 15; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(0, radius * 0.8);
      const x = center.x + Math.cos(angle) * dist;
      const y = center.y + Math.sin(angle) * dist;
      const rotation = Phaser.Math.FloatBetween(0, Math.PI * 2);
      this.drawDomino(graphics, x, y, rotation, tileColor, tileAlpha);
    }

    //randjes
    const maskGraphics = this.make.graphics({});
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillPoints(this.poly.points, true);
    const mask = maskGraphics.createGeometryMask();
    graphics.setMask(mask);
  }

  private drawDomino(g: Phaser.GameObjects.Graphics, x: number, y: number, rotation: number, color: number, alpha: number) {
    const w = 40;
    const h =80;
    g.save();
    g.translateCanvas(x, y);
    g.rotateCanvas(rotation);
    g.fillStyle(color, alpha);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 4);
    g.lineStyle(2, color, alpha* 1.5);
    g.beginPath();
    g.moveTo(-w / 2 + 5, 0);
    g.lineTo(w / 2 - 5, 0);
    g.strokePath();


    const topVal = Phaser.Math.Between(0, 6);
    const bottomVal = Phaser.Math.Between(0, 6);
    this.drawPips(g, 0, -h / 4, topVal, color, alpha * 2);
    this.drawPips(g, 0, h / 4, bottomVal, color, alpha * 2);
    g.restore();
  }

  private drawPips(g: Phaser.GameObjects.Graphics, cx: number, cy: number, value: number, color: number, alpha: number) {
    if (value === 0) return;
    g.fillStyle(color, alpha);
    const pipSize = 3;
    const offset = 10;
    const drawDot = (dx: number, dy: number) => {
      g.fillCircle(cx + dx, cy + dy, pipSize);
    };
    if (value % 2 === 1) drawDot(0, 0); 
    if (value >= 2) {
      drawDot(-offset, -offset); //linksboven
      drawDot(offset, offset);   //rechtsonder
    }
    if (value >= 4) {
      drawDot(offset, -offset);  //rechtsboven
      drawDot(-offset, offset);  //linksonder
    }
    if (value === 6) {
      drawDot(-offset, 0);       //middenlinks
      drawDot(offset, 0);        //middenrechts
    }
  }
}