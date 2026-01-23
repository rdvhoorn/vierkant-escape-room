import Phaser from "phaser";

export default class LogicTower_1 extends Phaser.Scene {
  // --- Configuration ---
  private readonly objectScale = 0.3;
  private readonly backgroundScale = 1;
  private returnSceneKey: string = "Face4Scene";

  // --- State Flags ---
  // We use simple booleans to track state, avoiding complex object checks
  private isInteracting = false; 

  // --- Game Objects ---
  private telescope!: Phaser.GameObjects.Image;
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;
  private answerInput?: Phaser.GameObjects.DOMElement;

  // --- Dialog Data ---
  private dialogLines: string[] = [];
  private dialogIndex = 0;

  // --- Event Handlers ---
  private dialogKeyHandler?: (ev: KeyboardEvent) => void;
  private pointerHandler?: () => void;

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
    // 1. HARD RESET OF STATE
    this.isInteracting = false;
    this.dialogLines = [];
    this.dialogIndex = 0;
    this.answerInput = undefined;

    const { width, height } = this.scale;

    // 2. Background
    const bg = this.add.rectangle(0, 0, width, height, 0x0f182b).setOrigin(0);
    bg.setScale(this.backgroundScale);

    this.add.text(20, 20, "ESC om terug te gaan", {
      fontFamily: "sans-serif", fontSize: "16px", color: "#8fd5ff",
    }).setOrigin(0, 0).setAlpha(0.7);

    // 3. Telescope with EXPLICIT HIT AREA
    this.telescope = this.add.image(width / 2, height / 2 + 20, "telescope")
      .setScale(this.objectScale);

    // Force a hit area based on the image size to ensure clicks register
    // (Wait for texture to load, or assume standard size if preloaded)
    this.telescope.setInteractive({ 
        useHandCursor: true,
        // Optional: define a shape if the PNG transparency is causing issues
        // hitArea: new Phaser.Geom.Rectangle(0, 0, this.telescope.width, this.telescope.height),
        // hitAreaCallback: Phaser.Geom.Rectangle.Contains
    });

    this.telescope.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // Prevent bubbling to global listener
      if (pointer.event) pointer.event.stopPropagation();

      // If we are already doing something (dialog or input), ignore clicks
      if (this.isInteracting) return;

      console.log("Telescope clicked!"); // Debug log
      this.startDialog([
        "Een oude telescoop...",
        "Er staat iets geschreven op de voet."
      ]);
    });

    // 4. Global Inputs
    this.input.keyboard?.on("keydown-ESC", () => this.exitPuzzle());

    // 5. Setup UI (Hidden)
    this.createDialogUI();

    // 6. Cleanup Hook
    this.events.once("shutdown", this.cleanup, this);
  }

  // -------------------------------------------------------------------------
  // DIALOG UI & INPUT HANDLING
  // -------------------------------------------------------------------------

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

    // Dialog Advance Listeners
    this.dialogKeyHandler = (ev: KeyboardEvent) => {
      if ((ev.key === "e" || ev.key === "E" || ev.code === "Space") && this.isInteracting && !this.answerInput) {
        this.advanceDialog();
      }
    };
    this.input.keyboard?.on("keydown", this.dialogKeyHandler);

    this.pointerHandler = () => {
      // Only advance if interacting AND input box is NOT open
      if (this.isInteracting && !this.answerInput) this.advanceDialog();
    };
    // Use a delay to prevent the telescope click from immediately triggering this
    this.input.on("pointerdown", this.pointerHandler);
  }

  // -------------------------------------------------------------------------
  // CLEANUP & EXIT
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // DIALOG LOGIC
  // -------------------------------------------------------------------------

  private startDialog(lines: string[]) {
    this.isInteracting = true; // Lock interaction
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
    // We stay in 'isInteracting = true' mode because we go straight to the Riddle
    this.dialogBox.setVisible(false);
    this.dialogText.setVisible(false);
    this.showRiddle();
  }

  // -------------------------------------------------------------------------
  // RIDDLE & DOM INPUT
  // -------------------------------------------------------------------------

  private showRiddle() {
    const w = this.scale.width;
    const textY = this.telescope.y - (this.telescope.displayHeight * this.objectScale / 2) - 60;
    
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

  private completePuzzle() {
    console.log("Puzzle 2 Complete!");
    // Transition to next level
    this.scene.start("LogicTower_2", { 
        returnScene: this.returnSceneKey 
    }); 
  }
}