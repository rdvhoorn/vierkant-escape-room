import Phaser from "phaser";
import { PlayerController } from "./PlanetPlayer";
import { toggleControlsMode } from "./ControlsMode";
import { DEBUG } from "./main";
import { ENERGY_THRESHOLD_HOME } from "./scenes/face_scenes/_FaceConfig";

type V2Like = { x: number; y: number };

type Interaction = {
  isInRange: (player: V2Like) => boolean;
  hintText?: string;
  onUse: () => void;
};

type HudOptions = {
  getPlayer: () => V2Like;
  isDesktop: boolean;
  onEscape?: () => void;
  getEnergy?: () => number;
  maxEnergy?: number;
};

const INTERACT_KEY = "E";

export class Hud {
  private joystickBase?: Phaser.GameObjects.Arc;
  private joystickKnob?: Phaser.GameObjects.Arc;
  private joystickPointerId: number | null = null;

  private controlsText?: Phaser.GameObjects.Text;
  private portalHint!: Phaser.GameObjects.Text;

  // Energy UI
  private readonly energyBarWidth = 180;
  private readonly energyBarHeight = 45;
  private energyBar?: Phaser.GameObjects.Graphics;
  private energyText?: Phaser.GameObjects.Text;
  private energyContainer?: Phaser.GameObjects.Container;

  // Mobile interaction button (+ glow)
  private interactButton?: Phaser.GameObjects.Rectangle;
  private interactButtonGlow?: Phaser.GameObjects.Rectangle;

  private interactions: Interaction[] = [];
  private interactKey?: Phaser.Input.Keyboard.Key;

  constructor(
    private scene: Phaser.Scene,
    private playerController: PlayerController,
    private opts: HudOptions
  ) {
    this.createControlsUI();
    this.createEnergyUI();

    if (!opts.isDesktop) {
      this.createTouchControls();
    }
    this.bindModeToggle();
  }

  registerInteraction(interaction: Interaction) {
    this.interactions.push(interaction);

    if (!this.interactKey && this.opts.isDesktop) {
      const handleInteract = () => {
        const player = this.opts.getPlayer();
        const active = this.getActiveInteraction(player);
        if (active) active.onUse();
      };

      this.interactKey = this.scene.input.keyboard?.addKey(INTERACT_KEY);
      this.scene.input.keyboard?.addKey("SPACE");
      this.scene.input.keyboard?.on(`keydown-${INTERACT_KEY}`, handleInteract);
      this.scene.input.keyboard?.on("keydown-SPACE", handleInteract);
    }
  }

  private getActiveInteraction(player: V2Like): Interaction | undefined {
    return this.interactions.find((i) => i.isInRange(player));
  }

  update() {
    this.playerController.update();
    const player = this.opts.getPlayer();
    const active = this.getActiveInteraction(player);

    if (active) {
      const defaultHint = this.opts.isDesktop
        ? "Interact: E / spatie"
        : "Interact: tap";
      const hint = active.hintText ?? defaultHint;
      this.portalHint.setText(hint).setAlpha(1);
    } else {
      this.portalHint.setAlpha(0);
    }

    // Update mobile interaction button glow
    this.updateInteractButtonHighlight(!!active);
  }

  destroy() {
    this.controlsText?.destroy();
    this.portalHint?.destroy();
    this.joystickBase?.destroy();
    this.joystickKnob?.destroy();
    this.energyBar?.destroy();
    this.energyText?.destroy();
    this.energyContainer?.destroy();
    this.interactButton?.destroy();
    this.interactButtonGlow?.destroy();

    // Unsubscribe from events
    this.scene.events.off("energyChanged", this.handleEnergyChanged, this);
  }

  // ---------------------------
  // Internal helpers
  // ---------------------------

