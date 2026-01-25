import Phaser from "phaser";
import { PUZZLE_REWARDS, PuzzleKey } from "../scenes/face_scenes/_FaceConfig";

const SCENES = {
  grouped: [
    { face: "Face1Scene", puzzles: [] },
    { face: "Face2Scene", puzzles: ["TangramSelectScene", "TangramKikkerScene", "TangramKrabScene", "TangramSchildpadScene"] },
    { face: "Face3Scene", puzzles: ["StreakMaze"] },
    { face: "Face4Scene", puzzles: ["LogicTower", "LogicTower_1", "LogicTower_2", "LogicTower_3", "LogicTower_4", "LogicTower_5"] },
    { face: "Face5Scene", puzzles: ["kvq_driehoeken", "kvq_som_1"] },
    { face: "Face6Scene", puzzles: ["kvq_eieren", "kvq_oneven"] },
    { face: "Face7Scene", puzzles: ["kvq_antwoorden_invullen"] },
    { face: "Face8Scene", puzzles: ["kvq_vierkant", "kvq_fruit"] },
    { face: "Face9Scene", puzzles: ["PhoneBoxScene"] },
    { face: "Face10Scene", puzzles: ["SudokuScene"] },
    { face: "Face11Scene", puzzles: ["SlotScene"] },
    { face: "Face12Scene", puzzles: ["DominoScene"] },
  ],
  other: ["TitleScene", "EndCreditsScene", "ShipFuelScene"],
  cockpitPhases: [
    { label: "intro", flags: { introDone: false, electricitySolved: false, postPuzzleThoughtsShown: false } },
    { label: "damaged", flags: { introDone: true, electricitySolved: false, postPuzzleThoughtsShown: false } },
    { label: "repaired", flags: { introDone: true, electricitySolved: true, postPuzzleThoughtsShown: false } },
    { label: "repaired (no dialog)", flags: { introDone: true, electricitySolved: true, postPuzzleThoughtsShown: true } },
  ],
};

const PUZZLES = [
  { key: PuzzleKey.ShipFuel, label: "ShipFuel" },       // Cockpit (begin)
  { key: PuzzleKey.Tangram, label: "Tangram" },         // Face2
  { key: PuzzleKey.StreakMaze, label: "StreakMaze" },   // Face3
  { key: PuzzleKey.LogicTower, label: "Tower" },        // Face4
  { key: PuzzleKey.KistVanQuadratus, label: "KVQ" },    // Face5-8
  { key: PuzzleKey.PhoneBox, label: "PhoneBox" },       // Face9
  { key: PuzzleKey.Sudoku, label: "Sudoku" },           // Face10
  { key: PuzzleKey.Slot, label: "Slot" },               // Face11
  { key: PuzzleKey.Domino, label: "Domino" },           // Face12
];

export class DebugMenu {
  private game: Phaser.Game;
  private container?: HTMLDivElement;
  private visible = false;
  private boundSyncCheckboxes: () => void;

  constructor(game: Phaser.Game) {
    this.game = game;
    this.boundSyncCheckboxes = this.syncPuzzleCheckboxes.bind(this);
    this.setupKeyListener();
  }

  private setupKeyListener() {
    window.addEventListener("keydown", (e) => {
      // Backslash (\) to toggle debug menu
      if (e.key === "\\") {
        e.preventDefault();
        this.toggle();
      }
    });
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
    this.registry.events.off("changedata", this.boundSyncCheckboxes);
    this.container?.remove();
    this.container = undefined;
  }

  private get registry() {
    return this.game.registry;
  }

  private get currentScene(): Phaser.Scene | undefined {
    return this.game.scene.getScenes(true)[0];
  }

