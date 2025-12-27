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
    this.load.image("farm", "/assets/decor/farm.png");
    this.load.image("farmer", "/assets/decor/farmer.png");
    this.load.image("wooden_sign", "/assets/decor/wooden_sign.png");
    this.load.image("wooden_panel", "/assets/decor/wooden_panel.png");

    // Small spark/smoke particle (8x8-ish white dot or smoke puff)
    // this.load.image("spark", "/assets/particles/spark.png");

    // KVQ
    this.load.image("twelve", "/assets/decor/kvq/12.png");
    this.load.image("ei", "/assets/decor/kvq/ei.png");
    this.load.image("fruitmand", "/assets/decor/kvq/fruitmand.png");
    this.load.image("vierkant_logo", "/assets/decor/kvq/vierkant_logo.png");
    this.load.image("vraagtekens", "/assets/decor/kvq/vraagtekens.png");
    this.load.image("driehoek", "/assets/decor/kvq/driehoek.png");
    this.load.image("1kers", "/assets/decor/fruit/1kers.png");
    this.load.image("1peer", "/assets/decor/fruit/1peer.png");
    this.load.image("2kersen", "/assets/decor/fruit/2kersen.png");
    this.load.image("6druiven", "/assets/decor/fruit/6druiven.png");
    this.load.image("8druiven", "/assets/decor/fruit/8druiven.png");

    // Rocks / tufts / debris (any small PNGs)
    this.load.image("rock", "/assets/decor/rock.png");
    this.load.image("tuft1", "/assets/decor/purple_tuft.png");
    this.load.image("tuft2", "/assets/decor/cactus.png");
    this.load.image("debris1", "/assets/decor/tuft.png");
    this.load.image("chest","/assets/decor/chest.png")
    this.load.image("chest_2","/assets/decor/chest_2.png")
    this.load.image("chest_2_open","/assets/decor/chest_2_open.png")
    this.load.image("tower","/assets/decor/tower.png")
    this.load.image("tower","/assets/decor/brokenpanel.png")
    this.load.image("telescope","/assets/decor/telescope.png")
    this.load.image("background_tower","/assets/decor/background_tower.png")
    this.load.image("balance_scale_puzzle","/assets/decor/balance_scale_puzzle.png")
    this.load.image("zippu","/assets/decor/zippu.png")
    this.load.image("mazedoor","/assets/decor/mazedoor.png")
    this.load.image("poffie","/assets/decor/poffie.png")

    
    

    // Player images - simple 2D top-down
    this.load.image("player_normal_1", "/assets/player/1.png");
    this.load.image("player_normal_2", "/assets/player/2.png");
    this.load.image("player_normal_3", "/assets/player/3.png");
    this.load.image("player_normal_4", "/assets/player/4.png");
    this.load.image("player_normal_5", "/assets/player/5.png");
  }

  create() {
    // Nothing else needed; we go to TitleScene in on('complete')
  }
}
