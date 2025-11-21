// TangramSchildpadScene.ts
import { BaseTangramScene, TangramPieceConfig } from "./BaseTangramPuzzle";

export default class TangramSchildpadScene extends BaseTangramScene {
  constructor() {
    super("TangramSchildpadScene");
  }

  protected getTitleText(): string {
    return "Tangram: Schildpad";
  }

  protected getSubtitleText(): string {
    return "Sleep de stukken op de schaduw. Selecteer en roteer per 45°. Druk op 'Check'.";
  }

  protected getPieceConfigs(
    width: number,
    height: number
  ): TangramPieceConfig[] {
    // Position the turtle a bit to the right & up
    const puzzleCenterX = width * 0.6;
    const puzzleCenterY = height * 0.45;

    return [
      // ==== SHELL: two large triangles making a rotated square ====

      // Large triangle 1 – shell (left/top half)
      {
        type: "largeTri",
        textureKey: "tan_largeTri",
        startX: width * 0.12,
        startY: height * 0.20,
        targetX: puzzleCenterX,
        targetY: puzzleCenterY,
        targetRotation: 45,
        color: 0xc97a2b,
      },

      // Large triangle 2 – shell (right/bottom half)
      {
        type: "largeTri2",
        textureKey: "tan_largeTri",
        startX: width * 0.18,
        startY: height * 0.35,
        targetX: puzzleCenterX,
        targetY: puzzleCenterY + 200,
        targetRotation: 225,
        color: 0x8a4b14,
      },

      // ==== HEAD: square as a diamond on the right ====

      {
        type: "square",
        textureKey: "tan_square",
        startX: width * 0.08,
        startY: height * 0.78,
        targetX: puzzleCenterX + 155,
        targetY: puzzleCenterY + 45,
        targetRotation: 45,               // diamond like in the picture
        color: 0x8a4b14,
      },

      // ==== TAIL: small triangle top-left ====

      {
        type: "smallTri2",
        textureKey: "tan_smallTri",
        startX: width * 0.2,
        startY: height * 0.75,
        targetX: puzzleCenterX - 57,
        targetY: puzzleCenterY + 60,
        targetRotation: 135,              // pointing back/left
        color: 0xf4a634,
      },

      // ==== FRONT LEG: small triangle bottom-left ====

      {
        type: "smallTri1",
        textureKey: "tan_smallTri",
        startX: width * 0.25,
        startY: height * 0.55,
        targetX: puzzleCenterX - 155,
        targetY: puzzleCenterY + 140,
        targetRotation: 315,              // pointing down/left
        color: 0xf4a634,
      },

      // ==== BACK LEG: medium triangle bottom-right ====

      {
        type: "mediumTri",
        textureKey: "tan_mediumTri",
        startX: width * 0.1,
        startY: height * 0.55,
        targetX: puzzleCenterX + 40,
        targetY: puzzleCenterY + 300,
        targetRotation: 225,      
        color: 0xf4a634,
      },

      // ==== TOP-RIGHT LEG: parallelogram up-right ====

      {
        type: "parallelogram",
        textureKey: "tan_parallelogram",
        startX: width * 0.3,
        startY: height * 0.3,
        targetX: puzzleCenterX + 150,
        targetY: puzzleCenterY - 30,
        targetRotation: 135,               // leaning up/right
        color: 0xf4a634,
      },
    ];
  }
}
