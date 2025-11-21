import FaceBase from "./_FaceBase";

export default class Face7Scene extends FaceBase {
  constructor() {
    super("Face7Scene");
  }

  create() {
    console.log("[ENTER]", this.scene.key);
    this.ensureEnergyInitialized(0);
    const faceTravelTargets = [
      "Face2Scene",
      "Face3Scene",
      "Face9Scene",
      "Face12Scene",
      "Face8Scene",
    ];

    const colorMap: Record<string, number> = {
      Face2Scene: 0x311111,
      Face3Scene: 0x311111,
      Face9Scene: 0x311111,
      Face12Scene: 0x311111,
      Face8Scene: 0x311111,
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
