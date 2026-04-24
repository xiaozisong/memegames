/**
 * Runtime contracts for no-build template.
 * Keep this file small and shared between kernel and renderer.
 */

export function createOverlay(title, body, buttonText) {
  return { visible: true, title, body, buttonText };
}
