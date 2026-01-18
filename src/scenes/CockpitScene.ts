import Phaser from "phaser";
import { TwinklingStars } from "../utils/TwinklingStars";

export default class CockpitScene extends Phaser.Scene {
  private stars?: TwinklingStars;
  private energyLevel: number = 90; // 0-100
  private lampStates: Record<string, boolean> = {
    stroom: true,
    waarschuwing: false,
    zuurstof: true,
    motor: true,
    schild: true,
    deuren: true,
  };

  // Navigation (HEINO bovenaan, DEZONIA onderaan)
  private destinations: string[] = ["HEINO", "LUNTEREN", "MATHORIA", "CALCULON", "DEZONIA"];
  private distances: Record<string, number> = {
    "DEZONIA": 2026,
    "CALCULON": 850,
    "MATHORIA": 2400,
    "LUNTEREN": 450000,
    "HEINO": 785042,
  };
  private selectedDestination: number = 0; // Start with HEINO selected (index 0)

  // Interactive elements
  private energyBar?: Phaser.GameObjects.Graphics;
  private lamps: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private needle?: Phaser.GameObjects.Graphics;

  // Scene state
  private currentPhase: "intro1" | "intro2" | "damaged" | "repaired" = "intro1";

  // Dialog system
  private dialogOverlay?: Phaser.GameObjects.Rectangle;
  private dialogBox?: Phaser.GameObjects.Graphics;
  private dialogText?: Phaser.GameObjects.Text;
  private dialogLines: string[] = [];
  private dialogIndex: number = 0;
  private dialogOnClose?: () => void;

  // Joystick (needs to be animatable)
  private joystickPressT = 0; // 0..1
  private joystickBusy = false;


  constructor() {
    super("CockpitScene");
  }

