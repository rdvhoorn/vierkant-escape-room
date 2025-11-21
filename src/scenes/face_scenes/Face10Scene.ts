import FaceBase from "./_FaceBase";

export default class Face10Scene extends FaceBase {
  constructor() {
    super("Face10Scene");
  }

  create() {
    console.log("[ENTER]", this.scene.key);
    this.ensureEnergyInitialized(0);

    const faceTravelTargets = [
      "Face4Scene",
      "Face5Scene",
      "Face11Scene",
      "Face12Scene",
      "Face9Scene",
    ];

    const colorMap: Record<string, number> = {
      Face4Scene: 0x311111,
      Face5Scene: 0x311111,
      Face11Scene: 0x311111,
      Face12Scene: 0x311111,
      Face9Scene: 0x311111,
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
