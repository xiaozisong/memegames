export const DIRECTIONS = {
  up: { x: 0, y: -1, rotation: 0 },
  upRight: { x: 1, y: -1, rotation: 45 },
  right: { x: 1, y: 0, rotation: 90 },
  downRight: { x: 1, y: 1, rotation: 135 },
  down: { x: 0, y: 1, rotation: 180 },
  downLeft: { x: -1, y: 1, rotation: 225 },
  left: { x: -1, y: 0, rotation: 270 },
  upLeft: { x: -1, y: -1, rotation: 315 },
};

export function getDirection(direction) {
  return DIRECTIONS[direction] ?? DIRECTIONS.up;
}

export function isDiagonalDirection(direction) {
  const vector = getDirection(direction);
  return vector.x !== 0 && vector.y !== 0;
}

export function listDirections() {
  return Object.keys(DIRECTIONS);
}
