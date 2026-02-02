import Phaser from "phaser";
import { getDeviceInfo } from "./deviceInfo";
import { sessionId, getCurrentSceneKey } from "./session";
import { submitAnalytics } from "./telemetryFirestore";
import { PUZZLE_REWARDS, PuzzleKey } from "../scenes/face_scenes/_FaceConfig";

// Known puzzle scene keys (scenes where player is actively solving a puzzle)
const PUZZLE_SCENES = new Set([
  "ShipFuelScene",
  "LogicTower",
  "LogicTower_1",
  "LogicTower_2",
  "LogicTower_3",
  "LogicTower_4",
  "LogicTower_5",
  "SudokuScene",
  "PhoneBoxScene",
  "StreakMaze",
  "SlotScene",
  "DominoScene",
  "kvq_driehoeken",
  "kvq_som_1",
  "kvq_eieren",
  "kvq_oneven",
  "kvq_fruit",
  "kvq_vierkant",
  "kvq_antwoorden_invullen",
  "TangramKikkerScene",
  "TangramKrabScene",
  "TangramSchildpadScene",
  "TangramSelectScene",
]);

// Build a set of all solved-registry-keys from PUZZLE_REWARDS
const SOLVED_KEYS = new Map<string, PuzzleKey>();
for (const [key, config] of Object.entries(PUZZLE_REWARDS)) {
  SOLVED_KEYS.set(config.puzzleSolvedRegistryKey, key as PuzzleKey);
}

type AnalyticsEvent = Record<string, unknown>;

let events: AnalyticsEvent[] = [];
let lastFlushedCount = 0;
let lastScene = "";

// Puzzle timing state
let puzzleStartTime = 0;
let puzzleAccumulatedMs = 0;
let puzzlePaused = false;
let currentPuzzleScene = "";

export function initAnalytics(game: Phaser.Game): void {
  // Snapshot of already-solved puzzles (from BootScene save restore)
  // Any key already true at init should be ignored
  const alreadySolved = new Set<string>();
  for (const config of Object.values(PUZZLE_REWARDS)) {
    if (game.registry.get(config.puzzleSolvedRegistryKey) === true) {
      alreadySolved.add(config.puzzleSolvedRegistryKey);
    }
  }

  // Record session start
  events.push({ type: "session_start", timestamp: Date.now() });

  // Scene change detection (500ms interval)
  setInterval(() => {
    const current = getCurrentSceneKey();
    if (current === lastScene) return;

    const prev = lastScene;
    lastScene = current;

    // Detect puzzle start
    if (PUZZLE_SCENES.has(current) && !PUZZLE_SCENES.has(prev)) {
      currentPuzzleScene = current;
      puzzleStartTime = Date.now();
      puzzleAccumulatedMs = 0;
      puzzlePaused = false;
      events.push({
        type: "puzzle_start",
        puzzle: current,
        timestamp: Date.now(),
      });
    }

    // Detect game complete
    if (current === "EndCreditsScene" && prev !== "EndCreditsScene") {
      const puzzlesSolved: string[] = [];
      for (const [key, config] of Object.entries(PUZZLE_REWARDS)) {
        if (game.registry.get(config.puzzleSolvedRegistryKey) === true) {
          puzzlesSolved.push(key);
        }
      }
      events.push({
        type: "game_complete",
        puzzlesSolved,
        energy: game.registry.get("energy") ?? 0,
        timestamp: Date.now(),
      });
      flush();
    }
  }, 500);

  // Puzzle completion via registry events
  const onSolvedChange = (
    _parent: unknown,
    key: string,
    value: unknown,
  ) => {
    if (!SOLVED_KEYS.has(key)) return;
    if (value !== true) return;
    if (alreadySolved.has(key)) return;

    // Mark as tracked so we don't double-count
    alreadySolved.add(key);

    const duration =
      puzzleAccumulatedMs +
      (puzzlePaused ? 0 : Date.now() - puzzleStartTime);

    const event: Record<string, unknown> = {
      type: "puzzle_complete",
      puzzle: currentPuzzleScene || getCurrentSceneKey(),
      registryKey: key,
      puzzleKey: SOLVED_KEYS.get(key),
      timestamp: Date.now(),
    };
    if (puzzleStartTime > 0) {
      event.approxDurationMs = duration;
    }
    events.push(event);

    flush();
  };

  game.registry.events.on("setdata", onSolvedChange);
  game.registry.events.on("changedata", onSolvedChange);

  // Visibility change: pause/resume timing + flush
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      if (!puzzlePaused && puzzleStartTime > 0) {
        puzzleAccumulatedMs += Date.now() - puzzleStartTime;
        puzzlePaused = true;
      }
      flush();
    } else {
      if (puzzlePaused) {
        puzzleStartTime = Date.now();
        puzzlePaused = false;
      }
    }
  });

  // Flush on page unload (backup for mobile)
  window.addEventListener("beforeunload", () => flush());
}

function flush(): void {
  if (events.length === lastFlushedCount) return; // nothing new
  lastFlushedCount = events.length;

  submitAnalytics({
    sessionId,
    deviceInfo: getDeviceInfo(),
    events: [...events],
  }).catch(() => {});
}
