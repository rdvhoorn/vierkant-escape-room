import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap, PUZZLE_REWARDS, PuzzleKey } from "./_FaceConfig";

export default class Face7Scene extends FaceBase {
  private entry_from_puzzle: boolean = false;

  constructor() {
    super("Face7Scene");
  }

  init(data?: any) {
    super.init(data);
    this.entry_from_puzzle = !!data?.entry_from_puzzle;
  }

  create() {
    console.log("[ENTER]", this.scene.key);

    const cfg = getFaceConfig("Face7Scene");
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

    const puzzleSolved = !!this.registry.get(PUZZLE_REWARDS[PuzzleKey.KistVanQuadratus].puzzleSolvedRegistryKey)

    const image_str = puzzleSolved ? "chest_2_open" : "chest_2";
    const center = this.getPolygonCenter(this.poly);
    const chest_pos = new Phaser.Math.Vector2(center.x, center.y);
    const chest = this.add
      .image(chest_pos.x, chest_pos.y, image_str)
      .setOrigin(0.5, 0.6)
      .setDisplaySize(976/9, 781/9)
      .setDepth(50);
    this.faceLayers?.deco.add(chest);

    const quadratus = this.add.image(chest_pos.x + 40, chest_pos.y + 20, "quadratus_small")
      .setDepth(50).setDisplaySize(-200/2, 336/2);
    this.faceLayers?.deco.add(quadratus);

    const chestBlock1 = this.add.zone(chest_pos.x, chest_pos.y-40, 976/15, 25);
    this.physics.add.existing(chestBlock1, true);
    this.physics.add.collider(this.player, chestBlock1);
    
    const handle = this.createDialogInteraction(chest, {
      hitRadius: 100,
      hintText: "Bekijk het slot op de kist",
      buildLines: () => {
        if (this.entry_from_puzzle && puzzleSolved) {
          return [
            { speaker: "Quadratus", text: "De kist is open! Dankjewel voor het helpen!" },
            { speaker: "Quadratus", text: "Zoals beloofd, hier is je beloning." },
          ];
        } else if (this.entry_from_puzzle && !puzzleSolved) {
          return [
            { speaker: "Quadratus", text: "Hm, het lijkt erop dat ik de kist nog niet kan openen." },
            { speaker: "Quadratus", text: "Ik probeer zelf nog wel wat. Maar ik kan je hulp altijd nog gebruiken." },
          ];
        } else if (!this.entry_from_puzzle && puzzleSolved) {
          return [
            { speaker: "Quadratus", text: "Je hebt de kist al geopend! Heel erg bedankt voor je hulp!" },
          ];
        } else {
          return [
            { speaker: "Jij", text: "Hoi Quadratus! Wat heb je hier?" },
            { speaker: "Quadratus", text: "Hoi! Dit is mijn schatkist, maar ik weet niet meer hoe hij open moet. Ik ben de code vergeten. Kun jij me helpen?" },
            { speaker: "Quadratus", text: "Als je me helpt hem te openen, dan krijg je alle energie die hier in zit." }
          ];
        }

      },
      onComplete: () => {
        if (this.entry_from_puzzle && puzzleSolved) {
          this.addPuzzleRewardIfNotObtained(PuzzleKey.KistVanQuadratus)
        }
        if (!this.entry_from_puzzle && !puzzleSolved) {
          this.scene.start("kvq_antwoorden_invullen");
        }
        if (this.entry_from_puzzle) {
          this.entry_from_puzzle = false;
        }
      }
    })

    if (this.entry_from_puzzle) {
      this.time.delayedCall(50, () => {
        handle.start();
      })
    }
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }
}