  private createDOM() {
    if (this.container) return;

    const div = document.createElement("div");
    div.style.cssText = `
      position: fixed; top: 10px; left: 10px; z-index: 99999;
      background: rgba(0,0,0,0.95); color: #fff; padding: 10px;
      font-family: monospace; font-size: 11px; max-height: 90vh;
      overflow-y: auto; border: 2px solid #666; width: 280px;
    `;

    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <b>DEBUG (\\)</b>
        <button id="dbg-close" style="cursor:pointer;">X</button>
      </div>

      <div style="margin-bottom:8px;">
        <b>Scenes:</b>
        <div id="dbg-scenes" style="margin-top:4px;"></div>
      </div>

      <div style="margin-bottom:8px;">
        <b>Cockpit:</b>
        <div id="dbg-cockpit" style="display:flex; flex-wrap:wrap; gap:2px; margin-top:4px;"></div>
      </div>

      <div style="margin-bottom:8px;">
        <b>Other:</b>
        <div id="dbg-other" style="display:flex; flex-wrap:wrap; gap:2px; margin-top:4px;"></div>
      </div>

      <hr style="border-color:#444; margin:8px 0;">

      <div style="margin-bottom:8px;">
        <b>Puzzle States:</b> <span id="dbg-energy" style="color:#0f0;"></span>
        <div id="dbg-states" style="margin-top:6px;"></div>
      </div>

      <hr style="border-color:#444; margin:8px 0;">

      <div style="margin-bottom:8px;">
        <b>Debug Visuals:</b>
        <div id="dbg-visuals" style="margin-top:4px;"></div>
      </div>

      <div style="margin-top:8px;">
        <button id="dbg-reset" style="cursor:pointer;">Reset All</button>
      </div>
    `;

    document.body.appendChild(div);
    this.container = div;

    // Close button
    div.querySelector("#dbg-close")?.addEventListener("click", () => this.hide());

    // Scene buttons (grouped by face)
    this.addGroupedSceneButtons();
    this.addCockpitPhaseButtons();
    this.addSceneButtons("#dbg-other", SCENES.other);

    // Puzzle state checkboxes
    this.addPuzzleStates();

    // Debug visual toggles
    this.addDebugVisualToggles();

    // Reset button
    div.querySelector("#dbg-reset")?.addEventListener("click", () => this.resetAll());

    // Update energy display
    this.updateEnergyDisplay();

    // Listen for registry changes to sync checkboxes
    this.registry.events.on("changedata", this.boundSyncCheckboxes);
  }

  private addGroupedSceneButtons() {
    const container = this.container?.querySelector("#dbg-scenes");
    if (!container) return;

    for (const group of SCENES.grouped) {
      const row = document.createElement("div");
      row.style.cssText = "margin-bottom:4px; display:flex; flex-wrap:wrap; align-items:center; gap:2px;";

      // Face button (bold, white bg)
      const faceBtn = document.createElement("button");
      faceBtn.textContent = group.face.replace("Scene", "");
      faceBtn.style.cssText = "cursor:pointer; padding:2px 4px; font-size:10px; font-weight:bold;";
      faceBtn.addEventListener("click", () => this.goToScene(group.face));
      row.appendChild(faceBtn);

      // Puzzle buttons (smaller, grey bg)
      for (const puzzle of group.puzzles) {
        const btn = document.createElement("button");
        let label = puzzle.replace("Scene", "").replace("Tangram", "Tang").replace("LogicTower", "Tower");
        if (label === "kvq_antwoorden_invullen") label = "KVQ_invullen";
        btn.textContent = label;
        btn.style.cssText = "cursor:pointer; padding:1px 3px; font-size:9px;";
        btn.addEventListener("click", () => this.goToScene(puzzle));
        row.appendChild(btn);
      }

      container.appendChild(row);
    }
  }

  private addCockpitPhaseButtons() {
    const container = this.container?.querySelector("#dbg-cockpit");
    if (!container) return;

    for (const phase of SCENES.cockpitPhases) {
      const btn = document.createElement("button");
      btn.textContent = phase.label;
      btn.style.cssText = "cursor:pointer; padding:2px 4px; font-size:10px; margin:1px;";
      btn.addEventListener("click", () => {
        // Set registry flags for this phase
        this.registry.set("introDone", phase.flags.introDone);
        this.registry.set("electricitySolved", phase.flags.electricitySolved);
        this.registry.set("postPuzzleThoughtsShown", phase.flags.postPuzzleThoughtsShown);
        this.goToScene("CockpitScene");
      });
      container.appendChild(btn);
    }
  }

  private addSceneButtons(selector: string, scenes: string[]) {
    const container = this.container?.querySelector(selector);
    if (!container) return;

    for (const scene of scenes) {
      const btn = document.createElement("button");
      btn.textContent = scene.replace("Scene", "").replace("Tangram", "Tang");
      btn.style.cssText = "cursor:pointer; padding:2px 4px; font-size:10px; margin:1px;";
      btn.addEventListener("click", () => this.goToScene(scene));
      container.appendChild(btn);
    }
  }

  private addPuzzleStates() {
    const container = this.container?.querySelector("#dbg-states");
    if (!container) return;

    for (const puzzle of PUZZLES) {
      const config = PUZZLE_REWARDS[puzzle.key];
      const solved = !!this.registry.get(config.puzzleSolvedRegistryKey);

      const row = document.createElement("div");
      row.style.cssText = "margin:4px 0;";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = solved;
      checkbox.id = `dbg-${puzzle.key}`;
      checkbox.addEventListener("change", () => {
        this.togglePuzzle(puzzle.key, checkbox.checked);
      });

      const label = document.createElement("label");
      label.htmlFor = checkbox.id;
      label.textContent = ` ${puzzle.label} (${config.rewardEnergy} energie)`;
      label.style.cursor = "pointer";

      row.appendChild(checkbox);
      row.appendChild(label);
      container.appendChild(row);
    }
  }

  private syncPuzzleCheckboxes() {
    for (const puzzle of PUZZLES) {
      const config = PUZZLE_REWARDS[puzzle.key];
      const checkbox = this.container?.querySelector(`#dbg-${puzzle.key}`) as HTMLInputElement | null;
      if (checkbox) {
        checkbox.checked = !!this.registry.get(config.puzzleSolvedRegistryKey);
      }
    }
    this.updateEnergyDisplay();
  }

  private addDebugVisualToggles() {
    const container = this.container?.querySelector("#dbg-visuals");
    if (!container) return;

    const showHitboxes = !!this.registry.get("debug_showHitboxes");

    const row = document.createElement("div");
    row.style.cssText = "margin:4px 0;";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = showHitboxes;
    checkbox.id = "dbg-hitboxes";
    checkbox.addEventListener("change", () => {
      this.registry.set("debug_showHitboxes", checkbox.checked);
    });

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = " Show Hitboxes (player + edge zones)";
    label.style.cursor = "pointer";

    row.appendChild(checkbox);
    row.appendChild(label);
    container.appendChild(row);
  }

  private goToScene(sceneKey: string) {
    const current = this.currentScene;
    if (current) {
      current.scene.start(sceneKey);
    }
  }

  private togglePuzzle(key: PuzzleKey, solved: boolean) {
    const config = PUZZLE_REWARDS[key];
    this.registry.set(config.puzzleSolvedRegistryKey, solved);
    this.registry.set(config.rewardObtainedRegistryKey, solved);

    // Special case: Tangram sub-flags
    if (key === PuzzleKey.Tangram) {
      this.registry.set("tangram_kikker_solved", solved);
      this.registry.set("tangram_schildpad_solved", solved);
      this.registry.set("tangram_krab_solved", solved);
    }

    if (solved) {
      // When toggling ON: set energy WITHOUT this puzzle, then play animation to add it
      this.recalculateEnergy(key); // exclude this puzzle

      // Trigger animation on current scene if it supports it
      const scene = this.currentScene as any;
      if (scene?.debugTestRewardAnimation) {
        scene.debugTestRewardAnimation(config.rewardEnergy);
      } else {
        // Fallback: just add energy directly if not on a Face scene
        this.recalculateEnergy();
        this.currentScene?.events.emit("energyChanged", this.registry.get("energy"));
      }

      // Show expected total in debug display (current + this puzzle's reward)
      const expectedTotal = (this.registry.get("energy") ?? 0) + config.rewardEnergy;
      this.updateEnergyDisplay(expectedTotal);
    } else {
      // When toggling OFF: recalculate immediately
      this.recalculateEnergy();
      this.currentScene?.events.emit("energyChanged", this.registry.get("energy"));
      this.updateEnergyDisplay();
    }
  }

  private recalculateEnergy(excludeKey?: PuzzleKey) {
    let total = 0;

    for (const puzzle of PUZZLES) {
      if (excludeKey && puzzle.key === excludeKey) continue; // Skip excluded puzzle
      const config = PUZZLE_REWARDS[puzzle.key];
      const solved = this.registry.get(config.puzzleSolvedRegistryKey);
      const obtained = this.registry.get(config.rewardObtainedRegistryKey);

      if (solved && obtained) {
        total += config.rewardEnergy;
      }
    }

    this.registry.set("energy", total);

    // Emit event so HUD updates immediately
    this.currentScene?.events.emit("energyChanged", total);
  }

  private updateEnergyDisplay(overrideValue?: number) {
    const el = this.container?.querySelector("#dbg-energy");
    if (el) {
      const energy = overrideValue ?? this.registry.get("energy") ?? 0;
      el.textContent = `(${energy} energie)`;
    }
  }

  private resetAll() {
    for (const puzzle of PUZZLES) {
      const config = PUZZLE_REWARDS[puzzle.key];
      this.registry.set(config.puzzleSolvedRegistryKey, false);
      this.registry.set(config.rewardObtainedRegistryKey, false);
    }

    // Tangram sub-flags
    this.registry.set("tangram_kikker_solved", false);
    this.registry.set("tangram_schildpad_solved", false);
    this.registry.set("tangram_krab_solved", false);

    this.registry.set("energy", 0);

    // Emit event so HUD updates immediately
    this.currentScene?.events.emit("energyChanged", 0);

    this.updateEnergyDisplay();

    // Refresh checkboxes
    for (const puzzle of PUZZLES) {
      const checkbox = this.container?.querySelector(`#dbg-${puzzle.key}`) as HTMLInputElement;
      if (checkbox) checkbox.checked = false;
    }
  }

}
