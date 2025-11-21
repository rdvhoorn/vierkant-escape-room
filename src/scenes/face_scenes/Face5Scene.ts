import FaceBase from "./_FaceBase";

export default class Face5Scene extends FaceBase {
  constructor() {
    super("Face5Scene");
  }

  create() {
    console.log("[ENTER]", this.scene.key);
    this.ensureEnergyInitialized(0);

    const faceTravelTargets = [
      "Face1Scene",
      "Face4Scene",
      "Face11Scene",
      "Face6Scene",
      "Face10Scene",
    ];

    const colorMap: Record<string, number> = {
      Face1Scene: 0x311111,
      Face4Scene: 0x311111,
      Face11Scene: 0x311111,
      Face6Scene: 0x311111,
      Face10Scene: 0x311111,
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
