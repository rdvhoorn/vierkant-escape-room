import Phaser from "phaser";

export default class LogicTowerScene extends Phaser.Scene {
  private panel!: Phaser.GameObjects.Image;

  private dialogActive = false;
  private dialog: string[] = [];
  private dialogIndex = 0;
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;

  private riddleText!: Phaser.GameObjects.Text;
  private answerInput!: Phaser.GameObjects.DOMElement;

  private dialogKeyHandler?: (ev: KeyboardEvent) => void;
  private pointerHandler?: () => void;
  private cleanupRegistered = false;

  //scalen
  private readonly panelScale = 0.2;     //schaal paneel (verwijder nog achtergrond)
  private readonly backgroundScale = 1;  //achtergrond genereren voelt dom, misschien met tekst de context beschrijven?

  constructor() {
    super("LogicTower");
  }
  preload() {
    this.load.image("brokenpanel", "assets/decor/brokenpanel.png");
  }

  create() {
//dit werkt allemaal nog niet helemaal lekker, achtergronden 
    const bg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x0f182b)
      .setOrigin(0, 0);

    bg.setScale(this.backgroundScale);

//de panel foto
    this.panel = this.add
      .image(this.scale.width / 2, this.scale.height / 2, "brokenpanel")
      .setScale(this.panelScale)
      .setInteractive({ useHandCursor: true });

    this.panel.on("pointerdown", () => {
      this.startDialog([
        "wow kapot, tekst hier"
      ]);
    });
    this.ensureDialogUI();
  }

//dialoog
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
          wordWrap: { width: this.dialogBox.width - 40}
        }
      )
      .setDepth(1001)
      .setVisible(false);

//listerner setup
    const inputPlugin = this.input;
    if (inputPlugin) {
      const keyboard =
        (inputPlugin as any).keyboard as
          | Phaser.Input.Keyboard.KeyboardPlugin
          | undefined;

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

      const keyboard =
        (inputPlugin as any).keyboard as
          | Phaser.Input.Keyboard.KeyboardPlugin
          | undefined;

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

//raadsel systeem
    private showRiddle() {
    const w = this.scale.width;
    const panelX = this.panel.x;
    const panelY = this.panel.y;
    const panelHeight = this.panel.height * this.panelScale;

    const riddle = "raadsel hier";

//schuiven
    this.riddleText = this.add
        .text(panelX, panelY - panelHeight * 0.7, riddle, {
        fontSize: "24px",
        fontFamily: "sans-serif",
        color: "#c6e2ff",
        align: "center",
        wordWrap: { width: w - 150 }
        })
        .setOrigin(0.8);

//answer box: werkt nog niet
    this.answerInput = this.add.dom(panelX, panelY + panelHeight * 0.9).createFromHTML(`
        <input 
        type="text" 
        id="answerBox" 
        placeholder="Type je antwoord" 
        style="
            width: 250px; 
            height: 32px; 
            font-size: 18px; 
            padding: 4px;
            border-radius: 6px;
            border: 2px solid #3c5a99;
            background:#e7f3ff;">
    `);
//er moet nog iets in de phaser: 
//Uncaught Error: No DOM Container set in game config
    //at LogicTowerScene.showRiddle (LogicTower.ts:187:33)
    //at LogicTowerScene.endDialog (LogicTower.ts:163:10)
    //at LogicTowerScene.advanceDialog (LogicTower.ts:151:12)
    //at InputPlugin2.pointerHandler (LogicTower.ts:100:37)


    this.answerInput.addListener("change");
    this.answerInput.on("change", () => {
        const value = (document.getElementById("answerBox") as HTMLInputElement)
        .value.trim()
        .toLowerCase();

        if (value === "ster") {
        this.completePuzzle();
        }
    });
    }


//voltooid; volgende laag. houdt niet helemaal lekker bij voor volgende keren
  private completePuzzle() {
    this.scene.start("LogicTower_1");
  }
}
