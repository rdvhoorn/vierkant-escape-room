# DialogManager - Unified Dialog System

## Doel

Eén dialoogsysteem dat consistent werkt in alle scenes:
- Face scenes (planeetvlakken)
- Puzzel scenes (LogicTower, StreakMaze, ShipFuel, etc.)
- Andere scenes (CockpitScene)

## Huidige Situatie

| Scene | Dialoog impl | E-toets | Klik | Tap | Spatie | Mobiel OK? |
|-------|--------------|---------|------|-----|--------|------------|
| FaceBase | eigen | ✅ | ❌ | via I-knop | ❌ | ✅ |
| CockpitScene | eigen | ❌ | ✅ | ✅ | ❌ | ✅ |
| LogicTower 0-1 | eigen | ✅ | ✅ | ✅ | ❌ | ✅ |
| LogicTower_5 | eigen | ✅ | ❌ | ❌ | ❌ | ❌ |
| StreakMaze | eigen | ✅ | ❌ | ❌ | ❌ | ❌ |
| ShipFuelScene | eigen | ❌ | ✅ | ✅ | ✅ | ✅ |

**Problemen:**
- 6 verschillende implementaties
- Inconsistente controls
- StreakMaze en LogicTower_5 broken op mobiel

---

## Nieuwe Architectuur

### File: `src/ui/DialogManager.ts`

```typescript
import Phaser from "phaser";

export interface DialogLine {
  speaker?: string;      // Naam van spreker (optioneel)
  text: string;          // De tekst
  speakerColor?: string; // Kleur voor speaker naam (optioneel)
}

export interface DialogConfig {
  // Styling
  boxColor?: number;           // Default: 0x1b2748
  boxAlpha?: number;           // Default: 0.9
  borderColor?: number;        // Default: 0x3c5a99
  textColor?: string;          // Default: "#e7f3ff"
  fontSize?: string;           // Default: "18px"

  // Positioning
  position?: "bottom" | "center" | "top";  // Default: "bottom"
  marginBottom?: number;       // Default: 80

  // Behavior
  pauseInput?: boolean;        // Pauzeer andere input tijdens dialoog (default: true)
}

export class DialogManager {
  private scene: Phaser.Scene;
  private config: DialogConfig;

  // State
  private active: boolean = false;
  private lines: DialogLine[] = [];
  private currentIndex: number = 0;
  private onComplete?: () => void;

  // UI Elements
  private overlay?: Phaser.GameObjects.Rectangle;
  private box?: Phaser.GameObjects.Graphics;
  private speakerText?: Phaser.GameObjects.Text;
  private dialogText?: Phaser.GameObjects.Text;
  private hintText?: Phaser.GameObjects.Text;

  // Input handlers (voor cleanup)
  private keyE?: Phaser.Input.Keyboard.Key;
  private keySpace?: Phaser.Input.Keyboard.Key;
  private pointerHandler?: () => void;

  constructor(scene: Phaser.Scene, config?: DialogConfig) {
    this.scene = scene;
    this.config = config ?? {};
    this.setupInput();
  }

  /** Start een dialoog */
  show(lines: DialogLine[], onComplete?: () => void): void;

  /** Ga naar volgende regel (of sluit af) */
  advance(): void;

  /** Forceer sluiten */
  close(): void;

  /** Check of dialoog actief is */
  isActive(): boolean;

  /** Cleanup (call in scene shutdown) */
  destroy(): void;

  // Private methods
  private setupInput(): void;
  private createUI(): void;
  private showCurrentLine(): void;
  private cleanupUI(): void;
}
```

---

## Input Handling

De DialogManager luistert naar **alle** volgende inputs:

| Input | Platform | Actie |
|-------|----------|-------|
| E-toets | Desktop | advance() |
| Spatiebalk | Desktop | advance() |
| Klik anywhere | Desktop | advance() |
| Tap anywhere | Mobiel | advance() |

**Implementatie:**

```typescript
private setupInput(): void {
  const kb = this.scene.input.keyboard;

  // Keyboard
  if (kb) {
    this.keyE = kb.addKey("E");
    this.keySpace = kb.addKey("SPACE");

    kb.on("keydown-E", this.handleAdvance, this);
    kb.on("keydown-SPACE", this.handleAdvance, this);
  }

  // Pointer (klik/tap)
  this.pointerHandler = () => this.handleAdvance();
  this.scene.input.on("pointerdown", this.pointerHandler);
}

private handleAdvance(): void {
  if (!this.active) return;
  this.advance();
}
```

---

## UI Layout

```
┌────────────────────────────────────────────────────────────┐
│  Speaker Name                                              │
│  ──────────────────────────────────────────────────────── │
│  Dialog text goes here. This can be multiple lines and    │
│  will wrap automatically based on the box width.          │
│                                                            │
│                                        [Klik om verder] →  │
└────────────────────────────────────────────────────────────┘
```

**Posities:**
- `bottom`: 80px vanaf onderkant (default, voor Face scenes)
- `center`: gecentreerd (voor puzzel intros)
- `top`: 80px vanaf bovenkant

