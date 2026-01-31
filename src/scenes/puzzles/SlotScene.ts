import Phaser from "phaser";
import { createBackButton } from "../../utils/BackButton";

export default class SlotScene extends Phaser.Scene {
  private returnSceneKey = "Face11Scene";
  private readonly correctCode = [0, 6, 7];
  private currentCode = [0, 0, 0];
  private codeTexts: Phaser.GameObjects.Text[] = [];
  private codeBgs: Phaser.GameObjects.Rectangle[] = []; 
  private feedbackText!: Phaser.GameObjects.Text;
  private selectedIndex = 0; 
  private erwts!: Phaser.GameObjects.Image;
  private dialogContainer!: Phaser.GameObjects.Container;
  private dialogText!: Phaser.GameObjects.Text;
  private speakerText!: Phaser.GameObjects.Text; 
  private isDialogueActive = false;
  private dialogueLines: { speaker: string; text: string }[] = [];
  private currentLineIndex = 0;

  constructor() {
    super("SlotScene");
  }

  init(data: { returnScene?: string }) {
    if (data?.returnScene) this.returnSceneKey = data.returnScene;
    
    this.currentCode = [0, 0, 0];
    this.selectedIndex = 0;
    this.isDialogueActive = false;
    this.currentLineIndex = 0;
    this.dialogueLines = [];
    
    this.codeTexts = [];
    this.codeBgs = [];
  }

