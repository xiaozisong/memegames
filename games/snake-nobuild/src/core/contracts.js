/**
 * @typedef {{ x: number, y: number }} Point
 * @typedef {{ id: number, x: number, y: number, radius: number, color: number, phase: number }} FoodParticle
 * @typedef {{
 *   head: Point,
 *   angle: number,
 *   radius: number,
 *   speed: number,
 *   body: Point[],
 *   currentLength: number
 * }} SnakeState
 */

export const GAME_CONTRACTS = {
  renderer: "snake-renderer",
  kernel: "snake-kernel",
};
