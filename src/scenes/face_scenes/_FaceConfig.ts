// faceConfig.ts

// ============================================================================
// DODECAHEDRON TOPOLOGY
// ============================================================================
// A dodecahedron has 12 pentagonal faces, arranged in a specific topology.
// We define the topology using letters A-L, which can then be mapped to
// Face1Scene-Face12Scene. This separation allows easy rearrangement of
// which puzzle appears on which face without breaking the geometric structure.
//
// Structure:
//   F (top cap)
//   A-E (top pentagon ring)
//   G-K (bottom pentagon ring)
//   L (bottom cap)
// ============================================================================

type TopoFace = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L";

// Correct dodecahedron topology (validated to be symmetric)
const DODECAHEDRON_TOPOLOGY: Record<TopoFace, TopoFace[]> = {
  F: ["A", "B", "C", "D", "E"],
  A: ["F", "B", "E", "K", "G"],
  B: ["F", "C", "A", "G", "H"],
  C: ["F", "D", "B", "H", "I"],
  D: ["F", "E", "C", "I", "J"],
  E: ["F", "A", "D", "J", "K"],
  G: ["A", "B", "H", "K", "L"],
  H: ["B", "C", "I", "G", "L"],
  I: ["C", "D", "J", "H", "L"],
  J: ["D", "E", "K", "I", "L"],
  K: ["E", "A", "G", "J", "L"],
  L: ["K", "G", "H", "I", "J"],
};

// Puzzle keys
export enum PuzzleKey {
  KistVanQuadratus = "kist_van_quadratus",
  Tangram = "tangram",
  ShipFuel = "ship_fuel",
  LogicTower = "logic_tower",
  Slot = "slot",
}

// Constant of puzzle key, reward, and reward obtained key
export const PUZZLE_REWARDS: Record<PuzzleKey, { rewardEnergy: number; rewardObtainedRegistryKey: string; puzzleSolvedRegistryKey: string }> = {
  [PuzzleKey.KistVanQuadratus]: { rewardEnergy: 20, rewardObtainedRegistryKey: "kvq_puzzle_solved_fuel_obtained", puzzleSolvedRegistryKey: "kvq_puzzle_solved" },
  [PuzzleKey.Tangram]: { rewardEnergy: 10, rewardObtainedRegistryKey: "tangram_puzzle_solved_fuel_obtained" , puzzleSolvedRegistryKey: "tangram_puzzle_solved" },
  [PuzzleKey.ShipFuel]: { rewardEnergy: 50, rewardObtainedRegistryKey: "ship_fuel_obtained", puzzleSolvedRegistryKey: "ship_fuel_solved" },
  [PuzzleKey.LogicTower]: { rewardEnergy: 50, rewardObtainedRegistryKey: "tower_reward_obtained", puzzleSolvedRegistryKey: "tower_solved" },
  [PuzzleKey.Slot]: { rewardEnergy: 10, rewardObtainedRegistryKey: "slot_reward_obtained", puzzleSolvedRegistryKey: "slot_solved" },
};

export type FaceKey =
  | "Face1Scene"
  | "Face2Scene"
  | "Face3Scene"
  | "Face4Scene"
  | "Face5Scene"
  | "Face6Scene"
  | "Face7Scene"
  | "Face8Scene"
  | "Face9Scene"
  | "Face10Scene"
  | "Face11Scene"
  | "Face12Scene";

// Mapping from topology letters to actual Face scenes
// You can rearrange this mapping to change which puzzle is on which face
const TOPOLOGY_TO_FACE: Record<TopoFace, FaceKey> = {
  F: "Face1Scene",  // Top cap - starting face
  A: "Face2Scene",  // Top ring
  B: "Face3Scene",
  C: "Face4Scene",
  D: "Face5Scene",
  E: "Face6Scene",
  G: "Face7Scene",  // Bottom ring
  H: "Face8Scene",
  I: "Face9Scene",
  J: "Face10Scene",
  K: "Face11Scene",
  L: "Face12Scene", // Bottom cap
};

// Reverse mapping for lookup
const FACE_TO_TOPOLOGY: Record<FaceKey, TopoFace> = Object.fromEntries(
  Object.entries(TOPOLOGY_TO_FACE).map(([topo, face]) => [face, topo as TopoFace])
) as Record<FaceKey, TopoFace>;

export type FaceNeighbors = (FaceKey | null)[]; // 5 edges, null = no travel

// Resolved visuals (after defaults applied)
export interface FaceVisualConfig {
  mainFill: number;
  neighborFill: number;
  backgroundColor: string;
  edgeTriggerScale: number;
  showLabel: boolean;
}

// In the config table we only specify overrides on top of defaults:
export interface FaceVisualOverrides {
  mainFill: number;
  neighborFill?: number;
  backgroundColor?: string;
  edgeTriggerScale?: number;
  showLabel?: boolean;
}

export interface FaceConfig {
  key: FaceKey;
  radius: number;
  neighbors: FaceNeighbors;
  visuals: FaceVisualOverrides;
}