  preload() {
    this.load.image("erwts", "assets/decor/erwts.png");
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    createBackButton(this, undefined, undefined, () => {
        if (!this.isDialogueActive) this.exitScene();
    });

    // Title
    this.add.text(width / 2, 50, "Cijferslot", {
      fontFamily: "sans-serif",
      fontSize: "32px",
      color: "#ffffff",
    }).setOrigin(0.5);

    // Hints
    const hints = [
      "478 → 1 goed, verkeerde plaats",
      "368 → 1 goed, goede plaats",
      "374 → 1 goed, verkeerde plaats",
      "740 → 2 goed, verkeerde plaats",
      "Klik op een vakje op dat vakje te veranderen",
      "Type het cijfer of gebruik de pijltjes"
    ];

    const hintsY = 120;
    hints.forEach((hint, i) => {
      this.add.text(width / 2, hintsY + i * 30, hint, {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#aaffaa",
      }).setOrigin(0.5);
    });

    // Code input area
    const codeY = height / 2 + 30;
    const digitWidth = 80;
    const gap = 20;
    const totalWidth = 3 * digitWidth + 2 * gap;
    const startX = (width - totalWidth) / 2 + digitWidth / 2;

    for (let i = 0; i < 3; i++) {
      const x = startX + i * (digitWidth + gap);

      // Digit background
      const bg = this.add.rectangle(x, codeY, digitWidth, 100, 0x333355)
        .setStrokeStyle(3, 0x6666aa)
        .setInteractive({ useHandCursor: true })
        .setDepth(10);
      
      bg.on('pointerdown', () => this.selectSlot(i));
      this.codeBgs.push(bg);

      // Up arrow
      const upBtn = this.add.text(x, codeY - 60, "▲", {
        fontSize: "28px",
        color: "#88aaff",
      }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(10); 

      upBtn.on("pointerdown", () => {
          this.selectSlot(i);
          this.changeDigit(i, 1);
      });
      upBtn.on("pointerover", () => upBtn.setColor("#ffffff"));
      upBtn.on("pointerout", () => upBtn.setColor("#88aaff"));

      // Down arrow
      const downBtn = this.add.text(x, codeY + 60, "▼", {
        fontSize: "28px",
        color: "#88aaff",
      }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(10); 

      downBtn.on("pointerdown", () => {
          this.selectSlot(i);
          this.changeDigit(i, -1);
      });
      downBtn.on("pointerover", () => downBtn.setColor("#ffffff"));
      downBtn.on("pointerout", () => downBtn.setColor("#88aaff"));

      // Digit text
      const digitText = this.add.text(x, codeY, "0", {
        fontFamily: "monospace",
        fontSize: "48px",
        color: "#ffffff",
      }).setOrigin(0.5)
        .setDepth(11); 

      this.codeTexts.push(digitText);
    }

    this.selectSlot(0);

    // Check button
    const checkBtn = this.add.text(width / 2, codeY + 120, "[ PROBEER CODE ]", {
      fontSize: "24px",
      color: "#00ff00",
      backgroundColor: "#224422",
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(10);

    checkBtn.on("pointerdown", () => this.checkCode());
    checkBtn.on("pointerover", () => checkBtn.setBackgroundColor("#336633"));
    checkBtn.on("pointerout", () => checkBtn.setBackgroundColor("#224422"));

    // Feedback text
    this.feedbackText = this.add.text(width / 2, codeY + 180, "", {
      fontSize: "20px",
      color: "#ff6666",
    }).setOrigin(0.5).setDepth(10);
    this.erwts = this.add.image(width * 0.8, height + 200, "erwts") 
        .setOrigin(0.5, 1)
        .setScale(0.4)
        .setFlipX(true) 
        .setDepth(20);

    this.createDialogUI(width, height);

    // Keyboard input
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
        if (this.isDialogueActive) {
            if (event.key === " " || event.key === "Enter") {
                this.advanceDialogue();
            }
            return;
        }

        const key = event.key;
        if (key === "Enter") {
            this.checkCode();
        } else if (/^[0-9]$/.test(key)) {
            this.setDigit(this.selectedIndex, parseInt(key));
            this.selectSlot((this.selectedIndex + 1) % 3);
        } else if (key === "ArrowLeft") {
            this.selectSlot((this.selectedIndex - 1 + 3) % 3);
        } else if (key === "ArrowRight") {
            this.selectSlot((this.selectedIndex + 1) % 3);
        } else if (key === "ArrowUp") {
            this.changeDigit(this.selectedIndex, 1);
        } else if (key === "ArrowDown") {
            this.changeDigit(this.selectedIndex, -1);
        } else if (key === "Backspace") {
            this.setDigit(this.selectedIndex, 0);
            this.selectSlot(Math.max(0, this.selectedIndex - 1));
        }
    });

    this.input.on('pointerdown', () => {
        if (this.isDialogueActive) this.advanceDialogue();
    });
  }

  private createDialogUI(width: number, height: number) {
      this.dialogContainer = this.add.container(0, 0).setDepth(30).setVisible(false);

      const panelHeight = 160;
      const panelY = height - panelHeight - 20;

      const bg = this.add.rectangle(width / 2, panelY + panelHeight / 2, width - 100, panelHeight, 0x000000, 0.9)
          .setStrokeStyle(4, 0xffffff);
      
      this.speakerText = this.add.text(width / 2 - (width - 140) / 2, panelY + 20, "", {
          fontFamily: "sans-serif",
          fontSize: "24px",
          color: "#ffff00", 
          fontStyle: "bold"
      }).setOrigin(0, 0);

      this.dialogText = this.add.text(width / 2, panelY + 80, "", {
          fontFamily: "monospace",
          fontSize: "20px",
          color: "#ffffff",
          align: "left",
          wordWrap: { width: width - 150 }
      }).setOrigin(0.5, 0.5);

      const hint = this.add.text(width - 80, height - 50, "▼", {
          fontSize: "20px", color: "#ffff00"
      }).setOrigin(1);

      this.tweens.add({
          targets: hint,
          y: height - 40,
          duration: 500,
          yoyo: true,
          repeat: -1
      });

      this.dialogContainer.add([bg, this.speakerText, this.dialogText, hint]);
  }

  private selectSlot(index: number) {
      if (this.isDialogueActive) return;

      this.selectedIndex = index;
      this.codeBgs.forEach((bg, i) => {
          if (!bg.active) return; 
          if (i === index) {
              bg.setStrokeStyle(4, 0x00ff00);
              bg.setFillStyle(0x444466);
          } else {
              bg.setStrokeStyle(3, 0x6666aa);
              bg.setFillStyle(0x333355);
          }
      });
  }

  private changeDigit(index: number, delta: number) {
    if (this.isDialogueActive || !this.codeTexts[index]?.active) return; 

    this.currentCode[index] = (this.currentCode[index] + delta + 10) % 10;
    this.codeTexts[index].setText(this.currentCode[index].toString());
    this.feedbackText.setText("");
  }

  private setDigit(index: number, value: number) {
      if (this.isDialogueActive || !this.codeTexts[index]?.active) return; 

      this.currentCode[index] = value;
      this.codeTexts[index].setText(value.toString());
      this.feedbackText.setText("");
  }

  private checkCode() {
    if (this.isDialogueActive) return;

    const isCorrect =
      this.currentCode[0] === this.correctCode[0] &&
      this.currentCode[1] === this.correctCode[1] &&
      this.currentCode[2] === this.correctCode[2];

    if (isCorrect) {
      this.feedbackText.setColor("#00ff00");
      this.feedbackText.setText("Correct! De deur gaat open...");
      this.registry.set("slot_solved", true);
      this.isDialogueActive = true; 
      this.startEndingSequence();

    } else {
      this.feedbackText.setColor("#ff6666");
      this.feedbackText.setText("Dat klopt niet, probeer opnieuw");
    }
  }

  private startEndingSequence() {
      const { height } = this.scale;
      
      this.tweens.add({
          targets: this.erwts,
          y: height - 160, 
          duration: 1000,
          ease: 'Back.out',
          onComplete: () => {
              this.startDialogue([
                  { speaker: "???", text: "Dankjewel voor je hulp" },
                  { speaker: "Erwts", text: "Ik ben Erwts, wat kan ik voor je doen om te laten zien hoe dankbaar ik ben dat je me hebt kunnen bevrijden?" },
                  { speaker: "Jij", text: "Nou, ik moet terug naar planeet aarde, heb je misschien wat energie voor mij?" },
                  { speaker: "Erwts", text: "Met zo'n groot ruimteschip heb ik altijd extra energie bij me. Hier, neem dit maar mee." },
                  { speaker: "Jij", text: "Bedankt Erwts. Pas de volgende keer op met slot als je gaat klussen!" },
              ]);
          }
      });
  }

  private startDialogue(lines: { speaker: string; text: string }[]) {
      this.dialogueLines = lines;
      this.currentLineIndex = 0;
      this.dialogContainer.setVisible(true);
      this.showNextLine();
  }

  private showNextLine() {
      if (this.currentLineIndex < this.dialogueLines.length) {
          const line = this.dialogueLines[this.currentLineIndex];
          this.speakerText.setText(line.speaker);
          this.dialogText.setText(line.text);
          this.currentLineIndex++;
      } else {
          this.dialogContainer.setVisible(false);
          this.time.delayedCall(500, () => this.exitScene());
      }
  }

  private advanceDialogue() {
      if (!this.dialogContainer.visible) return;

      this.showNextLine();
  }

  private exitScene() {
    this.scene.start(this.returnSceneKey, {
      spawnX: this.scale.width / 2,
      spawnY: this.scale.height / 2 + 60,
      cameFromScene: "SlotScene",
      entry_from_puzzle: true,
    });
  }
}