import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import PreloadScene from "./scenes/PreloadScene";
import TitleScene from "./scenes/TitleScene";
import IntroScene from "./scenes/IntroScene";
import Face1Scene from "./scenes/face_scenes/Face1Scene";
import Face2Scene from "./scenes/face_scenes/Face2Scene";
import Face3Scene from "./scenes/face_scenes/Face3Scene";
import Face4Scene from "./scenes/face_scenes/Face4Scene";
import Face5Scene from "./scenes/face_scenes/Face5Scene";
import Face6Scene from "./scenes/face_scenes/Face6Scene";
import Face7Scene from "./scenes/face_scenes/Face7Scene";
import Face8Scene from "./scenes/face_scenes/Face8Scene";
import Face9Scene from "./scenes/face_scenes/Face9Scene";
import Face10Scene from "./scenes/face_scenes/Face10Scene";
import Face11Scene from "./scenes/face_scenes/Face11Scene";
import Face12Scene from "./scenes/face_scenes/Face12Scene";

import TangramSchildpadScene from "./scenes/puzzles/tangram/TangramSchildpadScene";

// Puzzle scenes
import ShipFuelScene from "./scenes/puzzles/ShipFuelScene";
import MoreToComeScene from "./scenes/MoreToComeScene";
import PuzzleLogicOneScene from "./scenes/puzzles/PuzzleLogicOneScene";
import PuzzleLogicTwoScene from "./scenes/puzzles/PuzzleLogicTwoScene";

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
  arcade: { gravity: { x: 0, y: 0 }, debug: false },
},

  scene: [
  PreloadScene,
  ShipFuelScene,
  Face1Scene,
  Face2Scene,
  Face3Scene,
  Face4Scene,
  Face5Scene,
  Face6Scene,
  Face7Scene,
  Face8Scene,
  Face9Scene,
  Face10Scene,
  Face11Scene,
  Face12Scene,
  BootScene,
  TitleScene,
  IntroScene,
  MoreToComeScene,
  PuzzleLogicOneScene,
  PuzzleLogicTwoScene,
  TangramSchildpadScene,
],
};

new Phaser.Game(config);
