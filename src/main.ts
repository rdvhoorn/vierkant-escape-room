import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import PreloadScene from "./scenes/PreloadScene";
import TitleScene from "./scenes/TitleScene";
import IntroScene from "./scenes/IntroScene";
import FaceTopScene from "./scenes/FaceTopScene";
import FaceBottomScene from "./scenes/FaceBottomScene";

// Puzzle scenes
import ShipFuelScene from "./scenes/puzzles/ShipFuelScene";
import MoreToComeScene from "./scenes/MoreToComeScene";

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: "#0b1020",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: "game",
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [PreloadScene, FaceTopScene, BootScene, TitleScene, IntroScene, FaceBottomScene, ShipFuelScene, MoreToComeScene],
};

new Phaser.Game(config);