---

## Integratie

### 1. FaceBase

```typescript
// VOOR (in _FaceBase.ts)
protected startDialog(lines: DialogLine[], onComplete?: () => void) {
  // 50+ regels eigen implementatie
}

// NA
import { DialogManager } from "../ui/DialogManager";

export default abstract class FaceBase extends Phaser.Scene {
  protected dialogManager?: DialogManager;

  protected initStandardFace(config: StandardFaceConfig) {
    // ... bestaande code ...
    this.dialogManager = new DialogManager(this, { position: "bottom" });
  }

  protected startDialog(lines: DialogLine[], onComplete?: () => void) {
    this.playerController.setInputEnabled(false);
    this.dialogManager?.show(lines, () => {
      this.playerController.setInputEnabled(true);
      onComplete?.();
    });
  }

  // Bestaande createDialogInteraction blijft werken!
}
```

### 2. LogicTower (en _1, _5)

```typescript
// VOOR
private startDialog(lines: string[]) {
  // eigen implementatie
}

// NA
import { DialogManager } from "../ui/DialogManager";

export default class LogicTower extends Phaser.Scene {
  private dialogManager?: DialogManager;

  create() {
    this.dialogManager = new DialogManager(this, { position: "center" });
    // ...
  }

  private showIntro() {
    this.dialogManager?.show([
      { text: "Een mysterieuze toren..." },
      { text: "Wat zou er binnen zijn?" }
    ], () => {
      this.startPuzzle();
    });
  }
}
```

### 3. StreakMaze

```typescript
// VOOR - BROKEN op mobiel (alleen E-toets)
const keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
keyE.on("down", advanceHandler);

// NA - werkt op desktop EN mobiel
this.dialogManager = new DialogManager(this);
this.dialogManager.show(lines, onComplete);
```

### 4. CockpitScene

```typescript
// VOOR - alleen klik
this.dialogOverlay.on("pointerdown", () => this.advanceDialog());

// NA - E + spatie + klik/tap
this.dialogManager = new DialogManager(this, { position: "center" });
this.dialogManager.show(lines, onClose);
```

### 5. ShipFuelScene

```typescript
// VOOR - klik + spatie (geen E)
this.input.on("pointerdown", () => this.advance());
this.input.keyboard?.on("keydown-SPACE", () => this.advance());

// NA - uniform
this.dialogManager = new DialogManager(this);
this.dialogManager.show(introLines, () => this.startPuzzle());
```

---

## Migratie Stappenplan

### Fase 1: DialogManager maken ✅
- [x] Maak `src/ui/DialogManager.ts`
- [x] Implementeer basis functionaliteit
- [ ] Test standalone

### Fase 2: CockpitScene en FaceBase migreren ✅
- [x] Integreer DialogManager in CockpitScene
- [x] Verwijder oude dialog code uit CockpitScene
- [x] Integreer DialogManager in FaceBase
- [x] Verwijder oude dialog code uit FaceBase
- [ ] Test CockpitScene
- [ ] Test alle Face scenes (2, 3, 4, 7, 9, 10, 12)

### Fase 3: Puzzel scenes migreren (LATER)
- [ ] StreakMaze (prioriteit - broken op mobiel)
- [ ] LogicTower
- [ ] LogicTower_1
- [ ] LogicTower_5 (prioriteit - broken op mobiel)
- [ ] ShipFuelScene

### Fase 4: Cleanup
- [ ] Verwijder dubbele code
- [ ] Test alles op desktop + mobiel

---

## Voordelen

1. **Eén codebase** - bugs fixen op één plek
2. **Consistente UX** - zelfde controls overal
3. **Mobiel support** - automatisch voor alle scenes
4. **Makkelijk uitbreiden** - bijv. typewriter effect, portraits, keuzes
5. **Testbaar** - één class om te testen

---

## Risico's

1. **Regressie** - bestaande dialogen kunnen breken
   - Mitigatie: stap voor stap migreren, testen per scene

2. **Edge cases** - sommige scenes hebben speciale logica
   - Mitigatie: DialogManager flexibel maken met callbacks

3. **Timing** - moet vanavond af
   - Mitigatie: eerst StreakMaze fixen (quick fix), daarna refactor

---

## Alternatief: Quick Fix Eerst

Als tijd een probleem is, kunnen we eerst de **broken scenes fixen** zonder volledige refactor:

```typescript
// StreakMaze - voeg toe:
this.input.on("pointerdown", advanceHandler);

// LogicTower_5 - voeg toe:
this.input.on("pointerdown", () => { if (dialogActive) advance(); });
```

En de volledige DialogManager later implementeren.

---

## Beslissingen

1. ~~Volledige refactor nu? Of quick fixes eerst?~~ → **DialogManager eerst, dan CockpitScene + FaceBase. Puzzels later.**
2. ~~Spatie en Enter toevoegen? Of alleen E + klik/tap?~~ → **E + spatie + klik/tap. Geen Enter.**
3. **Position configureerbaar?** Of altijd bottom? → Te beslissen

