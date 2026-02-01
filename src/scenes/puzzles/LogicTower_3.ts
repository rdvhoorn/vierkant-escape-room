import Phaser from "phaser";
import { createBackButton } from "../../utils/BackButton";

export default class LogicTower_3 extends Phaser.Scene {
  private returnSceneKey: string = "Face4Scene";
  private inputElement?: Phaser.GameObjects.DOMElement;
  private readonly puzzleScale = 0.25; 
  private wrongAnswersCount = 0;
  private hintButton?: Phaser.GameObjects.Text;
  private isSolved = false;

  constructor() {
    super("LogicTower_3");
  }
  
  init(data: { returnScene?: string }) {
    if (data?.returnScene) this.returnSceneKey = data.returnScene;
  }

  preload() {
    this.load.image("balance_scale_puzzle", "assets/decor/balance_scale_puzzle.png");
    this.load.image("balance_scale_puzzle", "assets/decor/balance_scale_puzzle_nobg.png");
  }

  create() {
    this.isSolved = !!this.registry.get("logic_tower_3_solved");

    const { width, height } = this.scale;
    this.wrongAnswersCount = 0;
    this.hintButton = undefined;
    this.createTowerBackground(width, height);
    createBackButton(this, undefined, undefined, () => {
      this.exitScene();
    });
    this.add.text(width / 2, 40, "Logica Toren: Niveau 3", {
      fontFamily: "sans-serif", fontSize: "28px", color: "#ffffff", stroke: "#000", strokeThickness: 4
    }).setOrigin(0.5);

    const rules = [
        "Regels:",
        "- Ballen met dezelfde kleur hebben hetzelfde gewicht.",
        "- De weegschalen zijn in balans.",
        "- Wat is het gewicht van de witte bal?"
    ];

    this.add.text(width / 2, 120, rules, {
        fontFamily: "sans-serif", fontSize: "18px", color: "#cccccc", align: 'center', lineSpacing: 5, stroke: "#000", strokeThickness: 2
    }).setOrigin(0.5);

    const puzzleImg = this.add.image(width / 2, height / 2 + 30, "balance_scale_puzzle");
    puzzleImg.setScale(this.puzzleScale); 

    if (this.isSolved) {
        puzzleImg.setInteractive({ useHandCursor: true });
        puzzleImg.on('pointerdown', () => {
            this.scene.start("LogicTower_4", { returnScene: this.returnSceneKey });
        });
        
        this.add.text(width / 2, height - 80, "(Puzzel opgelost - Klik op de afbeelding)", {
            fontFamily: "sans-serif", fontSize: "18px", color: "#00ff00"
        }).setOrigin(0.5);
    } else {
        this.createInput(width / 2, height - 80);
    }
  }

  private createTowerBackground(width: number, height: number) {
    const skyColor = 0x0f182b;
    this.add.rectangle(0, 0, width, height, skyColor).setOrigin(0);

    const windowRadius = 150; 
    const windowX = width * 0.2; 
    const windowY = height / 2 - 50; 

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
      <div style="display: flex; gap: 10px; align-items: center; justify-content: center;">
        <input 
          type="number" 
          id="answerBox" 
          placeholder="?"
          style="
            width: 80px; 
            padding: 10px; 
            font-size: 24px; 
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
          return; 
      }
      
      e.stopPropagation(); 
      if (e.key === "Enter") this.checkAnswer();
    });

    const input = this.inputElement.getChildByID("answerBox") as HTMLInputElement;
    if (input) input.focus();
  }

  private checkAnswer() {
    const input = this.inputElement?.getChildByID("answerBox") as HTMLInputElement;
    if (!input) return;
    const val = parseInt(input.value);
    const correctAnswer = 40;
    
    if (val === correctAnswer) {
      this.completePuzzle();
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
        }
      });
    }
  }

  private showHintButton() {
      const { width, height } = this.scale;
      const btnY = height - 30; 
      
      this.hintButton = this.add.text(width / 2, btnY, "[ Hint Tonen ]", {
          fontSize: "18px", color: "#ffff00", backgroundColor: "#333", padding: { x: 10, y: 5 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
          if (this.hintButton) {
              this.hintButton.setText("Hint: Blauw = 10, Rood = 20, Groen = 30.");
              this.hintButton.disableInteractive();
          }
      });
  }

  private completePuzzle() {
    console.log("Tower Level 3 Completed!");
    this.registry.set("logic_tower_3_solved", true);
    this.scene.start("LogicTower_4", { 
        returnScene: this.returnSceneKey 
    });
  }

  private exitScene(solved = false) {
    const spawnX = this.scale.width / 2;
    const spawnY = this.scale.height / 2 + 90;
    this.scene.start(this.returnSceneKey, {
      spawnX,
      spawnY,
      cameFromScene: "LogicTower_3",
      towerSolved: solved 
    });
  }
}