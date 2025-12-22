import Phaser from "phaser";

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

  private clueText!: Phaser.GameObjects.Text;
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private inputBox?: HTMLInputElement;

  private firstTimeEntering: boolean = true;

  private dialogText?: Phaser.GameObjects.Text;
  private dialogHint?: Phaser.GameObjects.Text;
  private dialogLines: string[] = [];
  private currentLine: number = 0;
  private dialogActive: boolean = false;
  
  // Characters
  private zippuImage?: Phaser.GameObjects.Image;
  private poffieImage?: Phaser.GameObjects.Image;
  
  // --- SCALING CONFIG ---
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

    if (this.firstTimeEntering) {
      this.firstTimeEntering = false;
      this.addNpcDialog(true, () => {
        this.cleanupDialog();
        this.enterRoom("stage1");
      });
    } else {
      this.enterRoom("stage1");
    }
  }

  private cleanupDialog() {
    this.dialogText?.destroy();
    this.dialogHint?.destroy();
    this.zippuImage?.destroy(); 
    this.poffieImage?.destroy(); // Cleanup Poffie too
    
    this.dialogText = undefined;
    this.dialogHint = undefined;
    this.zippuImage = undefined;
    this.poffieImage = undefined;
  }

  // NPC DIALOG
  private addNpcDialog(forFirstTime: boolean, onComplete: () => void) {
    const { width, height } = this.scale;
    
    // 1. Setup Zippu
    this.zippuImage = this.add.image(width - 150, height / 2, "zippu");
    this.zippuImage.setScale(this.zippuScale);

    // 2. Define Lines
    this.dialogLines = forFirstTime
      ? [
          "Zippu: Hoi! Ik ben Zippu, kom jij me helpen om mijn poffel te vinden?",
          "Zippu: Ze heet Poffie en is het doolhof hierachter in gerend…",
          "Zippu: maar ik weet niet welke kant ik op moet!",
          "Jij: Euhm, ik moet eigenlijk op zoek naar energie voor mijn capsule om naar huis terug te keren. En wat is trouwens een poffel?",
          "Zippu: O ja, natuurlijk! Een poffel is een pluizig beestje, net zo groot als een kat. Poffie is heel nieuwsgierig, dus ze rende weg toen ze een geluidje hoorde.",
          "Jij: Poffie klinkt behoorlijk schattig, misschien moet ik Zippu toch helpen? Of is het slimmer om op zoek te gaan naar energie?",
          "Hoorde je wat ik zei? Als je mij helpt om Poffie te vinden, dan mag je al mijn extra energie hebben. Dat is wel 10 [ENERGIE-NAAM]. Wat zeg je ervan",
          "Dat klinkt als een goede deal! Ik zal je helpen Zippu, kom dan gaan we naar binnen.",
          "Dank je, dank je, dank je! Er staan wel bordjes binnen die je waarschijnlijk helpen met welke kant je op moet, maar ik weet het niet."
        ]
      : [
          "Zippu: Poffie! Poffie, kom dan! Poffie!",
          "POFFIE KOMT IN BEELD", // Trigger for Poffie spawn
          "Zippu: Oh, daar ben je!",
          "Zippu: Dank je wel, zonder jou had ik Poffie nooit gevonden. Hier heb je 10 energie.",
          "ZE VLIEGEN WEG" // Trigger for fly animation
        ];

    this.currentLine = 0;
    this.dialogActive = true;

    // 3. UI Text
    if (!this.dialogText)
      this.dialogText = this.add.text(width / 2, height - 100, "", {
        fontSize: "24px",
        color: "#ffffff",
        wordWrap: { width: width - 100, useAdvancedWrap: true },
        align: "center"
      }).setDepth(100).setOrigin(0.5);

    if (!this.dialogHint)
      this.dialogHint = this.add.text(width / 2, height - 50, "Druk op E om verder te gaan", {
        fontSize: "18px",
        color: "#ffff00",
      }).setDepth(100).setOrigin(0.5);

    // 4. Input Handler
    const keyE = this.input!.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    const advanceHandler = () => {
      if (!this.dialogActive) return;
      
      this.showNextDialogLine(onComplete, () => {
        // This callback runs when dialogue is totally finished
        this.cleanupDialog();
        if (!forFirstTime) this.registry.set("streak_maze_solved", true);
      });
    };

    keyE.on("down", advanceHandler);
    
    // Show first line immediately
    this.showNextDialogLine(onComplete, () => {});
  }

  // Handles displaying lines AND special actions (Spawn / Fly)
  private showNextDialogLine(onComplete: () => void, cleanup?: () => void) {
    // If we ran out of lines, finish.
    if (this.currentLine >= this.dialogLines.length) {
      cleanup?.();
      this.dialogActive = false;
      onComplete();
      return;
    }

    const line = this.dialogLines[this.currentLine];

    // --- ACTION: SPAWN POFFIE ---
    if (line === "POFFIE KOMT IN BEELD") {
        this.spawnPoffie();
        this.currentLine++; // Skip this line so we don't display the placeholder text
        this.showNextDialogLine(onComplete, cleanup); // Immediately show next line
        return;
    }

    // --- ACTION: FLY AWAY ---
    if (line === "ZE VLIEGEN WEG") {
        // Start animation, then finish dialog when animation is done
        this.performFlyAway(() => {
            cleanup?.();
            this.dialogActive = false;
            onComplete();
        });
        return;
    }

    // Normal Text Line
    this.dialogText?.setText(line);
    this.currentLine++;
  }

  private spawnPoffie() {
      const { width, height } = this.scale;
      
      // Create Poffie off-screen to the right
      this.poffieImage = this.add.image(width + 100, height / 2 + 50, "poffie");
      this.poffieImage.setScale(this.poffieScale);

      // Tween her in next to Zippu
      this.tweens.add({
          targets: this.poffieImage,
          x: width - 250, // To the left of Zippu
          y: height / 2 + 20,
          duration: 600,
          ease: 'Back.out'
      });
  }

  private performFlyAway(onAnimComplete: () => void) {
      // Hide UI during animation
      this.dialogText?.setVisible(false);
      this.dialogHint?.setVisible(false);

      const targets = [this.zippuImage];
      if (this.poffieImage) targets.push(this.poffieImage);

      this.tweens.add({
          targets: targets,
          y: -150,           // Fly off top
          x: '+=100',        // Slightly to the right
          duration: 1500,
          ease: 'Quad.in',
          onComplete: onAnimComplete
      });
  }

  // puzzle data
  private buildMazeData() {
    this.rooms = {
      stage1: { id: "stage1", clue: "Reeks: 2, 4, 6, 8", choices: [
        { label: "9", target: "WrongRoom" },
        { label: "10", target: "stage2" },
        { label: "12", target: "WrongRoom" },
      ]},
      stage2: { id: "stage2", clue: "Reeks: 1, 1, 2, 3, 5", choices: [
        { label: "6", target: "wrongA" },
        { label: "7", target: "wrongB" },
        { label: "8", target: "stage3" },
      ]},
      stage3: { id: "stage3", clue: "Reeks: 25, 36, 49, 64", choices: [
        { label: "73", target: "WrongRoom" },
        { label: "79", target: "wrongC" },
        { label: "81", target: "stage4" },
      ]},
      stage4: { id: "stage4", clue: "Reeks: 8, 10, 6, 8, 4, 6, 2", choices: [
        { label: "-2", target: "WrongRoom" },
        { label: "4", target: "stage5" },
        { label: "6", target: "WrongRoom" },
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

  // Room logic
  private enterRoom(roomId: string) {
    if (this.inputBox) {
      this.inputBox.remove();
      this.inputBox = undefined;
    }

    const room = this.rooms[roomId];
    if (!room) return;
    this.currentRoom = room;

    const { width } = this.scale;

    this.choiceTexts.forEach(t => t.destroy());
    this.choiceTexts = [];

    if (!this.clueText) {
      this.clueText = this.add.text(width / 2, 80, "", {
        fontSize: "26px",
        color: "#ffffff",
        align: "center",
      }).setOrigin(0.5);
    }

    if (room.isEndWrong) {
      this.clueText.setText("Fout! Je hebt ergens onderweg een fout gemaakt.");
      this.showResetButton();
      return;
    }

    if (room.isEndCorrect) {
      this.clueText.setText("Je hebt het doolhof opgelost!");
      //Forceer eind-dialoog
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

    this.clueText.setText(room.clue ?? "");

    if (room.isInputRoom) {
      this.createInputBox();
      return;
    }

    if (room.choices) {
      room.choices.forEach((choice, i) => {
        const text = this.add.text(width / 2, 180 + i * 60, `[ ${choice.label} ]`, {
          fontSize: "28px",
          color: "#ffffaa",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => { this.enterRoom(choice.target); });

        this.choiceTexts.push(text);
      });
    }
  }

  private createInputBox() {
    const { width } = this.scale;

    const input = document.createElement("input");
    input.type = "number";
    input.style.position = "absolute";
    input.style.left = `${width / 2 - 60}px`;
    input.style.top = `200px`;
    input.style.fontSize = "20px";
    input.style.padding = "6px";
    input.style.width = "120px";

    document.body.appendChild(input);
    this.inputBox = input;
    input.focus();

    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        const num = Number(input.value);
        const correct = this.currentRoom.correctInput;
        if (num === correct) {
          this.enterRoom("EndRoom");
        } else {
          this.enterRoom("WrongRoom");
        }
      }
    });
  }

  private showResetButton() {
    const { width } = this.scale;

    const btn = this.add.text(width / 2, 200, "Opnieuw beginnen", {
      fontSize: "28px",
      color: "#ffaa88",
      backgroundColor: "#442222",
      padding: { x: 10, y: 8 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      btn.destroy();
      this.enterRoom("stage1");
    });

    this.choiceTexts.push(btn);
  }
}