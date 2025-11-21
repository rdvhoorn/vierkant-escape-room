import Phaser from "phaser";

export default class PuzzleLogicOneScene extends Phaser.Scene {
  private persons!: Phaser.GameObjects.Image[];
  private roles!: Phaser.GameObjects.Zone[];
  private assigned: Record<string, string | null> = {};
  private submitButton!: Phaser.GameObjects.Text;
  private correctCombo = { liar: "person2", truth: "person1" };
  private escKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("PuzzleLogicOneScene");
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
  this.cameras.main.setBackgroundColor("#0b1020");

  this.add.text(width / 2, 50, "\n Wie liegt er? Wie spreekt de waarheid? [5 energie] ", {
    fontSize: "22px",
    color: "#ffffff",
  }).setOrigin(0.5);
  this.add.text(width / 2, 200, "Persoon 2 zegt: Ik spreek de waarheid. Persoon 1 ook.", {
    fontSize: "22px",
    color: "#ffffff",
  }).setOrigin(0.5);
    this.add.text(width / 2, 150, "Persoon 1 zegt:  Persoon 2 liegt", {
    fontSize: "22px",
    color: "#ffffff",
  }).setOrigin(0.5);

  // ESC 
  this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

  // Drop zones 
  const labels = ["Leugenaar", "Waarheidsspreker"];
  this.roles = labels.map((label, i) => {
    const zone = this.add.zone(width / 2 - 150 + i * 300, height - 180, 160, 100)
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
    ];

    this.persons = personData.map((p, i) => {
      if (!this.textures.exists(p.key)) {
        const tex = this.textures.createCanvas(p.key, 100, 100);
        if (tex) {
          const ctx = tex.getContext();
          ctx.fillStyle = "#" + p.color.toString(16).padStart(6, "0");
          ctx.fillRect(0, 0, 100, 100);

          //label tekst
          ctx.fillStyle = "#000000";
          ctx.font = "20px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(p.key.toUpperCase(), 50, 50);

          tex.refresh();
        }
      }

  const img = this.add.image(width / 2 - 120 + i * 240, height / 2, p.key)
    .setInteractive({ draggable: true });

  return img;
});


  // Pullen/drag/drop
  this.input.setDraggable(this.persons);

  this.input.on("drag", (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image, dragX: number, dragY: number) => {
    gameObject.x = dragX;
    gameObject.y = dragY;
  });

  this.input.on("drop", (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image, dropZone: Phaser.GameObjects.Zone) => {
    gameObject.x = dropZone.x;
    gameObject.y = dropZone.y;
    this.assigned[dropZone === this.roles[0] ? "liar" : "truth"] = gameObject.texture.key;
  });

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
      this.assigned.truth === this.correctCombo.truth
    ) {
      this.add.text(this.scale.width / 2, this.scale.height / 2 + 120, "Correct!", {
        color: "#00ff00",
        fontSize: "24px",
      }).setOrigin(0.5);
      this.registry.set("logic1Solved", true);
      this.registry.set("energy", (this.registry.get("energy") ?? 0) + 5); 
      this.events.emit("updateEnergy", this.registry.get("energy")); // dit is nog jank
      this.time.delayedCall(1000, () => this.scene.start("PuzzleLogicTwoScene"));

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
