import Phaser from "phaser";

/**
 * Development helper: Shows scene name in top-left corner
 * Call this in your scene's create() method
 */
export function showSceneName(scene: Phaser.Scene) {
  const sceneName = scene.scene.key;

  scene.add.text(10, 10, `Scene: ${sceneName}`, {
    fontFamily: "monospace",
    fontSize: "14px",
    color: "#00ff00",
    backgroundColor: "#000000",
    padding: { x: 8, y: 4 }
  }).setDepth(10000).setScrollFactor(0);
}