  create() {
    const { width, height } = this.scale;

    // Determine current phase based on registry
    var introDone = this.registry.get("introDone") || false;
    var electricitySolved = this.registry.get("electricitySolved") || false;

    // Temp to skip to end credits
    // introDone = true;
    // electricitySolved = true;
    // this.registry.set("postPuzzleThoughtsShown", true);

    if (electricitySolved) {
      this.currentPhase = "repaired";
    } else if (introDone) {
      this.currentPhase = "damaged";
    } else {
      this.currentPhase = "intro1";
    }

    // Set initial state based on phase
    this.syncEnergyFromRegistry();
    this.applyPhaseState();

    // Background color (dark space)
    this.cameras.main.setBackgroundColor("#050510");

    // Starfield visible through windows
    const windowTop = 80;
    const windowBottom = height * 0.5;
    this.stars = new TwinklingStars(this, 150, width, windowBottom - windowTop);
    this.stars.graphics.setDepth(0);

    // Draw cockpit elements
    this.drawCockpitWindows(width, height);
    this.drawDashboard(width, height);
    this.drawInstruments(width, height);
    this.drawStickControl(width, height);
    this.drawElectricityHatch(width, height);

    // Start intro sequence if not done yet
    if (this.currentPhase === "intro1") {
      // Show intro text first, then crash
      this.time.delayedCall(800, () => this.showIntroText());
    }

    // Wake up effect for damaged state (eyes opening)
    if (this.currentPhase === "damaged") {
      this.playWakeUpEffect();
    } else if (this.currentPhase === "repaired") {
      this.cameras.main.fadeIn(500);
      // Show post-puzzle thoughts after fade (only once)
      if (!this.registry.get("postPuzzleThoughtsShown")) {
        this.time.delayedCall(800, () => {
          this.showPostPuzzleThoughts();
        });
      }
    }

    // Navigation controls (only when not in intro)
    this.input.keyboard!.on("keydown-W", () => {
      if (this.currentPhase === "intro1" || this.currentPhase === "intro2") return;
      this.selectedDestination = Math.max(0, this.selectedDestination - 1);
      this.updateNavigationPanel();
    });

    this.input.keyboard!.on("keydown-S", () => {
      if (this.currentPhase === "intro1" || this.currentPhase === "intro2") return;
      this.selectedDestination = Math.min(this.destinations.length - 1, this.selectedDestination + 1);
      this.updateNavigationPanel();
    });

    this.input.keyboard!.on("keydown-UP", () => {
      if (this.currentPhase === "intro1" || this.currentPhase === "intro2") return;
      this.selectedDestination = Math.max(0, this.selectedDestination - 1);
      this.updateNavigationPanel();
    });

    this.input.keyboard!.on("keydown-DOWN", () => {
      if (this.currentPhase === "intro1" || this.currentPhase === "intro2") return;
      this.selectedDestination = Math.min(this.destinations.length - 1, this.selectedDestination + 1);
      this.updateNavigationPanel();
    });

    this.registry.events.on("changedata-energy", this.syncEnergyFromRegistry, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off("changedata-energy", this.syncEnergyFromRegistry, this);
    });
  }

  private applyPhaseState() {
    switch (this.currentPhase) {
      case "intro1":
        // Flying to earth - everything green, 90% energy, HEINO selected
        this.energyLevel = 90;
        this.selectedDestination = 0; // HEINO (index 0)
        this.lampStates = {
          stroom: true,
          waarschuwing: false,
          zuurstof: true,
          motor: true,
          schild: true,
          deuren: true,
        };
        break;

      case "damaged":
        // After crash - most things off, energy empty, navigation off
        this.energyLevel = 0;
        this.selectedDestination = -1; // No selection (navigation off)
        this.lampStates = {
          stroom: false,
          waarschuwing: true, // Alarm still on
          zuurstof: false,
          motor: false,
          schild: false,
          deuren: false,
        };
        break;

      case "repaired":
        // After puzzle solved - things back on, 10% energy
        this.selectedDestination = 4; // DEZONIA (index 4)
        // Set DEZONIA distance to 0 to show "HIER"
        this.distances["DEZONIA"] = 0;
        this.lampStates = {
          stroom: true,
          waarschuwing: false,
          zuurstof: true,
          motor: true,
          schild: false,
          deuren: true,
        };
        break;
    }
  }

  private startCrashSequence() {
    this.currentPhase = "intro2";

    // Alarm on!
    this.lampStates.waarschuwing = true;
    this.updateLamps();

    // Screen shake
    this.cameras.main.shake(800, 0.02);

    // Flash red
    this.time.delayedCall(200, () => {
      this.cameras.main.flash(300, 255, 50, 0);
    });

    // More shake
    this.time.delayedCall(500, () => {
      this.cameras.main.shake(600, 0.03);
    });

    // Turn off lamps one by one
    this.time.delayedCall(800, () => {
      this.lampStates.motor = false;
      this.updateLamps();
    });
    this.time.delayedCall(1000, () => {
      this.lampStates.schild = false;
      this.updateLamps();
    });
    this.time.delayedCall(1200, () => {
      this.lampStates.zuurstof = false;
      this.updateLamps();
    });
    this.time.delayedCall(1400, () => {
      this.lampStates.stroom = false;
      this.updateLamps();
    });

    // Change navigation to DEZONIA
    this.time.delayedCall(1000, () => {
      this.selectedDestination = 4; // DEZONIA (index 4)
      this.updateNavigationPanel();
    });

    // Reduce energy
    this.time.delayedCall(600, () => {
      this.energyLevel = 50;
      this.updateEnergyBar();
    });
    this.time.delayedCall(1000, () => {
      this.energyLevel = 20;
      this.updateEnergyBar();
    });
    this.time.delayedCall(1400, () => {
      this.energyLevel = 0;
      this.updateEnergyBar();
    });

    // Fade to black (longer)
    this.time.delayedCall(1800, () => {
      this.cameras.main.fadeOut(1500, 0, 0, 0);
    });

    // Set introDone and restart scene in damaged state (right after fadeOut completes)
    this.time.delayedCall(3300, () => {
      this.registry.set("introDone", true);
      this.scene.restart();
    });
  }

  private playWakeUpEffect() {
    const { width, height } = this.scale;

    // Black overlay that we'll fade out
    const blackOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 1);
    blackOverlay.setDepth(100);

    // Blur overlay (dark semi-transparent)
    const blurOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    blurOverlay.setDepth(99);

    // Fade from black (same duration as fade out: 1500ms)
    this.tweens.add({
      targets: blackOverlay,
      alpha: 0,
      duration: 1500,
      ease: "Power2",
      onComplete: () => blackOverlay.destroy()
    });

    // Gradually reduce blur (1500ms total)
    this.tweens.add({
      targets: blurOverlay,
      alpha: 0,
      duration: 1500,
      delay: 250,
      ease: "Power2",
      onComplete: () => blurOverlay.destroy()
    });

    // Navigation stays OFF in damaged state (selectedDestination remains -1)
    // It will turn back on in repaired state after puzzle is solved

    // Show wake-up thoughts after vision clears (500ms later)
    this.time.delayedCall(2250, () => {
      this.showWakeUpThoughts();
    });
  }

  private showIntroText() {
    const { width, height } = this.scale;

    // Semi-transparent overlay
    this.dialogOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.15);
    this.dialogOverlay.setDepth(200);

    // Dialog box positioned at standard location (35% from top)
    const boxHeight = 120;
    const boxWidth = 640;
    const boxY = height * 0.35;
    const boxX = width / 2 - boxWidth / 2;
    this.dialogBox = this.add.graphics();
    this.dialogBox.setDepth(201);
    this.dialogBox.fillStyle(0x1b2748, 0.95);
    this.dialogBox.fillRoundedRect(boxX, boxY - boxHeight / 2, boxWidth, boxHeight, 12);
    this.dialogBox.lineStyle(2, 0x3c5a99, 1);
    this.dialogBox.strokeRoundedRect(boxX, boxY - boxHeight / 2, boxWidth, boxHeight, 12);

    // Text starting position
    const textStartX = boxX + 20;

    // Dialog text
    this.dialogText = this.add.text(textStartX, boxY - 10, "Je reist lekker door de ruimte, als plots...", {
      fontFamily: "sans-serif",
      fontSize: "18px",
      color: "#e7f3ff",
      wordWrap: { width: boxWidth - 40, useAdvancedWrap: true },
    }).setDepth(202);

    // Hint positioned bottom-right inside box
    this.add.text(boxX + boxWidth - 10, boxY + boxHeight / 2 - 10, "Klik →", {
      fontFamily: "sans-serif",
      fontSize: "12px",
      color: "#888888",
    }).setOrigin(1, 1).setDepth(202).setName("introHint");

    // Enable clicking after a short delay to prevent immediate click-through
    this.time.delayedCall(300, () => {
      if (this.dialogOverlay) {
        this.dialogOverlay.setInteractive();
        this.dialogOverlay.on("pointerdown", () => {
          // Close dialog
          this.dialogOverlay?.destroy();
          this.dialogBox?.destroy();
          this.dialogText?.destroy();

          // Remove hint
          this.children.getAll().forEach((child) => {
            if (child.name === "introHint") {
              child.destroy();
            }
          });

          // Wait 500ms, then start crash sequence
          this.time.delayedCall(500, () => {
            this.startCrashSequence();
          });
        });
      }
    });
  }

  private showWakeUpThoughts() {
    this.dialogIndex = 0;
    this.dialogLines = [
      "Waar ben ik? Wat is er gebeurd? Waar is iedereen?",
      "Ik weet nog dat we gisteren onze ruimte-missie hebben afgerond en dat we daarna allemaal in onze eigen raketten naar de aarde teruggingen.",
      "Zo te zien ben ik niet op de aarde. Ik moet uitzoeken waar ik ben.",
      "Wacht... het paneel! Alle draden zijn los!"
    ];

    const { width, height } = this.scale;

    // Semi-transparent overlay (not interactive initially to prevent immediate clicks)
    this.dialogOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.15);
    this.dialogOverlay.setDepth(200);

    // Dialog box positioned in front of window area (35% from top, 30% smaller)
    const boxHeight = 120;
    const boxWidth = 640;
    const boxY = height * 0.35;
    const boxX = width / 2 - boxWidth / 2;
    this.dialogBox = this.add.graphics();
    this.dialogBox.setDepth(201);
    this.dialogBox.fillStyle(0x1b2748, 0.95);
    this.dialogBox.fillRoundedRect(boxX, boxY - boxHeight / 2, boxWidth, boxHeight, 12);
    this.dialogBox.lineStyle(2, 0x3c5a99, 1);
    this.dialogBox.strokeRoundedRect(boxX, boxY - boxHeight / 2, boxWidth, boxHeight, 12);

    // Text starting position (no speaker name for thoughts)
    const textStartX = boxX + 20;

    // Dialog text (positioned higher in box)
    this.dialogText = this.add.text(textStartX, boxY - 30, "", {
      fontFamily: "sans-serif",
      fontSize: "18px",
      color: "#e7f3ff",
      wordWrap: { width: boxWidth - 40, useAdvancedWrap: true },
    }).setDepth(202);

    // Hint positioned bottom-right inside box
    this.add.text(boxX + boxWidth - 10, boxY + boxHeight / 2 - 10, "Klik →", {
      fontFamily: "sans-serif",
      fontSize: "12px",
      color: "#888888",
    }).setOrigin(1, 1).setDepth(202).setName("thoughtHint");

    this.showDialogLine();

    // Enable clicking after a short delay to prevent immediate click-through
    this.time.delayedCall(300, () => {
      if (this.dialogOverlay) {
        this.dialogOverlay.setInteractive();
        this.dialogOverlay.on("pointerdown", () => this.advanceDialog());
      }
    });
  }

  private showDialogLine() {
    if (!this.dialogText) return;

    if (this.dialogIndex < this.dialogLines.length) {
      this.dialogText.setText(this.dialogLines[this.dialogIndex]);
    }
  }

  private advanceDialog() {
    this.dialogIndex++;
    if (this.dialogIndex < this.dialogLines.length) {
      this.showDialogLine();
    } else {
      this.closeDialog();
    }
  }

  private closeDialog() {
    this.dialogOverlay?.destroy();
    this.dialogBox?.destroy();
    this.dialogText?.destroy();

    // Remove hint
    this.children.getAll().forEach((child) => {
      if (child.name === "thoughtHint") child.destroy();
    });

    // Run optional callback (used for post puzzle transition etc.)
    const cb = this.dialogOnClose;
    this.dialogOnClose = undefined;
    if (cb) cb();
  }


  private showPostPuzzleThoughts() {
    // Mark as shown so it doesn't repeat
    this.registry.set("postPuzzleThoughtsShown", true);

    this.dialogIndex = 0;
    this.dialogLines = [
      "Yes! De systemen werken weer!",
      "Maar de energie is bijna op, reizen zal dus niet meer lukken.",
      "Volgens mijn navigatie ben ik op Dezonia?",
      "Ik moet uitstappen om dit te onderzoeken."
    ];

    const { width, height } = this.scale;

    // More transparent overlay to see dashboard better
    this.dialogOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.15);
    this.dialogOverlay.setDepth(200);

    // Dialog box positioned higher, in front of the window area (30% smaller)
    const boxHeight = 120;
    const boxWidth = 640;
    const boxY = height * 0.35; // Position at 35% from top (in window area)
    const boxX = width / 2 - boxWidth / 2;
    this.dialogBox = this.add.graphics();
    this.dialogBox.setDepth(201);
    this.dialogBox.fillStyle(0x1b2748, 0.95);
    this.dialogBox.fillRoundedRect(boxX, boxY - boxHeight / 2, boxWidth, boxHeight, 12);
    this.dialogBox.lineStyle(2, 0x3c5a99, 1);
    this.dialogBox.strokeRoundedRect(boxX, boxY - boxHeight / 2, boxWidth, boxHeight, 12);

    // Text starting position (no speaker name for thoughts)
    const textStartX = boxX + 20;

    // Dialog text (positioned higher in box)
    this.dialogText = this.add.text(textStartX, boxY - 30, "", {
      fontFamily: "sans-serif",
      fontSize: "18px",
      color: "#e7f3ff",
      wordWrap: { width: boxWidth - 40, useAdvancedWrap: true },
    }).setDepth(202);

    // Hint positioned bottom-right inside box
    this.add.text(boxX + boxWidth - 10, boxY + boxHeight / 2 - 10, "Klik →", {
      fontFamily: "sans-serif",
      fontSize: "12px",
      color: "#888888",
    }).setOrigin(1, 1).setDepth(202).setName("thoughtHint");

    this.dialogOnClose = () => {
      this.time.delayedCall(500, () => {
        this.cameras.main.fadeOut(800, 0, 0, 0);
      });
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("Face1Scene");
      });
    };


    this.showDialogLine();

    // Enable clicking after a short delay to prevent immediate click-through
    this.time.delayedCall(300, () => {
      if (this.dialogOverlay) {
        this.dialogOverlay.setInteractive();
        this.dialogOverlay.on("pointerdown", () => this.advanceDialog());
      }
    });
  }

  private drawCockpitWindows(width: number, height: number) {
    const windowTop = 80;
    const windowBottom = height * 0.5;
    const bgColor = 0x16213e; // Same as dashboard background

    // Trapezium corners
    const topLeft = width * 0.12;
    const topRight = width * 0.88;
    const bottomLeft = width * 0.02;
    const bottomRight = width * 0.98;

    // Mask outside the window (cover stars outside trapezium)
    const mask = this.add.graphics();
    mask.setDepth(1);
    mask.fillStyle(bgColor, 1);

    // Top area (above window)
    mask.fillRect(0, 0, width, windowTop);

    // Left triangle (extend slightly to avoid gaps)
    mask.beginPath();
    mask.moveTo(0, windowTop - 1);
    mask.lineTo(topLeft + 1, windowTop - 1);
    mask.lineTo(bottomLeft + 1, windowBottom);
    mask.lineTo(0, windowBottom);
    mask.closePath();
    mask.fillPath();

    // Right triangle (extend slightly to avoid gaps)
    mask.beginPath();
    mask.moveTo(width, windowTop - 1);
    mask.lineTo(topRight - 1, windowTop - 1);
    mask.lineTo(bottomRight - 1, windowBottom);
    mask.lineTo(width, windowBottom);
    mask.closePath();
    mask.fillPath();

    // Window frame (thick metallic border)
    const frame = this.add.graphics();
    frame.setDepth(2);
    frame.lineStyle(12, 0x3d4f6f, 1);
    frame.beginPath();
    frame.moveTo(topLeft, windowTop);
    frame.lineTo(topRight, windowTop);
    frame.lineTo(bottomRight, windowBottom);
    frame.lineTo(bottomLeft, windowBottom);
    frame.closePath();
    frame.strokePath();

    // Panel dividers (window struts)
    frame.lineStyle(6, 0x3d4f6f, 1);
    const divider1Top = width * 0.35;
    const divider1Bottom = width * 0.33;
    const divider2Top = width * 0.65;
    const divider2Bottom = width * 0.67;
    frame.lineBetween(divider1Top, windowTop, divider1Bottom, windowBottom);
    frame.lineBetween(divider2Top, windowTop, divider2Bottom, windowBottom);
  }

  private drawDashboard(width: number, height: number) {
    const gfx = this.add.graphics();
    gfx.setDepth(2); // Above windows
    const dashTop = height * 0.50;

    // Main dashboard background
    gfx.fillStyle(0x16213e, 1);
    gfx.fillRect(0, dashTop, width, height - dashTop);

    // Dashboard sections
    gfx.fillStyle(0x1a1a2e, 1);

    // Left panel (status lamps) - 18%
    const leftPanelW = width * 0.18;
    gfx.fillRect(20, dashTop + 20, leftPanelW, 180);

    // Center panel (navigation) - 45%, taller
    const centerPanelX = 20 + leftPanelW + 20;
    const centerPanelW = width * 0.45;
    gfx.fillRect(centerPanelX, dashTop + 20, centerPanelW, 180);

    // Right panel (energy + gauge) - 25%
    const rightPanelX = centerPanelX + centerPanelW + 20;
    const rightPanelW = width - rightPanelX - 20;
    gfx.fillRect(rightPanelX, dashTop + 20, rightPanelW, 180);

    // Panel borders
    gfx.lineStyle(2, 0x0e7490, 0.8);
    gfx.strokeRect(20, dashTop + 20, leftPanelW, 180);
    gfx.strokeRect(centerPanelX, dashTop + 20, centerPanelW, 180);
    gfx.strokeRect(rightPanelX, dashTop + 20, rightPanelW, 180);
  }

  private drawInstruments(width: number, height: number) {
    const dashTop = height * 0.50;
    const leftPanelW = width * 0.18;
    const centerPanelX = 20 + leftPanelW + 20;
    const centerPanelW = width * 0.45;
    const rightPanelX = centerPanelX + centerPanelW + 20;
    const rightPanelW = width - rightPanelX - 20;

    // LEFT PANEL: Status lamps
    this.drawLamps(35, dashTop + 35, width, height);

    // CENTER PANEL: Navigation
    this.drawNavigationPanel(centerPanelX, dashTop + 20, centerPanelW, 180);

    // RIGHT PANEL: Energy meter + Gauge
    this.drawEnergyMeter(rightPanelX + 10, dashTop + 35, rightPanelW - 20);
    this.drawGauge(rightPanelX + rightPanelW / 2, dashTop + 138, 28); // Smaller + lower to align
  }

  private drawLamps(x: number, y: number, _width: number, _height: number) {
    const lampNames = ["stroom", "waarschuwing", "zuurstof", "motor", "schild", "deuren"];
    const lampLabels = {
      stroom: "STROOM",
      waarschuwing: "ALARM",
      zuurstof: "ZUURSTOF",
      motor: "MOTOR",
      schild: "SCHILD",
      deuren: "DEUREN",
    };
    const lampColors = {
      stroom: 0x00ff00,
      waarschuwing: 0xff0000,
      zuurstof: 0x00ddff,
      motor: 0x00ff88,
      schild: 0x0099ff,
      deuren: 0xffff00,
    };

    lampNames.forEach((name, idx) => {
      const lampY = y + idx * 24;

      // Lamp circle
      const lamp = this.add.graphics();
      lamp.setDepth(3); // Above dashboard
      const isOn = this.lampStates[name];
      const color = isOn ? lampColors[name as keyof typeof lampColors] : 0x333333;
      const alpha = isOn ? 1 : 0.3;

      lamp.fillStyle(color, alpha);
      lamp.fillCircle(x, lampY, 6);

      if (isOn) {
        // Glow effect
        lamp.fillStyle(color, 0.3);
        lamp.fillCircle(x, lampY, 10);
      }

      this.lamps.set(name, lamp);

      // Label - make DEUREN a visual button (always visible, active when repaired)
      if (name === "deuren") {
        const buttonX = x + 16;
        const buttonY = lampY - 10;
        const buttonWidth = 55; // Narrower button
        const buttonHeight = 20;
        const isActive = this.currentPhase === "repaired" && isOn;

        if (isActive) {
          // ACTIVE button (repaired state)

          // Subtle shadow
          const shadow = this.add.graphics();
          shadow.setDepth(2);
          shadow.fillStyle(0x000000, 0.25);
          shadow.fillRoundedRect(buttonX + 1, buttonY + 1, buttonWidth, buttonHeight, 3);

          // Button background (flat design with subtle border)
          const buttonBg = this.add.graphics();
          buttonBg.setDepth(3);
          buttonBg.setName("deurenButtonBg");

          // Main button fill - darker, flatter
          buttonBg.fillStyle(0x3a4a2a, 1); // Dark olive green
          buttonBg.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 3);

          // Border for definition
          buttonBg.lineStyle(1, 0x5a6a4a, 0.8); // Subtle green border
          buttonBg.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 3);

          // Glow effect (more subtle)
          const glow = this.add.graphics();
          glow.setDepth(2);
          glow.setName("deurenButtonGlow");
          glow.lineStyle(1, 0xffff00, 0.3);
          glow.strokeRoundedRect(buttonX - 1, buttonY - 1, buttonWidth + 2, buttonHeight + 2, 4);

          // Button text - aligned left, white color
          const buttonText = this.add.text(buttonX + 5, buttonY + buttonHeight / 2, "DEUREN", {
            fontSize: "11px",
            color: "#ffffff",
            fontStyle: "normal",
          }).setOrigin(0, 0.5).setDepth(4);

          // Interactive hit area
          const hitArea = this.add.rectangle(
            buttonX + buttonWidth / 2,
            buttonY + buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            0xffffff,
            0
          );
          hitArea.setDepth(5);
          hitArea.setInteractive({ useHandCursor: true });

          // Hover effect
          hitArea.on("pointerover", () => {
            glow.clear();
            glow.lineStyle(2, 0xffff00, 0.6);
            glow.strokeRoundedRect(buttonX - 1, buttonY - 1, buttonWidth + 2, buttonHeight + 2, 4);
          });

          hitArea.on("pointerout", () => {
            buttonText.setY(buttonY + buttonHeight / 2);
            buttonBg.setY(0);
            glow.clear();
            glow.lineStyle(1, 0xffff00, 0.3);
            glow.strokeRoundedRect(buttonX - 1, buttonY - 1, buttonWidth + 2, buttonHeight + 2, 4);
          });

          // Press down effect
          hitArea.on("pointerdown", () => {
            // Visual press
            buttonText.setY(buttonY + buttonHeight / 2 + 1);
            buttonBg.setY(1);

            // Transition to Face1Scene after short delay
            this.time.delayedCall(100, () => {
              this.cameras.main.fadeOut(800, 0, 0, 0);
            });
            this.cameras.main.once("camerafadeoutcomplete", () => {
              this.scene.start("Face1Scene");
            });
          });
        } else {
          // INACTIVE button (damaged state)

          // Subtle shadow (darker)
          const shadow = this.add.graphics();
          shadow.setDepth(2);
          shadow.fillStyle(0x000000, 0.15);
          shadow.fillRoundedRect(buttonX + 1, buttonY + 1, buttonWidth, buttonHeight, 3);

          // Button background (darker, greyed out)
          const buttonBg = this.add.graphics();
          buttonBg.setDepth(3);

          // Main button fill - very dark grey
          buttonBg.fillStyle(0x2a2a2a, 1); // Dark grey
          buttonBg.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 3);

          // Border (darker)
          buttonBg.lineStyle(1, 0x404040, 0.5); // Dark grey border
          buttonBg.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 3);

          // Button text - aligned left, GREY color (disabled)
          this.add.text(buttonX + 5, buttonY + buttonHeight / 2, "DEUREN", {
            fontSize: "11px",
            color: "#666666", // Grey text for disabled state
            fontStyle: "normal",
          }).setOrigin(0, 0.5).setDepth(4);

          // No interactive hit area - button is disabled
        }
      } else {
        // Normal non-clickable label for other lamps
        this.add.text(x + 16, lampY - 6, lampLabels[name as keyof typeof lampLabels], {
          fontSize: "11px",
          color: isOn ? "#ffffff" : "#666666",
        }).setDepth(3);
      }
    });
  }

  private drawNavigationPanel(x: number, y: number, w: number, _h: number) {
    const isOff = this.selectedDestination === -1;

    // If navigation is off, draw nothing at all (completely empty panel)
    if (isOff) {
      return;
    }

    // Title
    this.add.text(x + w / 2, y + 10, "⚡ NAVIGATIE ⚡", {
      fontSize: "16px",
      color: "#00ff88",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(3).setName("nav-title");

    // Destinations list
    const listY = y + 40;
    const itemHeight = 22;

    this.destinations.forEach((dest, idx) => {
      const itemY = listY + idx * itemHeight;
      const isSelected = idx === this.selectedDestination;

      // Selection indicator (arrow)
      if (isSelected) {
        this.add.text(x + 15, itemY, "▶", {
          fontSize: "14px",
          color: "#ffaa00",
        }).setOrigin(0, 0.5).setDepth(3).setName(`nav-arrow`);
      }

      // Destination text
      this.add.text(x + 35, itemY, dest, {
        fontSize: isSelected ? "15px" : "13px",
        color: isSelected ? "#ffffff" : "#888888",
        fontStyle: isSelected ? "bold" : "normal",
      }).setOrigin(0, 0.5).setDepth(3).setName(`nav-dest-${idx}`);

      // Distance indicator (only for selected)
      if (isSelected) {
        const distance = this.distances[dest];
        const distText = distance === 0 ? "HIER" : distance < 1000 ? `${distance} km` : `${Math.floor(distance / 1000)}k km`;
        this.add.text(x + w - 20, itemY, distText, {
          fontSize: "11px",
          color: "#00ff88",
        }).setOrigin(1, 0.5).setDepth(3).setName(`nav-dist-${idx}`);
      }
    });

  }

  private drawEnergyMeter(x: number, y: number, maxWidth: number) {
    // Label (moved down slightly)
    this.add.text(x, y - 14, "ENERGIE", {
      fontSize: "13px",
      color: "#00ff88",
    }).setDepth(3);

    // Meter background
    const meterBg = this.add.graphics();
    meterBg.setDepth(3);
    meterBg.fillStyle(0x0a0a0a, 1);
    meterBg.fillRect(x, y, maxWidth, 30);
    meterBg.lineStyle(2, 0x00ff88, 0.6);
    meterBg.strokeRect(x, y, maxWidth, 30);

    // Energy bar (dynamic)
    this.energyBar = this.add.graphics();
    this.energyBar.setDepth(3);
    this.updateEnergyBar();
  }

  private updateEnergyBar() {
    if (!this.energyBar) return;

    const { width, height } = this.scale;
    const dashTop = height * 0.50;
    const leftPanelW = width * 0.18;
    const centerPanelX = 20 + leftPanelW + 20;
    const centerPanelW = width * 0.45;
    const rightPanelX = centerPanelX + centerPanelW + 20;
    const rightPanelW = width - rightPanelX - 20;

    const x = rightPanelX + 10;
    const y = dashTop + 35;
    const maxWidth = rightPanelW - 20;

    this.energyBar.clear();

    const barWidth = (this.energyLevel / 100) * maxWidth;
    let color = 0x00ff00;
    if (this.energyLevel < 30) color = 0xff0000;
    else if (this.energyLevel < 60) color = 0xffaa00;

    // Only draw bar if energy > 0
    if (this.energyLevel > 0) {
      this.energyBar.fillStyle(color, 0.8);
      this.energyBar.fillRect(x + 2, y + 2, barWidth - 4, 26);
    }

    // Percentage text (show "---" when empty)
    const oldText = this.children.getByName("energyText");
    if (oldText) oldText.destroy();

    const displayText = this.energyLevel === 0 ? "---" : `${Math.round(this.energyLevel)}%`;
    const textColor = this.energyLevel === 0 ? "#666666" : "#ffffff";

    this.add
      .text(x + maxWidth / 2, y + 15, displayText, {
        fontSize: "18px",
        color: textColor,
      })
      .setOrigin(0.5)
      .setName("energyText")
      .setDepth(3);
  }

  private drawGauge(cx: number, cy: number, radius: number) {
    const gfx = this.add.graphics();
    gfx.setDepth(3);

    // Gauge circle background
    gfx.fillStyle(0x0a0a0a, 1);
    gfx.fillCircle(cx, cy, radius);
    gfx.lineStyle(2, 0x0099ff, 0.6);
    gfx.strokeCircle(cx, cy, radius);

    // Center dot
    gfx.fillStyle(0x0099ff, 1);
    gfx.fillCircle(cx, cy, 3);

    // Needle (rotatable)
    this.needle = this.add.graphics();
    this.needle.setDepth(3);

    // Animate needle based on phase
    // 2:00 position = 60 degrees from top (12:00) = 150 degrees in our system
    // 7:00 position = 210 degrees from top (12:00)
    const baseAngle = this.currentPhase === "intro1" ? 150 :
                      (this.currentPhase === "damaged" || this.currentPhase === "repaired") ? 210 : 90;
    const wobbleAmount = this.currentPhase === "intro1" ? 3 : 0;

    this.updateNeedle(cx, cy, radius, baseAngle);

    this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        // Small wobble around base angle
        const wobble = Math.sin(this.time.now / 150) * wobbleAmount;
        this.updateNeedle(cx, cy, radius, baseAngle + wobble);
      },
    });

    // Label
    this.add
      .text(cx, cy + radius + 12, "SNELHEID", {
        fontSize: "10px",
        color: "#0099ff",
      })
      .setOrigin(0.5)
      .setDepth(3);
  }

  private updateNeedle(cx: number, cy: number, radius: number, angleDeg: number) {
    if (!this.needle) return;

    this.needle.clear();
    this.needle.lineStyle(2, 0x00ffff, 1);

    const angleRad = Phaser.Math.DegToRad(angleDeg - 90);
    const endX = cx + Math.cos(angleRad) * (radius - 5);
    const endY = cy + Math.sin(angleRad) * (radius - 5);

    this.needle.lineBetween(cx, cy, endX, endY);
  }

  private updateLamps() {
    this.lamps.forEach((lamp, name) => {
      lamp.clear();
      const isOn = this.lampStates[name];
      const lampColors = {
        stroom: 0x00ff00,
        waarschuwing: 0xff0000,
        brandstof: 0xffaa00,
        zuurstof: 0x00ddff,
        motor: 0x00ff88,
        schild: 0x0099ff,
        deuren: 0xffff00,
      };
      const color = isOn ? lampColors[name as keyof typeof lampColors] : 0x333333;
      const alpha = isOn ? 1 : 0.3;

      // Get position from existing graphics
      const x = 35;
      const y = this.scale.height * 0.5 + 35 + Array.from(this.lamps.keys()).indexOf(name) * 24;

      lamp.fillStyle(color, alpha);
      lamp.fillCircle(x, y, 6);

      if (isOn) {
        lamp.fillStyle(color, 0.3);
        lamp.fillCircle(x, y, 10);
      }
    });
  }

  private updateNavigationPanel() {
    // Remove old navigation text elements
    this.children.getAll().forEach((child) => {
      if (child.name && child.name.startsWith("nav-")) {
        child.destroy();
      }
    });

    // Redraw navigation panel
    const { width, height } = this.scale;
    const dashTop = height * 0.50;
    const leftPanelW = width * 0.18;
    const centerPanelX = 20 + leftPanelW + 20;
    const centerPanelW = width * 0.45;

    const x = centerPanelX;
    const y = dashTop + 20;
    const w = centerPanelW;
    const listY = y + 40;
    const itemHeight = 22;
    const isOff = this.selectedDestination === -1;

    // Title (dimmed when off)
    this.add.text(x + w / 2, y + 10, "⚡ NAVIGATIE ⚡", {
      fontSize: "16px",
      color: isOff ? "#334444" : "#00ff88",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(3).setName("nav-title");

    this.destinations.forEach((dest, idx) => {
      const itemY = listY + idx * itemHeight;
      const isSelected = idx === this.selectedDestination;

      // Selection indicator (arrow)
      if (isSelected && !isOff) {
        this.add.text(x + 15, itemY, "▶", {
          fontSize: "14px",
          color: "#ffaa00",
        }).setOrigin(0, 0.5).setDepth(3).setName(`nav-arrow`);
      }

      // Destination text (all dimmed when off)
      this.add.text(x + 35, itemY, dest, {
        fontSize: isSelected && !isOff ? "15px" : "13px",
        color: isOff ? "#333333" : (isSelected ? "#ffffff" : "#888888"),
        fontStyle: isSelected && !isOff ? "bold" : "normal",
      }).setOrigin(0, 0.5).setDepth(3).setName(`nav-dest-${idx}`);

      // Distance indicator (only for selected)
      if (isSelected && !isOff) {
        const distance = this.distances[dest];
        const distText = distance === 0 ? "HIER" : distance < 1000 ? `${distance} km` : `${Math.floor(distance / 1000)}k km`;
        this.add.text(x + w - 20, itemY, distText, {
          fontSize: "11px",
          color: "#00ff88",
        }).setOrigin(1, 0.5).setDepth(3).setName(`nav-dist-${idx}`);
      }
    });
  }

  private drawStickControl(width: number, height: number) {
    const cx = width / 2;
    const cy = height - 80;

    const hitW = 90;
    const hitH = 140;

    // Root container
    const root = this.add.container(cx, cy).setDepth(3);

    // --- BASE (never moves) ---
    const baseGfx = this.add.graphics();
    baseGfx.fillStyle(0x2d2d44, 1);
    baseGfx.fillRect(-30, 30, 60, 20);
    root.add(baseGfx);

    // --- HANDLE container (moves) ---
    const handle = this.add.container(0, 0);
    root.add(handle);

    // Shaft + knob are separate so we can redraw shaft length
    const shaftGfx = this.add.graphics();
    const knobGfx = this.add.graphics();
    handle.add([shaftGfx, knobGfx]);

    // Optional glow (still around knob)
    const glow = this.add.graphics().setDepth(2);
    root.addAt(glow, 0);

    let hoverBoost = 1.0;
    const glowState = { a: 0.35 };

    const drawGlow = () => {
      glow.clear();
      if (this.currentPhase === "damaged" || this.currentPhase === "repaired") {
        const a = glowState.a * hoverBoost;
        // keep glow centered on knob position (handle moves)
        const knobY = -30 + this.joystickPressT * 8;
        glow.fillStyle(0x00ffff, a * 0.18);
        glow.fillCircle(0, knobY, 26);
        glow.fillStyle(0x00ffff, a * 0.12);
        glow.fillCircle(0, knobY, 34);
        glow.fillStyle(0x00ffff, a * 0.08);
        glow.fillCircle(0, knobY, 44);
      }
    };

    // Draw shaft+knob based on press amount t (0..1)
    const renderHandle = (t: number) => {
      this.joystickPressT = Phaser.Math.Clamp(t, 0, 1);

      // Visual idea:
      // - knob moves down a bit
      // - shaft becomes shorter (top comes down toward base)
      // - shaft also becomes slightly thicker to sell perspective (optional)
      const knobY = -30 + this.joystickPressT * 8;          // knob travel
      const shaftTopY = -30 + this.joystickPressT * 10;     // top of shaft drops more
      const shaftBottomY = 30;                              // base connection stays
      const shaftW = 16;                                    // thickness stable

      shaftGfx.clear();
      shaftGfx.fillStyle(0x444455, 1);
      shaftGfx.fillRect(-shaftW / 2, shaftTopY, shaftW, shaftBottomY - shaftTopY);

      knobGfx.clear();
      knobGfx.fillStyle(0xff6b35, 1);
      knobGfx.fillCircle(0, knobY, 15);

      knobGfx.lineStyle(2, 0x333344, 1);
      for (let i = 0; i < 3; i++) {
        knobGfx.lineBetween(-10, knobY - 5 + i * 8, 10, knobY - 5 + i * 8);
      }

      drawGlow();
    };

    // Initial render
    renderHandle(0);

    // Glow pulse
    this.tweens.add({
      targets: glowState,
      a: 0.75,
      duration: 700,
      yoyo: true,
      repeat: -1,
      onUpdate: drawGlow,
    });

    // Hit area (screen coords)
    const hitArea = this.add
      .rectangle(cx, cy - 10, hitW, hitH, 0xffffff, 0)
      .setDepth(4)
      .setInteractive({ useHandCursor: true });

    hitArea.on("pointerover", () => {
      hoverBoost = 1.6;
      drawGlow();
    });

    hitArea.on("pointerout", () => {
      hoverBoost = 1.0;
      drawGlow();
    });

    // Store a reference so animation helpers can call renderHandle
    (this as any)._renderJoystickHandle = renderHandle;

    hitArea.on("pointerdown", () => this.onStickControlClicked());
  }

  private animateJoystickDownUp(onComplete: () => void) {
    if (this.joystickBusy) return;
    this.joystickBusy = true;

    const renderHandle: (t: number) => void = (this as any)._renderJoystickHandle;
    if (!renderHandle) {
      this.joystickBusy = false;
      onComplete();
      return;
    }

    const state = { t: 0 };

    this.tweens.add({
      targets: state,
      t: 1,
      duration: 140,
      ease: "Power2",
      onUpdate: () => renderHandle(state.t),
      onComplete: () => {
        this.tweens.add({
          targets: state,
          t: 0,
          duration: 160,
          ease: "Power2",
          onUpdate: () => renderHandle(state.t),
          onComplete: () => {
            this.joystickBusy = false;
            onComplete();
          },
        });
      },
    });
  }

  private animateJoystickDownOnly(onComplete: () => void) {
    if (this.joystickBusy) return;
    this.joystickBusy = true;

    const renderHandle: (t: number) => void = (this as any)._renderJoystickHandle;
    if (!renderHandle) {
      this.joystickBusy = false;
      onComplete();
      return;
    }

    const state = { t: 0 };

    this.tweens.add({
      targets: state,
      t: 1,
      duration: 140,
      ease: "Power2",
      onUpdate: () => renderHandle(state.t),
      onComplete: () => {
        this.joystickBusy = false;
        onComplete();
      },
    });
  }



  private onStickControlClicked() {
    if (this.joystickBusy) return;

    // Only allow joystick use in the same phases you described
    if (this.currentPhase !== "damaged" && this.currentPhase !== "repaired") return;

    // Case 1: Damaged (electricity hatch clickable)
    if (this.currentPhase === "damaged") {
      this.animateJoystickDownUp(() => {
        this.dialogIndex = 0;
        this.dialogLines = ["Hmm dit lijkt niet te werken..."];
        this.dialogOnClose = undefined; // no transitions
        this.showWakeUpThoughtsStyleDialog(); // helper below
      });
      return;
    }

    // Case 2: Repaired (electricity solved) => branch by energy level
    const regFuel = this.registry.get("energy");
    const fuel = typeof regFuel === "number" ? regFuel : 0;

    if (fuel >= 90) {
      this.animateJoystickDownOnly(() => {
        this.cameras.main.shake(800, 0.02);

        // Go to new scene after the shake starts (pick your scene name)
        this.time.delayedCall(500, () => {
          this.cameras.main.fadeOut(600, 0, 0, 0);
        });

        this.cameras.main.once("camerafadeoutcomplete", () => {
          this.scene.start("EndCreditsScene");
        });
      });
    } else {
      // Not enough fuel/energy
      this.animateJoystickDownOnly(() => {
        this.cameras.main.shake(200, 0.01);
        this.animateJoystickDownUp(() => {
          this.dialogIndex = 0;
          this.dialogLines = ["Hmm ik heb nog niet genoeg energie om weer op te stijgen..."];
          this.dialogOnClose = undefined;
          this.showWakeUpThoughtsStyleDialog();
        });
      });
    }
  }

  private showWakeUpThoughtsStyleDialog() {
    // This uses the same UI style as your thoughts dialogs, but uses this.dialogLines
    this.showWakeUpThoughts = this.showWakeUpThoughts.bind(this); // keep TS happy if needed

    const { width, height } = this.scale;

    // Semi-transparent overlay
    this.dialogOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.15);
    this.dialogOverlay.setDepth(200);

    // Dialog box
    const boxHeight = 120;
    const boxWidth = 640;
    const boxY = height * 0.35;
    const boxX = width / 2 - boxWidth / 2;

    this.dialogBox = this.add.graphics();
    this.dialogBox.setDepth(201);
    this.dialogBox.fillStyle(0x1b2748, 0.95);
    this.dialogBox.fillRoundedRect(boxX, boxY - boxHeight / 2, boxWidth, boxHeight, 12);
    this.dialogBox.lineStyle(2, 0x3c5a99, 1);
    this.dialogBox.strokeRoundedRect(boxX, boxY - boxHeight / 2, boxWidth, boxHeight, 12);

    this.dialogText = this.add.text(boxX + 20, boxY - 30, "", {
      fontFamily: "sans-serif",
      fontSize: "18px",
      color: "#e7f3ff",
      wordWrap: { width: boxWidth - 40, useAdvancedWrap: true },
    }).setDepth(202);

    this.add.text(boxX + boxWidth - 10, boxY + boxHeight / 2 - 10, "Klik →", {
      fontFamily: "sans-serif",
      fontSize: "12px",
      color: "#888888",
    }).setOrigin(1, 1).setDepth(202).setName("thoughtHint");

    this.showDialogLine();

    this.time.delayedCall(300, () => {
      if (this.dialogOverlay) {
        this.dialogOverlay.setInteractive();
        this.dialogOverlay.on("pointerdown", () => this.advanceDialog());
      }
    });
  }


  private syncEnergyFromRegistry() {
    const regEnergy = this.registry.get("energy");
    const energy = typeof regEnergy === "number" ? regEnergy : 0;

    // clamp 0-100
    this.energyLevel = Phaser.Math.Clamp(energy, 0, 100);

    // if UI already exists, refresh it
    this.updateEnergyBar();
  }

  private drawElectricityHatch(width: number, height: number) {
    const hatchWidth = 80;
    const hatchHeight = 50;
    const leftPanelW = width * 0.18;
    const hatchX = 20 + leftPanelW + 20; // Align with center panel left edge
    const hatchY = height - hatchHeight - 10;

    // Hatch panel (metallic)
    const hatch = this.add.graphics();
    hatch.setDepth(3);

    // Main panel
    hatch.fillStyle(0x3d4a5c, 1);
    hatch.fillRoundedRect(hatchX, hatchY, hatchWidth, hatchHeight, 4);

    // Beveled edge effect
    hatch.lineStyle(2, 0x5a6a7a, 1);
    hatch.strokeRoundedRect(hatchX, hatchY, hatchWidth, hatchHeight, 4);
    hatch.lineStyle(1, 0x2a3a4a, 1);
    hatch.strokeRoundedRect(hatchX + 2, hatchY + 2, hatchWidth - 4, hatchHeight - 4, 3);

    // Screws in corners
    const screwOffset = 8;
    const screwPositions = [
      { x: hatchX + screwOffset, y: hatchY + screwOffset },
      { x: hatchX + hatchWidth - screwOffset, y: hatchY + screwOffset },
      { x: hatchX + screwOffset, y: hatchY + hatchHeight - screwOffset },
      { x: hatchX + hatchWidth - screwOffset, y: hatchY + hatchHeight - screwOffset },
    ];

    screwPositions.forEach((pos) => {
      hatch.fillStyle(0x2a3a4a, 1);
      hatch.fillCircle(pos.x, pos.y, 4);
      hatch.lineStyle(1, 0x1a2a3a, 1);
      hatch.strokeCircle(pos.x, pos.y, 4);
      // Screw slot
      hatch.lineStyle(1, 0x1a2a3a, 1);
      hatch.lineBetween(pos.x - 2, pos.y, pos.x + 2, pos.y);
    });

    // Warning stripes (yellow/black) at top
    const stripeHeight = 6;
    for (let i = 0; i < 8; i++) {
      hatch.fillStyle(i % 2 === 0 ? 0xf0c000 : 0x222222, 1);
      hatch.fillRect(hatchX + 6 + i * 8.5, hatchY + 6, 8, stripeHeight);
    }

    // Label
    this.add.text(hatchX + hatchWidth / 2, hatchY + hatchHeight / 2 + 5, "ELEKTRA", {
      fontSize: "10px",
      color: "#aabbcc",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(3);

    // Lightning bolt icon
    this.add.text(hatchX + hatchWidth / 2, hatchY + hatchHeight / 2 - 8, "⚡", {
      fontSize: "14px",
    }).setOrigin(0.5).setDepth(3);

    // Pulsing glow effect in damaged state
    if (this.currentPhase === "damaged") {
      const glow = this.add.graphics();
      glow.setDepth(2);

      this.tweens.add({
        targets: { alpha: 0.3 },
        alpha: 0.8,
        duration: 800,
        yoyo: true,
        repeat: -1,
        onUpdate: (tween) => {
          const alpha = tween.getValue() ?? 0.3;
          glow.clear();
          glow.fillStyle(0xff6600, alpha);
          glow.fillRoundedRect(hatchX - 4, hatchY - 4, hatchWidth + 8, hatchHeight + 8, 8);
        }
      });
    }

    // Interactive zone - only in damaged state
    const hitArea = this.add.rectangle(
      hatchX + hatchWidth / 2,
      hatchY + hatchHeight / 2,
      hatchWidth,
      hatchHeight,
      0xffffff,
      0
    );
    hitArea.setDepth(4);

    // Only interactive in damaged state
    if (this.currentPhase === "damaged") {
      hitArea.setInteractive({ useHandCursor: true });
    }

    // Hover effect
    hitArea.on("pointerover", () => {
      if (this.currentPhase !== "damaged") return;
      hatch.clear();
      // Redraw with highlight
      hatch.fillStyle(0x4d5a6c, 1);
      hatch.fillRoundedRect(hatchX, hatchY, hatchWidth, hatchHeight, 4);
      hatch.lineStyle(2, 0x00ffff, 0.8);
      hatch.strokeRoundedRect(hatchX, hatchY, hatchWidth, hatchHeight, 4);
      hatch.lineStyle(1, 0x2a3a4a, 1);
      hatch.strokeRoundedRect(hatchX + 2, hatchY + 2, hatchWidth - 4, hatchHeight - 4, 3);

      // Redraw screws
      screwPositions.forEach((pos) => {
        hatch.fillStyle(0x2a3a4a, 1);
        hatch.fillCircle(pos.x, pos.y, 4);
        hatch.lineStyle(1, 0x1a2a3a, 1);
        hatch.strokeCircle(pos.x, pos.y, 4);
        hatch.lineBetween(pos.x - 2, pos.y, pos.x + 2, pos.y);
      });

      // Redraw stripes
      for (let i = 0; i < 8; i++) {
        hatch.fillStyle(i % 2 === 0 ? 0xf0c000 : 0x222222, 1);
        hatch.fillRect(hatchX + 6 + i * 8.5, hatchY + 6, 8, stripeHeight);
      }
    });

    hitArea.on("pointerout", () => {
      if (this.currentPhase !== "damaged") return;
      hatch.clear();
      // Redraw normal
      hatch.fillStyle(0x3d4a5c, 1);
      hatch.fillRoundedRect(hatchX, hatchY, hatchWidth, hatchHeight, 4);
      hatch.lineStyle(2, 0x5a6a7a, 1);
      hatch.strokeRoundedRect(hatchX, hatchY, hatchWidth, hatchHeight, 4);
      hatch.lineStyle(1, 0x2a3a4a, 1);
      hatch.strokeRoundedRect(hatchX + 2, hatchY + 2, hatchWidth - 4, hatchHeight - 4, 3);

      // Redraw screws
      screwPositions.forEach((pos) => {
        hatch.fillStyle(0x2a3a4a, 1);
        hatch.fillCircle(pos.x, pos.y, 4);
        hatch.lineStyle(1, 0x1a2a3a, 1);
        hatch.strokeCircle(pos.x, pos.y, 4);
        hatch.lineBetween(pos.x - 2, pos.y, pos.x + 2, pos.y);
      });

      // Redraw stripes
      for (let i = 0; i < 8; i++) {
        hatch.fillStyle(i % 2 === 0 ? 0xf0c000 : 0x222222, 1);
        hatch.fillRect(hatchX + 6 + i * 8.5, hatchY + 6, 8, stripeHeight);
      }
    });

    // Click handler - zoom in and transition
    hitArea.on("pointerdown", () => {
      this.openElectricityHatch(hatchX + hatchWidth / 2, hatchY + hatchHeight / 2);
    });
  }

  private openElectricityHatch(centerX: number, centerY: number) {
    // Zoom camera into the hatch
    this.cameras.main.pan(centerX, centerY, 500, "Power2");
    this.cameras.main.zoomTo(4, 500, "Power2");

    // Fade to black and switch scene
    this.time.delayedCall(400, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
    });

    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("ShipFuelScene");
    });
  }

  update(_time: number, delta: number) {
    this.stars?.update(delta);
  }
}
