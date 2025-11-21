import FaceBase from "./_FaceBase";

export default class Face12Scene extends FaceBase {
  constructor() {
    super("Face12Scene");
  }

  create() {
    console.log("[ENTER]", this.scene.key);
    this.ensureEnergyInitialized(0);
  
    const faceTravelTargets = [
      "Face7Scene",
      "Face8Scene",
      "Face9Scene",
      "Face10Scene",
      "Face11Scene",
    ];

    const colorMap: Record<string, number> = {
      Face7Scene: 0x311111,
      Face8Scene: 0x311111,
      Face9Scene: 0x311111,
      Face10Scene: 0x311111,
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
