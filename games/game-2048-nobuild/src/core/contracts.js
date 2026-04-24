/**
 * @typedef {"left" | "right" | "up" | "down"} Direction
 */

/**
 * @typedef {Object} OverlayState
 * @property {boolean} visible
 * @property {"start" | "end"} mode
 * @property {string} title
 * @property {string} body
 * @property {string} buttonText
 */

/**
 * @typedef {Object} Game2048Snapshot
 * @property {number} size
 * @property {number[][]} board
 * @property {number} score
 * @property {number} bestScore
 * @property {boolean} started
 * @property {boolean} gameOver
 * @property {boolean} hasWon
 * @property {string} statusText
 * @property {OverlayState} overlay
 */

export {};
