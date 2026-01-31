import Phaser from "phaser";
import { createBackButton } from "../../utils/BackButton";

export default class SudokuScene extends Phaser.Scene {
  private returnSceneKey: string = "Face10Scene";

  private readonly globalScale = 0.85; //sudoku rescale
  private get cellSize() { return 50 * this.globalScale; }
  private get fontSize() { return Math.floor(24 * this.globalScale); }
  private get gridStartX() { return (this.scale.width - (9 * this.cellSize)) / 2 - 50; }
  private get gridStartY() { return (this.scale.height - (9 * this.cellSize)) / 2; }
  private readonly correctCode = ["8", "8", "9", "5"]; //antwoord
  private selectedCell: { r: number; c: number } | null = null;
  private isPopupOpen = false;

  private initialGrid = [
    [0, 6, 0, 9, 3, 0, 7, 0, 0],
    [7, 3, 2, 5, 0, 0, 0, 9, 0],
    [0, 0, 0, 0, 0, 1, 0, 0, 6],
    [0, 0, 0, 7, 0, 0, 2, 0, 0],
    [2, 4, 7, 0, 9, 0, 0, 0, 3],
    [0, 1, 0, 0, 0, 3, 0, 7, 8],
    [8, 0, 0, 0, 4, 9, 6, 0, 0],
    [0, 9, 0, 6, 8, 0, 0, 3, 2],
    [0, 0, 6, 0, 0, 2, 1, 8, 0]
  ];

  private currentGrid: number[][] = [];
  
  private readonly specialCells = [
    { r: 0, c: 5, color: "#00ffff", hex: 0x00ffff, type: "triangle", char: "▲" }, 
    { r: 1, c: 6, color: "#ffff00", hex: 0xffff00, type: "square",   char: "■" }, 
    { r: 3, c: 2, color: "#00ff00", hex: 0x00ff00, type: "circle",   char: "●" }, 
    { r: 7, c: 0, color: "#ff0000", hex: 0xff0000, type: "diamond",  char: "◆" }  
  ];

  private readonly rules = [
    "Vul elk vakje met een cijfer van 1 t/m 9.",
    "Elke rij moet de cijfers 1 t/m 9 bevatten.",
    "Elke kolom moet de cijfers 1 t/m 9 bevatten.",
    "Elk blok van 3x3 moet de cijfers 1 t/m 9 bevatten."
  ];

  private cellTexts: Phaser.GameObjects.Text[][] = [];
  private selectorGraphics!: Phaser.GameObjects.Graphics;
  private popupContainer!: Phaser.GameObjects.Container;
  private codeDOM?: Phaser.GameObjects.DOMElement;

  constructor() {
    super("SudokuScene");
  }

  init(data: { returnScene?: string }) {
    if (data?.returnScene) this.returnSceneKey = data.returnScene;
  }

  create() {
    const { width, height } = this.scale;
    this.currentGrid = this.initialGrid.map(row => [...row]);

    const bg = this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0).setInteractive();
    bg.on('pointerdown', () => {
        if (!this.isPopupOpen) this.deselectCell();
    });

    createBackButton(this, undefined, undefined, () => {
      if (this.isPopupOpen) this.closeCodePopup();
      else this.exitScene();
    });

    this.drawGridVisuals();
    this.createInteractiveZones();
    this.createRuleUI();
    this.selectorGraphics = this.add.graphics();
    
    const uiX = this.gridStartX + (9 * this.cellSize) + 40;
    const uiY = this.gridStartY + 50;

    this.add.text(uiX, uiY, "Klaar met puzzelen?", { fontSize: "18px", color: "#ffffff" });
    
