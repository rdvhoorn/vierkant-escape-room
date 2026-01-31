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
    //this.load.image("ufo_slot", "assets/decor/slot/ufo met slot.webp");
    this.load.image("ufo_slot_png", "assets/decor/slot/ufo met slot.png");
    this.load.image("erwts", "assets/decor/erwts.png");
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
      showLabel: visuals.showLabel,
    });

    if (!this.faceLayers) return;
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    const ufo = this.add.image(centerX, centerY - 20, "ufo_slot_png");
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

    if (isSolved) {
        const erwts = this.add.image(centerX + 50, centerY + 80, "erwts");
        erwts.setScale(0.35); 
        erwts.setFlipX(true); 
        this.faceLayers.actors.add(erwts);
        this.addSoftShadowBelow(erwts, 30, 0x000000, 0.3);
    }

    // Give reward if returning from solved puzzle
    if (this.entry_from_puzzle && isSolved) {
      this.addPuzzleRewardIfNotObtained(PuzzleKey.Slot);
    }

    const handle = this.createDialogInteraction(ufo, {
      hitRadius: 100, 
      hintText: "E / spatie: Onderzoek",

      buildLines: () => {
        const solved = !!this.registry.get(rewardConfig.puzzleSolvedRegistryKey);

        if (solved) {
          return [
            { speaker: "Erwts", text: "Bedankt dat je me hebt bevrijd." },
            { speaker: "Erwts", text: "Meer energie heb ik niet voor je." },
            { speaker: "Erwts", text: "Helaas is mijn UFO niet beschikbaar voor je als taxi." },
            { speaker: "Erwts", text: "Succes met het vinden van genoeg energie." },
          ];
        }

        return [
            { speaker: "???", text: "HELP! HELP! IEMAND HELP!!!" },
            { speaker: "Jij", text: "Hallo! Hoe kan ik helpen?" },
            { speaker: "???", text: "Nou kijk, ik was bezig met het vervangen van het tijdstof-filter. Daarna heb ik de koepel weer dichtgelast van binnenuit en nu zit ik opgesloten!" },
            { speaker: "Jij", text: "Hahaha, komt goed, ik zie hier een cijferslot op de deur. Vertel me de code en ik bevrijd je." },
            { speaker: "???", text: "OH NEEEE!! Die heb ik laatst vervangen en nu weet ik het niet meer." },
            { speaker: "Jij", text: "Heb je de code nergens opgeschreven?" },
            { speaker: "???", text: "Ja! Nee… Nou ja, ik wilde het niet letterlijk opschrijven, dus ik heb er een soort puzzel van gemaakt. In een vakje naast de deur kun je een briefje vinden. daarop staan hints voor de code. Maar of dat genoeg is…" },
        ];
      },

      onComplete: () => {
        const solved = !!this.registry.get(rewardConfig.puzzleSolvedRegistryKey);
        if (!solved) {
          this.scene.start("SlotScene", { returnScene: "Face11Scene" });
        }
      },
    });

    ufo.setData("dialogHandle", handle);
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }
}