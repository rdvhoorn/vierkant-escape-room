// faceConfig.ts

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

export const FACE_CONFIGS: Record<FaceKey, FaceConfig> = {
  Face1Scene: {
    key: "Face1Scene",
    radius: 180,
    neighbors: [
      "Face2Scene",
      "Face3Scene",
      "Face4Scene",
      "Face5Scene",
      "Face6Scene",
    ],
    visuals: {
      mainFill: 0x1f4a2b,
    },
  },

  Face2Scene: {
    key: "Face2Scene",
    radius: 180,
    neighbors: [
      "Face1Scene",
      "Face3Scene",
      "Face4Scene",
      "Face5Scene",
      "Face6Scene",
    ],
    visuals: {
      mainFill: 0x11315a, // dark blue
    },
  },

  Face3Scene: {
    key: "Face3Scene",
    radius: 180,
    neighbors: [
      "Face1Scene",
      "Face2Scene",
      "Face9Scene",
      "Face4Scene",
      "Face7Scene",
    ],
    visuals: {
      mainFill: 0x1f3b24, // dark green
    },
  },

  Face4Scene: {
    key: "Face4Scene",
    radius: 180,
    neighbors: [
      "Face1Scene",
      "Face3Scene",
      "Face10Scene",
      "Face5Scene",
      "Face9Scene",
    ],
    visuals: {
      mainFill: 0x5a1131, // dark magenta
    },
  },

  Face5Scene: {
    key: "Face5Scene",
    radius: 180,
    neighbors: [
      "Face1Scene",
      "Face4Scene",
      "Face11Scene",
      "Face6Scene",
      "Face10Scene",
    ],
    visuals: {
      mainFill: 0x5a4b11, // olive / brownish
    },
  },

  Face6Scene: {
    key: "Face6Scene",
    radius: 180,
    neighbors: [
      "Face1Scene",
      "Face5Scene",
      "Face8Scene",
      "Face2Scene",
      "Face11Scene",
    ],
    visuals: {
      mainFill: 0x11425a, // teal / cyan-ish
    },
  },

  Face7Scene: {
    key: "Face7Scene",
    radius: 180,
    neighbors: [
      "Face2Scene",
      "Face3Scene",
      "Face9Scene",
      "Face12Scene",
      "Face8Scene",
    ],
    visuals: {
      mainFill: 0x3b115a, // violet
    },
  },

  Face8Scene: {
    key: "Face8Scene",
    radius: 180,
    neighbors: [
      "Face2Scene",
      "Face6Scene",
      "Face11Scene",
      "Face12Scene",
      "Face7Scene",
    ],
    visuals: {
      mainFill: 0x1f2f5a, // indigo
    },
  },

  Face9Scene: {
    key: "Face9Scene",
    radius: 180,
    neighbors: [
      "Face3Scene",
      "Face4Scene",
      "Face10Scene",
      "Face12Scene",
      "Face7Scene",
    ],
    visuals: {
      mainFill: 0x2f5a1f, // green variant
    },
  },

  Face10Scene: {
    key: "Face10Scene",
    radius: 180,
    neighbors: [
      "Face4Scene",
      "Face5Scene",
      "Face11Scene",
      "Face12Scene",
      "Face9Scene",
    ],
    visuals: {
      mainFill: 0x5a2f1f, // reddish brown
    },
  },

  Face11Scene: {
    key: "Face11Scene",
    radius: 180,
    neighbors: [
      "Face6Scene",
      "Face7Scene",
      "Face12Scene",
      "Face10Scene",
      "Face8Scene",
    ],
    visuals: {
      mainFill: 0x1f5a4b, // turquoise
    },
  },

  Face12Scene: {
    key: "Face12Scene",
    radius: 180,
    neighbors: [
      "Face7Scene",
      "Face8Scene",
      "Face9Scene",
      "Face10Scene",
      "Face11Scene",
    ],
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
