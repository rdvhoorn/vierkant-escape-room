import Phaser from "phaser";
import { createBackButton } from "../../utils/BackButton";

//types
type DominoData = {
  id: number;
  top: number;
  bottom: number;
};

type GridSlot = {
  x: number;      
  y: number;      
  pixelX: number; 
  pixelY: number; 
};

type RuleType = "exact" | "sum_match" | "less_than" | "equality_group";

type RuleDef = {
  id: string;
  type: RuleType;
  cells: { x: number, y: number }[]; 
  value?: number; 
  description: string; 
  color?: number; 
};

type DominoState = {
  id: number;
  x: number;
  y: number;
  angle: number;
};

export default class DominoScene extends Phaser.Scene {
  private returnSceneKey = "Face12Scene";

  private readonly tileSize = 60; 
  private readonly boardOffsetX = -60; 
  private readonly boardOffsetY = 140;  

  private readonly initialDominos: DominoData[] = [
    { id: 1, top: 5, bottom: 2 },
    { id: 2, top: 4, bottom: 3 }, 
    { id: 3, top: 0, bottom: 0 },
    { id: 4, top: 5, bottom: 6 },
    { id: 5, top: 1, bottom: 4 },
    { id: 6, top: 1, bottom: 2 },
    { id: 7, top: 4, bottom: 4 }
  ];

