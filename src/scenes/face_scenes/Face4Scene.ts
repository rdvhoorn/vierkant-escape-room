import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap } from "./_FaceConfig";

export default class Face4Scene extends FaceBase {
  constructor() {
    super("Face4Scene");
  }

  create() {
    console.log("[ENTER]", this.scene.key);

    this.ensureEnergyInitialized(0);

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

    if (!this.faceLayers) return;
    const { actors } = this.faceLayers;

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    //logic tower 
    const tower = this.add.image(centerX, centerY + 40, "tower");
    tower.setOrigin(0.5, 1);

    // de image is te groot
    const scaleFactor = 0.04;
    tower.setScale(scaleFactor);
    actors.add(tower);
    this.addSoftShadowBelow(tower, 80 * scaleFactor, 0x000000, 0.35);

    // interactie
    const handle = this.createDialogInteraction(tower, {
      hitRadius: 40,
      hintText: "Druk op E om de toren in te gaan",
      buildLines: () => [
        "dialogue hier"
      ],
      onComplete: () => {
        this.scene.start("LogicTower", { entry_from_face: true });
      },
    });
    tower.setData("dialogHandle", handle);
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }
}
