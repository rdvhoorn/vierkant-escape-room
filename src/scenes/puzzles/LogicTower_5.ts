import Phaser from "phaser";
import { createBackButton } from "../../utils/BackButton";

export default class LogicTower_5 extends Phaser.Scene {
  private returnSceneKey: string = "Face4Scene";
  private inputElement?: Phaser.GameObjects.DOMElement;
  private readonly quadratusScale = 0.4; 
  private readonly morsesheetScale = 0.85; 
  private readonly sideOffset = 280; 
  private readonly dotDuration = 200;
  private readonly dashDuration = 600;
  private readonly symbolGap = 200;   
  private readonly letterGap = 2500;   
  private readonly secretCode = [".", "..", "-.", "-..", "."];
  private dialogText?: Phaser.GameObjects.Text;
  private dialogHint?: Phaser.GameObjects.Text;
  private replayText?: Phaser.GameObjects.Text;
  private continueText?: Phaser.GameObjects.Text;
  private backOptionText?: Phaser.GameObjects.Text;
  private hintButton?: Phaser.GameObjects.Text;
  private npcImage?: Phaser.GameObjects.Image;
  private morseSheet?: Phaser.GameObjects.Image;
  private signalBox?: Phaser.GameObjects.Container;
  private flashElement?: Phaser.GameObjects.Rectangle;
  private isSignalPlaying = false;
  private wrongAnswersCount = 0;
  private currentSignalTimer?: Phaser.Time.TimerEvent;
  private introClickHandler?: () => void;

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

    createBackButton(this, undefined, undefined, () => {
      this.exitScene();
    });