// --------------------
// Global defaults
// --------------------
const DEFAULT_VISUALS: Omit<FaceVisualConfig, "mainFill" | "neighborFill"> = {
  backgroundColor: "#0b1020",
  edgeTriggerScale: 0.4,
  showLabel: true,
};

// --------------------
// Master config table
// --------------------

// Helper function to compute neighbors from topology
function getNeighborsForFace(faceKey: FaceKey): FaceNeighbors {
  const topoFace = FACE_TO_TOPOLOGY[faceKey];
  const topoNeighbors = DODECAHEDRON_TOPOLOGY[topoFace];
  return topoNeighbors.map(topoN => TOPOLOGY_TO_FACE[topoN]);
}

export const FACE_CONFIGS: Record<FaceKey, FaceConfig> = {
  Face1Scene: {
    key: "Face1Scene",
    radius: 300,
    neighbors: getNeighborsForFace("Face1Scene"),
    visuals: {
      mainFill: 0x1f4a2b,
    },
  },

  Face2Scene: {
    key: "Face2Scene",
    radius: 300,
    neighbors: getNeighborsForFace("Face2Scene"),
    visuals: {
      mainFill: 0x11315a, // dark blue
    },
  },

  Face3Scene: {
    key: "Face3Scene",
    radius: 300,
    neighbors: getNeighborsForFace("Face3Scene"),
    visuals: {
      mainFill: 0x1f3b24, // dark green
    },
  },

  Face4Scene: {
    key: "Face4Scene",
    radius: 300,
    neighbors: getNeighborsForFace("Face4Scene"),
    visuals: {
      mainFill: 0x5a1131, // dark magenta
    },
  },

  Face5Scene: {
    key: "Face5Scene",
    radius: 300,
    neighbors: getNeighborsForFace("Face5Scene"),
    visuals: {
      mainFill: 0x5a4b11, // olive / brownish
    },
  },

  Face6Scene: {
    key: "Face6Scene",
    radius: 300,
    neighbors: getNeighborsForFace("Face6Scene"),
    visuals: {
      mainFill: 0x11425a, // teal / cyan-ish
    },
  },

  Face7Scene: {
    key: "Face7Scene",
    radius: 300,
    neighbors: getNeighborsForFace("Face7Scene"),
    visuals: {
      mainFill: 0x3b115a, // violet
    },
  },

  Face8Scene: {
    key: "Face8Scene",
    radius: 300,
    neighbors: getNeighborsForFace("Face8Scene"),
    visuals: {
      mainFill: 0x1f2f5a, // indigo
    },
  },

  Face9Scene: {
    key: "Face9Scene",
    radius: 300,
    neighbors: getNeighborsForFace("Face9Scene"),
    visuals: {
      mainFill: 0x2f5a1f, // green variant
    },
  },

  Face10Scene: {
    key: "Face10Scene",
    radius: 300,
    neighbors: getNeighborsForFace("Face10Scene"),
    visuals: {
      mainFill: 0x5a2f1f, // reddish brown
    },
  },

  Face11Scene: {
    key: "Face11Scene",
    radius: 300,
    neighbors: getNeighborsForFace("Face11Scene"),
    visuals: {
      mainFill: 0x1f5a4b, // turquoise
    },
  },

  Face12Scene: {
    key: "Face12Scene",
    radius: 300,
    neighbors: getNeighborsForFace("Face12Scene"),
    visuals: {
      mainFill: 0x4b1f5a, // purple
    },
  },
} as const;

// --------------------
// Helpers
// --------------------

/** Get raw config (with overrides only). */
export function getFaceConfig(key: FaceKey): FaceConfig {
  const cfg = FACE_CONFIGS[key];
  if (!cfg) {
    throw new Error(`No FaceConfig found for key: ${key}`);
  }
  return cfg;
}

/** Merge defaults + overrides into a fully-resolved config. */
export function resolveFaceConfig(key: FaceKey): {
  key: FaceKey;
  radius: number;
  neighbors: FaceNeighbors;
  visuals: FaceVisualConfig;
} {
  const base = getFaceConfig(key);
  const ov = base.visuals;

  const mainFill = ov.mainFill;
  const neighborFill = ov.neighborFill ?? mainFill;

  const visuals: FaceVisualConfig = {
    mainFill,
    neighborFill,
    backgroundColor: ov.backgroundColor ?? DEFAULT_VISUALS.backgroundColor,
    edgeTriggerScale: ov.edgeTriggerScale ?? DEFAULT_VISUALS.edgeTriggerScale,
    showLabel: ov.showLabel ?? DEFAULT_VISUALS.showLabel,
  };

  return {
    key: base.key,
    radius: base.radius,
    neighbors: base.neighbors,
    visuals,
  };
}

/**
 * Build a colorMap compatible with FaceBase.initStandardFace:
 * each neighbor face uses that neighbor's resolved mainFill as its color.
 */
export function buildNeighborColorMap(neighbors: FaceNeighbors): Record<string, number> {
  const map: Record<string, number> = {};
  for (const n of neighbors) {
    if (!n) continue;
    const cfg = resolveFaceConfig(n);
    map[n] = cfg.visuals.mainFill;
  }
  return map;
}