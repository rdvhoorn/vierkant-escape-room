import Phaser from "phaser";
import { createBackButton } from "../../utils/BackButton";

export default class LogicTowerScene extends Phaser.Scene {
  private readonly returnSceneKeyDefault = "Face4Scene";
  private readonly panelScale = 0.2;
  private returnSceneKey: string = "";
  private isDialogActive = false;
  private dialogLines: string[] = [];
  private dialogIndex = 0;
  private isSolved = false; 
  private panel!: Phaser.GameObjects.Image;
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;
  private answerInput: Phaser.GameObjects.DOMElement | undefined; 
  private onKeyHandler?: (event: KeyboardEvent) => void;
  private onPointerHandler?: () => void;
  private wrongAttempts = 0;
  private hintText?: Phaser.GameObjects.Text;

  constructor() {
    super("LogicTower");
  }

  init(data: { entry_from_face?: boolean; returnScene?: string }) {
    this.returnSceneKey = data?.returnScene || this.returnSceneKeyDefault;
  }

  preload() {
    this.load.image("brokenpanel", "assets/decor/brokenpanel.png");
  }

  create() {
    this.isDialogActive = false;
    this.dialogIndex = 0;
    this.dialogLines = [];
    this.answerInput = undefined; 
    this.onKeyHandler = undefined;
    this.onPointerHandler = undefined;
    this.wrongAttempts = 0;
    this.hintText = undefined;
    
    this.isSolved = !!this.registry.get("logic_tower_0_solved");

    const { width, height } = this.scale;
    
    createBackButton(this, undefined, undefined, () => {
      this.exitPuzzle();
    });

    this.createTowerBackground(width, height);

    this.panel = this.add.image(width / 2, height / 2, "brokenpanel")
      .setScale(this.panelScale)
      .setInteractive({ useHandCursor: true });

    this.panel.on("pointerdown", () => {
      if (this.isDialogActive || this.answerInput) return;
      if (this.isSolved) {
        console.log("Floor 0 already solved, moving to Floor 1");
        this.scene.start("LogicTower_1", { returnScene: this.returnSceneKey });
      } else {
        this.startDialog([
          "Het paneel is kapot...",
          "Misschien kan ik het systeem herstarten met een wachtwoord?"
        ]);
      }
    });
    this.createDialogUI();
    this.setupInputListeners();
    this.events.once("shutdown", this.cleanup, this);
  }

  private createTowerBackground(width: number, height: number) {
    const skyColor = 0x0f182b;
    this.add.rectangle(0, 0, width, height, skyColor).setOrigin(0);
    const windowRadius = 150; 
    const windowX = width * 0.75; 
    const windowY = height / 2 - 80;
    const starGraphics = this.add.graphics();
    starGraphics.fillStyle(0xffffff, 1.0); 
    
    for (let i = 0; i < 150; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * windowRadius; 
        
        const sx = windowX + Math.cos(angle) * r;
        const sy = windowY + Math.sin(angle) * r;
        
        const size = Math.random() * 2 + 1; 
        starGraphics.fillCircle(sx, sy, size);
    }

    const wallGraphics = this.add.graphics();
    wallGraphics.fillStyle(0x222222); 
    wallGraphics.beginPath();
    wallGraphics.arc(windowX, windowY, windowRadius, 0, Math.PI * 2, false);
    wallGraphics.arc(windowX, windowY, 3000, 0, Math.PI * 2, true);
    wallGraphics.fillPath();
    wallGraphics.lineStyle(12, 0x111111);
    wallGraphics.strokeCircle(windowX, windowY, windowRadius);
    wallGraphics.fillStyle(0x333333, 0.4);
    for (let i = 0; i < 30; i++) {
        const bx = Math.random() * width;
        const by = Math.random() * height;
        if (Phaser.Math.Distance.Between(bx, by, windowX, windowY) > windowRadius + 20) {
             wallGraphics.fillRect(bx, by, 60, 30);
        }
    }
  }

