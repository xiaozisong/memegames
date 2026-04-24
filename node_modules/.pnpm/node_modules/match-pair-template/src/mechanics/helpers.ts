import { Cell, GemTarget } from "../types";

export const pieceShapes: Record<string, Array<[number, number]>> = {
  single: [[0, 0]],
  line2: [
    [0, 0],
    [0, 1]
  ],
  line3: [
    [0, 0],
    [0, 1],
    [0, 2]
  ],
  L3: [
    [0, 0],
    [1, 0],
    [1, 1]
  ],
  square2: [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1]
  ]
};

export function randomInt(max: number, random: () => number): number {
  return Math.floor(random() * max);
}

export function copyBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

export function pickWeighted(weights: Record<string, number>, random: () => number): string {
  const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
  if (entries.length === 0) return "single";

  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = random() * total;
  for (const [key, weight] of entries) {
    cursor -= weight;
    if (cursor <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

export function chooseGemId(
  getSetting: <T>(path: string, fallback: T) => T,
  random: () => number
): string | null {
  const targets = getSetting<GemTarget[]>("gameplay.objectives.gemTargets", []);
  if (targets.length === 0 || random() > 0.15) return null;
  return targets[randomInt(targets.length, random)]?.id ?? null;
}