  private createControlsUI() {
    // Bottom-right controls hint ONLY on desktop
    if (this.opts.isDesktop) {
      this.controlsText = this.scene.add
        .text(
          this.scene.scale.width - 12,
          this.scene.scale.height - 10,
          "Lopen: WASD / Pijltjes   |  Spatie: Interactie",
          { fontFamily: "sans-serif", fontSize: "14px", color: "#b6d5ff" }
        )
        .setScrollFactor(0)
        .setOrigin(1, 1)
        .setAlpha(0.9);
    }

    // Portal / interaction hint (desktop + mobile)
    this.portalHint = this.scene.add
      .text(this.scene.scale.width / 2, 28, "", {
        fontFamily: "sans-serif",
        fontSize: "16px",
        color: "#cfe8ff",
      })
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setAlpha(0);
  }

  // Energy bar UI (top-right) - cockpit style
  private createEnergyUI() {
    if (!this.opts.getEnergy) return; // HUD can be used without energy

    const barWidth = this.energyBarWidth;
    const barHeight = this.energyBarHeight;
    const max = this.opts.maxEnergy ?? 100;
    const current = this.opts.getEnergy();

    // Label above the bar
    const label = this.scene.add.text(barWidth / 2, -10, "ENERGIE", {
      fontFamily: "sans-serif",
      fontSize: "16px",
      color: "#aaccff",
    }).setOrigin(0.5, 1);

    // Background with border
    const energyBg = this.scene.add.graphics();
    energyBg.fillStyle(0x111122, 0.85);
    energyBg.fillRect(0, 0, barWidth, barHeight);
    energyBg.lineStyle(3, 0x3c5a99, 1);
    energyBg.strokeRect(0, 0, barWidth, barHeight);

    // Energy fill bar
    this.energyBar = this.scene.add.graphics();
    this.drawEnergyFill(current, max, barWidth, barHeight);

    // Energy value text (no % sign since value can exceed 100)
    this.energyText = this.scene.add.text(barWidth / 2, barHeight / 2, `${current}`, {
      fontFamily: "sans-serif",
      fontSize: "20px",
      color: "#ffffff",
    }).setOrigin(0.5);

    this.energyContainer = this.scene.add
      .container(this.scene.scale.width - barWidth - 16, 35, [energyBg, this.energyBar, this.energyText, label])
      .setScrollFactor(0)
      .setDepth(20);

    this.scene.events.on("energyChanged", this.handleEnergyChanged, this);
  }

  private drawEnergyFill(current: number, max: number, barWidth: number, barHeight: number) {
    if (!this.energyBar) return;

    this.energyBar.clear();

    // Cap fill at 100% (bar doesn't overflow even if energy > max)
    const maxFillWidth = barWidth - 4;
    const fillWidth = Math.min((current / max) * maxFillWidth, maxFillWidth);
    if (fillWidth <= 0) return;

    // Color based on level (same as cockpit) — green at threshold to fly home
    let color = 0x00ff00; // green
    const percentage = (current / max) * 100;
    const thresholdPct = (ENERGY_THRESHOLD_HOME / (max || 100)) * 100;
    if (percentage < thresholdPct / 2) color = 0xff0000; // red
    else if (percentage < thresholdPct) color = 0xffaa00; // orange

    this.energyBar.fillStyle(color, 0.8);
    this.energyBar.fillRect(2, 2, fillWidth, barHeight - 4);
  }

  private handleEnergyChanged = (newEnergy: number) => {
    if (!this.energyBar) return;

    const max = this.opts.maxEnergy ?? 100;
    // Clamp for the bar fill (visual), but show actual value in text
    const clampedForFill = Phaser.Math.Clamp(newEnergy, 0, max);

    this.drawEnergyFill(clampedForFill, max, this.energyBarWidth, this.energyBarHeight);

    if (this.energyText) {
      // Show actual energy value (can be > 100), no % sign
      this.energyText.setText(`${Math.round(Math.max(0, newEnergy))}`);
    }
  };

  private bindModeToggle() {
    // Dev-only: backtick (`) toggles control mode and restarts the scene.
    if (!DEBUG) return;

    this.scene.input.keyboard?.on("keydown-BACKTICK", () => {
      const isNowDesktop = toggleControlsMode(this.scene);

      console.log(
        `[Hud] Restarting scene in ${isNowDesktop ? "DESKTOP" : "TOUCH"} mode`
      );

      // Restart the current scene so everything is rebuilt with the new mode.
      this.scene.scene.restart();
    });
  }

