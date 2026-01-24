import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap, PuzzleKey } from "./_FaceConfig";

export default class Face9Scene extends FaceBase {
  private entry_from_puzzle = false;

  constructor() {
    super("Face9Scene");
  }

  init(data?: any) {
    super.init(data);
    this.entry_from_puzzle = !!data?.entry_from_puzzle;
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

    // Give reward if returning from solved puzzle
    if (this.entry_from_puzzle && this.registry.get("phonebox_solved")) {
      this.addPuzzleRewardIfNotObtained(PuzzleKey.PhoneBox);
    }
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }
} 