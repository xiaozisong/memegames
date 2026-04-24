export const SHAPE_LIBRARY = {
  single: [[0, 0]],
  line2: [
    [0, 0],
    [0, 1],
  ],
  line3: [
    [0, 0],
    [0, 1],
    [0, 2],
  ],
  line4: [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ],
  L: [
    [0, 0],
    [1, 0],
    [1, 1],
  ],
  square: [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  T: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 1],
  ],
};

export const SHAPE_ALIASES = {
  line: "line3",
  square2: "square",
  L3: "L",
  T4: "T",
};

export function normalizeShapeType(type) {
  if (!type) return "single";
  return SHAPE_ALIASES[type] ?? type;
}
