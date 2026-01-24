# Debug Menu - Plan

## Doel

Snelle test-cycle voor dialogen en puzzels zonder het hele spel te doorlopen.

**Features:**
1. Direct naar elke scene springen
2. Puzzle states togglen (opgelost/niet opgelost)
3. Energie automatisch herberekenen
4. Alleen zichtbaar als `DEBUG = true`

---

## Huidige Puzzle/Reward Structuur

| Puzzel | Registry Key | Sub-flags | Energie |
|--------|--------------|-----------|---------|
| **Tangram** | `tangram_puzzle_solved` | `tangram_kikker_solved`, `tangram_schildpad_solved`, `tangram_krab_solved` | 10 |
| **KVQ** | `kvq_puzzle_solved` | - | 20 |
| **Tower** | `tower_solved` | `logic_tower_0_solved` t/m `logic_tower_4_solved`? | 50 |
| **Slot** | `slot_solved` | - | 10 |
| **Sudoku** | `sudoku_solved` | - | ? |
| **Domino** | `domino_solved`? | - | ? |
| **PhoneBox** | `phonebox_solved` | - | ? |
| **ShipFuel** | `ship_fuel_solved` | - | 50 |
| **StreakMaze** | `streak_maze_solved` | - | ? |

**Regel:** Energie wordt alleen gegeven als de hoofd-flag `true` is. Sub-flags alleen zijn niet genoeg.

---

## UI Ontwerp

```
┌─ DEBUG MENU (F1 to toggle) ──────────────────────────────────┐
│                                                              │
│  SCENES                                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Faces:   [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]    │   │
│  │          [11] [12]                                    │   │
│  │ Puzzles: [Tangram] [KVQ] [Tower] [Sudoku] [Slot]     │   │
│  │          [Domino] [PhoneBox] [ShipFuel] [StreakMaze] │   │
│  │ Other:   [Title] [Cockpit] [EndCredits]              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  PUZZLE STATES                          ENERGIE: 30/100      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │  [ ] Tangram (10 energie)                            │   │
│  │        [x] kikker                                    │   │
│  │        [x] schildpad                                 │   │
│  │        [ ] krab                                      │   │
│  │                                                      │   │
│  │  [x] KVQ (20 energie)                    +20         │   │
│  │  [ ] Tower (50 energie)                              │   │
│  │  [x] Slot (10 energie)                   +10         │   │
│  │  [ ] Sudoku                                          │   │
│  │  [ ] Domino                                          │   │
│  │  [ ] PhoneBox                                        │   │
│  │  [ ] ShipFuel (50 energie)                           │   │
│  │  [ ] StreakMaze                                      │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [Reset All] [Close]                                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Gedrag

### Scene Buttons
- Klik = `this.scene.start("SceneName")`
- Sluit debug menu automatisch

### Puzzle Checkboxes
- **Hoofd-checkbox aan:** Zet main flag + alle sub-flags op `true`
- **Hoofd-checkbox uit:** Zet main flag + alle sub-flags op `false`
- **Sub-checkbox toggle:** Zet alleen die sub-flag, herbereken of main compleet is

### Energie Berekening
```typescript
function recalculateEnergy(): number {
  let total = 0;

  for (const [key, config] of Object.entries(PUZZLE_REWARDS)) {
    const solved = registry.get(config.puzzleSolvedRegistryKey);
    const obtained = registry.get(config.rewardObtainedRegistryKey);

    if (solved && obtained) {
      total += config.rewardEnergy;
    }
  }

  registry.set("energy", total);
  return total;
}
```

### Reset All
- Zet alle puzzle flags op `false`
- Zet energie op `0`

---

## Technische Implementatie

### File: `src/ui/DebugMenu.ts`

```typescript
import Phaser from "phaser";
import { PUZZLE_REWARDS, PuzzleKey } from "../scenes/face_scenes/_FaceConfig";

interface PuzzleState {
  key: PuzzleKey;
  label: string;
  mainFlag: string;
  rewardFlag: string;
  energy: number;
  subFlags?: { flag: string; label: string }[];
}

export class DebugMenu {
  private scene: Phaser.Scene;
  private container?: HTMLDivElement;
  private visible: boolean = false;

