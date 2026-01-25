import Phaser from "phaser";

export interface DialogLine {
  speaker?: string;
  text: string;
  speakerColor?: string;
}

export interface DialogConfig {
  // Styling
  boxColor?: number;
  boxAlpha?: number;
  borderColor?: number;
  textColor?: string;
  fontSize?: string;

  // Positioning
  position?: "bottom" | "center" | "top";
  marginY?: number;
  boxWidth?: number;
  boxHeight?: number;

  // Behavior
  showOverlay?: boolean;
  overlayAlpha?: number;
  showHint?: boolean;
  hintText?: string;
  inputDelay?: number;

  // Speaker styles
  speakerStyles?: Record<string, string>;
  defaultSpeakerColor?: string;
}

const DEFAULT_CONFIG: Required<DialogConfig> = {
  boxColor: 0x1b2748,
  boxAlpha: 0.95,
  borderColor: 0x3c5a99,
  textColor: "#e7f3ff",
  fontSize: "18px",

  position: "bottom",
  marginY: 80,
  boxWidth: 640,
  boxHeight: 120,

  showOverlay: false,
  overlayAlpha: 0.15,
  showHint: true,
  hintText: "Klik →",
  inputDelay: 300,

  speakerStyles: {
    Jij: "#4bff72ff",
    Quadratus: "#ffb74cff",
  },
  defaultSpeakerColor: "#ffffffff",
};

export class DialogManager {
  private scene: Phaser.Scene;
  private config: Required<DialogConfig>;

  // State
  private active: boolean = false;
  private lines: DialogLine[] = [];
  private currentIndex: number = 0;
  private onComplete?: () => void;
  private inputEnabled: boolean = false;

  // UI Elements
  private overlay?: Phaser.GameObjects.Rectangle;
  private box?: Phaser.GameObjects.Graphics;
  private speakerText?: Phaser.GameObjects.Text;
  private dialogText?: Phaser.GameObjects.Text;
  private hintText?: Phaser.GameObjects.Text;

  // Input handlers
  private keyE?: Phaser.Input.Keyboard.Key;
  private keySpace?: Phaser.Input.Keyboard.Key;
  private boundHandleAdvance: () => void;
  private boundPointerHandler: () => void;

  constructor(scene: Phaser.Scene, config?: DialogConfig) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.boundHandleAdvance = this.handleAdvance.bind(this);
    this.boundPointerHandler = this.handlePointer.bind(this);

