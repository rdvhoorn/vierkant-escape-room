import FaceBase from "./_FaceBase";

export default class Face6Scene extends FaceBase {
  constructor() {
    super("Face6Scene");
  }
  create() {
    console.log("[ENTER]", this.scene.key);
    this.ensureEnergyInitialized(0);

    const faceTravelTargets = [
      "Face1Scene",
      "Face5Scene",
      "Face8Scene",
      "Face2Scene",
      "Face11Scene",
    ];

    const colorMap: Record<string, number> = {
      Face1Scene: 0x311111,
      Face5Scene: 0x311111,
      Face8Scene: 0x311111,
      Face2Scene: 0x311111,
      Face11Scene: 0x311111,
    };

    this.initStandardFace({
      radius: 180,
      faceTravelTargets,
      mainFill: 0x311111,
      neighborFill: 0x311111,
      colorMap,
      edgeTriggerScale: 0.4,
      showLabel: true,
    });

  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }
}
