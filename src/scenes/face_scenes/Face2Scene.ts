import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap, PUZZLE_REWARDS, PuzzleKey } from "./_FaceConfig";

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

    const baseLayers = this.getFaceLayers();

    this.addFarmer();

    // ---- Farm building ----
    const center = this.getPolygonCenter(this.poly);
    const farmPos = new Phaser.Math.Vector2(center.x, center.y-50);

    const farm = this.add
      .image(farmPos.x, farmPos.y, "farm")
      .setOrigin(0.5, 0.6)
      .setDisplaySize(200, 200)
      .setDepth(50);
    baseLayers.deco?.add(farm);

    const farmBlock = this.add.zone(farmPos.x, farmPos.y-60, 100, 100);
    this.physics.add.existing(farmBlock, true);
    this.physics.add.collider(this.player, farmBlock);
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }

  // ---------------- NPC + dialog using helpers ----------------
  private addFarmer() {
    const layers = this.getFaceLayers();

    const center= this.getPolygonCenter(this.poly);
    const farmerPos = new Phaser.Math.Vector2(center.x + 40, center.y);
    const farmer = this.add.image(farmerPos.x, farmerPos.y, "farmer").setOrigin(0.5, 0.6).setDisplaySize(44*2.5, 56*2.5).setDepth(70);
    layers.actors.add(farmer);

    const puzzleSolved = !!this.registry.get(PUZZLE_REWARDS[PuzzleKey.Tangram].puzzleSolvedRegistryKey);

    const handle = this.createDialogInteraction(farmer, {
      hitRadius: 100,
      hintText: "Praat met reiziger: E",
      buildLines: () => {
        if (this.entry_from_puzzle && puzzleSolved) {
          return [
            { speaker: "Henk", text: "Dankjewel voor het helpen! Ik hoop dat je goed gebruik kan maken van de brandstof!" },
          ];
        } else if (this.entry_from_puzzle && !puzzleSolved) {
          return [
            { speaker: "Henk", text: "Ik zoek zelf wel nog wat verder, maar ik kan altijd nog je hulp gebruiken. Kom vooral later nog terug!" }
          ]
        } else if (!this.entry_from_puzzle && puzzleSolved) {
          return [
            { speaker: "Henk", text: "Dankjewel voor je hulp! Ik ben zo blij dat al mijn dieren terug zijn!" },
          ];
        } else {
          return [
            { speaker: "Henk", text: "Hé, jij ziet er nieuw uit op dit vlak." },
            { speaker: "Jij", text: "Net geland. Weet je waar ik wat energie kan vinden?" },
            { speaker: "Henk", text: "Sommige vlakken verbergen meer dan ze laten zien… kijk goed rond." },
            { speaker: "Henk", text: "Kom, dan laat ik je een puzzel zien." },
          ];
        }
      },
      onComplete: () => {
        if (this.entry_from_puzzle && puzzleSolved) {
          this.addPuzzleRewardIfNotObtained(PuzzleKey.Tangram);
        }
        if (!this.entry_from_puzzle && !puzzleSolved) {
          this.scene.start("TangramSelectScene");
        }
        if (this.entry_from_puzzle) {
          this.entry_from_puzzle = false;
        }
      },
    });

    this.travelerDialogHandle = handle;

    if (this.entry_from_puzzle) {
      // small delay so HUD/player/etc are fully ready
      this.time.delayedCall(50, () => {
        this.travelerDialogHandle?.start();
      });
    }
  }

}
