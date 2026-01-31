// Function to create a back button in a Phaser scene
import Phaser from "phaser";

export function createBackButton(
  current_scene: Phaser.Scene,
  next_scene_key?: string,
  next_scene_data?: any,
  next_scene_function?: () => void
) {
    // Simple text button
    const backButton = current_scene.add
      .text(40, 40, "← Terug (ESC)", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
        backgroundColor: undefined,
      })
      .setPadding(10)
      .setInteractive({ useHandCursor: true })
      .setDepth(1000);

    backButton.on("pointerup", () => {
      // Go back to the selection / previous scene
      if (next_scene_function) {
        next_scene_function();
        return;
      }

      current_scene.scene.start(next_scene_key, next_scene_data);
    });

    backButton.on("pointerover", () => {
      backButton.setStyle({ backgroundColor: "#333333" });
    });

    backButton.on("pointerout", () => {
      backButton.setStyle({ backgroundColor: undefined });
    });

    // Add ESC key functionality to go back
    current_scene.input.keyboard?.on("keydown-ESC", () => {
      if (next_scene_function) {
        next_scene_function();
        return;
      }

      current_scene.scene.start(next_scene_key, next_scene_data);
    });

    return backButton;
}