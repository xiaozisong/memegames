export type PhysicsWorldConfig = {
  gravityY: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
};

export type PhysicsBodyCreateInput = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  restitution: number;
  damping: number;
  ttlMs: number;
  tag: string;
};

export type PhysicsBodySnapshot = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  ttlMs: number;
  tag: string;
};

export type PhysicsEvent =
  | {
      type: "body_bounced";
      bodyId: string;
      energy: number;
      tag: string;
    }
  | {
      type: "body_expired";
      bodyId: string;
      tag: string;
    };

export type PhysicsAdapter = {
  init: (config: PhysicsWorldConfig) => void;
  createBody: (input: PhysicsBodyCreateInput) => string;
  step: (deltaMs: number) => PhysicsEvent[];
  getBodies: () => PhysicsBodySnapshot[];
  removeBody: (id: string) => void;
  clear: () => void;
  destroy: () => void;
};

export type PhysicsPluginConfig = {
  enabled: boolean;
  engine: "matterjs" | "simple2d";
  fixedDeltaMs: number;
  gravityY: number;
  boundsPadding: number;
  placementImpulse: {
    x: number;
    y: number;
    ttlMs: number;
    damping: number;
    restitution: number;
    radius: number;
    mass: number;
  };
  lineClearImpulseMultiplier: number;
  maxBodies: number;
};

export type PhysicsStats = {
  enabled: boolean;
  activeBodyCount: number;
  recentBounceEnergy: number;
  recentExpiredCount: number;
  fixedDeltaMs: number;
};
