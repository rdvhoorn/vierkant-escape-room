import Phaser from "phaser";

export default class LogicTower_5 extends Phaser.Scene {
  private returnSceneKey: string = "Face4Scene";
  private inputElement?: Phaser.GameObjects.DOMElement;
  
  // --- ASSETS & CONFIG ---
  private readonly quadratusScale = 0.4; 
  private readonly morsesheetScale = 0.6;
  
  // Separation from center for NPC and Sheet
  private readonly sideOffset = 280; 

  // Morse Timing (in ms)
  private readonly dotDuration = 200;
  private readonly dashDuration = 600;
  private readonly symbolGap = 200;   
  private readonly letterGap = 800;   

  // "EINDE"
  private readonly secretCode = [".", "..", "-.", "-..", "."];

  // State / Objects
  private dialogText?: Phaser.GameObjects.Text;
  private dialogHint?: Phaser.GameObjects.Text;
  private replayText?: Phaser.GameObjects.Text;
  private continueText?: Phaser.GameObjects.Text;
  private backOptionText?: Phaser.GameObjects.Text;

  private npcImage?: Phaser.GameObjects.Image;
  private morseSheet?: Phaser.GameObjects.Image;
  
  private signalBox?: Phaser.GameObjects.Container;
  private flashElement?: Phaser.GameObjects.Rectangle;

  constructor() {
    super("LogicTower_5");
  }

  init(data: { returnScene?: string }) {
    if (data?.returnScene) this.returnSceneKey = data.returnScene;
  }

  preload() {
    this.load.image("quadratus", "assets/decor/quadratus.png");
    this.load.image("morsesheet", "assets/decor/morsesheet.png");
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x0a0a1a).setOrigin(0);

    this.createSignalBox(width / 2, height / 2 - 200); 

    // 1. Setup Quadratus NPC (Left)
    this.npcImage = this.add.image(width / 2 - this.sideOffset, height / 2 + 100, "quadratus");
    this.npcImage.setScale(this.quadratusScale);
    this.npcImage.setAlpha(0);

    // 2. Setup Morse Sheet (Right)
    this.morseSheet = this.add.image(width / 2 + this.sideOffset, height / 2 + 100, "morsesheet");
    this.morseSheet.setScale(this.morsesheetScale);
    this.morseSheet.setAlpha(0); 

