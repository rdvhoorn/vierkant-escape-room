import Phaser from "phaser";

export default class LogicTower_1 extends Phaser.Scene {
  private telescope!: Phaser.GameObjects.Image;
  private dialogActive = false;
  private dialog: string[] = [];
  private dialogIndex = 0;
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;

  private riddleText!: Phaser.GameObjects.Text;
  private answerInput?: Phaser.GameObjects.DOMElement;

  private dialogKeyHandler?: (ev: KeyboardEvent) => void;
  private pointerHandler?: () => void;
  private cleanupRegistered = false;

  private returnSceneKey: string = "Face4Scene"; 

  private readonly objectScale = 0.3; 
  private readonly backgroundScale = 1;

  constructor() {
    super("LogicTower_1");
  }

  init(data: { cameFromScene?: string; returnScene?: string }) {
    if (data?.returnScene) {
      this.returnSceneKey = data.returnScene;
    }
  }

  preload() {
    this.load.image("telescope", "assets/decor/telescope.png");
  }

  create() {
    const { width, height } = this.scale;
    const bg = this.add
      .rectangle(0, 0, width, height, 0x0f182b)
      .setOrigin(0, 0);
    bg.setScale(this.backgroundScale);

    this.add.text(20, 20, "ESC om terug te gaan", {
      fontFamily: "sans-serif",
      fontSize: "16px",
      color: "#8fd5ff",
    }).setOrigin(0, 0).setAlpha(0.7);

    this.input.keyboard?.on("keydown-ESC", () => {
      this.exitPuzzle();
    });

    this.telescope = this.add
      .image(width / 2, height / 2 + 20, "telescope")
      .setScale(this.objectScale)
      .setInteractive({ useHandCursor: true });

    this.telescope.on("pointerdown", () => {
      if (this.answerInput) return;

      this.startDialog([
        "Een oude telescoop...",
        "Er staat een iets geschreven op de voet."
      ]);
    });

    this.ensureDialogUI();
  }

  private exitPuzzle() {
    const spawnX = this.scale.width / 2;
    const spawnY = this.scale.height / 2 + 90;
    this.scene.start(this.returnSceneKey, {
      spawnX,
      spawnY,
      cameFromScene: "LogicTower_1",
    });
  }


  private ensureDialogUI() {
    if (this.dialogBox) return;
    const w = this.scale.width;
    const h = this.scale.height;
    this.dialogBox = this.add
      .rectangle(w / 2, h - 110, w - 80, 120, 0x1b2748, 0.92)
      .setStrokeStyle(3, 0x3c5a99)
      .setDepth(1000)
      .setVisible(false);

    this.dialogText = this.add
      .text(
        this.dialogBox.x - this.dialogBox.width / 2 + 20,
        this.dialogBox.y - 45,
        "",
        {
          fontFamily: "sans-serif",
          fontSize: "20px",
          color: "#e7f3ff",
          wordWrap: { width: this.dialogBox.width - 40 },
        }
      )
      .setDepth(1001)
      .setVisible(false);

    const inputPlugin = this.input;
    if (inputPlugin) {
      const keyboard = (inputPlugin as any).keyboard as Phaser.Input.Keyboard.KeyboardPlugin;
      if (keyboard) {
        this.dialogKeyHandler = (ev: KeyboardEvent) => {
          if ((ev.key === "E" || ev.key === "e" || ev.code === "Space") && this.dialogActive) {
            this.advanceDialog();
          }
        };
        keyboard.on("keydown", this.dialogKeyHandler);
      }
      this.pointerHandler = () => {
        if (this.dialogActive) this.advanceDialog();
      };
      inputPlugin.on("pointerdown", this.pointerHandler);
    }
    if (!this.cleanupRegistered) {
      this.cleanupRegistered = true;
      this.events.on("shutdown", this.cleanupDialogListeners, this);
      this.events.on("destroy", this.cleanupDialogListeners, this);
    }
  }

  private cleanupDialogListeners() {
    const inputPlugin = this.input;
    if (inputPlugin) {
      if (this.pointerHandler) {
        inputPlugin.off("pointerdown", this.pointerHandler);
        this.pointerHandler = undefined;
      }
      const keyboard = (inputPlugin as any).keyboard;
      if (keyboard && this.dialogKeyHandler) {
        keyboard.off("keydown", this.dialogKeyHandler);
        this.dialogKeyHandler = undefined;
      }
    }
    this.cleanupRegistered = false;
  }

  private startDialog(lines: string[]) {
    this.dialog = lines;
    this.dialogIndex = 0;
    this.dialogActive = true;
    this.dialogBox.setVisible(true);
    this.dialogText.setVisible(true);
    this.dialogText.setText(lines[0]);
  }

  private advanceDialog() {
    if (!this.dialogActive) return;
    this.dialogIndex++;

    if (this.dialogIndex >= this.dialog.length) {
      this.endDialog();
      return;
    }
    this.dialogText.setText(this.dialog[this.dialogIndex]);
  }

  private endDialog() {
    this.dialogActive = false;
    this.dialogBox.setVisible(false);
    this.dialogText.setVisible(false);
    this.showRiddle();
  }

  private showRiddle() {
    const w = this.scale.width;
    const textY = this.telescope.y - (this.telescope.displayHeight / 2) - 60;
    const riddle = "Je vindt mij in Mercurius, Aarde, Mars en Jupiter,\nmaar niet in Venus of Neptunus.\nWat ben ik?";
    this.riddleText = this.add
      .text(w / 2, textY, riddle, {
        fontSize: "20px",
        fontFamily: "sans-serif",
        color: "#c6e2ff",
        align: "center",
        wordWrap: { width: 500 },
      })
      .setOrigin(0.5);

    const inputY = this.scale.height * 0.75; 
    this.answerInput = this.add.dom(w / 2, inputY).createFromHTML(`
        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
          <input
            type="text"
            name="answerField"
            placeholder="Antwoord..."
            style="
              width: 220px;
              padding: 10px;
              font-size: 18px;
              border-radius: 5px;
              border: 2px solid #3c5a99;
              outline: none;
              color: #000;
              text-align: center;
            "
          />
          <button
            name="submitBtn"
            style="
              cursor: pointer;
              padding: 8px 16px;
              font-size: 16px;
              border-radius: 5px;
              border: none;
              background-color: #3c5a99;
              color: #ffffff;
              font-family: sans-serif;
            "
          >
            Check
          </button>
        </div>
      `);

    if (!this.answerInput) return;
    this.answerInput.addListener("click");
    this.answerInput.on("click", (event: any) => {
      if (event.target.name === "submitBtn") {
        this.validateAnswer();
      }
    });
    this.answerInput.addListener("keydown");
    this.answerInput.on("keydown", (event: any) => {
      event.stopPropagation();
      if (event.code === "Enter") {
        this.validateAnswer();
      }
    });
  }

  private validateAnswer() {
    if (!this.answerInput) return;
    const inputElement = this.answerInput.getChildByName("answerField") as HTMLInputElement;
    if (inputElement) {
      const value = inputElement.value.trim().toLowerCase();
      // misschien meer varianten
      if (value === "r" || value === "de letter r") {
        this.completePuzzle();
      } else {
        inputElement.style.border = "2px solid #ff4444";
        this.tweens.add({
          targets: this.answerInput,
          x: this.answerInput.x + 5,
          duration: 50,
          yoyo: true,
          repeat: 3
        });
      }
    }
  }

    private completePuzzle() {
        console.log("Puzzle 2 Complete!");
        this.scene.start("LogicTower_2", { 
            returnScene: this.returnSceneKey 
        }); 
    }
    }