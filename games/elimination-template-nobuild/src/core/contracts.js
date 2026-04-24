/**
 * Runtime contracts for no-build template.
 * Keep this file as documentation + shared shape helpers.
 */

export function createOverlay(title, body, buttonText) {
  return { visible: true, title, body, buttonText };
}
