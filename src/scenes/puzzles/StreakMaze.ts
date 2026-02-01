import Phaser from "phaser";
import { createBackButton } from "../../utils/BackButton";

interface MazeChoice {
  label: string;
  target: string;
}

interface MazeRoom {
  id: string;
  clue?: string;
  choices?: MazeChoice[];
  isInputRoom?: boolean;
  correctInput?: number;
  isEndCorrect?: boolean;
  isEndWrong?: boolean;
}

export default class StreakMaze extends Phaser.Scene {
  private currentRoom!: MazeRoom;
  private rooms: Record<string, MazeRoom> = {};
  private mainSignText!: Phaser.GameObjects.Text;
  private choiceContainer!: Phaser.GameObjects.Container;
  private inputDOM?: Phaser.GameObjects.DOMElement;
  private dialogText?: Phaser.GameObjects.Text;
  private dialogHint?: Phaser.GameObjects.Text;
  private dialogLines: string[] = [];
  private currentLine: number = 0;
  private dialogActive: boolean = false;
  private zippuImage?: Phaser.GameObjects.Image;
  private poffieImage?: Phaser.GameObjects.Image;
  private readonly zippuScale = 0.3; 
  private readonly poffieScale = 0.3; 

  constructor() {
    super("StreakMaze");
  }

  preload() {
      this.load.image("zippu", "assets/decor/zippu.png"); 
      this.load.image("poffie", "assets/decor/poffie.png"); 
  }

  create() {
    this.buildMazeData();
    this.drawForestBackground();
    this.createMainSign();
    createBackButton(this, "Face3Scene", { entry_from_puzzle: true, spawnX: this.scale.width / 2, spawnY: this.scale.height / 2 + 80 - 30  });
    this.choiceContainer = this.add.container(0, 0);

    this.addNpcDialog(true, () => {
      this.cleanupDialog();
      this.enterRoom("stage1");
    });
  }

  private drawForestBackground() {
    const { width, height } = this.scale;
    
    this.add.rectangle(0, 0, width, height, 0x1a2b1a).setOrigin(0);

    const g = this.add.graphics();

    g.fillStyle(0x3d2e1e); 
    
    g.beginPath();
    g.moveTo(width * 0.5, height);
    g.lineTo(width * 0.4, height * 0.7); 
    g.lineTo(width * 0.6, height * 0.7);
    g.closePath();
    g.fillPath();

    g.beginPath();
    g.moveTo(width * 0.4, height * 0.75);
    g.lineTo(width * 0.2, height * 0.5);
    g.lineTo(width * 0.3, height * 0.5);
    g.closePath();
    g.fillPath();

    g.beginPath();
    g.moveTo(width * 0.5, height * 0.75);
    g.lineTo(width * 0.45, height * 0.5); 
    g.lineTo(width * 0.55, height * 0.5);
    g.closePath();
    g.fillPath();

    g.beginPath();
    g.moveTo(width * 0.6, height * 0.75);
    g.lineTo(width * 0.8, height * 0.5); 
    g.lineTo(width * 0.7, height * 0.5);
    g.closePath();
    g.fillPath();

    g.fillStyle(0x0f380f, 0.8);
    g.fillTriangle(width * 0.1, height * 0.5, width * 0.2, height * 0.2, width * 0.3, height * 0.5);
    g.fillTriangle(width * 0.8, height * 0.6, width * 0.9, height * 0.3, width * 1.0, height * 0.6);
    g.fillTriangle(width * 0.0, height * 0.7, width * 0.1, height * 0.4, width * 0.2, height * 0.7);
  }

