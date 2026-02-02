import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import PreloadScene from "./scenes/PreloadScene";
import TitleScene from "./scenes/TitleScene";
import CockpitScene from "./scenes/CockpitScene";
import EndCreditsScene from "./scenes/EndCreditsScene";
import IntroScene from "./scenes/IntroTextScene";
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

import KVQDriehoeken from "./scenes/puzzles/kist_van_quadratus/kvq_driehoeken";
import KVQSom1 from "./scenes/puzzles/kist_van_quadratus/kvq_som_1";
import KVQEieren from "./scenes/puzzles/kist_van_quadratus/kvq_eieren";
import KVQOneven from "./scenes/puzzles/kist_van_quadratus/kvq_oneven";
import KVQfruit from "./scenes/puzzles/kist_van_quadratus/kvq_fruit";
import KVQVierkant from "./scenes/puzzles/kist_van_quadratus/kvq_vierkant";
import KVQAntwoordenInvullen from "./scenes/puzzles/kist_van_quadratus/kvq_antwoorden_invullen";

import TangramKikkerScene from "./scenes/puzzles/tangram/TangramKikkerScene";
import TangramKrabScene from "./scenes/puzzles/tangram/TangramKrabScene";
import TangramSchildpadScene from "./scenes/puzzles/tangram/TangramSchildpadScene";
import TangramSelectScene from "./scenes/puzzles/tangram/TangramSelectScene";

// Puzzle scenes
import ShipFuelScene from "./scenes/puzzles/ShipFuelScene";
import StreakMaze from "./scenes/puzzles/StreakMaze";
import LogicTower from "./scenes/puzzles/LogicTower";
import LogicTower_1 from "./scenes/puzzles/LogicTower_1";
import LogicTower_2 from "./scenes/puzzles/LogicTower_2";
import LogicTower_3 from "./scenes/puzzles/LogicTower_3";
import LogicTower_4 from "./scenes/puzzles/LogicTower_4";
import LogicTower_5 from "./scenes/puzzles/LogicTower_5";
import PhoneBoxScene from "./scenes/puzzles/PhoneBoxScene";
import SudokuScene from "./scenes/puzzles/SudokuScene";
import DominoScene from "./scenes/puzzles/DominoScene";
import SlotScene from "./scenes/puzzles/SlotScene";
import { DebugMenu } from "./ui/DebugMenu";
import { initTelemetry } from "./telemetry/session";

// Debug mode - set to false for release
export const DEBUG = false;

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

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
  dom: {
    createContainer: true,
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 0 }, debug: false },  
  },
  render: { pixelArt: true},

  scene: [
  BootScene,
  PreloadScene,
  ShipFuelScene,
  EndCreditsScene,
  IntroScene,
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
  TitleScene,
  CockpitScene,
  KVQDriehoeken,
  KVQSom1,
  KVQEieren,
  KVQOneven,
  KVQVierkant,
  KVQfruit,
  KVQAntwoordenInvullen,
  TangramKikkerScene,
  TangramKrabScene,
  TangramSchildpadScene,
  TangramSelectScene,
  StreakMaze,
  LogicTower,
  LogicTower_1,
  LogicTower_2,
  LogicTower_3,
  LogicTower_4,
  LogicTower_5,
  PhoneBoxScene,
  SudokuScene,
  DominoScene,
  SlotScene,
],
};

const game = new Phaser.Game(config);

// Initialize debug menu (F1 to toggle)
if (DEBUG) {
  new DebugMenu(game);
}

// Initialize telemetry (bug reports, error logging, analytics)
initTelemetry(game);
