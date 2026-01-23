import Phaser from "phaser";
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
    { x: 3, y: 2 }, //rechter extension
    { x: -1, y: 1 } //linker extension (ja negative lekker handig hopelijk levert het geen problemen op)
  ];

  //regels hier
  private readonly rules: RuleDef[] = [
    { 
      id: "rule_neg1_1", type: "less_than", value: 3,
      cells: [{ x: -1, y: 1 }], 
      description: "In het rode vakje moeten minder dan 3 ogen",
      color: 0xff5555 //rood
    },
    { 
      id: "rule_0_0", type: "exact", value: 6,
      cells: [{ x: 0, y: 0 }], 
      description: "In het groene vakje moeten 6 ogen",
      color: 0x55ff55 //groen
    },
    { 
      id: "sum_01_02", type: "sum_match", value: 6,
      cells: [{ x: 1, y: 0 }, { x: 2, y: 0 }], 
      description: "In de blauwe vakjes moeten samen exact 6 ogen",
      color: 0x5555ff //blauw
    },
    { 
      id: "sum_01_11", type: "sum_match", value: 2,
      cells: [{ x: 0, y: 1 }, { x: 1, y: 1 }], 
      description: "In de gele vakjes moeten samen exact 2 ogen",
      color: 0xffff55 //geel
    },
    { 
      id: "sum_02_12", type: "sum_match", value: 2,
      cells: [{ x: 0, y: 2 }, { x: 1, y: 2 }], 
      description: "In de roze vakjes moeten samen exact 2 ogen ",
      color: 0xff55ff //roze
    },
    { 
      id: "equal_group", type: "equality_group",
      cells: [{ x: 1, y: 3 }, { x: 2, y: 3 }, { x: 2, y: 2 }, { x: 2, y: 1 }], 
      description: "In de blauwe vakjes moeten alle vakjes hetzelfde aantal ogen hebben",
      color: 0x55ffff //lichtblauw
    }
  ];

  //state
  private dominos: Phaser.GameObjects.Container[] = [];
  private gridSlots: GridSlot[] = [];
  private graphics!: Phaser.GameObjects.Graphics;
  private activeDomino: Phaser.GameObjects.Container | null = null;
  private ruleLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  constructor() {
    super("DominoScene");
  }

  init(data: { returnScene?: string }) {
    if (data?.returnScene) this.returnSceneKey = data.returnScene;
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);
    this.add.text(20, 20, "ESC: Terug", { fontSize: "16px", color: "#8fd5ff" });
    this.add.text(width - 250, 20, "Druk op R om een steen te 90 graden te draaien", { fontSize: "16px", color: "#ffffff" });
    this.createGrid(width, height);
    this.createRuleUI();
    this.spawnDominos(height);
    this.input.keyboard?.on("keydown-ESC", () => this.exitScene());
    this.input.keyboard?.on("keydown-R", () => {
        if (this.activeDomino) {
            this.activeDomino.angle += 90;
            this.checkRules();
        }
    });
    this.checkRules();
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

    //standaard outlines
    this.graphics.lineStyle(2, 0x333333);
    this.gridSlots.forEach(slot => {
         this.graphics.strokeRect(slot.pixelX - this.tileSize/2, slot.pixelY - this.tileSize/2, this.tileSize, this.tileSize);
    });

    //gekleurde outlines
    this.rules.forEach(rule => {
        const color = rule.color || 0xffffff;
        this.graphics.lineStyle(4, color, 1); //dikker voor de regels natuurlijk
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
    const x = 20;
    this.add.text(x, y - 25, "Regels:", { fontSize: "18px", color: "#fff", fontStyle: "bold" });
    this.rules.forEach(rule => {
        const colorHex = rule.color ? `#${rule.color.toString(16).padStart(6, '0')}` : "#aaaaaa";
        const txt = this.add.text(x, y, `[ ] ${rule.description}`, { 
            fontSize: "14px", 
            color: colorHex,
            fontStyle: "bold"
        });
        this.add.rectangle(x - 10, y + 7, 8, 8, rule.color).setStrokeStyle(1, 0xffffff);
        this.ruleLabels.set(rule.id, txt);
        y += 30;
    });
  }
  //logica
  private checkRules() {
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
            rule.color ? `#${rule.color.toString(16).padStart(6, '0')}` : "#ffffff";
            //misschien gedimd als het nog niet goed is
            label.setText(`[${passed ? "✔" : " "}] ${rule.description}`);
            label.setAlpha(passed ? 1.0 : 0.7);
        }
        if (!passed) allPassed = false;
    });

    if (allPassed) this.puzzleSolved();
  }

  private puzzleSolved() {
    if (this.registry.get("domino_complete")) return;
    this.registry.set("domino_complete", true);

    const txt = this.add.text(this.scale.width/2, this.scale.height/2, "OPGELOST!", {
        fontSize: "40px", color: "#00ff00", backgroundColor: "#000", padding: { x: 20, y: 20 }
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({ targets: txt, scale: 1.2, duration: 300, yoyo: true });
    this.time.delayedCall(2000, () => this.exitScene());
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
      this.children.bringToTop(obj); this.activeDomino = obj;
      this.tweens.add({ targets: obj, scale: 1.1, duration: 100 });
    });
    this.input.on('drag', (_p: any, obj: any, x: number, y: number) => { obj.x = x; obj.y = y; });
    this.input.on('dragend', (_p: any, obj: any) => {
      this.tweens.add({ targets: obj, scale: 1.0, duration: 100 });
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
    this.scene.start(this.returnSceneKey, { spawnX: this.scale.width/2, spawnY: this.scale.height/2 + 60, cameFromScene: "DominoScene" });
  }
}