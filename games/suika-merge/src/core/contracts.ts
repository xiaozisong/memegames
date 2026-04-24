export type OverlayState = {
  visible: boolean;
  title: string;
  body: string;
  buttonText: string;
};

export type FruitSnapshot = {
  id: string;
  type: string;
  x: number;
  y: number;
  angle: number;
  radius: number;
  color: string;
};

export type SuikaSnapshot = {
  mode: string;
  world: {
    width: number;
    height: number;
    warningLineY: number;
    spawnY: number;
    spawnXMin: number;
    spawnXMax: number;
    gravity: number;
  };
  state: {
    fruits: FruitSnapshot[];
    score: number;
    nextFruitType: string;
    started: boolean;
    isGameOver: boolean;
    message: string;
    overlay: OverlayState;
  };
};

export type KernelAction =
  | { type: "start_or_restart" }
  | { type: "resize_world"; width: number; height: number }
  | { type: "spawn_fruit"; normalizedX: number }
  | { type: "tick"; deltaMs: number };

export type KernelListener = (snapshot: SuikaSnapshot) => void;

export type GameKernel = {
  id: string;
  subscribe: (listener: KernelListener) => () => void;
  dispatch: (action: KernelAction) => void;
  getSnapshot: () => SuikaSnapshot;
};