    this.createTowerBackground(width, height);
    this.createSignalBox(width / 2, height / 2 - 200); 
    this.npcImage = this.add.image(width / 2 - this.sideOffset, height / 2 + 100, "quadratus");
    this.npcImage.setScale(this.quadratusScale);
    this.npcImage.setAlpha(0);
    this.morseSheet = this.add.image(width / 2 + this.sideOffset, height / 2 + 100, "morsesheet");
    this.morseSheet.setScale(this.morsesheetScale);
    this.morseSheet.setAlpha(0); 
    this.startIntroDialog();
  }

  private createTowerBackground(width: number, height: number) {
    const skyColor = 0x0f182b;
    this.add.rectangle(0, 0, width, height, skyColor).setOrigin(0);
    const windowRadius = 80; 
    const windowX = width * 0.15; 
    const windowY = height * 0.2;
    const starGraphics = this.add.graphics();
    starGraphics.fillStyle(0xffffff, 1.0); 
    
    for (let i = 0; i < 80; i++) {
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

  private createSignalBox(x: number, y: number) {
      const boxW = 200;
      const boxH = 100;
      this.signalBox = this.add.container(x, y);
      this.signalBox.setAlpha(0); 
      const boxBg = this.add.rectangle(0, 0, boxW, boxH, 0x000000).setStrokeStyle(4, 0xffffff);
      this.flashElement = this.add.rectangle(0, 0, boxW - 20, boxH - 20, 0xffffff).setAlpha(0);
      this.signalBox.add([boxBg, this.flashElement]);
  }

  private startIntroDialog() {
    const { width, height } = this.scale;

    this.tweens.add({ targets: this.npcImage, alpha: 1, duration: 1000 });

    this.dialogText = this.add.text(width / 2, height - 150, 
        "Quadratus: ...Je hebt het ver geschopt...\nPak pen en papier erbij, dit gaat snel...", 
        {
            fontFamily: "sans-serif", fontSize: "24px", color: "#ffffff",
            wordWrap: { width: width - 100 }, align: 'center'
        }
    ).setOrigin(0.5).setAlpha(0);

    this.dialogHint = this.add.text(width / 2, height - 100, "(Klik of druk op E / spatie)", {
      fontFamily: "sans-serif", fontSize: "16px", color: "#ffff00"
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: [this.dialogText, this.dialogHint],
      alpha: 1,
      duration: 1000,
      onComplete: () => {
        this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.input.keyboard?.once("keydown-E", () => this.startFlashingSequence());
        this.input.keyboard?.once("keydown-SPACE", () => this.startFlashingSequence());
        this.introClickHandler = () => this.startFlashingSequence();
        this.input.once("pointerdown", this.introClickHandler);
      }
    });
  }

  private startFlashingSequence() {
    if (this.introClickHandler) {
        this.input.off("pointerdown", this.introClickHandler);
        this.introClickHandler = undefined;
    }

    this.dialogText?.destroy();
    this.dialogHint?.destroy();
    
    this.transitionToSignalState();
  }

  private transitionToSignalState() {
      this.stopSignalTimers();
      this.clearReplayUI();
      this.cleanupInputUI();
      this.isSignalPlaying = true;
      this.signalBox?.setAlpha(1);
      this.npcImage?.setAlpha(1).setTint(0x444444);
      this.morseSheet?.setAlpha(1);
      const { width, height } = this.scale;
      if (this.morseSheet && this.morseSheet.x === width/2) {
          this.tweens.add({
              targets: this.morseSheet,
              x: width / 2 + this.sideOffset,
              y: height / 2 + 100,
              duration: 500,
              ease: 'Power2'
          });
      }

      this.currentSignalTimer = this.time.delayedCall(2000, () => {
          if(this.isSignalPlaying) {
             this.playNextLetter(0);
          }
      });
  }

  private stopSignalTimers() {
      if (this.currentSignalTimer) {
          this.currentSignalTimer.remove(false);
          this.currentSignalTimer = undefined;
      }
      this.isSignalPlaying = false;
      if (this.flashElement) this.flashElement.setAlpha(0);
  }

  private playNextLetter(index: number) {
    if (!this.isSignalPlaying) return;

    if (index >= this.secretCode.length) {
      this.currentSignalTimer = this.time.delayedCall(1000, () => {
          if (this.isSignalPlaying) this.offerReplayOrContinue();
      });
      return;
    }
    const pattern = this.secretCode[index];
    this.playSignal(pattern, 0, () => {
      this.currentSignalTimer = this.time.delayedCall(this.letterGap, () => {
        this.playNextLetter(index + 1);
      });
    });
  }

  private playSignal(pattern: string, symbolIndex: number, onComplete: () => void) {
    if (!this.isSignalPlaying) return;

    if (symbolIndex >= pattern.length) {
      onComplete();
      return;
    }
    const symbol = pattern[symbolIndex];
    const duration = symbol === "." ? this.dotDuration : this.dashDuration;
    
    if (this.flashElement) this.flashElement.setAlpha(1);
    
    this.currentSignalTimer = this.time.delayedCall(duration, () => {
      if (!this.isSignalPlaying) return;
      if (this.flashElement) this.flashElement.setAlpha(0);
      
      this.currentSignalTimer = this.time.delayedCall(this.symbolGap, () => {
        this.playSignal(pattern, symbolIndex + 1, onComplete);
      });
    });
  }

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

  private showMorsePaper() {
    this.stopSignalTimers();
    this.clearReplayUI();
    const { width, height } = this.scale;
    this.npcImage?.setAlpha(0);
    this.signalBox?.setAlpha(0);
    this.tweens.killTweensOf(this.flashElement!);
    this.wrongAnswersCount = 0;
    this.hintButton = undefined;

    if (this.morseSheet) {
        this.tweens.add({
            targets: this.morseSheet,
            x: width / 2,
            y: height / 2,
            duration: 600,
            ease: 'Power2'
        });
    }

    this.dialogText = this.add.text(width / 2, height / 2 - 250, "Vertaal het signaal:", {
      fontFamily: "sans-serif", fontSize: "28px", color: "#ffffff"
    }).setOrigin(0.5);

    this.time.delayedCall(50, () => {
        this.createInput(width / 2, height - 100);
    });
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
      
      this.wrongAnswersCount++;
      if (this.wrongAnswersCount >= 2 && !this.hintButton) {
          this.showHintButton();
      }

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

  private showHintButton() {
      const { width, height } = this.scale;
      const btnX = width / 2 + 400;
      const btnY = height - 100; 
      this.hintButton = this.add.text(btnX, btnY, "[ Hint Tonen ]", {
          fontSize: "18px", color: "#ffff00", backgroundColor: "#333", padding: { x: 10, y: 5 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
          if (this.hintButton) {
              this.hintButton.setText("Hint: Het woord heeft 5 letters");
              this.hintButton.disableInteractive();
          }
      });
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
      this.hintButton?.destroy();
      this.hintButton = undefined;
  }

  private completeTower() {
    this.inputElement?.setVisible(false);
    this.backOptionText?.destroy(); 
    this.hintButton?.destroy();

    this.registry.set("tower_solved", true);

    const { width, height } = this.scale;
    const finalText = this.add.text(width/2, height/2, "Correct.\n\nJe hebt het einde van de toren bereikt.\n Deze toren gebruikten we altijd om andere wezens in de gaten te houden en met hen te communiceren.", {
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
      towerSolved: solved,
      entry_from_puzzle: true,
    });
  }
}