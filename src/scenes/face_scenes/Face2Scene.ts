import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap } from "./_FaceConfig";

export default class Face2Scene extends FaceBase {
  constructor() {
    super("Face2Scene");
  }

  create() {
    console.log("[ENTER]", this.scene.key);
    this.ensureEnergyInitialized(0);

    const cfg = getFaceConfig("Face2Scene");
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
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }
}
