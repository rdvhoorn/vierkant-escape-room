import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap } from "./_FaceConfig";

export default class Face2Scene extends FaceBase {
  private entry_from_puzzle: boolean = false;
  private travelerDialogHandle?: { start: () => void };

  constructor() {
    super("Face2Scene");
  }

  init(data?: any) {
    super.init(data);
    this.entry_from_puzzle = !!data?.entry_from_puzzle;
  }

  create() {
    this.ensureEnergyInitialized(0);

    const cfg = getFaceConfig("Face2Scene");
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

    this.addPlaceholderNpc();
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }

  // ---------------- NPC + dialog using helpers ----------------
  private addPlaceholderNpc() {
    const { width, height } = this.scale;
    const layers = this.getFaceLayers();

    const npcWidth = 22;
    const npcHeight = 34;

    const npc = this.add
      .rectangle(width / 2 + 40, height / 2, npcWidth, npcHeight, 0xffcc88)
      .setStrokeStyle(2, 0x3a230f);

    layers.actors.add(npc);

    const handle = this.createDialogInteraction(npc, {
      hitRadius: 50,
      hintText: "Praat met reiziger: E",
      buildLines: () => {
        const tangramSolved = !!this.registry.get("tangram_puzzle_solved");

        if (tangramSolved) {
          // Puzzle already solved → short thank-you dialog
          return [
            "Reiziger: Dankjewel voor het helpen! Ik hoop dat je goed gebruik kan maken van de brandstof!",
          ];
        }

        // Puzzle not solved → dialog that leads into tangram select
        return [
          "Reiziger: Hé, jij ziet er nieuw uit op dit vlak.",
          "Jij: Net geland. Weet je waar ik wat energie kan vinden?",
          "Reiziger: Sommige vlakken verbergen meer dan ze laten zien… kijk goed rond.",
          "Reiziger: Kom, dan laat ik je een puzzel zien.",
        ];
      },
      onComplete: () => {
        const tangramSolved = !!this.registry.get("tangram_puzzle_solved");
        if (!tangramSolved) {
          this.scene.start("TangramSelectScene");
        }
      },
    });

    this.travelerDialogHandle = handle;

    // 👉 If we just came back from the puzzle, immediately resume dialog
    if (this.entry_from_puzzle) {
      // small delay so HUD/player/etc are fully ready
      this.time.delayedCall(50, () => {
        this.travelerDialogHandle?.start();
      });
    }
  }

}
