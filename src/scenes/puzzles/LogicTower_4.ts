import Phaser from "phaser";

export default class LogicTower_4 extends Phaser.Scene {
  private returnSceneKey: string = "Face4Scene";
  private inputElement?: Phaser.GameObjects.DOMElement;

  // --- SCALING CONFIG ---
  // Adjust scale to fit the whiteboard nicely on screen
  private readonly puzzleScale = 0.2;

  constructor() {
    super("LogicTower_4");
  }

  init(data: { returnScene?: string }) {
    if (data?.returnScene) this.returnSceneKey = data.returnScene;
  }

  preload() {
    // Load the whiteboard image
    this.load.image("whiteboard", "assets/decor/whiteboard.png");
  }

  create() {
    const { width, height } = this.scale;

    // 1. Background
    this.add.rectangle(0, 0, width, height, 0x1b2748).setOrigin(0);

    // 2. Header
    this.add.text(width / 2, 40, "Logica Toren: Niveau 4", {
      fontFamily: "sans-serif", fontSize: "28px", color: "#ffffff"
    }).setOrigin(0.5);

    this.add.text(20, 20, "ESC om terug te gaan", {
      fontFamily: "sans-serif", fontSize: "16px", color: "#8fd5ff",
    }).setAlpha(0.7);

    // 3. The Whiteboard Puzzle Image
    // Positioned slightly above center to make room for input
    const whiteboard = this.add.image(width / 2, height / 2 - 30, "whiteboard");
    whiteboard.setScale(this.puzzleScale);

    // 4. Create Input Field
    // Positioned below the whiteboard
    this.createInput(width / 2, height - 100);

    // 5. Escape Listener
    this.input.keyboard?.on("keydown-ESC", () => this.exitScene());
  }

  // ---------------------------------------------------------
  // INTERACTION
  // ---------------------------------------------------------
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
                width: 300px; /* Wider box for the longer answer */
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
      e.stopPropagation();
      // Prevent submitting if the dialogue is active
      if (e.key === "Enter" && this.inputElement?.visible) this.checkAnswer();
    });
  }

  private checkAnswer() {
    const input = this.inputElement?.getChildByID("answerBox") as HTMLInputElement;
    if (!input) return;

    const rawValue = input.value;

    // Normalization:
    // 1. toLowerCase(): makes it case-insensitive
    // 2. replace(/\s+/g, ''): removes ALL spaces
    // Result: "Vierkant voor Wiskunde" becomes "vierkantvoorwiskunde"
    const normalizedValue = rawValue.toLowerCase().replace(/\s+/g, '');
    const targetAnswer = "vierkantvoorwiskunde";

    if (normalizedValue === targetAnswer) {
      // Correct! Start the dialogue sequence.
      this.startPostPuzzleDialogue();
    } else {
      // Wrong answer animation (Shake and Red flash)
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
          input.focus();
        }
      });
    }
  }

  // ---------------------------------------------------------
  // POST-PUZZLE DIALOGUE
  // ---------------------------------------------------------
  private startPostPuzzleDialogue() {
      // 1. Hide the input form so they can't type anymore
      if (this.inputElement) this.inputElement.setVisible(false);

      const { width, height } = this.scale;

      // Simple placeholder dialogue box
      this.add.rectangle(width/2, height - 100, width - 100, 150, 0x000000, 0.8)
          .setStrokeStyle(2, 0xffffff);
      
      const textContent = "Dat is juist! 'Vierkant voor wiskunde'.\n\n[Hier komt het vervolg van het verhaal...]\n\n(Klik of druk op E / spatie)";

      this.add.text(width/2, height - 100, textContent, {
          fontFamily: 'sans-serif',
          fontSize: '20px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: width - 140 }
      }).setOrigin(0.5);

      // Add listeners for E, spacebar, and tap to finish the level
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