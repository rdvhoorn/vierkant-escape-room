import Phaser from "phaser";

export default class PuzzleLogicTwoScene extends Phaser.Scene {
  private persons!: Phaser.GameObjects.Image[];
  private roles!: Phaser.GameObjects.Zone[];
  private assigned: Record<string, string | null> = {};
  private submitButton!: Phaser.GameObjects.Text;
  private correctCombo = { liar: "person3", truth: "person1", spy: "person2" };
  private escKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("PuzzleLogicTwoScene");
  }

  create() {
    const { width, height } = this.scale;
  
    const stars = this.add.graphics();
    for (let i = 0; i < 200; i++) {
      stars.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.15, 0.8));
      stars.fillRect(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        2,
        2
      );
    }
    stars.setDepth(0); //deze kan je niet naar achter schuiven
  
    this.cameras.main.setBackgroundColor("#0b1020");

    this.add.text(width / 2, 50, "\n Nu is er een spion. De spion kan zowel liegen als de waarheid spreken.[10 energie]\n Persoon 1 zegt dat die niet de spion is \n Persoon 2 zegt dat die niet de ridder is.\n Persoon 3 zegt dat die niet de leugenaar is. ", {
      fontSize: "22px",
      color: "#ffffff",
      wordWrap: { width: 800 },
    }).setOrigin(0.5);

    //ESC
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // drop zones
    const labels = ["Leugenaar", "Waarheidsspreker", "Spion"];
    this.roles = labels.map((label, i) => {
      const zone = this.add.zone(width / 2 - 300 + i * 300, height - 180, 160, 100)
        .setRectangleDropZone(160, 100);
      const g = this.add.graphics();
      g.lineStyle(2, 0xffffff, 0.6);
      g.strokeRect(zone.x - 80, zone.y - 50, 160, 100);
      this.add.text(zone.x, zone.y + 60, label, { color: "#ffffff" }).setOrigin(0.5);
      return zone;
    });

    // Sleepbare dingen zoals vorige
        const personData = [
          { key: "person1", color: 0x4cc9f0 },
          { key: "person2", color: 0xf72585 },
          { key: "person3", color: 0x90be6d },
        ];

    this.persons = personData.map((p, i) => {
      if (!this.textures.exists(p.key)) {
        const tex = this.textures.createCanvas(p.key, 100, 100);
        if (tex) {
          const ctx = tex.getContext();
          if (ctx) {
            ctx.fillStyle = "#" + p.color.toString(16).padStart(6, "0");
            ctx.fillRect(0, 0, 100, 100);
            ctx.fillStyle = "#000000";
            ctx.font = "20px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(p.key.toUpperCase(), 50, 50);
            tex.refresh();
          }
        }
      }

      return this.add.image(width / 2 - 240 + i * 240, height / 2, p.key)
        .setInteractive({ draggable: true });
    }) as Phaser.GameObjects.Image[]; //type moet duidelijk zijn, anders jank


    // Pullen/drag/drop
    this.input.setDraggable(this.persons);

    this.input.on(
      "drag",
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.Image,
        dragX: number,
        dragY: number
      ) => {
        gameObject.x = dragX;
        gameObject.y = dragY;
      }
    );


    this.input.on(
      "drop",
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.Image,
        dropZone: Phaser.GameObjects.Zone
      ) => {
        gameObject.x = dropZone.x;
        gameObject.y = dropZone.y;
        const roleKey = this.roles.indexOf(dropZone);
        if (roleKey === 0) this.assigned.liar = gameObject.texture.key;
        else if (roleKey === 1) this.assigned.truth = gameObject.texture.key;
        else this.assigned.spy = gameObject.texture.key;
      }
    );


    // submit knopje
    this.submitButton = this.add.text(width / 2, height - 60, "Check", {
      fontSize: "20px",
      backgroundColor: "#222",
      color: "#fff",
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setInteractive();

    this.submitButton.on("pointerdown", () => this.checkAnswer());
  }

  private checkAnswer() {
    if (
      this.assigned.liar === this.correctCombo.liar &&
      this.assigned.truth === this.correctCombo.truth &&
      this.assigned.spy === this.correctCombo.spy
    ) {
      this.add.text(this.scale.width / 2, this.scale.height / 2 + 120, "All correct!", {
        color: "#00ff00",
        fontSize: "24px",
      }).setOrigin(0.5);
      this.registry.set("logic2Solved", true);
      this.registry.set("energy", (this.registry.get("energy") ?? 0) + 10); 
      this.events.emit("updateEnergy", this.registry.get("energy")); // dit is nog jank
      this.time.delayedCall(1000, () => this.scene.start("Face1Scene"));

    } else {
      this.add.text(this.scale.width / 2, this.scale.height / 2 + 120, "Try again!", {
        color: "#ff0000",
        fontSize: "24px",
      }).setOrigin(0.5);
    }
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.scene.start("Face1Scene");
    }
  }
}
