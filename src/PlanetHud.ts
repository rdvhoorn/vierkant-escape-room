import Phaser from "phaser";
import { PlayerController } from "./PlanetPlayer";
import { toggleControlsMode } from "./ControlsMode";

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
  private energyBar?: Phaser.GameObjects.Graphics;
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
    this.bindEscape();
    this.bindModeToggle();
  }

  registerInteraction(interaction: Interaction) {
    this.interactions.push(interaction);

    if (!this.interactKey && this.opts.isDesktop) {
      this.interactKey = this.scene.input.keyboard?.addKey(INTERACT_KEY);
      this.scene.input.keyboard?.on(`keydown-${INTERACT_KEY}`, () => {
        const player = this.opts.getPlayer();
        const active = this.getActiveInteraction(player);
        if (active) active.onUse();
      });
    }
  }

  getActiveInteraction(player: V2Like): Interaction | undefined {
    return this.interactions.find((i) => i.isInRange(player));
  }

  update() {
    this.playerController.update();
    const player = this.opts.getPlayer();
    const active = this.getActiveInteraction(player);

    if (active) {
      const defaultHint = this.opts.isDesktop
        ? "Interact: spatie / E"
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
    this.energyContainer?.destroy();
    this.interactButton?.destroy();
    this.interactButtonGlow?.destroy();

    // Unsubscribe from events
    this.scene.events.off("energyChanged", this.handleEnergyChanged, this);
    // You can also remove input listeners here if you want to be extra clean.
  }

  // ---------------------------
  // Internal helpers
  // ---------------------------

  private createControlsUI() {
    // Bottom-right controls hint ONLY on desktop
    if (this.opts.isDesktop) {
      // Build controls text - only show ESC if escape handler exists
      let controlsText = "Lopen: WASD / Pijltjes   |  E:  Interactie";
      if (this.opts.onEscape) {
        controlsText += "   |  ESC: Titel Scherm";
      }

      this.controlsText = this.scene.add
        .text(
          this.scene.scale.width - 12,
          this.scene.scale.height - 10,
          controlsText,
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

  // Energy bar UI (top-right)
  private createEnergyUI() {
    if (!this.opts.getEnergy) return; // HUD can be used without energy

    const max = this.opts.maxEnergy ?? 100;
    const initialEnergy = Phaser.Math.Clamp(this.opts.getEnergy(), 0, max);

    const energyBg = this.scene.add.graphics();
    energyBg.fillStyle(0x222222, 0.7);
    energyBg.fillRect(0, 0, 104, 24);

    this.energyBar = this.scene.add.graphics();
    this.energyBar.fillStyle(0x00ff00, 1);
    this.energyBar.fillRect(2, 2, Math.min(initialEnergy, max), 20);

    this.energyContainer = this.scene.add
      .container(this.scene.scale.width - 120, 28, [energyBg, this.energyBar])
      .setScrollFactor(0)
      .setDepth(20);

    this.scene.events.on("energyChanged", this.handleEnergyChanged, this);
  }

  private handleEnergyChanged = (newEnergy: number) => {
    if (!this.energyBar) return;

    const max = this.opts.maxEnergy ?? 100;
    const clamped = Phaser.Math.Clamp(newEnergy, 0, max);

    this.energyBar.clear();
    this.energyBar.fillStyle(0x00ff00, 1);
    this.energyBar.fillRect(2, 2, Math.min(clamped, max), 20);
  };

  private bindEscape() {
    if (!this.opts.onEscape) return;
    this.scene.input.keyboard?.on("keydown-ESC", this.opts.onEscape);
  }

  private bindModeToggle() {
    // Secret dev key: backtick (`) toggles control mode and restarts the scene.
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
