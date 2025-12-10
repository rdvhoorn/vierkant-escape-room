import FaceBase from "./_FaceBase";
import { getFaceConfig, buildNeighborColorMap } from "./_FaceConfig";

export default class Face3Scene extends FaceBase {
  private entry_from_puzzle: boolean = false;
  private doorDialogHandle?: { start: () => void };

  constructor() { super("Face3Scene"); }

  init(data?: any) {
    super.init(data);
    this.entry_from_puzzle = !!data?.entry_from_puzzle;
  }

  create() {
    console.log("[ENTER]", this.scene.key);
    this.ensureEnergyInitialized(0);

    const cfg = getFaceConfig("Face3Scene");
    const { radius, neighbors, visuals } = cfg;
    const colorMap = buildNeighborColorMap(neighbors);

    this.initStandardFace({
      radius,
      faceTravelTargets: neighbors,
      mainFill: visuals.mainFill,
      neighborFill: visuals.neighborFill ?? visuals.mainFill,
      colorMap,
      edgeTriggerScale: visuals.edgeTriggerScale,
      backgroundColor: visuals.backgroundColor,
      showLabel: visuals.showLabel ?? true,
    });

    this.addDoorNpc();
  }

  private addDoorNpc() {
    const { width, height } = this.scale;
    const layers = this.getFaceLayers();

    const npcWidth = 22;
    const npcHeight = 34;
    const door = this.add.rectangle(width / 2 , height / 2+80, npcWidth, npcHeight, 0x88ff88).setStrokeStyle(2, 0x1f3a1f);
    //positieve width is naar rechts, positive height is omlaag
    layers.actors.add(door);

    const handle = this.createDialogInteraction(door, {
      hitRadius: 30,
      hintText: "Ga door het deurtje: E",
      buildLines: () => {
        const solved = !!this.registry.get("streak_maze_solved");
        if (solved) return ["Het deurtje staat open. Je bent hier al geweest."];
        return [
          "Je staat voor een klein deurtje in de hoge heg.",
          "Het lijkt op slot… of misschien toch niet?",
          "Je bent nieuwsgiereg en gaat naar binnen",
        ];
      },
      onComplete: () => {
        const solved = !!this.registry.get("streak_maze_solved");
        if (!solved) this.scene.start("StreakMaze", { entry_from_face: true });
      },
    });

    this.doorDialogHandle = handle;

    //Debatable; restarts currently now when unfinished (although escape button doesn't work at all yet in the streakmaze)
    if (this.entry_from_puzzle && !this.registry.get("streak_maze_solved")) {
      this.time.delayedCall(50, () => this.doorDialogHandle?.start());
    }
  }

  update(_time: number, delta: number) { this.baseFaceUpdate(delta); }
}

