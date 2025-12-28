import Phaser from "phaser";

export default class LogicTower_3 extends Phaser.Scene {
  private returnSceneKey: string = "Face4Scene";
  private inputElement?: Phaser.GameObjects.DOMElement;
  private readonly puzzleScale = 0.25; //scale hier
  constructor() {
    super("LogicTower_3");
  }
  init(data: { returnScene?: string }) {
    if (data?.returnScene) this.returnSceneKey = data.returnScene;
  }

  preload() {
    this.load.image("balance_scale_puzzle", "assets/decor/balance_scale_puzzle.png");
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x1b2748).setOrigin(0);

    //de header
    this.add.text(width / 2, 40, "Logica Toren: Niveau 3", {
      fontFamily: "sans-serif", fontSize: "28px", color: "#ffffff"
    }).setOrigin(0.5);
    this.add.text(20, 20, "ESC om terug te gaan", {
      fontFamily: "sans-serif", fontSize: "16px", color: "#8fd5ff",
    }).setAlpha(0.7);

    const puzzleImg = this.add.image(width / 2, height / 2, "balance_scale_puzzle");
    puzzleImg.setScale(this.puzzleScale); //scale bovenin 
    this.createInput(width / 2, height - 80);
    this.input.keyboard?.on("keydown-ESC", () => this.exitScene());
  }

  //interactie
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
      e.stopPropagation();
      if (e.key === "Enter") this.checkAnswer();
    });
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

private completePuzzle() {
    console.log("Tower Level 3 Completed!");
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