  private createMainSign() {
    const { width } = this.scale;
    const x = width / 2;
    const y = 150;

    const g = this.add.graphics();
    g.fillStyle(0x5c4033); 
    g.fillRect(x - 10, y, 20, 200); 

    g.fillStyle(0x8b5a2b); 
    g.fillRoundedRect(x - 300, y - 100, 600, 150, 10);
    g.lineStyle(4, 0x3e2723);
    g.strokeRoundedRect(x - 300, y - 100, 600, 150, 10);

    this.mainSignText = this.add.text(x, y - 25, "", {
        fontSize: "28px",
        color: "#3e2723",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: 550 }
    }).setOrigin(0.5);
  }

  private cleanupDialog() {
    this.dialogText?.destroy();
    this.dialogHint?.destroy();
    this.zippuImage?.destroy(); 
    this.poffieImage?.destroy(); 
    
    this.dialogText = undefined;
    this.dialogHint = undefined;
    this.zippuImage = undefined;
    this.poffieImage = undefined;
  }

  private addNpcDialog(forFirstTime: boolean, onComplete: () => void) {
    const { width, height } = this.scale;
    this.zippuImage = this.add.image(width - 150, height / 2, "zippu");
    this.zippuImage.setScale(this.zippuScale);
    this.dialogLines = forFirstTime
      ? [
          "Zippu: Hoi! Ik ben Zippu, kom jij me helpen om mijn poffel te vinden?",
          "Zippu: Ze heet Poffie en is het doolhof hierachter in gerend…",
          "Zippu: ,maar ik weet niet welke kant ik op moet!",
          "Jij: Euhm, ik moet eigenlijk op zoek naar energie voor mijn capsule, om naar huis terug te keren. En wat is trouwens een poffel?",
          "Zippu: O ja, natuurlijk! Een poffel is een pluizig beestje, net zo groot als een kat. Poffie is heel nieuwsgierig, dus ze rende weg toen ze een geluidje hoorde.",
          "Jij: Poffie klinkt behoorlijk schattig, misschien moet ik Zippu toch helpen? Of is het slimmer om op zoek te gaan naar energie?",
          "Zippu: Hoorde je wat ik zei? Als je mij helpt om Poffie te vinden, dan mag je al mijn extra energie hebben, ik heb 10 energie. Wat zeg je ervan",
          "Jij: Dat klinkt als een goede deal! Ik zal je helpen Zippu, kom dan gaan we naar binnen.",
          "Zippu: Dank je, dank je, dank je! Er staan wel bordjes binnen die je waarschijnlijk helpen met welke kant je op moet, maar ik weet het niet."
        ]
      : [
          "Zippu: Poffie! Poffie, kom dan! Poffie!",
          "POFFIE KOMT IN BEELD", 
          "Zippu: Oh, daar ben je!",
          "Zippu: Dank je wel, zonder jou had ik Poffie nooit gevonden. Hier heb je 10 energie.",
          "ZE VLIEGEN WEG" 
        ];

    this.currentLine = 0;
    this.dialogActive = true;

    if (!this.dialogText)
      this.dialogText = this.add.text(width / 2, height - 100, "", {
        fontSize: "24px",
        color: "#ffffff",
        wordWrap: { width: width - 100, useAdvancedWrap: true },
        align: "center"
      }).setDepth(100).setOrigin(0.5);

    if (!this.dialogHint)
      this.dialogHint = this.add.text(width / 2, height - 50, "Klik of druk op E / spatie", {
        fontSize: "18px",
        color: "#ffff00",
      }).setDepth(100).setOrigin(0.5);
    const advanceHandler = () => {
      if (!this.dialogActive) return;

      this.showNextDialogLine(onComplete, () => {
        this.cleanupDialog();
        if (!forFirstTime) this.registry.set("streak_maze_solved", true);
      });
    };

    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E).on("down", advanceHandler);
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard!.on("keydown-SPACE", advanceHandler);
    this.input.on("pointerdown", advanceHandler);
    this.showNextDialogLine(onComplete, () => {});
  }

  private showNextDialogLine(onComplete: () => void, cleanup?: () => void) {
    if (this.currentLine >= this.dialogLines.length) {
      cleanup?.();
      this.dialogActive = false;
      onComplete();
      return;
    }

    const line = this.dialogLines[this.currentLine];


    if (line === "POFFIE KOMT IN BEELD") {
        this.spawnPoffie();
        this.currentLine++; 
        this.showNextDialogLine(onComplete, cleanup); 
        return;
    }

    if (line === "ZE VLIEGEN WEG") {
        this.performFlyAway(() => {
            cleanup?.();
            this.dialogActive = false;
            onComplete();
        });
        return;
    }

    this.dialogText?.setText(line);
    this.currentLine++;
  }

  private spawnPoffie() {
      const { width, height } = this.scale;
      this.poffieImage = this.add.image(width + 100, height / 2 + 50, "poffie");
      this.poffieImage.setScale(this.poffieScale);
      this.tweens.add({
          targets: this.poffieImage,
          x: width - 250,
          y: height / 2 + 20,
          duration: 600,
          ease: 'Back.out'
      });
  }

  private performFlyAway(onAnimComplete: () => void) {
      this.dialogText?.setVisible(false);
      this.dialogHint?.setVisible(false);

      const targets = [this.zippuImage];
      if (this.poffieImage) targets.push(this.poffieImage);

      this.tweens.add({
          targets: targets,
          y: -150,          
          x: '+=100',        
          duration: 1500,
          ease: 'Quad.in',
          onComplete: onAnimComplete
      });
  }

  private buildMazeData() {
    this.rooms = {
      stage1: { id: "stage1", clue: "Reeks: 2, 4, 6, 8", choices: [
        { label: "9", target: "WrongRoom" },
        { label: "10", target: "stage2" },
        { label: "12", target: "WrongRoom" },
      ]},
      stage2: { id: "stage2", clue: "Reeks: 1, 1, 2, 3, 5", choices: [
        { label: "6", target: "wrongA" },
        { label: "8", target: "stage3" }, 
        { label: "7", target: "wrongB" },
      ]},
      stage3: { id: "stage3", clue: "Reeks: 25, 36, 49, 64", choices: [
        { label: "81", target: "stage4" },
        { label: "73", target: "WrongRoom" },
        { label: "79", target: "wrongC" },
      ]},
      stage4: { id: "stage4", clue: "Reeks: 8, 10, 6, 8, 4, 6, 2", choices: [
        { label: "-2", target: "WrongRoom" },
        { label: "6", target: "WrongRoom" },
        { label: "4", target: "stage5" },
      ]},
      stage5: { id: "stage5", clue: "Reeks: 13, 17, 19, 23\nVoer het volgende getal in:", isInputRoom: true, correctInput: 29 },
      wrongA: { id: "wrongA", clue: "Reeks: 243, 247, 251, 255", choices: [
        { label: "257", target: "WrongRoom" },
        { label: "259", target: "WrongRoom" },
        { label: "261", target: "WrongRoom" },
      ]},
      wrongB: { id: "wrongB", clue: "Reeks: 3, 6, 10, 15, 21", choices: [
        { label: "22", target: "WrongRoom" },
        { label: "27", target: "WrongRoom" },
        { label: "28", target: "WrongRoom" },
      ]},
      wrongC: { id: "wrongC", clue: "Reeks: 64, 128, 256", choices: [
        { label: "452", target: "WrongRoom" },
        { label: "512", target: "WrongRoom" },
        { label: "1024", target: "WrongRoom" },
      ]},
      WrongRoom: { id: "WrongRoom", isEndWrong: true },
      EndRoom:   { id: "EndRoom", isEndCorrect: true },
    };
  }

  private enterRoom(roomId: string) {
    if (this.inputDOM) {
        this.inputDOM.destroy();
        this.inputDOM = undefined;
    }

    const room = this.rooms[roomId];
    if (!room) return;
    this.currentRoom = room;

    this.choiceContainer.removeAll(true); 

    if (room.isEndWrong) {
      this.mainSignText.setText("Fout! Je hebt ergens onderweg een fout gemaakt.");
      this.createChoiceSign(this.scale.width / 2, this.scale.height * 0.5, "Opnieuw", () => {
          this.enterRoom("stage1");
      });
      return;
    }

    if (room.isEndCorrect) {
      this.mainSignText.setText("Je hebt het doolhof opgelost!");
      this.addNpcDialog(false, () => {
        const { width, height } = this.scale;
        this.scene.start("Face3Scene", {
          entry_from_puzzle: true,
          spawnX: width / 2,
          spawnY: height / 2 + 80 - 30 
        });
      });
      return;
    }

    this.mainSignText.setText(room.clue ?? "");

    if (room.isInputRoom) {
      this.createDigitInputUI(); 
      return;
    }

    if (room.choices) {
        const { width, height } = this.scale;
        const positions = [
            { x: width * 0.25, y: height * 0.55 }, 
            { x: width * 0.5, y: height * 0.55 },  
            { x: width * 0.75, y: height * 0.55 }  
        ];

        room.choices.forEach((choice, i) => {
            const pos = positions[i] || positions[1];
            this.createChoiceSign(pos.x, pos.y, choice.label, () => {
                this.enterRoom(choice.target);
            });
        });
    }
  }

  private createChoiceSign(x: number, y: number, text: string, onClick: () => void) {
      const container = this.add.container(x, y);
      
      const post = this.add.rectangle(0, 50, 10, 80, 0x3e2723);
      
      const board = this.add.graphics();
      board.fillStyle(0x8b5a2b);
      board.fillRoundedRect(-60, -30, 120, 60, 8);
      board.lineStyle(2, 0x3e2723);
      board.strokeRoundedRect(-60, -30, 120, 60, 8);

      const label = this.add.text(0, 0, text, {
          fontSize: "24px",
          color: "#3e2723",
          fontStyle: "bold"
      }).setOrigin(0.5);

      container.add([post, board, label]);
      
      const hitArea = new Phaser.Geom.Rectangle(-60, -30, 120, 60);
      container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
      
      container.on('pointerdown', () => {
          this.tweens.add({
              targets: container,
              scale: 0.9,
              duration: 50,
              yoyo: true,
              onComplete: onClick
          });
      });

      this.choiceContainer.add(container);
  }

  private createDigitInputUI() {
    const { width, height } = this.scale;
    this.inputDOM = this.add.dom(width / 2, height / 2 + 50).createFromHTML(`
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; gap: 15px;">
            
            <div style="display: flex; gap: 15px;">
                ${[0, 1].map((index) => `
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        
                        <button name="btnUp" data-index="${index}" style="
                            background: transparent; border: none; color: #ffff00; font-size: 24px; cursor: pointer; padding: 0; margin-bottom: 2px;
                        ">▲</button>

                        <input type="text" id="digit${index}" readonly value="0"
                            style="
                                width: 50px; 
                                height: 50px; 
                                font-size: 30px; 
                                text-align: center; 
                                background: #222; 
                                color: white; 
                                border: 3px solid #8b5a2b; 
                                border-radius: 8px;
                                outline: none;
                                font-weight: bold;
                            "
                        >

                        <button name="btnDown" data-index="${index}" style="
                            background: transparent; border: none; color: #ffff00; font-size: 24px; cursor: pointer; padding: 0; margin-top: 2px;
                        ">▼</button>
                    </div>
                `).join('')}
            </div>

            <div style="display: flex; gap: 15px; margin-top: 10px;">
                <button id="hintBtn" style="padding: 10px 20px; cursor: pointer; background: #555; color: #ffff00; border: 2px solid #fff; border-radius: 5px; font-size: 16px;">
                    HINT
                </button>
                <button id="checkBtn" style="padding: 10px 20px; cursor: pointer; background: #3e2723; color: white; border: 2px solid #8b5a2b; border-radius: 5px; font-size: 16px; font-weight: bold;">
                    CHECK
                </button>
            </div>
            
            <div id="hintText" style="
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                width: 100%;
                min-width: 400px;
                color: #ffff00; 
                font-size: 16px; 
                margin-top: 10px; 
                text-align: center; 
                display: none; 
                background: rgba(0,0,0,0.8); 
                padding: 15px; 
                border-radius: 5px;
                z-index: 10;
            ">
                Een priemgetal is een getal dat alleen deelbaar is door 1 en zichzelf (zoals 2, 3, 5, 7, 11), maar bijvoorbeeld niet 15 (want 15 / 3 = 5 en 15 / 5 = 3).
            </div>
        </div>
    `);

    this.inputDOM.addListener("click");
    this.inputDOM.on("click", (e: any) => {
        const target = e.target;


        if (target.id === "checkBtn") {
            const digit0 = (this.inputDOM?.getChildByID("digit0") as HTMLInputElement).value;
            const digit1 = (this.inputDOM?.getChildByID("digit1") as HTMLInputElement).value;
            const fullNumber = parseInt(digit0 + digit1);

            if (fullNumber === this.currentRoom.correctInput) {
                this.enterRoom("EndRoom");
            } else {
                this.enterRoom("WrongRoom");
            }
        }

        if (target.id === "hintBtn") {
            const hintDiv = this.inputDOM?.getChildByID("hintText") as HTMLElement;
            if (hintDiv) hintDiv.style.display = "block";
        }

        if (target.name === "btnUp" || target.name === "btnDown") {
            const idx = target.getAttribute("data-index");
            const inputEl = this.inputDOM?.getChildByID(`digit${idx}`) as HTMLInputElement;
            
            if (inputEl) {
                let val = parseInt(inputEl.value);
                if (target.name === "btnUp") {
                    val = (val + 1) % 10;
                } else {
                    val = (val - 1 + 10) % 10;
                }
                inputEl.value = val.toString();
            }
        }
    });
  }
}