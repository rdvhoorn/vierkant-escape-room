import Phaser from "phaser";
import { createBackButton } from "../../utils/BackButton";

export default class LogicTower_2 extends Phaser.Scene {
  private returnSceneKey: string = "Face4Scene"; 
  private puzzleContainer!: Phaser.GameObjects.Container;
  private inputElement?: Phaser.GameObjects.DOMElement;
  private isPuzzleOpen = false;
  private wrongAnswersCount = 0; 
  private hintButton?: Phaser.GameObjects.Text;

  private readonly gridSize = 320; 
  private readonly step = 32;      
  private readonly starsData = [
    { x: 7, y: 5, color: 0x00ff00, radius: 8 }, 
    { x: 2, y: 3, color: 0xff0000, radius: 6 }, 
    { x: 9, y: 8, color: 0x0000ff, radius: 6 }, 
    { x: 1, y: 9, color: 0xffff00, radius: 6 }, 
    { x: 5, y: 2, color: 0xff00ff, radius: 6 }, 
    { x: 8, y: 1, color: 0x00ffff, radius: 6 }, 
    { x: 3, y: 6, color: 0xffaa00, radius: 6 }, 
    { x: 6, y: 8, color: 0xffffff, radius: 6 }, 
  ];

  constructor() {
    super("LogicTower_2");
  }

  init(data: { returnScene?: string }) {
    if (data?.returnScene) this.returnSceneKey = data.returnScene;
  }

  preload() {
    this.load.image("background_tower", "assets/decor/background_tower.png");
  }

  create() {
    const { width, height } = this.scale;
    this.createTowerBackground(width, height);
    this.add.image(width / 2, height / 2, "background_tower")
      .setScale(0.5); 

    createBackButton(this, undefined, undefined, () => {
        if (this.isPuzzleOpen) {
            this.closePuzzle();
        } else {
            this.exitScene();
        }
    });


    const hoverGuide = this.add.graphics();
    hoverGuide.lineStyle(4, 0x00ff00, 0.6);
    hoverGuide.strokeCircle(width / 2, height / 2, 100); 
    hoverGuide.setVisible(false);
    
    this.tweens.add({
        targets: hoverGuide,
        alpha: { from: 0.3, to: 1 },
        scale: { from: 0.9, to: 1.1 },
        duration: 800,
        yoyo: true,
        repeat: -1
    });


    const triggerZone = this.add.zone(width / 2, height / 2, 200, 200)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

    triggerZone.on("pointerover", () => {
        if (!this.isPuzzleOpen) hoverGuide.setVisible(true);
    });

    triggerZone.on("pointerout", () => {
        hoverGuide.setVisible(false);
    });
    
    triggerZone.on("pointerdown", () => {
      if (!this.isPuzzleOpen) {
        hoverGuide.setVisible(false); 
        this.openGridPuzzle();
      }
    });
  }

  private createTowerBackground(width: number, height: number) {
    this.add.rectangle(0, 0, width, height, 0x222222).setOrigin(0);
    const wallGraphics = this.add.graphics();
    wallGraphics.fillStyle(0x333333, 0.4);
    
    for (let i = 0; i < 40; i++) {
        const bx = Math.random() * width;
        const by = Math.random() * height;
        wallGraphics.fillRect(bx, by, 60, 30);
    }
  }

  //grid puzzle UI
  private openGridPuzzle() {
    this.isPuzzleOpen = true;
    this.wrongAnswersCount = 0; 
    this.hintButton = undefined;

    const { width, height } = this.scale;
    this.puzzleContainer = this.add.container(0, 0).setDepth(100);
    
    const overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.85)
        .setInteractive();
    this.puzzleContainer.add(overlay);
    
    const panelW = 450;
    const panelH = 580; 
    const panel = this.add.rectangle(width/2, height/2, panelW, panelH, 0x1b2748)
        .setStrokeStyle(4, 0x3c5a99);
    this.puzzleContainer.add(panel);


    const originX = (width / 2) - (this.gridSize / 2);
    const originY = (height / 2) + (this.gridSize / 2) - 40; 
    
    const instructionText = this.add.text(width / 2, originY - this.gridSize - 50, 
        "Geef de coordinaten van de groene\n ster door om het signaal te ontvangen", {
        fontFamily: "sans-serif",
        fontSize: "18px",
        color: "#8fd5ff",
        align: "center",
        wordWrap: { width: panelW - 40 }
    }).setOrigin(0.5);
    this.puzzleContainer.add(instructionText);

