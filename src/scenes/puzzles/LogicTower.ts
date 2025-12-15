import Phaser from "phaser";

export default class LogicTowerScene extends Phaser.Scene {
  private panel!: Phaser.GameObjects.Image;

  private dialogActive = false;
  private dialog: string[] = [];
  private dialogIndex = 0;
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;
  private riddleText!: Phaser.GameObjects.Text; //kan eruit later, tekst onscreen is prima
  private answerInput?: Phaser.GameObjects.DOMElement;
  private dialogKeyHandler?: (ev: KeyboardEvent) => void;
  private pointerHandler?: () => void;
  private cleanupRegistered = false;
  private returnSceneKey: string = "Face4Scene"; 

  //scaling
  private readonly panelScale = 0.2;
  private readonly backgroundScale = 1;

  constructor() {
    super("LogicTower");
  }

  init(data: { entry_from_face?: boolean; returnScene?: string }) {
    if (data?.returnScene) {
      this.returnSceneKey = data.returnScene;
    }
  }
//overbodig lowkey
  preload() {
    this.load.image("brokenpanel", "assets/decor/brokenpanel.png");
  }
  create() {
    const { width, height } = this.scale;
    //bg
    const bg = this.add
      .rectangle(0, 0, width, height, 0x0f182b)
      .setOrigin(0, 0);
    bg.setScale(this.backgroundScale);

    //dit verdween, zit wel in facebase
    this.add.text(20, 20, "ESC om terug te gaan", {
      fontFamily: "sans-serif",
      fontSize: "16px",
      color: "#8fd5ff",
    }).setOrigin(0, 0).setAlpha(0.7);
    this.input.keyboard?.on("keydown-ESC", () => {
      this.exitPuzzle();
    });
    this.panel = this.add
      .image(width / 2, height / 2, "brokenpanel")
      .setScale(this.panelScale)
      .setInteractive({ useHandCursor: true });
    this.panel.on("pointerdown", () => {
      this.startDialog(["Helaas, het paneel is kapot...", "Misschien kan ik het systeem herstarten?"]);
    });
    this.ensureDialogUI();
  }

  private exitPuzzle() {
    const spawnX = this.scale.width / 2;
    const spawnY = this.scale.height / 2 + 90;
    this.scene.start(this.returnSceneKey, {
      spawnX,
      spawnY,
      cameFromScene: "LogicTower",
    });
  }
  //dialog
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
//inputs
    const inputPlugin = this.input;
    if (inputPlugin) {
      const keyboard = (inputPlugin as any).keyboard as Phaser.Input.Keyboard.KeyboardPlugin | undefined;

      if (keyboard) {
        this.dialogKeyHandler = (ev: KeyboardEvent) => {
          if ((ev.key === "E" || ev.key === "e") && this.dialogActive) {
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
      const keyboard = (inputPlugin as any).keyboard as Phaser.Input.Keyboard.KeyboardPlugin | undefined;
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

//DOM input, werkt raar
  private showRiddle() {
    const w = this.scale.width;
    const panelX = this.panel.x;
    const panelY = this.panel.y;
    const panelHeight = this.panel.height * this.panelScale;
    const riddle = "Ik schijn zonder een lamp te zijn \n en ik brand zonder te verbranden \n Je ziet me alleen als de nacht donker is \n en avonturiers gebruiken mij om hun weg te vinden";

    this.riddleText = this.add
      .text(panelX, panelY - panelHeight * 0.7, riddle, {
        fontSize: "20px",
        fontFamily: "sans-serif",
        color: "#c6e2ff",
        align: "center",
        wordWrap: { width: 450 },
      })
      .setOrigin(0.5);

    //dom met de button
    const inputY = this.scale.height * 0.65;
    this.answerInput = this.add.dom(panelX, inputY).createFromHTML(`
        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
          <input
            type="text"
            name="answerField"
            placeholder="Wachtwoord..."
            style="
              width: 220px;
              padding: 10px;
              font-size: 18px;
              border-radius: 5px;
              border: 2px solid #3c5a99;
              outline: none;
              color: #000;
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
            Invoeren
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
      if (value === "sterren" || value === "ster") {
        this.completePuzzle();
      } else {
        //shake
        inputElement.style.border = "2px solid #ff4444";
        this.tweens.add({
          targets: this.answerInput,
          x: this.answerInput.x + 5,
          duration: 50,
          yoyo: true,
          repeat: 3,
          onComplete: () => {
          }
        });
      }
    }
  }

  private completePuzzle() {
    this.scene.start("LogicTower_1");
  }
}