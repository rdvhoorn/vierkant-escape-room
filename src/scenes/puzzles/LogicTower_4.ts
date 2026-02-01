import Phaser from "phaser";
import { createBackButton } from "../../utils/BackButton";

export default class LogicTower_4 extends Phaser.Scene {
  private returnSceneKey: string = "Face4Scene";
  private inputElement?: Phaser.GameObjects.DOMElement;
  private readonly puzzleScale = 0.2;
  private wrongAnswersCount = 0;
  private hintButton?: Phaser.GameObjects.Text;
  private isSolved = false;

  constructor() {
    super("LogicTower_4");
  }

  init(data: { returnScene?: string }) {
    if (data?.returnScene) this.returnSceneKey = data.returnScene;
  }

  preload() {
    this.load.image("whiteboard", "assets/decor/whiteboard.png");
  }

  create() {
    this.isSolved = !!this.registry.get("logic_tower_4_solved");

    const { width, height } = this.scale;
    this.wrongAnswersCount = 0;
    this.hintButton = undefined;

    this.createTowerBackground(width, height);
    createBackButton(this, undefined, undefined, () => {
      this.exitScene();
    });

    this.add.text(width / 2, 40, "Logica Toren: Niveau 4", {
      fontFamily: "sans-serif", fontSize: "28px", color: "#ffffff", stroke: "#000", strokeThickness: 4
    }).setOrigin(0.5);

    const contentX = width * 0.45;

    const whiteboard = this.add.image(contentX, height / 2 - 30, "whiteboard");
    whiteboard.setScale(this.puzzleScale);

    if (this.isSolved) {
        whiteboard.setInteractive({ useHandCursor: true });
        whiteboard.on('pointerdown', () => {
            this.scene.start("LogicTower_5", { returnScene: this.returnSceneKey });
        });

        this.add.text(contentX, height - 100, "(Puzzel opgelost - Klik op het bord)", {
            fontFamily: "sans-serif", fontSize: "18px", color: "#00ff00"
        }).setOrigin(0.5);
    } else {
        this.createInput(contentX, height - 100);
    }
  }

  private createTowerBackground(width: number, height: number) {
    const skyColor = 0x0f182b;
    this.add.rectangle(0, 0, width, height, skyColor).setOrigin(0);

    const windowRadius = 120; 
    const windowX = width * 0.85; 
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

  private createInput(x: number, y: number) {
    this.inputElement = this.add.dom(x, y).createFromHTML(`
      <div style="display: flex; gap: 10px; align-items: center; justify-content: center; flex-direction: column;">
        <label style="color: white; font-size: 18px; margin-bottom: 5px;">Antwoord:</label>
        <div style="display: flex; gap: 10px;">
            <input 
            type="text" 
            id="answerBox" 
            placeholder="..."
            style="
                width: 300px; 
                padding: 10px; 
                font-size: 20px; 
                text-align: center; 
                border: 3px solid #3c5a99; 
                border-radius: 8px; 
                outline: none; 
                font-weight: bold; 
                color: #333;
            "
            />
            <button 
            name="submitBtn"
            style="
                padding: 10px 20px; 
                font-size: 18px; 
                background: #3c5a99; 
                color: white; 
                border: none; 
                border-radius: 8px; 
                cursor: pointer; 
                font-weight: bold;
            "
            >
            Check
            </button>
        </div>
      </div>
    `);

    this.inputElement.addListener("click");
    this.inputElement.on("click", (e: any) => {
      if (e.target.name === "submitBtn") this.checkAnswer();
    });

    this.inputElement.addListener("keydown");
    this.inputElement.on("keydown", (e: any) => {

      if (e.key === "Escape") {
          const input = this.inputElement?.getChildByID("answerBox") as HTMLInputElement;
          input?.blur(); 
          this.exitScene(); 
          return;
      }

      e.stopPropagation(); 
      if (e.key === "Enter" && this.inputElement?.visible) this.checkAnswer();
    });
  }

  private checkAnswer() {
    const input = this.inputElement?.getChildByID("answerBox") as HTMLInputElement;
    if (!input) return;

    const rawValue = input.value;
    const normalizedValue = rawValue.toLowerCase().replace(/\s+/g, '');
    const targetAnswer = "vierkantvoorwiskunde";

    if (normalizedValue === targetAnswer) {
      this.startPostPuzzleDialogue();
    } else {
      input.style.borderColor = "#ff0000";
      input.style.backgroundColor = "#ffcccc";
      this.wrongAnswersCount++;

      if (this.wrongAnswersCount >= 2 && !this.hintButton) {
          this.showHintButton();
      }

      this.tweens.add({
        targets: this.inputElement,
        x: this.inputElement!.x + 10,
        duration: 50,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          input.style.backgroundColor = "white"; 
          input.style.borderColor = "#3c5a99";
          input.focus();
        }
      });
    }
  }

  private showHintButton() {
      const { width, height } = this.scale;
      const btnY = height - 40; 
      
      const btnX = width * 0.45; 

      this.hintButton = this.add.text(btnX, btnY, "[ Hint Tonen ]", {
          fontSize: "18px", color: "#ffff00", backgroundColor: "#333", padding: { x: 10, y: 5 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
          if (this.hintButton) {
              this.hintButton.setText("Hint: Het zijn kandelaars, geen kaarsen :)");
              this.hintButton.disableInteractive();
          }
      });
  }

  private startPostPuzzleDialogue() {
      if (this.inputElement) this.inputElement.setVisible(false);
      this.hintButton?.setVisible(false);

      const { width, height } = this.scale;

      this.add.rectangle(width/2, height - 100, width - 100, 150, 0x000000, 0.8)
          .setStrokeStyle(2, 0xffffff);
      
      const textContent = "Dat is juist! 'Vierkant voor wiskunde'.\n\nDe toren is bijna hersteld!\n\n(Klik of druk op E / spatie)";

      this.add.text(width/2, height - 100, textContent, {
          fontFamily: 'sans-serif',
          fontSize: '20px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: width - 140 }
      }).setOrigin(0.5);

      this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.input.keyboard?.once('keydown-E', () => {
          this.completePuzzle();
      });
      this.input.keyboard?.once('keydown-SPACE', () => {
          this.completePuzzle();
      });
      this.input.once('pointerdown', () => {
          this.completePuzzle();
      });
  }

  private completePuzzle() {
    console.log("Tower Level 4 Completed!");
    this.registry.set("logic_tower_4_solved", true);
    this.scene.start("LogicTower_5", { 
        returnScene: this.returnSceneKey 
    });
  }
  private exitScene(solved = false) {
    const spawnX = this.scale.width / 2;
    const spawnY = this.scale.height / 2 + 90;

    this.scene.start(this.returnSceneKey, {
      spawnX,
      spawnY,
      cameFromScene: "LogicTower_4",
      towerSolved: solved 
    });
  }
}