  private createDialogUI() {
    const { width, height } = this.scale;

    this.dialogBox = this.add.rectangle(width / 2, height - 110, width - 80, 120, 0x1b2748, 0.92)
      .setStrokeStyle(3, 0x3c5a99)
      .setDepth(1000)
      .setVisible(false);

    this.dialogText = this.add.text(
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
  }

  private setupInputListeners() {
    this.input.keyboard?.on("keydown-ESC", () => this.exitPuzzle());
    this.onKeyHandler = (ev: KeyboardEvent) => {
      if ((ev.key === "e" || ev.key === "E" || ev.key === " ") && this.isDialogActive) {
        this.advanceDialog();
      }
    };
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard?.on("keydown", this.onKeyHandler);
    this.onPointerHandler = () => {
      if (this.isDialogActive) this.advanceDialog();
    };
    this.input.on("pointerdown", this.onPointerHandler);
  }

  private cleanup() {
    if (this.input.keyboard && this.onKeyHandler) {
      this.input.keyboard.off("keydown", this.onKeyHandler);
    }
    if (this.onPointerHandler) {
      this.input.off("pointerdown", this.onPointerHandler);
    }
    this.input.keyboard?.off("keydown-ESC");

    if (this.answerInput) {
      this.answerInput.removeListener("click");
      this.answerInput.removeListener("keydown");
      this.answerInput.destroy();
      this.answerInput = undefined;
    }
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


  private startDialog(lines: string[]) {

    if (this.isDialogActive || this.answerInput) return;

    this.dialogLines = lines;
    this.dialogIndex = 0;
    this.isDialogActive = true;
    this.dialogBox.setVisible(true);
    this.dialogText.setVisible(true);
    this.dialogText.setText(this.dialogLines[0]);
  }

  private advanceDialog() {
    this.dialogIndex++;
    if (this.dialogIndex >= this.dialogLines.length) {
      this.endDialog();
    } else {
      this.dialogText.setText(this.dialogLines[this.dialogIndex]);
    }
  }

  private endDialog() {
    this.isDialogActive = false;
    this.dialogBox.setVisible(false);
    this.dialogText.setVisible(false);
    this.showRiddle();
  }

  private showRiddle() {
    const panelY = this.panel.y;
    const panelHeight = this.panel.height * this.panelScale;
    const riddle = "Ik schijn zonder een lamp te zijn \n en ik brand zonder te verbranden\nJe ziet me alleen als de nacht donker is\nen avonturiers gebruiken mij om hun weg te vinden";

    this.add.text(this.panel.x, panelY - panelHeight * 0.9, riddle, {
        fontSize: "20px",
        fontFamily: "sans-serif",
        color: "#c6e2ff",
        align: "center",
        wordWrap: { width: 450 },
      })
      .setOrigin(0.5);


    const inputY = this.scale.height * 0.65;
    this.answerInput = this.add.dom(this.panel.x, inputY).createFromHTML(`
        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
          <input type="text" name="answerField" placeholder="Wachtwoord..." 
            style="width: 220px; padding: 10px; font-size: 18px; border-radius: 5px; border: 2px solid #3c5a99; outline: none; color: #000;">
          <button name="submitBtn" 
            style="cursor: pointer; padding: 8px 16px; font-size: 16px; border-radius: 5px; border: none; background-color: #3c5a99; color: #ffffff;">
            Enter
          </button>
        </div>
    `);

    this.answerInput.addListener("click");
    this.answerInput.on("click", (event: any) => {
      if (event.target.name === "submitBtn") this.validateAnswer();
    });

    this.answerInput.addListener("keydown");
    this.answerInput.on("keydown", (event: any) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        const inputElement = this.answerInput?.getChildByName("answerField") as HTMLInputElement;
        if (inputElement) inputElement.blur();
        this.exitPuzzle();
        return;
      }

      event.stopPropagation();
      
      if (event.key === "Enter") {
        this.validateAnswer();
      }
    });

    const inputElement = this.answerInput.getChildByName("answerField") as HTMLInputElement;
    if (inputElement) inputElement.focus();
  }

  private validateAnswer() {
    if (!this.answerInput) return;
  
    const inputElement = this.answerInput.getChildByName("answerField") as HTMLInputElement;
    if (!inputElement) return;

    const value = inputElement.value.trim().toLowerCase();

    if (value === "sterren" || value === "ster") {
      this.completePuzzle();
    } else {
      this.wrongAttempts++;
  
      if (this.wrongAttempts >= 2 && !this.hintText) {
          const { width, height } = this.scale;

          this.hintText = this.add.text(width / 2, height * 0.8, "Hint: Kijk eens uit het raampje...", {
              fontFamily: "sans-serif",
              fontSize: "18px",
              color: "#ffffaa", 
              fontStyle: "italic"
          }).setOrigin(0.5);
        
          this.tweens.add({
              targets: this.hintText,
              alpha: { from: 0, to: 1 },
              duration: 500,
              ease: 'Sine.easeInOut'
          });
      }

      inputElement.style.border = "2px solid #ff4444";
      this.tweens.add({
        targets: this.answerInput,
        x: this.answerInput.x + 5,
        duration: 50,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
           if(inputElement) inputElement.style.border = "2px solid #3c5a99";
        }
      });
    }
  }

  private completePuzzle() {
    console.log("Puzzle Solved!");
    this.registry.set("logic_tower_0_solved", true);
    this.scene.start("LogicTower_1", { returnScene: this.returnSceneKey });
  }
}