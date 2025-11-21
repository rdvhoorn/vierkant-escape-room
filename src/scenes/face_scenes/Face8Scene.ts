import FaceBase from "./_FaceBase";

export default class Face8Scene extends FaceBase {
  constructor() {
    super("Face8Scene");
  }

  create() {
    console.log("[ENTER]", this.scene.key);
    this.ensureEnergyInitialized(0);

    const faceTravelTargets = [
      "Face2Scene",
      "Face6Scene",
      "Face11Scene",
      "Face12Scene",
      "Face7Scene",
    ];

    const colorMap: Record<string, number> = {
      Face2Scene: 0x311111,
      Face6Scene: 0x311111,
      Face11Scene: 0x311111,
      Face12Scene: 0x311111,
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
