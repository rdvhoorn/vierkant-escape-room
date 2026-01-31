import Phaser from "phaser";
import { createBackButton } from "../../utils/BackButton";

export default class PhoneBoxScene extends Phaser.Scene {
  private returnSceneKey: string = "Face9Scene";
  private readonly correctCode = "6294";
  private currentWallIndex = 0; // 0 tot 3
  private enteredCode = "";
  private numpadContainer!: Phaser.GameObjects.Container;
  private wallContainer!: Phaser.GameObjects.Container;
  private codeDisplay!: Phaser.GameObjects.Text;
  private wallText!: Phaser.GameObjects.Text;
  private wallTitle!: Phaser.GameObjects.Text;
  private hintDisplay!: Phaser.GameObjects.Text; 

  private readonly wallClues = [
    { id: 1, arrows: ["↑", "←", "↑", "→", "↑", "→", "↓"] },       //6
    { id: 2, arrows: ["↑", "→", "↑", "↑", "←"] },                //2
    { id: 3, arrows: ["↑", "↑", "←", "↑", "→", "→", "↓", "↓"] },  //9
    { id: 4, arrows: ["↑", "→", "↑", "←", "←"] }                  //4
  ];

  constructor() {
    super("PhoneBoxScene");
  }

  init(data: { returnScene?: string }) {
    if (data?.returnScene) this.returnSceneKey = data.returnScene;
  }

