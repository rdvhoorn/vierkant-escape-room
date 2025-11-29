// TangramSchildpadScene.ts
import { BaseTangramScene, TangramPieceConfig } from "./BaseTangramPuzzle";

export default class TangramKikkerScene extends BaseTangramScene {
  constructor() {
    super("TangramKikkerScene");
  }

  protected getTitleText(): string {
    return "Tangram: Kikker";
  }

  protected getSubtitleText(): string {
    return ""
  }

  protected onPuzzleSolved(): void {
    // Mark this puzzle solved in the registry
    this.registry.set("tangram_kikker_solved", true);

    // Return to the selection scene
    this.scene.start("TangramSelectScene");
  }

  protected getPieceConfigs(
    width: number,
    height: number
  ): TangramPieceConfig[] {
    // Position the frog a bit to the right & up
    const puzzleCenterX = width * 0.6;
    const puzzleCenterY = height * 0.35;

    return [
      // ==== SHELL: two large triangles making a rotated square ====

      // Large triangle 1 – shell (left/top half)
      {
        type: "largeTri",
        textureKey: "tan_largeTri",
        targetX: puzzleCenterX+200,
        targetY: puzzleCenterY+200,
        targetRotation: 3 * 45,
        color: 0xc97a2b,
      },

      // Large triangle 2 – shell (right/bottom half)
      {
        type: "largeTri2",
        textureKey: "tan_largeTri",
        targetX: puzzleCenterX-46,
        targetY: puzzleCenterY+50,
        targetRotation: 7*45,
        color: 0x8a4b14,
      },

      // ==== HEAD: square as a diamond on the right ====

      {
        type: "square",
        textureKey: "tan_square",
        targetX: puzzleCenterX+90,
        targetY: puzzleCenterY-50,
        targetRotation: 0,
        color: 0x8a4b14,
      },

      // ==== TAIL: small triangle top-left ====

      {
        type: "smallTri2",
        textureKey: "tan_smallTri",
        targetX: puzzleCenterX+10,
        targetY: puzzleCenterY+20,
        targetRotation: 180,
        color: 0xf4a634,
      },

      // ==== FRONT LEG: small triangle bottom-left ====

      {
        type: "smallTri1",
        textureKey: "tan_smallTri",
        targetX: puzzleCenterX-60,
        targetY: puzzleCenterY-50,
        targetRotation: 0,
        color: 0xf4a634,
      },

      // ==== BACK LEG: medium triangle bottom-right ====

      {
        type: "mediumTri",
        textureKey: "tan_mediumTri",
        targetX: puzzleCenterX+120,
        targetY: puzzleCenterY+50,
        targetRotation: 3*45,
        color: 0xf4a634,
      },

      // ==== TOP-RIGHT LEG: parallelogram up-right ====

      {
        type: "parallelogram",
        textureKey: "tan_parallelogram",
        targetX: puzzleCenterX+155,
        targetY: puzzleCenterY+249,
        targetRotation: 180,
        color: 0xf4a634,
      },
    ];
  }
}