  //grid
  private readonly validCoords = [
    { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
    { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 },
    { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 },
    { x: 3, y: 2 }, 
    { x: -1, y: 1 } 
  ];

  //regels hier
  private readonly rules: RuleDef[] = [
    { 
      id: "rule_neg1_1", type: "less_than", value: 3,
      cells: [{ x: -1, y: 1 }], 
      description: "In het rode vakje moeten minder dan 3 ogen",
      color: 0xff5555 
    },
    { 
      id: "rule_0_0", type: "exact", value: 6,
      cells: [{ x: 0, y: 0 }], 
      description: "In het groene vakje moeten 6 ogen",
      color: 0x55ff55 
    },
    { 
      id: "sum_01_02", type: "sum_match", value: 6,
      cells: [{ x: 1, y: 0 }, { x: 2, y: 0 }], 
      description: "In de donkerblauwe vakjes moeten samen precies 6 ogen",
      color: 0x5555ff 
    },
    { 
      id: "sum_01_11", type: "sum_match", value: 2,
      cells: [{ x: 0, y: 1 }, { x: 1, y: 1 }], 
      description: "In de gele vakjes moeten samen precies 2 ogen",
      color: 0xffff55 
    },
    { 
      id: "sum_02_12", type: "sum_match", value: 2,
      cells: [{ x: 0, y: 2 }, { x: 1, y: 2 }], 
      description: "In de roze vakjes moeten samen precies 2 ogen ",
      color: 0xff55ff 
    },
    { 
      id: "equal_group", type: "equality_group",
      cells: [{ x: 1, y: 3 }, { x: 2, y: 3 }, { x: 2, y: 2 }, { x: 2, y: 1 }], 
      description: "In de lichtblauwe vakjes moet elk vakje hetzelfde aantal ogen hebben",
      color: 0x55ffff 
    }
  ];

  //state
  private dominos: Phaser.GameObjects.Container[] = [];
  private gridSlots: GridSlot[] = [];
  private graphics!: Phaser.GameObjects.Graphics;
  private activeDomino: Phaser.GameObjects.Container | null = null;
  private ruleLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  
  private history: DominoState[][] = [];
  
  private undoBtnText = "Stap terug";
  private resetBtnText = "Reset alles";

  // Plok & Dialogue variables
  private plok!: Phaser.GameObjects.Image;
  private dialogContainer!: Phaser.GameObjects.Container;
  private dialogText!: Phaser.GameObjects.Text;
  private speakerText!: Phaser.GameObjects.Text;
  private isDialogueActive = false;
  private dialogueLines: { speaker: string; text: string }[] = [];
  private currentLineIndex = 0;

  constructor() {
    super("DominoScene");
  }

  init(data: { returnScene?: string }) {
    if (data?.returnScene) this.returnSceneKey = data.returnScene;
    
    // Reset dialogue state
    this.isDialogueActive = false;
    this.currentLineIndex = 0;
    this.dialogueLines = [];
  }

  preload() {
    // Load Plok image
    this.load.image("plok", "assets/decor/plok.png"); 
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);
    
    // Disable back button during dialogue
    createBackButton(this, undefined, undefined, () => {
        if (!this.isDialogueActive) this.exitScene();
    });
    
    const infoStyle = { fontSize: "24px", color: "#ffffff", fontStyle: "bold", stroke: "#000000", strokeThickness: 4 };
    this.add.text(width - 300, 20, "R: Draai steen 90°", infoStyle);

    this.createGrid(width, height);
    this.createRuleUI();
    this.createControlButtons(width, height);

    this.spawnDominos(height);

    // Setup Plok off-screen
    this.plok = this.add.image(width + 200, height - 200, "plok")
        .setOrigin(0.5, 1)
        .setScale(0.35) 
        .setDepth(20);

    this.createDialogUI(width, height);

    this.input.keyboard?.on("keydown-R", () => {
        if (this.activeDomino && !this.isDialogueActive) {
            this.saveState();
            this.activeDomino.angle += 90;
            this.checkRules();
        }
    });

    // Handle dialogue input
    this.input.on('pointerdown', () => {
        if (this.isDialogueActive) this.advanceDialogue();
    });
    
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
        if (this.isDialogueActive && (event.key === " " || event.key === "Enter")) {
            this.advanceDialogue();
        }
    });

    this.checkRules();
  }

  private createControlButtons(width: number, height: number) {
    const btnStyle = { fontSize: "18px", color: "#ffffff", backgroundColor: "#444444", padding: { x: 10, y: 5 } };
    
    this.add.text(width - 150, height - 80, this.undoBtnText, btnStyle)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            if (!this.isDialogueActive) this.undoLastMove();
        });

    this.add.text(width - 150, height - 40, this.resetBtnText, { ...btnStyle, backgroundColor: "#aa3333" })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            if (!this.isDialogueActive) this.resetBoard();
        });
  }

  private saveState() {
    const currentState: DominoState[] = this.dominos.map(d => ({
        id: d.getData("id"),
        x: d.x,
        y: d.y,
        angle: d.angle
    }));
    this.history.push(currentState);
    if (this.history.length > 20) this.history.shift(); 
  }

  private undoLastMove() {
    if (this.history.length === 0) return;
    
    const prevState = this.history.pop();
    if (!prevState) return;

    prevState.forEach(state => {
        const domino = this.dominos.find(d => d.getData("id") === state.id);
        if (domino) {
            this.tweens.add({
                targets: domino,
                x: state.x,
                y: state.y,
                angle: state.angle,
                duration: 200
            });
        }
    });

    this.time.delayedCall(205, () => this.checkRules());
  }

  private resetBoard() {
    this.saveState(); 

    this.dominos.forEach(d => {
        this.tweens.add({
            targets: d,
            x: d.getData("homeX"),
            y: d.getData("homeY"),
            angle: 0,
            duration: 500,
            ease: 'Power2'
        });
    });

    this.time.delayedCall(505, () => this.checkRules());
  }

  //grid logica
  private createGrid(width: number, height: number) {
    const centerX = width / 2;
    const centerY = height / 2;
    this.graphics = this.add.graphics();
    //slots/cellen
    this.validCoords.forEach(coord => {
      const px = centerX + this.boardOffsetX + coord.x * this.tileSize;
      const py = centerY + this.boardOffsetY - coord.y * this.tileSize;
      this.gridSlots.push({ x: coord.x, y: coord.y, pixelX: px, pixelY: py });
    });

    //standaard outlines - now brighter white and slightly thicker
    this.graphics.lineStyle(4, 0xffffff, 0.8);
    this.gridSlots.forEach(slot => {
         this.graphics.strokeRect(slot.pixelX - this.tileSize/2, slot.pixelY - this.tileSize/2, this.tileSize, this.tileSize);
    });

    //gekleurde outlines
    this.rules.forEach(rule => {
        const color = rule.color || 0xffffff;
        this.graphics.lineStyle(4, color, 1); 
        rule.cells.forEach(cell => {
             const slot = this.gridSlots.find(s => s.x === cell.x && s.y === cell.y);
             if (slot) {
                 this.graphics.strokeRect(slot.pixelX - this.tileSize/2 + 2, slot.pixelY - this.tileSize/2 + 2, this.tileSize - 4, this.tileSize - 4);
             }
        });
    });
  }

  private createRuleUI() {
    let y = 60;
    const x = 300;
    this.rules.forEach(rule => {
        const colorHex = rule.color ? `#${rule.color.toString(16).padStart(6, '0')}` : "#aaaaaa";
        const txt = this.add.text(x, y, `[ ] ${rule.description}`, { 
            fontSize: "16px", 
            color: colorHex,
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 2
        });
        this.add.rectangle(x - 10, y + 10, 10, 10, rule.color).setStrokeStyle(1, 0xffffff);
        this.ruleLabels.set(rule.id, txt);
        y += 35;
    });
  }

  //logica
  private checkRules() {
    // If dialogue active, don't re-check or trigger solved again
    if (this.isDialogueActive) return;

    const boardState = new Map<string, number>();
    this.dominos.forEach(d => {
        if (d.x === d.getData("homeX") && d.y === d.getData("homeY")) return;
        const snapPos = this.getSnapPosition(d);
        if (!snapPos) return; 
        let angle = Math.round(d.angle) % 360;
        if (angle < 0) angle += 360;
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const midGridX = (snapPos.x - (centerX + this.boardOffsetX)) / this.tileSize;
        const midGridY = ((centerY + this.boardOffsetY) - snapPos.y) / this.tileSize;
        const topVal = d.getData("top");
        const bottomVal = d.getData("bottom");

        let cell1 = { x: 0, y: 0, val: 0 };
        let cell2 = { x: 0, y: 0, val: 0 };

        if (angle === 0) { 
            cell1 = { x: Math.round(midGridX), y: Math.ceil(midGridY), val: topVal };
            cell2 = { x: Math.round(midGridX), y: Math.floor(midGridY), val: bottomVal };
        } 
        else if (angle === 90) { 
            cell1 = { x: Math.ceil(midGridX), y: Math.round(midGridY), val: topVal };
            cell2 = { x: Math.floor(midGridX), y: Math.round(midGridY), val: bottomVal };
        }
        else if (angle === 180) { 
            cell1 = { x: Math.round(midGridX), y: Math.floor(midGridY), val: topVal };
            cell2 = { x: Math.round(midGridX), y: Math.ceil(midGridY), val: bottomVal };
        }
        else if (angle === 270) { 
            cell1 = { x: Math.floor(midGridX), y: Math.round(midGridY), val: topVal };
            cell2 = { x: Math.ceil(midGridX), y: Math.round(midGridY), val: bottomVal };
        }
        boardState.set(`${cell1.x},${cell1.y}`, cell1.val);
        boardState.set(`${cell2.x},${cell2.y}`, cell2.val);
    });
    let allPassed = true;

    this.rules.forEach(rule => {
        let passed = false;
        const cellsFilled = rule.cells.every(c => boardState.has(`${c.x},${c.y}`));
        if (cellsFilled) {
            const values = rule.cells.map(c => boardState.get(`${c.x},${c.y}`)!);
            if (rule.type === "exact") passed = values[0] === rule.value;
            else if (rule.type === "less_than") passed = values[0] < rule.value!;
            else if (rule.type === "sum_match") passed = values.reduce((a, b) => a + b, 0) === rule.value;
            else if (rule.type === "equality_group") {
                const first = values[0];
                passed = values.every(v => v === first);
            }
        }

        const label = this.ruleLabels.get(rule.id);
        if (label) {
            label.setText(`[${passed ? "✔" : " "}] ${rule.description}`);
            label.setAlpha(passed ? 1.0 : 0.7);
        }
        if (!passed) allPassed = false;
    });

    if (allPassed) this.puzzleSolved();
  }

  private puzzleSolved() {
    if (this.registry.get("domino_solved")) return;
    this.registry.set("domino_solved", true);

    const txt = this.add.text(this.scale.width/2, this.scale.height/2, "OPGELOST!", {
        fontSize: "40px", color: "#00ff00", backgroundColor: "#000", padding: { x: 20, y: 20 }
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({ targets: txt, scale: 1.2, duration: 300, yoyo: true });
    
    this.time.delayedCall(1500, () => {
        txt.destroy();
        this.startEndingSequence();
    });
  }

  private createDialogUI(width: number, height: number) {
    this.dialogContainer = this.add.container(0, 0).setDepth(30).setVisible(false);

    const panelHeight = 160;
    const panelY = height - panelHeight - 20;

    const bg = this.add.rectangle(width / 2, panelY + panelHeight / 2, width - 100, panelHeight, 0x000000, 0.9)
        .setStrokeStyle(4, 0xffffff);
    
    this.speakerText = this.add.text(width / 2 - (width - 140) / 2, panelY + 20, "", {
        fontFamily: "sans-serif",
        fontSize: "24px",
        color: "#ffff00", 
        fontStyle: "bold"
    }).setOrigin(0, 0);

    this.dialogText = this.add.text(width / 2, panelY + 80, "", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#ffffff",
        align: "left",
        wordWrap: { width: width - 150 }
    }).setOrigin(0.5, 0.5);

    const hint = this.add.text(width - 80, height - 50, "▼", {
        fontSize: "20px", color: "#ffff00"
    }).setOrigin(1);

    this.tweens.add({
        targets: hint,
        y: height - 40,
        duration: 500,
        yoyo: true,
        repeat: -1
    });

    this.dialogContainer.add([bg, this.speakerText, this.dialogText, hint]);
  }

  private startEndingSequence() {
    this.isDialogueActive = true;
    const { width, height } = this.scale;
    this.tweens.add({
        targets: this.plok,
        x: width - 150, 
        duration: 1000,
        ease: 'Back.out',
        onComplete: () => {
            this.startDialogue([
                { speaker: "Plok", text: "Goed zo! De stenen liggen perfect!" },
                { speaker: "Plok", text: "Wat goed! Hier heb je 10 energie, succes me thet verzamelen en je terugreis naar Aarde." },
                { speaker: "Jij", text: "Graag gedaan en dank je wel!" },
            ]);
        }
    });
  }

  private startDialogue(lines: { speaker: string; text: string }[]) {
    this.dialogueLines = lines;
    this.currentLineIndex = 0;
    this.dialogContainer.setVisible(true);
    this.showNextLine();
  }

  private showNextLine() {
    if (this.currentLineIndex < this.dialogueLines.length) {
        const line = this.dialogueLines[this.currentLineIndex];
        this.speakerText.setText(line.speaker);
        this.dialogText.setText(line.text);
        this.currentLineIndex++;
    } else {
        this.dialogContainer.setVisible(false);
        this.exitScene();
    }
  }

  private advanceDialogue() {
    if (!this.dialogContainer.visible) return;
    this.showNextLine();
  }

  private getSnapPosition(domino: Phaser.GameObjects.Container): { x: number, y: number } | null {
    const isVertical = Math.abs(domino.angle % 180) === 0;
    let closestDist = 10000;
    let bestPos = null;

    for (const slot of this.gridSlots) {
      const neighborX = slot.x + (isVertical ? 0 : 1);
      const neighborY = slot.y + (isVertical ? 1 : 0); 
      const neighborSlot = this.gridSlots.find(s => s.x === neighborX && s.y === neighborY);

      if (neighborSlot) {
        const midX = (slot.pixelX + neighborSlot.pixelX) / 2;
        const midY = (slot.pixelY + neighborSlot.pixelY) / 2;
        const dist = Phaser.Math.Distance.Between(domino.x, domino.y, midX, midY);
        if (dist < 60 && dist < closestDist) {
          closestDist = dist;
          bestPos = { x: midX, y: midY };
        }
      }
    }
    return bestPos;
  }

  private spawnDominos(height: number) {
    const startX = 100; const startY = height - 100; const gap = 80;
    this.initialDominos.forEach((data, index) => {
      const x = startX + index * gap; const y = startY;
      const container = this.createDominoVisual(data.top, data.bottom);
      container.setPosition(x, y);
      container.setSize(this.tileSize, this.tileSize * 2); 
      
      // Make slightly smaller so grid lines are visible around it
      container.setScale(0.95);

      container.setData("isDomino", true);
      container.setData("id", data.id);
      container.setData("top", data.top);
      container.setData("bottom", data.bottom);
      container.setData("homeX", x);
      container.setData("homeY", y);
      container.setInteractive({ draggable: true });
      this.input.setDraggable(container);
      this.dominos.push(container);
    });
    this.input.on('dragstart', (_p: any, obj: any) => {
        // Prevent interaction during dialogue
      if (this.isDialogueActive) return;

      this.saveState();
      this.children.bringToTop(obj); this.activeDomino = obj;
      // Scale up slightly for drag effect (relative to base 0.95)
      this.tweens.add({ targets: obj, scale: 1.05, duration: 100 });
    });
    this.input.on('drag', (_p: any, obj: any, x: number, y: number) => { 
        if (this.isDialogueActive) return;
        obj.x = x; obj.y = y; 
    });
    this.input.on('dragend', (_p: any, obj: any) => {
        if (this.isDialogueActive) return;

      // Return to base size
      this.tweens.add({ targets: obj, scale: 0.95, duration: 100 });
      const snapPos = this.getSnapPosition(obj);
      if (snapPos) { obj.x = snapPos.x; obj.y = snapPos.y; }
      else { this.tweens.add({ targets: obj, x: obj.getData("homeX"), y: obj.getData("homeY"), duration: 200 }); }
      this.checkRules();
    });
  }

  private createDominoVisual(top: number, bottom: number) {
    const w = this.tileSize; const h = this.tileSize * 2;  
    const c = this.add.container(0, 0);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff); bg.fillRoundedRect(-w/2, -h/2, w, h, 8);
    bg.lineStyle(2, 0x000000); bg.strokeRoundedRect(-w/2, -h/2, w, h, 8);
    bg.lineStyle(2, 0x000000, 0.5); bg.lineBetween(-w/2 + 5, 0, w/2 - 5, 0);
    c.add(bg);
    this.addPips(c, 0, -h/4, top);
    this.addPips(c, 0, h/4, bottom);
    return c;
  }

  private addPips(c: any, cx: number, cy: number, val: number) {
    if (val === 0) return;
    const g = this.add.graphics(); g.fillStyle(0x000000);
    const sz = 4; const off = 15;
    const dot = (x: number, y: number) => g.fillCircle(cx+x, cy+y, sz);
    if (val%2 === 1) dot(0,0);
    if (val>=2) { dot(-off,-off); dot(off,off); }
    if (val>=4) { dot(off,-off); dot(-off,off); }
    if (val===6) { dot(-off,0); dot(off,0); }
    c.add(g);
  }

  private exitScene() {
    this.scene.start(this.returnSceneKey, { spawnX: this.scale.width/2, spawnY: this.scale.height/2 + 60, cameFromScene: "DominoScene", entry_from_puzzle: true });
  }

}