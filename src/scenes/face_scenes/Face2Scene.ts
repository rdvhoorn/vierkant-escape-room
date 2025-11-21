import FaceBase from "./_FaceBase";

export default class Face2Scene extends FaceBase {
  constructor() {
    super("Face2Scene");
  }

  create() {
    console.log("[ENTER]", this.scene.key);
    this.ensureEnergyInitialized(0);

    const faceTravelTargets: (string | null)[] = [
      "Face1Scene",
      "Face3Scene",
      "Face4Scene",
      "Face5Scene",
      "Face6Scene",
    ];

    const colorMap: Record<string, number> = {
      Face1Scene: 0x311111,
      Face3Scene: 0x311111,
      Face4Scene: 0x311111,
      Face5Scene: 0x311111,
      Face6Scene: 0x311111,
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