    this.startIntroDialog();
  }

  private createSignalBox(x: number, y: number) {
      const boxW = 200;
      const boxH = 100;
      this.signalBox = this.add.container(x, y);
      this.signalBox.setAlpha(0); 
      const boxBg = this.add.rectangle(0, 0, boxW, boxH, 0x000000).setStrokeStyle(4, 0xffffff);
      this.flashElement = this.add.rectangle(0, 0, boxW - 20, boxH - 20, 0xffffff).setAlpha(0);
      this.signalBox.add([boxBg, this.flashElement]);
  }

  // ---------------------------------------------------------
  // SEQUENCE PART 1: DIALOGUE
  // ---------------------------------------------------------
  private startIntroDialog() {
    const { width, height } = this.scale;

    this.tweens.add({ targets: this.npcImage, alpha: 1, duration: 1000 });

    this.dialogText = this.add.text(width / 2, height - 150, "Quadratus: ...Je hebt het ver geschopt... Luister goed...", {
      fontFamily: "sans-serif", fontSize: "24px", color: "#ffffff",
      wordWrap: { width: width - 100 }, align: 'center'
    }).setOrigin(0.5).setAlpha(0);

    this.dialogHint = this.add.text(width / 2, height - 100, "(Druk op E om het signaal te starten)", {
      fontFamily: "sans-serif", fontSize: "16px", color: "#ffff00"
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: [this.dialogText, this.dialogHint],
      alpha: 1,
      duration: 1000,
      onComplete: () => {
        this.input.keyboard?.once("keydown-E", () => {
          this.startFlashingSequence();
        });
      }
    });
  }

  // ---------------------------------------------------------
  // SEQUENCE PART 2: MORSE FLASHING
  // ---------------------------------------------------------
  private startFlashingSequence() {
    this.dialogText?.destroy();
    this.dialogHint?.destroy();
    
    this.transitionToSignalState();
  }

  private transitionToSignalState() {
      this.clearReplayUI();
      this.cleanupInputUI();

      this.signalBox?.setAlpha(1);
      this.npcImage?.setAlpha(1).setTint(0x444444);
      this.morseSheet?.setAlpha(1);

      // Tween sheet back to the side if it was in the center
      const { width, height } = this.scale;
      if (this.morseSheet && this.morseSheet.x === width/2) {
          this.tweens.add({
              targets: this.morseSheet,
              x: width / 2 + this.sideOffset,
              y: height / 2 + 100,
              duration: 800,
              ease: 'Power2'
          });
      }

      console.log("Starting Morse Sequence...");
      this.playNextLetter(0);
  }

  private playNextLetter(index: number) {
    if (index >= this.secretCode.length) {
      this.time.delayedCall(1000, () => this.offerReplayOrContinue());
      return;
    }
    const pattern = this.secretCode[index];
    this.playSignal(pattern, 0, () => {
      this.time.delayedCall(this.letterGap, () => {
        this.playNextLetter(index + 1);
      });
    });
  }

  private playSignal(pattern: string, symbolIndex: number, onComplete: () => void) {
    if (symbolIndex >= pattern.length) {
      onComplete();
      return;
    }
    const symbol = pattern[symbolIndex];
    const duration = symbol === "." ? this.dotDuration : this.dashDuration;
    this.flashElement!.setAlpha(1);
    this.time.delayedCall(duration, () => {
      this.flashElement!.setAlpha(0);
      this.time.delayedCall(this.symbolGap, () => {
        this.playSignal(pattern, symbolIndex + 1, onComplete);
      });
    });
  }

  // ---------------------------------------------------------
  // SEQUENCE PART 3: REPLAY OPTION
  // ---------------------------------------------------------
  private offerReplayOrContinue() {
      const { width, height } = this.scale;

      this.replayText = this.add.text(width/2, height - 160, "[R] Signaal herhalen", {
          fontFamily: 'sans-serif', fontSize: '22px', color: '#ffff00',
          backgroundColor: '#222200', padding: { x: 10, y: 5 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      
      this.replayText.on('pointerdown', () => this.startFlashingSequence());

      this.continueText = this.add.text(width/2, height - 110, "[C] Doorgaan naar vertaling", {
        fontFamily: 'sans-serif', fontSize: '22px', color: '#00ff00',
        backgroundColor: '#002200', padding: { x: 10, y: 5 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      this.continueText.on('pointerdown', () => this.showMorsePaper());

      this.input.keyboard?.once('keydown-R', () => this.startFlashingSequence());
      this.input.keyboard?.once('keydown-C', () => this.showMorsePaper());
  }

  private clearReplayUI() {
      this.replayText?.destroy();
      this.continueText?.destroy();
      this.input.keyboard?.off('keydown-R');
      this.input.keyboard?.off('keydown-C');
  }

  // ---------------------------------------------------------
  // SEQUENCE PART 4: PAPER & INPUT
  // ---------------------------------------------------------
  private showMorsePaper() {
    this.clearReplayUI();
    const { width, height } = this.scale;
    
    this.npcImage?.setAlpha(0);
    this.signalBox?.setAlpha(0);

    if (this.morseSheet) {
        this.tweens.add({
            targets: this.morseSheet,
            x: width / 2,
            y: height / 2,
            duration: 1000,
            ease: 'Power2'
        });
    }

    this.dialogText = this.add.text(width / 2, height / 2 - 250, "Vertaal het signaal:", {
      fontFamily: "sans-serif", fontSize: "28px", color: "#ffffff"
    }).setOrigin(0.5);

    this.createInput(width / 2, height - 100);
  }

  private createInput(x: number, y: number) {
    this.inputElement = this.add.dom(x, y).createFromHTML(`
      <div style="display: flex; gap: 10px; align-items: center; justify-content: center;">
        <input type="text" id="answerBox" placeholder="..."
          style="width: 200px; padding: 10px; font-size: 24px; text-align: center; border: 3px solid #ffffff; border-radius: 8px; outline: none; background: #222; color: white; font-weight: bold; text-transform: uppercase;" />
        <button name="submitBtn" style="padding: 10px 20px; font-size: 18px; background: #ffffff; color: black; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Check</button>
      </div>
    `);

    this.inputElement.addListener("click");
    this.inputElement.on("click", (e: any) => { if (e.target.name === "submitBtn") this.checkAnswer(); });
    
    this.inputElement.addListener("keydown");
    this.inputElement.on("keydown", (e: any) => {
      e.stopPropagation(); 
      if (e.key === "Enter") { this.checkAnswer(); return; }
      if (this.backOptionText && e.key.toLowerCase() === 'b') {
          e.preventDefault(); 
          this.returnToSignal();
      }
    });

    const input = this.inputElement.getChildByID("answerBox") as HTMLInputElement;
    input?.focus();
  }

  private checkAnswer() {
    const input = this.inputElement?.getChildByID("answerBox") as HTMLInputElement;
    if (!input) return;
    const val = input.value.trim().toLowerCase();

    if (val === "einde") {
      this.completeTower();
    } else {
      input.style.borderColor = "#ff0000";
      this.tweens.add({
        targets: this.inputElement, x: this.inputElement!.x + 10, duration: 50, yoyo: true, repeat: 3,
        onComplete: () => { input.style.borderColor = "#ffffff"; input.focus(); }
      });

      if (!this.backOptionText) {
          const { width, height } = this.scale;
          this.backOptionText = this.add.text(width / 2, height - 40, "[B] Terug naar signaal", {
              fontFamily: "sans-serif", fontSize: "18px", color: "#ffaaaa", backgroundColor: "#220000", padding: { x: 10, y: 5 }
          }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          this.backOptionText.on('pointerdown', () => { this.returnToSignal(); });
      }
    }
  }

  private returnToSignal() {
      this.transitionToSignalState();
  }

  private cleanupInputUI() {
      this.inputElement?.destroy();
      this.inputElement = undefined;
      this.dialogText?.destroy();
      this.dialogText = undefined;
      this.backOptionText?.destroy();
      this.backOptionText = undefined;
  }

  private completeTower() {
    console.log("Final Tower Puzzle Completed! Exiting...");
    this.inputElement?.setVisible(false);
    this.backOptionText?.destroy(); 

    // --- SAVE PROGRESS ---
    this.registry.set("tower_solved", true);

    const { width, height } = this.scale;
    const finalText = this.add.text(width/2, height/2, "Correct.\n\nHet signaal is verzonden.\nDe toren sluit zich.", {
        fontFamily: 'sans-serif', fontSize: "32px", color: "#00ff00", align: "center", backgroundColor: "#000000", padding: {x:20, y:20}
    }).setOrigin(0.5).setDepth(2000).setAlpha(0);

    this.tweens.add({
        targets: [this.npcImage, this.morseSheet],
        alpha: 0,
        duration: 1000
    });
    this.tweens.add({
        targets: finalText, alpha: 1, duration: 1500,
    });

    this.time.delayedCall(4000, () => {
        this.exitScene(true);
    });
  }

  private exitScene(solved = false) {
    const spawnX = this.scale.width / 2;
    const spawnY = this.scale.height / 2 + 90;

    this.scene.start(this.returnSceneKey, {
      spawnX,
      spawnY,
      cameFromScene: "LogicTower_5",
      towerSolved: solved 
    });
  }
}