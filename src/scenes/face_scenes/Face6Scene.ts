import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap } from "./_FaceConfig";

// Face6 is het tweede 'Kist of quadratus' vlak
export default class Face6Scene extends FaceBase {
  constructor() {
    super("Face6Scene");
  }

  create() {
    console.log("[ENTER]", this.scene.key);
    
    const cfg = getFaceConfig("Face6Scene");
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
    const sign1Pos = new Phaser.Math.Vector2(center.x, center.y - 60);
    const sign1 = this.add
      .image(sign1Pos.x, sign1Pos.y, "ei_sign")
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
        this.scene.start("kvq_eieren");
      }
    })

    const sign2Pos = new Phaser.Math.Vector2(center.x - 90, center.y + 60);
    const sign2 = this.add
      .image(sign2Pos.x, sign2Pos.y, "vraagtekens_sign")
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
        this.scene.start("kvq_oneven");
      }
    })
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }
}
