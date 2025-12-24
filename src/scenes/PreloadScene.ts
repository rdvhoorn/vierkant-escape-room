import Phaser from "phaser";

export default class PreloadScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Rectangle;
  private percentText!: Phaser.GameObjects.Text;

  constructor() {
    super("PreloadScene");
  }

  preload() {
    const { width, height } = this.scale;

    // Loading UI
    this.progressBar = this.add.rectangle((width / 2) - 175, height / 2, 0, 20, 0x8fd5ff, 1).setOrigin(0, 0.5);
    this.percentText = this.add.text(width / 2, height / 2 + 40, "0%", {
      fontFamily: "sans-serif",
      fontSize: "14px",
      color: "#cfe8ff",
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 60, "Lancering voorbereiden...", {
      fontFamily: "sans-serif",
      fontSize: "18px",
      color: "#cfe8ff",
    }).setOrigin(0.5);

    // Progress handlers
    this.load.on("progress", (value: number) => {
      this.progressBar.width = 350 * value;
      this.percentText.setText(`${Math.round(value * 100)}%`);
    });
    this.load.on("complete", () => {
      this.time.delayedCall(200, () => this.scene.start("TitleScene"));
    });

    // ---------------------------
    // Asset loads (replace paths with your chosen pack)
    // ---------------------------
    // Lander / spaceship (e.g., from Kenney or itch.io packs)
    this.load.image("ship", "/assets/decor/ship.png");
    this.load.image("letter", "/assets/decor/letter.png");

    // Small spark/smoke particle (8x8-ish white dot or smoke puff)
    // this.load.image("spark", "/assets/particles/spark.png");

    // Rocks / tufts / debris (any small PNGs)
    this.load.image("rock", "/assets/decor/rock.png");
    this.load.image("tuft1", "/assets/decor/purple_tuft.png");
    this.load.image("tuft2", "/assets/decor/cactus.png");
    this.load.image("debris1", "/assets/decor/tuft.png");

    // Player images - simple 2D top-down
    this.load.image("player_normal_1", "/assets/player/1.png");
    this.load.image("player_normal_2", "/assets/player/2.png");
    this.load.image("player_normal_3", "/assets/player/3.png");
    this.load.image("player_normal_4", "/assets/player/4.png");
    this.load.image("player_normal_5", "/assets/player/5.png");

    // Characters - LOD (Level of Detail) approach
    this.load.image("quadratus_small", "/assets/quadratus_small.webp"); // 200x336 for gameplay
    this.load.image("quadratus_large", "/assets/quadratus_large.webp"); // 729x1224 for close-ups
  }

  create() {
    // Nothing else needed; we go to TitleScene in on('complete')
  }
}
