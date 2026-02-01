import Phaser from "phaser";
import { createBackButton } from "../../utils/BackButton";

export default class LogicTower_1 extends Phaser.Scene {
  private readonly objectScale = 0.3;
  private returnSceneKey: string = "Face4Scene";

  private isInteracting = false; 
  private wrongAnswersCount = 0; 
  private telescope!: Phaser.GameObjects.Image;
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;
  private answerInput?: Phaser.GameObjects.DOMElement;
  private hintButton?: Phaser.GameObjects.Text; 
  private dialogLines: string[] = [];
  private dialogIndex = 0;
  private dialogKeyHandler?: (ev: KeyboardEvent) => void;
  private pointerHandler?: () => void;
  private isSolved = false;

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
    this.isInteracting = false;
    this.wrongAnswersCount = 0;
    this.dialogLines = [];
    this.dialogIndex = 0;
    this.answerInput = undefined;
    this.hintButton = undefined;
    this.isSolved = !!this.registry.get("logic_tower_1_solved");
    const { width, height } = this.scale;
    this.createTowerBackground(width, height);
    
    createBackButton(this, undefined, undefined, () => {
      this.exitPuzzle();
    });

    this.telescope = this.add.image(width / 2, height / 2 + 20, "telescope")
      .setScale(this.objectScale);

    this.telescope.setInteractive({ 
        useHandCursor: true,
    });

    this.telescope.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.event) pointer.event.stopPropagation();

      if (this.isInteracting) return;

      if (this.isSolved) {
          console.log("Floor 1 already solved, moving to Floor 2");
          this.scene.start("LogicTower_2", { returnScene: this.returnSceneKey });
          return;
      }

      console.log("Telescope clicked!");
      this.startDialog([
        "Een oude telescoop...",
        "Er staat iets geschreven op de voet."
      ]);
    });

    this.createDialogUI();

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
          fontFamily: "sans-serif", fontSize: "20px", color: "#e7f3ff",
          wordWrap: { width: this.dialogBox.width - 40 },
        }
      )
      .setDepth(1001)
      .setVisible(false);

    this.dialogKeyHandler = (ev: KeyboardEvent) => {
      if ((ev.key === "e" || ev.key === "E" || ev.code === "Space") && this.isInteracting && !this.answerInput) {
        this.advanceDialog();
      }
    };
    this.input.keyboard?.on("keydown", this.dialogKeyHandler);

    this.pointerHandler = () => {
      if (this.isInteracting && !this.answerInput) this.advanceDialog();
    };
    this.input.on("pointerdown", this.pointerHandler);
  }

  private cleanup() {
    this.input.keyboard?.off("keydown-ESC");
    if (this.dialogKeyHandler && this.input.keyboard) {
      this.input.keyboard.off("keydown", this.dialogKeyHandler);
    }
    if (this.pointerHandler) {
      this.input.off("pointerdown", this.pointerHandler);
    }

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
      spawnX, spawnY, cameFromScene: "LogicTower_1"
    });
  }

  private startDialog(lines: string[]) {
    this.isInteracting = true; 
    this.dialogLines = lines;
    this.dialogIndex = 0;
    
    this.dialogBox.setVisible(true);
    this.dialogText.setVisible(true);
    this.dialogText.setText(this.dialogLines[0]);
  }

  private advanceDialog() {
    this.dialogIndex++;
    if (this.dialogIndex >= this.dialogLines.length) {
      this.endDialog();
      return;
    }
    this.dialogText.setText(this.dialogLines[this.dialogIndex]);
  }

  private endDialog() {
    this.dialogBox.setVisible(false);
    this.dialogText.setVisible(false);
    this.showRiddle();
  }

  private showRiddle() {
    const w = this.scale.width;
    const textY = this.telescope.y - (this.telescope.displayHeight * this.objectScale / 2) - 120;
    
    const riddle = "Je vindt mij in Mercurius, Aarde, Mars en Jupiter,\nmaar niet in Venus of Neptunus.\nWat ben ik?";
    
    this.add.text(w / 2, textY, riddle, {
        fontSize: "20px", fontFamily: "sans-serif", color: "#c6e2ff",
        align: "center", wordWrap: { width: 500 },
      })
      .setOrigin(0.5);

    const inputY = this.scale.height * 0.75; 
    this.answerInput = this.add.dom(w / 2, inputY).createFromHTML(`
        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
          <input type="text" name="answerField" placeholder="Antwoord..." 
            style="width: 220px; padding: 10px; font-size: 18px; border-radius: 5px; border: 2px solid #3c5a99; outline: none; color: #000; text-align: center;">
          <button name="submitBtn" 
            style="cursor: pointer; padding: 8px 16px; font-size: 16px; border-radius: 5px; border: none; background-color: #3c5a99; color: #ffffff;">
            Check
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
      if (event.code === "Enter") this.validateAnswer();
    });

    const inputElement = this.answerInput.getChildByName("answerField") as HTMLInputElement;
    if (inputElement) inputElement.focus();
  }

  private validateAnswer() {
    if (!this.answerInput) return;
    const inputElement = this.answerInput.getChildByName("answerField") as HTMLInputElement;
    if (inputElement) {
      const value = inputElement.value.trim().toLowerCase();
      
      if (value === "r" || value === "de letter r" || value === "letter r") {
        this.completePuzzle();
      } else {
        inputElement.style.border = "2px solid #ff4444";
        this.wrongAnswersCount++;
        if (this.wrongAnswersCount >= 2 && !this.hintButton) {
            this.showHintButton();
        }

        this.tweens.add({
          targets: this.answerInput,
          x: this.answerInput.x + 5,
          duration: 50,
          yoyo: true, repeat: 3,
          onComplete: () => {
             if (inputElement) inputElement.style.border = "2px solid #3c5a99";
          }
        });
      }
    }
  }

  private showHintButton() {
      const { width, height } = this.scale;
      const btnY = height * 0.75 + 60; 
      
      this.hintButton = this.add.text(width / 2, btnY, "[Hint]", {
          fontSize: "18px",
          color: "#ffff00",
          backgroundColor: "#333333",
          padding: { x: 10, y: 5 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
          if (this.hintButton) {
              this.hintButton.setText("Hint: Misschien is het niet iets wat je op de planeten vind, maar meer LETTERlijk");
              this.hintButton.disableInteractive();
          }
      });
  }

  private completePuzzle() {
    console.log("Puzzle 2 Complete!");
    this.registry.set("logic_tower_1_solved", true);
    this.scene.start("LogicTower_2", { 
        returnScene: this.returnSceneKey 
    }); 
  }
}