  // ---------------------------
  // Touch / joystick handling
  // ---------------------------

  private createTouchControls() {
    const radius = 60;
    const knobRadius = 24;

    // Joystick base (bottom-left)
    this.joystickBase = this.scene.add
      .circle(
        90,
        this.scene.scale.height - 90,
        radius,
        0x000000,
        0.25
      )
      .setScrollFactor(0)
      .setDepth(100);

    // Joystick knob
    this.joystickKnob = this.scene.add
      .circle(
        this.joystickBase.x,
        this.joystickBase.y,
        knobRadius,
        0xffffff,
        0.7
      )
      .setScrollFactor(0)
      .setDepth(101);

    // --- INTERACTION BUTTON (tap) bottom-right ---
    const btnSize = 64;
    const btnX = this.scene.scale.width - 90;
    const btnY = this.scene.scale.height - 90;

    // Green "glow" behind the button (initially invisible)
    this.interactButtonGlow = this.scene.add
      .rectangle(btnX, btnY, btnSize + 16, btnSize + 16, 0x00ff00, 0.4)
      .setScrollFactor(0)
      .setDepth(99)
      .setAlpha(0);

    // Actual interaction button
    this.interactButton = this.scene.add
      .rectangle(btnX, btnY, btnSize, btnSize, 0xffffff, 1)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true });

    this.scene.add
      .text(btnX, btnY, "I", {
        fontFamily: "sans-serif",
        fontSize: "32px",
        color: "#000000", // black "I" on white square
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    // Tap on the button = interaction
    this.interactButton.on("pointerdown", () => {
      const player = this.opts.getPlayer();
      const active = this.getActiveInteraction(player);
      if (active) active.onUse();
    });

    // Pointer events for joystick ONLY (left half)
    this.scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.x < this.scene.scale.width / 2) {
        if (this.joystickPointerId === null) {
          this.joystickPointerId = pointer.id;
          this.updateJoystick(pointer);
        }
      }
    });

    this.scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) {
        this.updateJoystick(pointer);
      }
    });

    this.scene.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) {
        this.joystickPointerId = null;

        if (this.joystickBase && this.joystickKnob) {
          this.joystickKnob.setPosition(
            this.joystickBase.x,
            this.joystickBase.y
          );
        }

        // Clear touch input on release
        this.playerController.setTouchInput(null);
      }
    });
  }

  private updateJoystick(pointer: Phaser.Input.Pointer) {
    if (!this.joystickBase || !this.joystickKnob) return;

    const base = this.joystickBase;
    const knob = this.joystickKnob;

    const dx = pointer.x - base.x;
    const dy = pointer.y - base.y;

    const maxDist = base.radius;
    let dist = Math.sqrt(dx * dx + dy * dy);

    let nx = 0;
    let ny = 0;

    if (dist > 0) {
      const k = Math.min(dist, maxDist) / dist;
      const clampedX = base.x + dx * k;
      const clampedY = base.y + dy * k;
      knob.setPosition(clampedX, clampedY);

      nx = dx / maxDist; // approx [-1, 1]
      ny = dy / maxDist;
    } else {
      knob.setPosition(base.x, base.y);
    }

    const DEAD = 0.25;
    const input = {
      left: nx < -DEAD,
      right: nx > DEAD,
      up: ny < -DEAD,
      down: ny > DEAD,
    };

    this.playerController.setTouchInput(input);
  }

  // ---------------------------
  // Mobile interaction button highlight
  // ---------------------------

  private updateInteractButtonHighlight(hasInteraction: boolean) {
    if (this.opts.isDesktop || !this.interactButton) return;

    if (hasInteraction) {
      // Slightly green-ish button + visible glow behind it
      this.interactButton.setFillStyle(0xc8ffc8, 1);
      this.interactButtonGlow?.setAlpha(0.7);
    } else {
      // Default plain white button, no glow
      this.interactButton.setFillStyle(0xffffff, 1);
      this.interactButtonGlow?.setAlpha(0);
    }
  }
}
