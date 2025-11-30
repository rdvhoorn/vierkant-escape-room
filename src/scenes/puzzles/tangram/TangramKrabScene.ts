// TangramSchildpadScene.ts
import { BaseTangramScene, TangramPieceConfig } from "./BaseTangramPuzzle";

export default class TangramKrabScene extends BaseTangramScene {
  constructor() {
    super("TangramKrabScene");
  }

  protected getTitleText(): string {
    return "Tangram: Krab";
  }

  protected getSubtitleText(): string {
    return ""
  }

  protected onPuzzleSolved(): void {
    // Mark this puzzle solved in the registry
    this.registry.set("tangram_krab_solved", true);

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

      {
        type: "largeTri",
        textureKey: "tan_largeTri",
        targetX: puzzleCenterX+70,
        targetY: puzzleCenterY+130,
        targetRotation: 90,
        color: 0xc97a2b,
      },

      {
        type: "largeTri2",
        textureKey: "tan_largeTri",
        targetX: puzzleCenterX,
        targetY: puzzleCenterY+200,
        targetRotation: 180+90,
        color: 0x8a4b14,
      },

      {
        type: "square",
        textureKey: "tan_square",
        targetX: puzzleCenterX,
        targetY: puzzleCenterY+60,
        targetRotation: 0,
        color: 0x8a4b14,
      },

      {
        type: "smallTri2",
        textureKey: "tan_smallTri",
        targetX: puzzleCenterX+140,
        targetY: puzzleCenterY+270,
        targetRotation: 4*45,
        color: 0xf4a634,
      },

      {
        type: "smallTri1",
        textureKey: "tan_smallTri",
        targetX: puzzleCenterX-140,
        targetY: puzzleCenterY+60,
        targetRotation: 6*45,
        color: 0xf4a634,
      },

      {
        type: "mediumTri",
        textureKey: "tan_mediumTri",
        targetX: puzzleCenterX+140,
        targetY: puzzleCenterY+130,
        targetRotation: 5*45,
        color: 0xf4a634,
      },

      {
        type: "parallelogram",
        textureKey: "tan_parallelogram",
        targetX: puzzleCenterX-105,
        targetY: puzzleCenterY+25,
        targetRotation: 45,
        color: 0xf4a634,
      },
    ];
  }
}
