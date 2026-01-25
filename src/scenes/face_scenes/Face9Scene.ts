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
      neighborFill: 0x500a0a,  
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

    const isSolved = this.registry.get("phonebox_solved");

    const handle = this.createDialogInteraction(phonebox, {
      hitRadius: 100,
      paddingX: -80,
      hintText: isSolved ? "Bekijk telefooncel" : "Druk op E",
      buildLines: () => {
        if (isSolved) {
            return [
                { text: "De puzzel van de telefooncel is opgelost.", speaker: "" },
                { text: "Er komt geen geluid meer uit, en de deur gaat niet meer open.", speaker: "" }
            ];
        } else {
            return [
                { text: "Er komt geluid uit de telefooncel", speaker: "" },
                { text: "Hé jij daar, luister even goed, ben een telefoon met oude kracht.", speaker: "Telefooncel" },
                { text: "In mij verstopt zit een geheime code, maar alleen wie goed raadt krijgt mijn macht.", speaker: "Telefooncel" },
                { text: "Toets de cijfers één voor één, dan ga ik aan en wordt het fijn", speaker: "Telefooncel" },
                { text: "Druk de knoppen rustig in, dan gaat je wens snel in vervulling zijn", speaker: "Telefooncel" },
                { text: "Vraag mij kracht voor jouw reis terug, energie om naar huis te gaan", speaker: "Telefooncel" },
                { text: "Ontcijfer mij, je kunt het heus, en ik zal voor je openstaan", speaker: "Telefooncel" },
            ];
        }
      },
      onComplete: () => {
        if (!isSolved) {
            this.scene.start("PhoneBoxScene", { returnScene: "Face9Scene" });
        }
      },
    });
    phonebox.setData("dialogHandle", handle);

    if (this.entry_from_puzzle && isSolved) {
      this.addPuzzleRewardIfNotObtained(PuzzleKey.PhoneBox);
    }
  }

  update(_time: number, delta: number) {
    this.baseFaceUpdate(delta);
  }
}