  private puzzleStates: PuzzleState[] = [
    {
      key: PuzzleKey.Tangram,
      label: "Tangram",
      mainFlag: "tangram_puzzle_solved",
      rewardFlag: "tangram_puzzle_solved_fuel_obtained",
      energy: 10,
      subFlags: [
        { flag: "tangram_kikker_solved", label: "Kikker" },
        { flag: "tangram_schildpad_solved", label: "Schildpad" },
        { flag: "tangram_krab_solved", label: "Krab" },
      ],
    },
    {
      key: PuzzleKey.KistVanQuadratus,
      label: "KVQ",
      mainFlag: "kvq_puzzle_solved",
      rewardFlag: "kvq_puzzle_solved_fuel_obtained",
      energy: 20,
    },
    // ... etc
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupKeyListener();
  }

  private setupKeyListener() {
    this.scene.input.keyboard?.on("keydown-F1", () => this.toggle());
  }

  toggle() {
    this.visible ? this.hide() : this.show();
  }

  show() {
    this.visible = true;
    this.createDOM();
  }

  hide() {
    this.visible = false;
    this.container?.remove();
    this.container = undefined;
  }

  private createDOM() {
    // Maak HTML overlay
    // ... zie implementatie hieronder
  }

  private goToScene(sceneKey: string) {
    this.hide();
    this.scene.scene.start(sceneKey);
  }

  private togglePuzzle(state: PuzzleState, solved: boolean) {
    const registry = this.scene.registry;

    registry.set(state.mainFlag, solved);
    registry.set(state.rewardFlag, solved);

    if (state.subFlags) {
      for (const sub of state.subFlags) {
        registry.set(sub.flag, solved);
      }
    }

    this.recalculateEnergy();
    this.updateUI();
  }

  private recalculateEnergy() {
    const registry = this.scene.registry;
    let total = 0;

    for (const state of this.puzzleStates) {
      const solved = registry.get(state.mainFlag);
      const obtained = registry.get(state.rewardFlag);

      if (solved && obtained) {
        total += state.energy;
      }
    }

    registry.set("energy", total);
  }
}
```

### Integratie in Scenes

```typescript
// In elke scene die debug support nodig heeft (of in een base class)
import { DebugMenu } from "../ui/DebugMenu";
import { DEBUG } from "../main";

create() {
  if (DEBUG) {
    this.debugMenu = new DebugMenu(this);
  }
}
```

### Of: Globale Singleton

```typescript
// main.ts
if (DEBUG) {
  window.__debugMenu = new DebugMenu(game.scene.scenes[0]);
}
```

---

## Scenes Lijst

### Face Scenes
- Face1Scene t/m Face12Scene

### Puzzle Scenes
- TangramSelectScene, TangramKikkerScene, TangramSchildpadScene, TangramKrabScene
- KVQ: kvq_driehoeken, kvq_som_1, kvq_eieren, kvq_oneven, kvq_fruit, kvq_vierkant, kvq_antwoorden_invullen
- LogicTower, LogicTower_1, LogicTower_2, LogicTower_3, LogicTower_4, LogicTower_5
- SudokuScene
- SlotScene
- DominoScene
- PhoneBoxScene
- ShipFuelScene
- StreakMaze

### Other Scenes
- TitleScene
- CockpitScene
- EndCreditsScene
- PreloadScene
- BootScene

---

## Activeren

```typescript
// main.ts
export const DEBUG = true;  // Zet op false voor release
```

**Sneltoets:** F1

---

## Stappenplan

### Fase 1: Basis (30 min)
- [ ] Maak `src/ui/DebugMenu.ts`
- [ ] Scene selector buttons
- [ ] F1 toggle
- [ ] Basic styling

### Fase 2: Puzzle States (20 min)
- [ ] Checkboxes voor alle puzzels
- [ ] Sub-checkboxes voor Tangram
- [ ] Energie herberekening

### Fase 3: Polish (10 min)
- [ ] Reset All button
- [ ] Energie display
- [ ] Betere styling

---

## Alternatief: Simpele Versie

Als tijd een probleem is, minimale versie:

```typescript
// main.ts - voeg toe aan window voor console access
if (DEBUG) {
  (window as any).debug = {
    goto: (scene: string) => game.scene.start(scene),
    solve: (flag: string) => game.registry.set(flag, true),
    reset: () => { /* clear all flags */ },
    energy: (n: number) => game.registry.set("energy", n),
  };
}

// Gebruik in browser console:
// debug.goto("Face7Scene")
// debug.solve("tangram_puzzle_solved")
```

**Tijd:** 10 minuten

---

## Beslissingen

1. **Volledige UI of console-only?**
2. **F1 of andere toets?** (F1 kan browser help openen)
3. **Per-scene of globaal?**
