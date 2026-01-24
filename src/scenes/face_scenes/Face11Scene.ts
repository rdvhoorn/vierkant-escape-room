import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap, PuzzleKey, PUZZLE_REWARDS } from "./_FaceConfig";

export default class Face11Scene extends FaceBase {
  private entry_from_puzzle = false;

  constructor() {
    super("Face11Scene");
  }

  init(data?: any) {
    super.init(data);
    this.entry_from_puzzle = !!data?.entry_from_puzzle;
  }

  preload() {
    this.load.image("ufo_slot", "assets/decor/slot/ufo met slot.webp");
  }

  create() {
    console.log("[ENTER]", this.scene.key);
    const cfg = getFaceConfig("Face11Scene");
    const { radius, neighbors, visuals } = cfg;
    const colorMap = buildNeighborColorMap(neighbors);

    this.initStandardFace({
      radius,
      faceTravelTargets: neighbors,
      mainFill: visuals.mainFill,
      neighborFill: visuals.neighborFill ?? visuals.mainFill,
      colorMap,
      edgeTriggerScale: visuals.edgeTriggerScale,
      backgroundColor: visuals.backgroundColor,
      showLabel: visuals.showLabel ?? true,
    });

    if (!this.faceLayers) return;

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    const ufo = this.add.image(centerX, centerY - 20, "ufo_slot");
    ufo.setScale(0.5);
    this.faceLayers.actors.add(ufo);

    // Gentle hover animation
    this.tweens.add({
      targets: ufo,
      y: centerY - 30,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.addSoftShadowBelow(ufo, 60, 0x000000, 0.3);

    const rewardConfig = PUZZLE_REWARDS[PuzzleKey.Slot];
    const isSolved = !!this.registry.get(rewardConfig.puzzleSolvedRegistryKey);

    // Give reward if returning from solved puzzle
    if (this.entry_from_puzzle && isSolved) {
      this.addPuzzleRewardIfNotObtained(PuzzleKey.Slot);
    }

    // Interaction: go to SlotScene if not solved
    this.makeObjectInteractable(ufo, {
      hitRadius: 80,
      hintText: isSolved ? "" : "Druk op E",
      onUse: () => {
        if (!isSolved) {
          this.scene.start("SlotScene", { returnScene: "Face11Scene" });
        }
      },
    });
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }
}
