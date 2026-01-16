import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap } from "./_FaceConfig";

export default class Face12Scene extends FaceBase {
  constructor() {
    super("Face12Scene");
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
    const handle = this.createDialogInteraction(plok, {
      hitRadius: 60,
      hintText: "Druk op E",
      
      buildLines: () => [
        { text: "de tekst komt hier", speaker: "Plok" },
        { text: "domino domino domino domino", speaker: "Plok" },
        { text: "stray kids reference", speaker: "Plok" }
      ],
      
      onComplete: () => {
        this.scene.start("DominoScene", { returnScene: "Face12Scene" });
      },
    });

    plok.setData("dialogHandle", handle);
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