    // grid visual
    const gfx = this.add.graphics();
    this.puzzleContainer.add(gfx);
    gfx.lineStyle(1, 0x3c5a99, 0.3); 
    for (let i = 0; i <= 10; i++) {
        const pos = i * this.step;
        gfx.moveTo(originX + pos, originY);
        gfx.lineTo(originX + pos, originY - this.gridSize);
        gfx.moveTo(originX, originY - pos);
        gfx.lineTo(originX + this.gridSize, originY - pos);
        

        this.puzzleContainer.add(this.add.text(originX + pos, originY + 10, i.toString(), { fontSize: '12px', color: '#88aaff' }).setOrigin(0.5));
        this.puzzleContainer.add(this.add.text(originX - 15, originY - pos, i.toString(), { fontSize: '12px', color: '#88aaff' }).setOrigin(0.5));
    }

    gfx.lineStyle(2, 0xffffff, 1);
    gfx.beginPath();
    gfx.moveTo(originX, originY - this.gridSize); 
    gfx.lineTo(originX, originY);                 
    gfx.lineTo(originX + this.gridSize, originY); 
    gfx.strokePath();


    this.starsData.forEach(star => {
        const screenX = originX + (star.x * this.step);
        const screenY = originY - (star.y * this.step); 
        const starObj = this.add.star(screenX, screenY, 5, star.radius, star.radius / 2, star.color);
        this.puzzleContainer.add(starObj);
    });


    const inputY = originY + 60;
    this.inputElement = this.add.dom(width / 2, inputY).createFromHTML(`
        <div style="display:flex; align-items:center; gap:10px; font-family:sans-serif;">
            <div style="display:flex; flex-direction:column; align-items:center;">
                <label style="color:#88aaff; font-size:12px;">X</label>
                <input type="number" id="inputX" min="0" max="10" 
                    style="width:50px; padding:8px; text-align:center; border-radius:5px; border:2px solid #3c5a99; outline:none;">
            </div>
            
            <div style="display:flex; flex-direction:column; align-items:center;">
                <label style="color:#88aaff; font-size:12px;">Y</label>
                <input type="number" id="inputY" min="0" max="10" 
                    style="width:50px; padding:8px; text-align:center; border-radius:5px; border:2px solid #3c5a99; outline:none;">
            </div>

            <button name="checkBtn" 
                style="margin-left:10px; height:40px; padding:0 20px; background:#3c5a99; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">
                CHECK
            </button>
        </div>
    `);

    this.inputElement.addListener("click");
    this.inputElement.on("click", (e: any) => {
        if (e.target.name === "checkBtn") this.checkSolution();
    });
  }

  private checkSolution() {
      if (!this.inputElement) return;

      const xInput = this.inputElement.getChildByID("inputX") as HTMLInputElement;
      const yInput = this.inputElement.getChildByID("inputY") as HTMLInputElement;

      const xVal = parseInt(xInput.value);
      const yVal = parseInt(yInput.value);

      if (xVal === 7 && yVal === 5) {
          this.completePuzzle();
      } else {
          xInput.style.borderColor = "red";
          yInput.style.borderColor = "red";
          this.wrongAnswersCount++;

          if (this.wrongAnswersCount >= 2 && !this.hintButton) {
              this.showHintButton();
          }

          this.tweens.add({
              targets: this.inputElement,
              x: this.inputElement.x + 5,
              duration: 50,
              yoyo: true,
              repeat: 3
          });
      }
  }

  private showHintButton() {
    const { width } = this.scale;
    const hintY = (this.inputElement?.y || 0) + 60;

    this.hintButton = this.add.text(width / 2, hintY, "[ Hint Tonen ]", {
        fontSize: "18px",
        color: "#ffff00",
        backgroundColor: "#333333",
        padding: { x: 10, y: 5 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
        if (this.hintButton) {
            this.hintButton.setText("X = Horizontaal (Opzij)\nY = Verticaal (Omhoog)");
            this.hintButton.disableInteractive();
        }
    });

    this.puzzleContainer.add(this.hintButton);
  }

  private closePuzzle() {
      this.isPuzzleOpen = false;
      this.inputElement?.destroy();
      this.puzzleContainer?.destroy();
  }

  private completePuzzle() {
      this.closePuzzle();
      this.scene.start("LogicTower_3", { returnScene: this.returnSceneKey });
  }

  private exitScene() {
    const spawnX = this.scale.width / 2;
    const spawnY = this.scale.height / 2 + 90;
    this.scene.start(this.returnSceneKey, { spawnX, spawnY, cameFromScene: "LogicTower_2" });
  }
}