import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap } from "./_FaceConfig";

// Face5 is the first 'Kist of quadratus puzzle face
export default class Face5Scene extends FaceBase {
  constructor() {
    super("Face5Scene");
  }

  create() {
    console.log("[ENTER]", this.scene.key);
    this.ensureEnergyInitialized(0);

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


    const center = this.getPolygonCenter(this.poly);
    const signPos = new Phaser.Math.Vector2(center.x, center.y + 50);
    const sign1 = this.add
      .image(signPos.x, signPos.y, "wooden_sign")
      .setOrigin(0.5, 0.6)
      .setDisplaySize(48, 48)
      .setDepth(50);
    sign1.setAngle(-18);
    this.addSoftShadowBelow(sign1, 22, 0x000000, 0.28);
    this.faceLayers?.deco.add(sign1);

    const signBlock = this.add.zone(signPos.x, signPos.y, 10, 10);
    this.physics.add.existing(signBlock, true);
    this.physics.add.collider(this.player, signBlock);

    this.makeObjectInteractable(sign1, {
      hitRadius: 40,
      paddingX: 0,
      paddingY: 0,
      onUse: () => {
        this.scene.start("kvq_driehoeken");
      }
    })
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }
}
