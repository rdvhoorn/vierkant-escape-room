import Phaser from "phaser";
import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap } from "./_FaceConfig";

// TANGRAM SCENE!!
export default class Face2Scene extends FaceBase {
  private npcPos = new Phaser.Math.Vector2();
  private npcHitRadius = 50;

  private dialogBox?: Phaser.GameObjects.Rectangle;
  private dialogText?: Phaser.GameObjects.Text;
  private dialogLines: string[] = [];
  private dialogIndex = 0;
  private dialogActive = false;
  private goToTangramAfterDialog = false;

  constructor() {
    super("Face2Scene");
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

  // ---------------- NPC + dialog ----------------

  private addPlaceholderNpc() {
    const { width, height } = this.scale;
    const layers = this.getFaceLayers();

    // Simple little “person” rectangle on the face
    this.npcPos.set(width / 2 + 40, height / 2);
    const npc = this.add
      .rectangle(this.npcPos.x, this.npcPos.y, 22, 34, 0xffcc88)
      .setStrokeStyle(2, 0x3a230f);
    layers.actors.add(npc);

    // Register interaction via your HUD system
    this.registerInteraction(
      (player) =>
        Phaser.Math.Distance.Between(
          player.x,
          player.y,
          this.npcPos.x,
          this.npcPos.y
        ) < this.npcHitRadius,
      () => this.handleNpcInteraction(),
      { hintText: "Praat met reiziger: E" }
    );
  }

  private handleNpcInteraction() {
    if (!this.dialogActive) {
      this.startConversation();
    } else {
      this.advanceConversation();
    }
  }

  private ensureDialogUi() {
    if (this.dialogText && this.dialogText.scene && this.dialogText.active) {
      return;
    }

    const { width, height } = this.scale;

    this.dialogBox?.destroy();
    this.dialogText?.destroy();
    this.dialogBox = this.add
      .rectangle(width / 2 + 100, height - 80, width - 100, 100, 0x1b2748, 0.9)
      .setStrokeStyle(2, 0x3c5a99)
      .setDepth(999);

    this.dialogText = this.add
      .text(
        this.dialogBox.x - this.dialogBox.width / 2 + 20,
        this.dialogBox.y - 40,
        "",
        {
          fontFamily: "sans-serif",
          fontSize: "18px",
          color: "#e7f3ff",
          wordWrap: { width: this.dialogBox.width - 40, useAdvancedWrap: true },
        }
      )
      .setDepth(1000);

    this.dialogBox.setVisible(false);
    this.dialogText.setVisible(false);
  }


  private startConversation() {
    this.ensureDialogUi();
    this.playerController.setInputEnabled(false);

    const tangramSolved = !!this.registry.get("tangram_puzzle_solved");

    if (tangramSolved) {
      // 1. Puzzle already solved → short thank-you dialog
      this.dialogLines = [
        "Reiziger: Dank je wel voor het helpen! Ik hoop dat je goed gebruik kan maken van de brandstof!",
      ];
      this.goToTangramAfterDialog = false;
    } else {
      // 2. Puzzle not solved → normal dialog that leads into tangram select
      this.dialogLines = [
        "Reiziger: Hé, jij ziet er nieuw uit op dit vlak.",
        "Jij: Net geland. Weet je waar ik wat energie kan vinden?",
        "Reiziger: Sommige vlakken verbergen meer dan ze laten zien… kijk goed rond.",
        "Reiziger: Kom, dan laat ik je een puzzel zien.",
      ];
      this.goToTangramAfterDialog = true;
    }

    this.dialogIndex = 0;
    this.dialogActive = true;
    this.showDialog(this.dialogLines[0]);
  }

  private advanceConversation() {
    if (!this.dialogActive) return;
    this.dialogIndex++;
    if (this.dialogIndex >= this.dialogLines.length) {
      this.endConversation();
    } else {
      this.showDialog(this.dialogLines[this.dialogIndex]);
    }
  }

  private showDialog(text: string) {
    if (!this.dialogBox || !this.dialogText) return;
    this.dialogBox.setVisible(true);
    this.dialogText.setVisible(true);
    this.dialogText.setText(text);
  }

  private endConversation() {
    this.dialogActive = false;
    this.playerController.setInputEnabled(true);

    if (this.dialogBox) this.dialogBox.setVisible(false);
    if (this.dialogText) this.dialogText.setVisible(false);

    if (this.goToTangramAfterDialog) {
      this.scene.start("TangramSelectScene");
    }
  }
}