    this.add.text(uiX, uiY + 40, "[ CODE INVOEREN ]", {
        fontSize: "20px", color: "#00ff00", backgroundColor: "#222", padding: { x: 10, y: 10 }
    })
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => this.openCodePopup());
    
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
        if (!this.isPopupOpen) this.handleGridInput(event);
    });
  }

  private createRuleUI() {
    let y = 120;
    const x = 20;
    
    this.add.text(x, y, "Regels:", { 
        fontSize: "22px", 
        color: "#ffffff", 
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 2 
    });
    
    y += 40;

    this.rules.forEach(ruleText => {
        this.add.text(x, y, `- ${ruleText}`, { 
            fontSize: "16px", 
            color: "#eeeeee",
            stroke: "#000000",
            strokeThickness: 2,
            wordWrap: { width: 250 }
        });
        
        y += 50;
    });
  }

  private openCodePopup() {
    if (this.isPopupOpen) return;
    this.isPopupOpen = true;
    this.deselectCell(); 
    
    const { width, height } = this.scale;
    const popupX = width * 0.75; 
    const popupY = height * 0.75;

    this.popupContainer = this.add.container(0, 0).setDepth(2000);
    
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0).setInteractive();
    
    const boxW = 450;
    const boxH = 400; 
    const box = this.add.rectangle(popupX, popupY, boxW, boxH, 0x222222).setStrokeStyle(4, 0x555555);

    const title = this.add.text(popupX, popupY - 140, "VOER DE CODE IN", {
        fontSize: "24px", fontStyle: "bold", color: "#ffffff"
    }).setOrigin(0.5);

    const sub = this.add.text(popupX, popupY - 110, "(Kijk naar de gemarkeerde vakjes)", {
        fontSize: "16px", color: "#cccccc"
    }).setOrigin(0.5);

    this.codeDOM = this.add.dom(popupX, popupY + 20).createFromHTML(`
        <div style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
            
            <div style="display: flex; gap: 15px;">
                ${this.specialCells.map((cell, index) => `
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <span style="color: ${cell.color}; font-size: 24px; margin-bottom: 5px;">${cell.char}</span>
                        
                        <button name="btnUp" data-index="${index}" style="
                            background: transparent; border: none; color: #888; font-size: 20px; cursor: pointer; padding: 0; margin-bottom: 2px;
                        ">▲</button>

                        <input type="text" id="digit${index}" name="codeDigit" data-index="${index}" maxlength="1"
                            style="
                                width: 50px; 
                                height: 50px; 
                                font-size: 30px; 
                                text-align: center; 
                                background: #000; 
                                color: white; 
                                border: 4px solid ${cell.color}; 
                                outline: none;
                                font-weight: bold;
                            "
                        >

                        <button name="btnDown" data-index="${index}" style="
                            background: transparent; border: none; color: #888; font-size: 20px; cursor: pointer; padding: 0; margin-top: 2px;
                        ">▼</button>
                    </div>
                `).join('')}
            </div>

            <div style="display: flex; gap: 20px; margin-top: 10px;">
                <button id="btnCancel" style="padding: 10px 20px; cursor: pointer; background: #555; color: white; border: none; font-size: 16px;">
                    TERUG
                </button>
                <button id="btnCheck" style="padding: 10px 20px; cursor: pointer; background: #3c5a99; color: white; border: none; font-size: 16px; font-weight: bold;">
                    CHECK
                </button>
            </div>
        </div>
    `);


    this.codeDOM.addListener("click");
    this.codeDOM.addListener("input"); 
    this.codeDOM.addListener("keydown");
    this.codeDOM.on("click", (e: any) => {
        if (e.target.id === "btnCheck") this.checkCode();
        if (e.target.id === "btnCancel") this.closeCodePopup();
        if (e.target.name === "btnUp" || e.target.name === "btnDown") {
            const idx = parseInt(e.target.getAttribute("data-index"));
            const inputEl = this.codeDOM?.getChildByID(`digit${idx}`) as HTMLInputElement;
            if (inputEl) {
                let currentVal = parseInt(inputEl.value) || 0;
                if (e.target.name === "btnUp") {
                    currentVal = (currentVal + 1) % 10;
                } else {
                    currentVal = (currentVal - 1 + 10) % 10;
                }
                inputEl.value = currentVal.toString();
            }
        }
    });
    //autojump als typen niet pijlen
    this.codeDOM.on("input", (e: any) => {
        if (e.target.name === "codeDigit") {
            const idx = parseInt(e.target.getAttribute("data-index"));
            const val = e.target.value;
      
            if (val.length === 1 && idx < 3) {
                const nextInput = this.codeDOM?.getChildByID(`digit${idx + 1}`) as HTMLInputElement;
                if (nextInput) nextInput.focus();
            }
        }
    });
    
    this.codeDOM.on("keydown", (e: any) => {
        e.stopPropagation(); 
        if (e.key === "Enter") this.checkCode();
        if (e.key === "Escape") this.closeCodePopup();
    });
    
    const firstInput = this.codeDOM.getChildByID("digit0") as HTMLInputElement;
    if (firstInput) firstInput.focus();

    this.popupContainer.add([overlay, box, title, sub, this.codeDOM]);
  }

  private closeCodePopup() {
    this.isPopupOpen = false;
    if (this.codeDOM) {
        this.codeDOM.destroy();
        this.codeDOM = undefined;
    }
    if (this.popupContainer) {
        this.popupContainer.destroy();
    }
  }

  private checkCode() {
    if (!this.codeDOM) return;

    let enteredCode: string[] = [];
    let inputs: HTMLInputElement[] = [];

    for (let i = 0; i < 4; i++) {
        const el = this.codeDOM.getChildByID(`digit${i}`) as HTMLInputElement;
        if (el) {
            inputs.push(el);
            enteredCode.push(el.value.trim());
        }
    }

    let isCorrect = true;
    for (let i = 0; i < 4; i++) {
        if (enteredCode[i] !== this.correctCode[i]) {
            isCorrect = false;
            inputs[i].style.backgroundColor = "#550000";
        } else {
            inputs[i].style.backgroundColor = "#000000";
        }
    }

    if (isCorrect) {
        this.puzzleSolved();
    } else {
        this.tweens.add({
            targets: this.codeDOM,
            x: this.codeDOM.x + 5,
            duration: 50,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                inputs.forEach(el => el.style.backgroundColor = "#000");
                inputs[0].focus();
            }
        });
    }
  }

  private drawGridVisuals() {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x555555, 1);

    for (const special of this.specialCells) {
      const x = this.gridStartX + special.c * this.cellSize;
      const y = this.gridStartY + special.r * this.cellSize;
      const bg = this.add.rectangle(x, y, this.cellSize, this.cellSize, special.hex);
      bg.setOrigin(0, 0).setAlpha(0.6);

      const symbolGraphics = this.add.graphics();
      const padding = 6;
      const size = this.cellSize * 0.15; 
      const cornerX = x + padding + size; 
      const cornerY = y + padding + size;

      symbolGraphics.lineStyle(2, 0xffffff, 0.9);
      
      switch (special.type) {
        case 'triangle':
            symbolGraphics.strokeTriangle(cornerX, cornerY - size, cornerX + size, cornerY + size, cornerX - size, cornerY + size);
            break;
        case 'square':
            symbolGraphics.strokeRect(cornerX - size, cornerY - size, size * 2, size * 2);
            break;
        case 'circle':
            symbolGraphics.strokeCircle(cornerX, cornerY, size);
            break;
        case 'diamond':
            symbolGraphics.beginPath();
            symbolGraphics.moveTo(cornerX, cornerY - size * 1.3);
            symbolGraphics.lineTo(cornerX + size * 1.3, cornerY);
            symbolGraphics.lineTo(cornerX, cornerY + size * 1.3);
            symbolGraphics.lineTo(cornerX - size * 1.3, cornerY);
            symbolGraphics.closePath();
            symbolGraphics.strokePath();
            break;
      }
    }

    for (let i = 0; i <= 9; i++) {
      const thickness = (i % 3 === 0) ? 3 : 1;
      const color = (i % 3 === 0) ? 0xffffff : 0x888888;
      graphics.lineStyle(thickness, color, 1);
      
      graphics.beginPath();
      graphics.moveTo(this.gridStartX + i * this.cellSize, this.gridStartY);
      graphics.lineTo(this.gridStartX + i * this.cellSize, this.gridStartY + 9 * this.cellSize);
      graphics.strokePath();

      graphics.beginPath();
      graphics.moveTo(this.gridStartX, this.gridStartY + i * this.cellSize);
      graphics.lineTo(this.gridStartX + 9 * this.cellSize, this.gridStartY + i * this.cellSize);
      graphics.strokePath();
    }

    this.cellTexts = [];
    for (let r = 0; r < 9; r++) {
      const rowTexts: Phaser.GameObjects.Text[] = [];
      for (let c = 0; c < 9; c++) {
        const val = this.currentGrid[r][c];
        const isFixed = this.initialGrid[r][c] !== 0;
        
        const x = this.gridStartX + c * this.cellSize + this.cellSize / 2;
        const y = this.gridStartY + r * this.cellSize + this.cellSize / 2;

        const textObj = this.add.text(x, y, val === 0 ? "" : val.toString(), {
          fontFamily: "sans-serif",
          fontSize: `${this.fontSize}px`,
          color: isFixed ? "#ffffff" : "#00ffff", 
          fontStyle: isFixed ? "bold" : "normal"
        }).setOrigin(0.5);

        rowTexts.push(textObj);
      }
      this.cellTexts.push(rowTexts);
    }
  }

  private createInteractiveZones() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const x = this.gridStartX + c * this.cellSize;
        const y = this.gridStartY + r * this.cellSize;
        
        const zone = this.add.zone(x, y, this.cellSize, this.cellSize).setOrigin(0);
        zone.setInteractive({ useHandCursor: true });
        
        zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if (!this.isPopupOpen) {
            pointer.event.stopPropagation();
            this.selectCell(r, c);
          }
        });
      }
    }
  }

  private selectCell(r: number, c: number) {
    this.selectedCell = { r, c };
    this.selectorGraphics.clear();
    this.selectorGraphics.lineStyle(3, 0x00ff00, 1);
    this.selectorGraphics.strokeRect(
      this.gridStartX + c * this.cellSize,
      this.gridStartY + r * this.cellSize,
      this.cellSize,
      this.cellSize
    );
  }

  private deselectCell() {
    this.selectedCell = null;
    this.selectorGraphics.clear();
  }

  private handleGridInput(event: KeyboardEvent) {
    if (!this.selectedCell) return;
    const { r, c } = this.selectedCell;

    if (this.initialGrid[r][c] !== 0) return;

    if (event.key >= "1" && event.key <= "9") {
      this.updateCell(r, c, parseInt(event.key));
    } else if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
      this.updateCell(r, c, 0);
    }
  }

  private updateCell(r: number, c: number, value: number) {
    this.currentGrid[r][c] = value;
    const textObj = this.cellTexts[r][c];
    textObj.setText(value === 0 ? "" : value.toString());
  }

  private puzzleSolved() {
    this.registry.set("sudoku_solved", true);
    this.closeCodePopup();

    const { width, height } = this.scale;
    const successText = this.add.text(width/2, height/2, "VERBINDING HERSTELD", {
        fontSize: "32px", color: "#00ff00", backgroundColor: "#000000", padding: {x:20, y:20}
    }).setOrigin(0.5).setDepth(3000);

    this.tweens.add({
        targets: successText, scale: 1.2, duration: 200, yoyo: true
    });

    this.time.delayedCall(1500, () => this.exitScene());
  }

  private exitScene() {
    if (this.codeDOM) {
        this.codeDOM.destroy();
        this.codeDOM = undefined;
    }
    const spawnX = this.scale.width / 2;
    const spawnY = this.scale.height / 2 + 60;
    this.scene.start(this.returnSceneKey, {
      spawnX, spawnY, cameFromScene: "SudokuScene", entry_from_puzzle: true,
    });
  }
}