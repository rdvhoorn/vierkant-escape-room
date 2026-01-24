// TangramSelectScene.ts
import Phaser from "phaser";
import { createBackButton } from "../../../utils/BackButton";
import { PUZZLE_REWARDS, PuzzleKey } from "../../face_scenes/_FaceConfig";

interface TangramLevel {
  key: string;          // Scene key of the puzzle
  label: string;        // Display name
  registryFlag: string; // Registry key for "solved" state
}

export default class TangramSelectScene extends Phaser.Scene {
  private levels: TangramLevel[] = [
    {
      key: "TangramKikkerScene",
      label: "Mijn kikkertje",
      registryFlag: "tangram_kikker_solved",
    },
    {
      key: "TangramSchildpadScene",
      label: "Mijn schildpad",
      registryFlag: "tangram_schildpad_solved",
    },
    {
      key: "TangramKrabScene",
      label: "En mijn krabbetje",
      registryFlag: "tangram_krab_solved",
    },
  ];

  private levelTextObjects: Phaser.GameObjects.Text[] = [];

  constructor() {
    super("TangramSelectScene");
  }

  create() {
    const { width, height } = this.scale;

    // Back button
    createBackButton(this, "Face2Scene", { entry_from_puzzle: true });

    // 🔧 IMPORTANT: reset the stored text objects when the scene (re)starts
    this.levelTextObjects = [];

    this.add
        .text(width / 2, height * 0.2, "Kun jij mijn dieren terugvinden?", {
        fontFamily: "sans-serif",
        fontSize: "36px",
        color: "#ffffff",
        })
        .setOrigin(0.5);

    this.add.text(width / 2, height * 0.3, "Klik een van de dieren om de schaduw na te maken", {
        fontFamily: "sans-serif",
        fontSize: "24px",
        color: "#ffffff",
    }).setOrigin(0.5);

    const startY = height * 0.5;
    const gap = 70;

    this.levels.forEach((level, index) => {
        const y = startY + index * gap;
        const isSolved = this.registry.get(level.registryFlag) === true;
        const label = isSolved ? `${level.label} ✓` : level.label;

        const textObj = this.add
        .text(width / 2, y, label, {
            fontFamily: "sans-serif",
            fontSize: "28px",
            color: isSolved ? "#00ff00" : "#ffffff",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        textObj.on("pointerover", () => {
        textObj.setStyle({ fontSize: "30px" });
        });

        textObj.on("pointerout", () => {
        textObj.setStyle({ fontSize: "28px" });
        });

        textObj.on("pointerup", () => {
        this.scene.start(level.key);
        });

        this.levelTextObjects.push(textObj);
    });

    this.events.on(Phaser.Scenes.Events.WAKE, this.updateLevelStates, this);

    // This is okay now, because levelTextObjects only has the *new* objects
    this.updateLevelStates();
    }

  private updateLevelStates() {
    this.levels.forEach((level, index) => {
      const textObj = this.levelTextObjects[index];
      if (!textObj) return;

      const isSolved = this.registry.get(level.registryFlag) === true;
      const label = isSolved ? `${level.label} ✓` : level.label;

      textObj.setText(label);
      textObj.setColor(isSolved ? "#00ff00" : "#ffffff");
    });

    this.checkAllSolved();
  }

  private checkAllSolved() {
    const allSolved = this.levels.every(
      (level) => this.registry.get(level.registryFlag) === true
    );

    if (allSolved) {
      this.registry.set(PUZZLE_REWARDS[PuzzleKey.Tangram].puzzleSolvedRegistryKey, true);

      this.time.delayedCall(400, () => {
        // 👇 pass the "came from puzzle" flag
        this.scene.start("Face2Scene", { entry_from_puzzle: true });
      });
    }
  }


  shutdown() {
    this.events.off(Phaser.Scenes.Events.WAKE, this.updateLevelStates, this);
  }
}
