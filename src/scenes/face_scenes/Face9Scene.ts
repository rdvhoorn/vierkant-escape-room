import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap } from "./_FaceConfig";

export default class Face9Scene extends FaceBase {
  constructor() {
    super("Face9Scene");
  }

  preload() {
    this.load.image("phonebox", "assets/decor/phonebox.png");
  }

  create() {
    console.log("[ENTER]", this.scene.key);

    const cfg = getFaceConfig("Face9Scene");
    const { radius, neighbors, visuals } = cfg;
    const colorMap = buildNeighborColorMap(neighbors);

    this.initStandardFace({
      radius,
      faceTravelTargets: neighbors,
      mainFill: 0x8a1c1c,       
      neighborFill: 0x500a0a,  //idk hoe mooi dit is
      colorMap,
      edgeTriggerScale: visuals.edgeTriggerScale,
      backgroundColor: visuals.backgroundColor,
      showLabel: visuals.showLabel ?? true,
    });

    if (!this.faceLayers) return;
    const { actors } = this.faceLayers;
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    const phonebox = this.add.image(centerX, centerY + 20, "phonebox");
    const scaleFactor = 0.5; 
    phonebox.setScale(scaleFactor);
    phonebox.setOrigin(0.5, 1);
    actors.add(phonebox);
    this.addSoftShadowBelow(phonebox, 60 * scaleFactor, 0x000000, 0.4);

    const handle = this.createDialogInteraction(phonebox, {
      hitRadius: 100,
      paddingX: -80,
      hintText: "Druk op E",
      buildLines: () => [
        { text: "De tekst komt hier", speaker: "Telefooncel" },
        { text: "even kijken hoeveel stappen dat in moet, het is vrij veel", speaker: "Telefooncel" }
      ],
      onComplete: () => {
        this.scene.start("PhoneBoxScene", { returnScene: "Face9Scene" });
      },
    });
    phonebox.setData("dialogHandle", handle);
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }
} 