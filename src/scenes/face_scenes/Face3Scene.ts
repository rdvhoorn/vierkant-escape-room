import FaceBase from "./_FaceBase";

export default class Face3Scene extends FaceBase {
  constructor() {
    super("Face3Scene");
  }

  create() {
    console.log("[ENTER]", this.scene.key);
    this.ensureEnergyInitialized(0);
    
    const faceTravelTargets = [
      "Face1Scene",
      "Face2Scene",
      "Face9Scene",
      "Face4Scene",
      "Face7Scene",
    ];

    const colorMap: Record<string, number> = {
      Face1Scene: 0x311111,
      Face2Scene: 0x311111,
      Face9Scene: 0x311111,
      Face4Scene: 0x311111,
      Face7Scene: 0x311111,
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