  create() {
    // Reset state on each scene start
    this.enteredCode = "";
    this.currentWallIndex = 0;
    createBackButton(this, undefined, undefined, () => this.exitScene());

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x2a0a0a).setOrigin(0);
    this.numpadContainer = this.add.container(0, 0);
    this.wallContainer = this.add.container(0, 0).setVisible(false);
    this.createNumpadView(width, height);
    this.createWallView(width, height);
  }

  //numpad
  private createNumpadView(width: number, height: number) {
    const screenBg = this.add.rectangle(width / 2, 100, 300, 80, 0x000000).setStrokeStyle(4, 0x555555);
    this.codeDisplay = this.add.text(width / 2, 100, "_ _ _ _", {
      fontFamily: "monospace", fontSize: "48px", color: "#00ff00", letterSpacing: 10
    }).setOrigin(0.5);
    this.numpadContainer.add([screenBg, this.codeDisplay]);

    //123 moet boven, neit als een rekenmachine
    const startX = width / 2 - 80;
    const startY = 250;
    const gap = 80;
    const keys = [
      1, 2, 3,
      4, 5, 6,
      7, 8, 9
    ];

    keys.forEach((num, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = startX + col * gap;
      const y = startY + row * gap;
      this.createKeyBtn(x, y, num.toString(), () => this.handleInput(num.toString()));
    });
    const x0 = startX + 1 * gap; 
    const y0 = startY + 3 * gap; 
    this.createKeyBtn(x0, y0, "0", () => this.handleInput("0"), 0x004400, 0x00ff00);

    //clear (linksonder)
    this.createKeyBtn(x0 - gap, y0, "C", () => this.clearInput(), 0x440000, 0xff0000);
    
    //submit
    this.createKeyBtn(x0 + gap, y0, "OK", () => this.checkCode(), 0x000044, 0x8888ff);


    //naar de muren
    const wallBtn = this.add.text(width-200, height - 80, "[Muren bekijken]", { 
      fontSize: "24px", color: "#ffffff", backgroundColor: "#444", padding: { x: 20, y: 10 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => this.switchView("wall"));

    this.numpadContainer.add(wallBtn);
    const hintBtn = this.add.text(200, height - 80, "[ Hint ]", {
        fontSize: "24px", color: "#ffff00", backgroundColor: "#444", padding: { x: 20, y: 10 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
 
        this.hintDisplay.setVisible(!this.hintDisplay.visible);
    });
    this.numpadContainer.add(hintBtn);
    this.hintDisplay = this.add.text(width / 2, height - 150, "Begin bij nul...", {
        fontSize: "20px", color: "#ffff00", backgroundColor: "#000000", padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setVisible(false);
    this.numpadContainer.add(this.hintDisplay);
  }

  private createKeyBtn(x: number, y: number, label: string, onClick: () => void, fill = 0x222222, textCol = 0xffffff) {
    const bg = this.add.rectangle(0, 0, 70, 70, fill).setStrokeStyle(2, 0x666666);
    const txt = this.add.text(0, 0, label, { fontSize: "32px", color: "#ffffff" }).setOrigin(0.5);
    if (typeof textCol === 'number') txt.setTint(textCol);
    const container = this.add.container(x, y, [bg, txt])
      .setSize(70, 70)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.tweens.add({ targets: container, scale: 0.9, duration: 50, yoyo: true });
        onClick();
      });

    this.numpadContainer.add(container);
  }

  //muren
  private createWallView(width: number, height: number) {
    //achtergrond net iets anders voor verschil
    const bg = this.add.rectangle(0, 0, width, height, 0x3d1212).setOrigin(0);
    this.wallContainer.add(bg);

    //titel
    this.wallTitle = this.add.text(width / 2, 100, "Muur 1 (Cijfer 1)", {
      fontSize: "32px", color: "#ffaAAA", fontStyle: "bold"
    }).setOrigin(0.5);

    //pijlen
    this.wallText = this.add.text(width / 2, height / 2, "", {
      fontSize: "60px", color: "#ffffff", align: "center", lineSpacing: 20
    }).setOrigin(0.5);

    //links en rechts button van muren
    const btnY = height / 2+150;
    const prevBtn = this.add.text(50, btnY, "<", { fontSize: "80px", color: "#fff" })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changeWall(-1));
    
    const nextBtn = this.add.text(width - 50, btnY, ">", { fontSize: "80px", color: "#fff" })
      .setOrigin(1, 0) 
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changeWall(1));

    //return
    const returnBtn = this.add.text(width / 2, height - 80, "[Terug naar cel]", {
      fontSize: "24px", color: "#ffffff", backgroundColor: "#444", padding: { x: 20, y: 10 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => this.switchView("numpad"));
    this.wallContainer.add([this.wallTitle, this.wallText, prevBtn, nextBtn, returnBtn]);
    this.updateWallContent();
  }

  //logica/interactie zelf

  private handleInput(char: string) {
    if (this.enteredCode.length < 4) {
      this.enteredCode += char;
      this.updateDisplay();
    }
  }

  private clearInput() {
    this.enteredCode = "";
    this.updateDisplay();
  }

  private updateDisplay() {
    let txt = "";
    for (let i = 0; i < 4; i++) {
      txt += (this.enteredCode[i] || "_") + " ";
    }
    this.codeDisplay.setText(txt.trim());
    this.codeDisplay.setColor("#00ff00"); 
  }

  private checkCode() {
    if (this.enteredCode === this.correctCode) {
      this.codeDisplay.setColor("#00ffff");
      this.time.delayedCall(500, () => this.puzzleSolved());
    } else {
      this.codeDisplay.setColor("#ff0000");
      this.cameras.main.shake(100, 0.01);
      this.time.delayedCall(500, () => this.clearInput());
    }
  }

  private switchView(view: "numpad" | "wall") {
    if (view === "numpad") {
      this.numpadContainer.setVisible(true);
      this.wallContainer.setVisible(false);
    } else {
      this.numpadContainer.setVisible(false);
      this.wallContainer.setVisible(true);
    }
  }

  private changeWall(delta: number) {
    this.currentWallIndex += delta;
    if (this.currentWallIndex < 0) this.currentWallIndex = 3; //clean lol
    if (this.currentWallIndex > 3) this.currentWallIndex = 0;
    this.updateWallContent();
  }

  private updateWallContent() {
    const clue = this.wallClues[this.currentWallIndex];
    this.wallTitle.setText(`Muur ${this.currentWallIndex + 1} (Cijfer ${this.currentWallIndex + 1})`);
    const arrowString = clue.arrows.join("   "); 
    this.wallText.setText(arrowString);
  }

  private puzzleSolved() {
    console.log("[PhoneBox] Puzzle solved, returning to:", this.returnSceneKey);
    this.registry.set("phonebox_solved", true);
    this.exitScene();
  }

  private exitScene() {
    const spawnX = this.scale.width / 2;
    const spawnY = this.scale.height / 2 + 60;
    this.scene.start(this.returnSceneKey, {
      spawnX,
      spawnY,
      cameFromScene: "PhoneBoxScene",
      entry_from_puzzle: true,
    });
  }
}