    this.setupInput();
  }

  show(lines: DialogLine[], onComplete?: () => void): void {
    if (!lines.length) return;

    this.lines = lines;
    this.currentIndex = 0;
    this.onComplete = onComplete;
    this.active = true;
    this.inputEnabled = false;

    this.createUI();
    this.showCurrentLine();

    // Enable input after delay (prevents accidental click-through)
    this.scene.time.delayedCall(this.config.inputDelay, () => {
      if (this.active) {
        this.inputEnabled = true;
      }
    });
  }

  advance(): void {
    if (!this.active || !this.inputEnabled) return;

    this.currentIndex++;
    if (this.currentIndex >= this.lines.length) {
      this.close();
    } else {
      this.showCurrentLine();
    }
  }

  close(): void {
    if (!this.active) return;

    this.active = false;
    this.inputEnabled = false;
    this.cleanupUI();

    const cb = this.onComplete;
    this.onComplete = undefined;
    cb?.();
  }

  isActive(): boolean {
    return this.active;
  }

  destroy(): void {
    this.cleanupUI();
    this.cleanupInput();
  }

  private setupInput(): void {
    const kb = this.scene.input.keyboard;

    if (kb) {
      this.keyE = kb.addKey("E");
      this.keySpace = kb.addKey("SPACE");

      kb.on("keydown-E", this.boundHandleAdvance);
      kb.on("keydown-SPACE", this.boundHandleAdvance);
    }

    this.scene.input.on("pointerdown", this.boundPointerHandler);
  }

  private cleanupInput(): void {
    const kb = this.scene.input.keyboard;

    if (kb) {
      kb.off("keydown-E", this.boundHandleAdvance);
      kb.off("keydown-SPACE", this.boundHandleAdvance);

      if (this.keyE) kb.removeKey(this.keyE);
      if (this.keySpace) kb.removeKey(this.keySpace);
    }

    this.scene.input.off("pointerdown", this.boundPointerHandler);
  }

  private handleAdvance(): void {
    if (!this.active || !this.inputEnabled) return;
    this.advance();
  }

  private handlePointer(): void {
    if (!this.active || !this.inputEnabled) return;
    this.advance();
  }

  private createUI(): void {
    const { width, height } = this.scene.scale;
    const cfg = this.config;

    // Calculate box position
    let boxY: number;
    switch (cfg.position) {
      case "top":
        boxY = cfg.marginY + cfg.boxHeight / 2;
        break;
      case "center":
        boxY = height * 0.35;
        break;
      case "bottom":
      default:
        boxY = height - cfg.marginY;
        break;
    }

    // Use full width for bottom position, fixed width otherwise
    const boxWidth = cfg.position === "bottom" ? width - 100 : cfg.boxWidth;
    const boxX = width / 2 - boxWidth / 2;

    // Overlay (optional)
    if (cfg.showOverlay) {
      this.overlay = this.scene.add.rectangle(
        width / 2,
        height / 2,
        width,
        height,
        0x000000,
        cfg.overlayAlpha
      );
      this.overlay.setDepth(998);
      this.overlay.setScrollFactor(0);
    }

    // Dialog box
    this.box = this.scene.add.graphics();
    this.box.setDepth(999);
    this.box.setScrollFactor(0);
    this.box.fillStyle(cfg.boxColor, cfg.boxAlpha);
    this.box.fillRoundedRect(
      boxX,
      boxY - cfg.boxHeight / 2,
      boxWidth,
      cfg.boxHeight,
      12
    );
    this.box.lineStyle(2, cfg.borderColor, 1);
    this.box.strokeRoundedRect(
      boxX,
      boxY - cfg.boxHeight / 2,
      boxWidth,
      cfg.boxHeight,
      12
    );

    const textStartX = boxX + 20;
    const textTopY = boxY - cfg.boxHeight / 2 + 14;

    // Speaker name text
    this.speakerText = this.scene.add
      .text(textStartX, textTopY, "", {
        fontFamily: "sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color: cfg.defaultSpeakerColor,
      })
      .setDepth(1000)
      .setScrollFactor(0);

    // Dialog text - position depends on whether there's a speaker
    this.dialogText = this.scene.add
      .text(textStartX, textTopY + 24, "", {
        fontFamily: "sans-serif",
        fontSize: cfg.fontSize,
        color: cfg.textColor,
        wordWrap: { width: boxWidth - 40, useAdvancedWrap: true },
      })
      .setDepth(1000)
      .setScrollFactor(0);

    // Hint text (optional)
    if (cfg.showHint) {
      this.hintText = this.scene.add
        .text(
          boxX + boxWidth - 10,
          boxY + cfg.boxHeight / 2 - 10,
          cfg.hintText,
          {
            fontFamily: "sans-serif",
            fontSize: "12px",
            color: "#888888",
          }
        )
        .setOrigin(1, 1)
        .setDepth(1000)
        .setScrollFactor(0);
    }
  }

  private showCurrentLine(): void {
    const line = this.lines[this.currentIndex];
    if (!line || !this.dialogText) return;

    // Handle speaker
    if (line.speaker && this.speakerText) {
      const speakerColor =
        line.speakerColor ??
        this.config.speakerStyles[line.speaker] ??
        this.config.defaultSpeakerColor;

      this.speakerText.setText(line.speaker);
      this.speakerText.setColor(speakerColor);
      this.speakerText.setVisible(true);

      // Position dialog text below speaker
      const speakerY = this.speakerText.y;
      this.dialogText.setY(speakerY + 24);
    } else if (this.speakerText) {
      this.speakerText.setVisible(false);
      // Position dialog text at speaker position when no speaker
      this.dialogText.setY(this.speakerText.y);
    }

    this.dialogText.setText(line.text);
  }

  private cleanupUI(): void {
    this.overlay?.destroy();
    this.box?.destroy();
    this.speakerText?.destroy();
    this.dialogText?.destroy();
    this.hintText?.destroy();

    this.overlay = undefined;
    this.box = undefined;
    this.speakerText = undefined;
    this.dialogText = undefined;
    this.hintText = undefined;
  }
}
