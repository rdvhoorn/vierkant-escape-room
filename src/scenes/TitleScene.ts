import Phaser from "phaser";

export default class TitleScene extends Phaser.Scene {
  private pulseTween?: Phaser.Tweens.Tween;

  constructor() {
    super("TitleScene");
  }

  create() {
    const { width, height } = this.scale;

    const stars = this.add.graphics();
    for (let i = 0; i < 120; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const a = Phaser.Math.FloatBetween(0.2, 0.9);
      stars.fillStyle(0xffffff, a);
      stars.fillRect(x, y, 2, 2);
    }

    this.add.text(width / 2, height * 0.28, "Dodecahedron Escape", {
      fontFamily: "sans-serif",
      fontSize: "42px",
      fontStyle: "900",
      color: "#e7f3ff",
      stroke: "#66a3ff",
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.38, "Gestrand! De zoektocht naar een wiskundige manier om weer weg te komen.", {
      fontFamily: "sans-serif",
      fontSize: "18px",
      color: "#b6d5ff",
    }).setOrigin(0.5);

    const pad = this.add.rectangle(width / 2, height * 0.65, 420, 70, 0x1e2a4a, 0.6)
      .setStrokeStyle(2, 0x3c5a99);
    const startHint = this.add.text(width / 2, height * 0.65, "Klik hier om te starten", {
      fontFamily: "sans-serif",
      fontSize: "22px",
      color: "#cfe8ff",
    }).setOrigin(0.5);

    this.pulseTween = this.tweens.add({
      targets: [pad, startHint],
      alpha: { from: 0.6, to: 1 },
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    this.input.keyboard?.once("keydown-SPACE", () => this.startGame());
    this.input.on("pointerdown", () => this.startGame());

    const v = this.registry.get("version") ?? "";
    this.add.text(width - 12, height - 10, `v${v}`, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#7ea7ff",
    }).setOrigin(1, 1).setAlpha(0.8);
  }

  private startGame() {
    this.pulseTween?.stop();
    this.cameras.main.fadeOut(200, 0, 0, 0, (_: any, p: number) => {
      if (p === 1) this.scene.start("IntroScene");
    });
  }
}
