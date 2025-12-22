import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap } from "./_FaceConfig";

export default class Face7Scene extends FaceBase {
  constructor() {
    super("Face7Scene");
  }

  create() {
    console.log("[ENTER]", this.scene.key);
    this.ensureEnergyInitialized(0);

    const cfg = getFaceConfig("Face7Scene");
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
    const chest_pos = new Phaser.Math.Vector2(center.x, center.y);
    const chest = this.add
      .image(chest_pos.x, chest_pos.y, "chest_2")
      .setOrigin(0.5, 0.6)
      .setDisplaySize(976/15, 781/15)
      .setDepth(50);
    this.faceLayers?.deco.add(chest);

    const chestBlock1 = this.add.zone(chest_pos.x, chest_pos.y-20, 976/15, 25);
    this.physics.add.existing(chestBlock1, true);
    this.physics.add.collider(this.player, chestBlock1);
    this.makeObjectInteractable(chest, {
      hitRadius: 50,
      paddingX: 10,
      paddingY: 10,
      hintText: "E: Bekijk het slot op de kist",
      onUse: () => {
        this.scene.start("kvq_antwoorden_invullen");
      }
    })
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }
}
