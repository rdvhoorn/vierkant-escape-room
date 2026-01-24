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
      hintText: "Praat met de boer: E",
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
            { speaker: "Henk", text: "Hier is de brandstof die ik je beloofd had. Succes met je reis terug naar huis!" },
          ];
        } else {
          return [
            { speaker: "Henk", text: "Hoi! Ik ben Henk. Ik ben hier wat ze op aarde boer noemen geloof ik. Welkom op onze planeet!" },
            { speaker: "Jij", text: "Hoi Henk! Ik ben hier neergestort en ik probeer nu genoeg energie te verzamelen om terug naar huis te reizen. Kun jij me misschien helpen?" },
            { speaker: "Henk", text: "Ja, als jij me helpt om mijn dieren weer terug te krijgen, dan krijg jij een deel van mijn energievoorraad." },
            { speaker: "Henk", text: "Ik heb een speciaal compas om ze terug te halen. Het enige wat jij hoeft te doen is hun schaduw precies na te maken met mijn speciale stenen." },
            { speaker: "Henk", text: "Er zijn drie soorten dieren, de schaduw van de kikker is het makkelijkst, die van de krab het moeilijkst en die van de schildpad zit er tussen in." },
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
