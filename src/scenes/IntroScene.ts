import Phaser from "phaser";

enum Phase {
  Prologue = "Prologue",
  FuelFix = "FuelFix",
  Epilogue = "Epilogue",
}

export default class IntroScene extends Phaser.Scene {
  private phase: Phase = Phase.Prologue;

  // narrative
  private lines: string[] = [];
  private lineIndex = 0;

  // UI: rocket + dialog
  private rocket!: Phaser.GameObjects.Rectangle;
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;
  private clickHint!: Phaser.GameObjects.Text;

  // Fuel Fix puzzle state
  private consoleGroup!: Phaser.GameObjects.Container;
  private gauge!: Phaser.GameObjects.Graphics;
  private needle!: Phaser.GameObjects.Line;
  private diagnosticText!: Phaser.GameObjects.Text;
  private meterText!: Phaser.GameObjects.Text;
  private calText!: Phaser.GameObjects.Text;

  private trueFuel = 0;       // what the ship *actually* has (given by diagnostics)
  private offset = 0;         // the broken meter’s internal offset (unknown to player)
  private calibration = 0;    // player-adjusted calibration (goal: offset + calibration = 0)
  private tolerance = 1;      // how close is “fixed”

  constructor() {
    super("IntroScene");
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(0, 0, width, height, 0x0f1630).setOrigin(0);
    const stars = this.add.graphics();
    for (let i = 0; i < 120; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      stars.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.9));
      stars.fillRect(x, y, 2, 2);
    }

    // Square rocket
    this.rocket = this.add.rectangle(width * 0.22, height * 0.6, 84, 84, 0x78e3ff)
      .setStrokeStyle(3, 0x134a84)
      .setOrigin(0.5);
    this.tweens.add({
      targets: this.rocket, angle: { from: -2, to: 2 }, duration: 900, yoyo: true, repeat: -1, ease: "sine.inOut",
    });

    // Dialogue UI
    this.dialogBox = this.add.rectangle(width / 2, height - 92, width - 80, 124, 0x1b2748, 0.85)
      .setStrokeStyle(2, 0x3c5a99);
    this.dialogText = this.add.text(
      this.dialogBox.x - this.dialogBox.width / 2 + 20,
      this.dialogBox.y - 48,
      "",
      {
        fontFamily: "sans-serif",
        fontSize: "18px",
        color: "#e7f3ff",
        wordWrap: { width: this.dialogBox.width - 40, useAdvancedWrap: true },
      }
    ).setOrigin(0, 0);

    this.clickHint = this.add.text(width - 30, height - 20, "Click / Space →", {
      fontFamily: "sans-serif",
      fontSize: "14px",
      color: "#b6d5ff",
    }).setOrigin(1, 1).setAlpha(0.8);

    // Prologue lines
    this.lines = [
      "Impact detected. Hull stable. Navigation nominal.",
      "Attempted restart failed. Systems report: fuel meter error.",
      "Diagnostics show a fuel value, but the cockpit gauge disagrees.",
      "Let’s calibrate the meter so we know what’s really in the tank…",
    ];
    this.lineIndex = 0;
    this.showLine(this.lines[this.lineIndex]);

    // Input to advance
    this.input.keyboard?.on("keydown-SPACE", () => this.advance());
    this.input.on("pointerdown", () => this.advance());

    // Puzzle container (hidden until we enter it)
    this.consoleGroup = this.add.container(0, 0).setVisible(false);
  }

  // -------------------- Flow --------------------
  private advance() {
    if (this.phase === Phase.Prologue) {
      this.lineIndex++;
      if (this.lineIndex < this.lines.length) {
        this.showLine(this.lines[this.lineIndex]);
      } else {
        this.enterFuelFix();
      }
    } else if (this.phase === Phase.Epilogue) {
      this.scene.start("TitleScene");
    }
  }

  private showLine(text: string) {
    this.tweens.killTweensOf(this.dialogText);
    this.dialogText.setAlpha(0).setText(text);
    this.tweens.add({ targets: this.dialogText, alpha: 1, duration: 180, ease: "sine.out" });
  }

  // -------------------- Fuel Meter Fix (Calibration) --------------------
  private enterFuelFix() {
    this.phase = Phase.FuelFix;

    // move rocket aside slightly
    this.tweens.add({ targets: this.rocket, x: this.scale.width * 0.18, duration: 250, ease: "sine.out" });

    // initialize puzzle numbers
    this.trueFuel = Phaser.Math.Between(20, 80);
    this.offset = Phaser.Math.RND.pick([-18, -12, -8, 8, 12, 18]); // broken offset
    this.calibration = 0;
    this.tolerance = 1;

    // Prompt
    this.showLine(
      "Calibration Console: Match the cockpit meter to the diagnostic reading using the CAL knob. When they agree, the meter is fixed."
    );
    this.clickHint.setText("Use – / + (or A/D) to adjust CAL").setAlpha(0.9);

    // Build console UI
    this.buildFuelConsole();
    this.consoleGroup.setVisible(true);

    // controls
    this.input.keyboard?.on("keydown-A", () => this.adjustCal(-1));
    this.input.keyboard?.on("keydown-D", () => this.adjustCal(1));
    this.input.keyboard?.on("keydown-Q", () => this.adjustCal(-5));
    this.input.keyboard?.on("keydown-E", () => this.adjustCal(5));
  }

  private buildFuelConsole() {
    const { width, height } = this.scale;
    this.consoleGroup.removeAll(true);

    // Panel
    const panel = this.add.rectangle(width * 0.66, height * 0.5, 420, 280, 0x13203d, 0.95)
      .setStrokeStyle(2, 0x3c5a99);
    const title = this.add.text(panel.x, panel.y - 118, "Calibration Console", {
      fontFamily: "sans-serif",
      fontSize: "20px",
      color: "#cfe8ff",
    }).setOrigin(0.5);

    // Gauge
    this.gauge = this.add.graphics({ x: panel.x, y: panel.y + 16 });
    this.drawGauge(this.getMeterReading());

    // Needle (drawn as a separate line so we can easily rotate/replace)
    this.needle = this.add.line(0, 0, 0, 0, 0, -80, 0xffe28a, 1);
    this.needle.setLineWidth(4);
    this.needle.setPosition(this.gauge.x, this.gauge.y);
    this.updateNeedle(this.getMeterReading());

    // Readouts
    this.diagnosticText = this.add.text(panel.x - 170, panel.y + 98, "", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#9cd1ff",
    }).setOrigin(0, 0.5);

    this.meterText = this.add.text(panel.x + 40, panel.y + 98, "", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#e7f3ff",
    }).setOrigin(0, 0.5);

    // Buttons
    const makeBtn = (label: string, x: number, y: number, cb: () => void) => {
      const btn = this.add.rectangle(x, y, 46, 38, 0x1e2a4a, 1).setStrokeStyle(2, 0x66a3ff).setInteractive({ useHandCursor: true });
      const txt = this.add.text(x, y, label, { fontFamily: "sans-serif", fontSize: "20px", color: "#e7f3ff" }).setOrigin(0.5);
      btn.on("pointerover", () => btn.setFillStyle(0x253459));
      btn.on("pointerout", () => btn.setFillStyle(0x1e2a4a));
      btn.on("pointerdown", cb);
      return [btn, txt] as const;
    };

    const minus = makeBtn("–", panel.x - 90, panel.y + 128, () => this.adjustCal(-1));
    const plus  = makeBtn("+", panel.x - 30, panel.y + 128, () => this.adjustCal(1));
    const minus5 = makeBtn("–5", panel.x + 40, panel.y + 128, () => this.adjustCal(-5));
    const plus5  = makeBtn("+5", panel.x + 110, panel.y + 128, () => this.adjustCal(5));

    // Calibration display
    this.calText = this.add.text(panel.x + 180, panel.y + 128, "CAL 0", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#cfe8ff",
    }).setOrigin(1, 0.5);

    // Add to container
    this.consoleGroup.add([
      panel, title,
      this.gauge, this.needle,
      this.diagnosticText, this.meterText,
      ...minus, ...plus, ...minus5, ...plus5,
      this.calText,
    ]);

    // First render of labels
    this.updateLabels();
  }

  private getMeterReading(): number {
    // meter shows trueFuel + offset + calibration, clamped 0..100
    const raw = this.trueFuel + this.offset + this.calibration;
    return Phaser.Math.Clamp(raw, 0, 100);
  }

  private adjustCal(delta: number) {
    if (this.phase !== Phase.FuelFix) return;
    this.calibration = Phaser.Math.Clamp(this.calibration + delta, -30, 30);
    this.flashCal();
    const reading = this.getMeterReading();
    this.drawGauge(reading);
    this.updateNeedle(reading);
    this.updateLabels();
    this.checkFixed();
  }

  private updateLabels() {
    this.diagnosticText.setText(`Diagnostic: ${this.trueFuel.toFixed(0)}%`);
    this.meterText.setText(`Cockpit Meter: ${this.getMeterReading().toFixed(0)}%`);
    this.calText.setText(`CAL ${this.calibration > 0 ? "+" : ""}${this.calibration}`);
  }

  private flashCal() {
    const rect = this.add.rectangle(this.calText.x - 28, this.calText.y + 1, 60, 20, 0x2b3e6a, 0.8).setOrigin(1, 0.5);
    this.tweens.add({ targets: rect, alpha: 0, duration: 160, onComplete: () => rect.destroy() });
  }

  private checkFixed() {
    // The meter is “fixed” if the cockpit reading matches diagnostics within tolerance
    const ok = Math.abs((this.trueFuel + this.offset + this.calibration) - this.trueFuel) <= this.tolerance;
    if (ok) {
      this.onFixed();
    }
  }

  private onFixed() {
    // Small celebration
    this.clickHint.setText("Meter fixed! Click / Space to continue").setAlpha(1);
    this.addFuelFloaty(this.rocket.x, this.rocket.y - 70, "Fuel Meter Calibrated!");
    // lock interactions
    this.phase = Phase.Epilogue;
    this.consoleGroup.setAlpha(1);
    this.tweens.add({ targets: this.consoleGroup, angle: { from: 0, to: 0 }, duration: 200 });

    // Glow pulse on gauge
    const ring = this.add.circle(this.gauge.x, this.gauge.y, 110, 0x2a7f3a, 0.18);
    this.tweens.add({
      targets: ring, scale: { from: 1, to: 1.1 }, alpha: { from: 0.18, to: 0 },
      duration: 650, onComplete: () => ring.destroy(),
    });

    // Narrative
    this.showLine("Calibration complete. We can trust the gauge again. Let’s find the locals and trade puzzles…");
  }

  // -------------------- Gauge rendering --------------------
  private drawGauge(valuePercent: number) {
    // valuePercent: 0..100
    const g = this.gauge;
    g.clear();

    // base
    g.lineStyle(10, 0x29406d, 1);
    g.beginPath();
    g.arc(0, 0, 100, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
    g.strokePath();

    // ticks
    g.lineStyle(2, 0x4f76b8, 1);
    for (let p = 0; p <= 10; p++) {
      const deg = 180 + (p * 18);
      const rad = Phaser.Math.DegToRad(deg);
      const x1 = Math.cos(rad) * 88;
      const y1 = Math.sin(rad) * 88;
      const x2 = Math.cos(rad) * 100;
      const y2 = Math.sin(rad) * 100;
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
    }

    // fill arc to value
    const endDeg = 180 + (valuePercent / 100) * 180;
    g.lineStyle(10, 0x8fd5ff, 1);
    g.beginPath();
    g.arc(0, 0, 100, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(endDeg), false);
    g.strokePath();
  }

  private updateNeedle(valuePercent: number) {
    const deg = 180 + (valuePercent / 100) * 180;
    const rad = Phaser.Math.DegToRad(deg);
    const x = Math.cos(rad) * 80;
    const y = Math.sin(rad) * 80;
    this.needle.setTo(this.gauge.x, this.gauge.y, this.gauge.x + x, this.gauge.y + y);
  }

  // -------------------- Small helpers --------------------
  private addFuelFloaty(x: number, y: number, text: string) {
    const t = this.add.text(x, y, text, {
      fontFamily: "sans-serif",
      fontSize: "16px",
      color: "#9cff9c",
      stroke: "#1a3f1a",
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: t,
      y: y - 30,
      alpha: 0,
      duration: 900,
      ease: "sine.out",
      onComplete: () => t.destroy(),
    });
  }
}
