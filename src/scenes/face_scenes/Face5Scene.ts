import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap } from "./_FaceConfig";

// Face5 is the first 'Kist of quadratus puzzle face
export default class Face5Scene extends FaceBase {
  constructor() {
    super("Face5Scene");
  }

  create() {
    console.log("[ENTER]", this.scene.key);

    const cfg = getFaceConfig("Face5Scene");
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

    this.addDiagonalStripesInFace({
      angleDeg: -18,
      overlayAlpha: 0.4,
      stripeAlpha: 0.25,
      gap: 30,
      stripeWidth: 10,
    });

    const center = this.getPolygonCenter(this.poly);
    const sign1Pos = new Phaser.Math.Vector2(center.x, center.y + 100);
    const sign1 = this.add
      .image(sign1Pos.x, sign1Pos.y, "driehoek_sign")
      .setOrigin(0.5, 0.6)
      .setDisplaySize(70, 70)
      .setDepth(50);
    sign1.setAngle(-18);
    this.addSoftShadowBelow(sign1, 22, 0x000000, 0.28);
    this.faceLayers?.deco.add(sign1);

    const signBlock1 = this.add.zone(sign1Pos.x, sign1Pos.y, 10, 10);
    this.physics.add.existing(signBlock1, true);
    this.physics.add.collider(this.player, signBlock1);

    this.makeObjectInteractable(sign1, {
      hitRadius: 100,
      paddingX: 0,
      paddingY: 0,
      hintText: "E: Bekijk het bord",
      onUse: () => {
        this.scene.start("kvq_driehoeken");
      }
    })

    const sign2Pos = new Phaser.Math.Vector2(center.x + 100, center.y - 70);
    const sign2 = this.add
      .image(sign2Pos.x, sign2Pos.y, "twelve_sign")
      .setOrigin(0.5, 0.6)
      .setDisplaySize(70, 70)
      .setDepth(50);
    sign2.setAngle(-18);
    this.addSoftShadowBelow(sign2, 22, 0x000000, 0.28);
    this.faceLayers?.deco.add(sign2);

    const signBlock2 = this.add.zone(sign2Pos.x, sign2Pos.y, 10, 10);
    this.physics.add.existing(signBlock2, true);
    this.physics.add.collider(this.player, signBlock2);

    this.makeObjectInteractable(sign2, {
      hitRadius: 100,
      paddingX: 0,
      paddingY: 0,
      hintText: "E: Bekijk het bord",
      onUse: () => {
        this.scene.start("kvq_som_1");
      }
    })
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }
}
