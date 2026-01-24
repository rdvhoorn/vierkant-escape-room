import Phaser from "phaser";

export default class SlotScene extends Phaser.Scene {
  private returnSceneKey = "Face11Scene";
  private readonly correctCode = [0, 6, 7];
  private currentCode = [0, 0, 0];
  private codeTexts: Phaser.GameObjects.Text[] = [];
  private feedbackText!: Phaser.GameObjects.Text;

  constructor() {
    super("SlotScene");
  }

  init(data: { returnScene?: string }) {
    if (data?.returnScene) this.returnSceneKey = data.returnScene;
    this.currentCode = [0, 0, 0];
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    // Title
    this.add.text(width / 2, 50, "Cijferslot", {
      fontFamily: "sans-serif",
      fontSize: "32px",
      color: "#ffffff",
    }).setOrigin(0.5);

    // Hints - the mastermind clues
    const hints = [
      "478 → 1 goed, verkeerde plaats",
      "368 → 1 goed, goede plaats",
      "374 → 1 goed, verkeerde plaats",
      "740 → 2 goed, verkeerde plaats",
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
      this.add.rectangle(x, codeY, digitWidth, 100, 0x333355)
        .setStrokeStyle(3, 0x6666aa);

      // Up arrow
      const upBtn = this.add.text(x, codeY - 60, "▲", {
        fontSize: "28px",
        color: "#88aaff",
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      upBtn.on("pointerdown", () => this.changeDigit(i, 1));
      upBtn.on("pointerover", () => upBtn.setColor("#ffffff"));
      upBtn.on("pointerout", () => upBtn.setColor("#88aaff"));

      // Down arrow
      const downBtn = this.add.text(x, codeY + 60, "▼", {
        fontSize: "28px",
        color: "#88aaff",
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      downBtn.on("pointerdown", () => this.changeDigit(i, -1));
      downBtn.on("pointerover", () => downBtn.setColor("#ffffff"));
      downBtn.on("pointerout", () => downBtn.setColor("#88aaff"));

      // Digit text
      const digitText = this.add.text(x, codeY, "0", {
        fontFamily: "monospace",
        fontSize: "48px",
        color: "#ffffff",
      }).setOrigin(0.5);

      this.codeTexts.push(digitText);
    }

    // Check button
    const checkBtn = this.add.text(width / 2, codeY + 120, "[ PROBEER CODE ]", {
      fontSize: "24px",
      color: "#00ff00",
      backgroundColor: "#224422",
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    checkBtn.on("pointerdown", () => this.checkCode());
    checkBtn.on("pointerover", () => checkBtn.setBackgroundColor("#336633"));
    checkBtn.on("pointerout", () => checkBtn.setBackgroundColor("#224422"));

    // Feedback text
    this.feedbackText = this.add.text(width / 2, codeY + 180, "", {
      fontSize: "20px",
      color: "#ff6666",
    }).setOrigin(0.5);

    // ESC hint
    this.add.text(20, height - 30, "ESC om terug te gaan", {
      fontFamily: "sans-serif",
      fontSize: "16px",
      color: "#8fd5ff",
    }).setOrigin(0, 0.5).setAlpha(0.7);

    // Keyboard input
    this.input.keyboard?.on("keydown-ESC", () => this.exitScene());
    this.input.keyboard?.on("keydown-ENTER", () => this.checkCode());
  }

  private changeDigit(index: number, delta: number) {
    this.currentCode[index] = (this.currentCode[index] + delta + 10) % 10;
    this.codeTexts[index].setText(this.currentCode[index].toString());
    this.feedbackText.setText("");
  }

  private checkCode() {
    const isCorrect =
      this.currentCode[0] === this.correctCode[0] &&
      this.currentCode[1] === this.correctCode[1] &&
      this.currentCode[2] === this.correctCode[2];

    if (isCorrect) {
      this.feedbackText.setColor("#00ff00");
      this.feedbackText.setText("Correct! De deur gaat open...");
      this.registry.set("slot_solved", true);

      // Return to face after short delay
      this.time.delayedCall(1500, () => {
        this.scene.start(this.returnSceneKey, {
          spawnX: this.scale.width / 2,
          spawnY: this.scale.height / 2 + 60,
          cameFromScene: "SlotScene",
          entry_from_puzzle: true,
        });
      });
    } else {
      this.feedbackText.setColor("#ff6666");
      this.feedbackText.setText("Dat klopt niet, probeer opnieuw");
    }
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
