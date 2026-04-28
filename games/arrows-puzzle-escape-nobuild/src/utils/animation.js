export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

export function easeInOutCubic(value) {
  if (value < 0.5) return 4 * value * value * value;
  return 1 - Math.pow(-2 * value + 2, 3) / 2;
}

export async function animate({ duration = 200, easing = easeInOutCubic, onUpdate }) {
  const start = performance.now();
  let previous = start;
  while (true) {
    const now = await nextFrame();
    const elapsed = now - start;
    const delta = now - previous;
    previous = now;
    const progress = Math.min(1, duration <= 0 ? 1 : elapsed / duration);
    onUpdate?.(easing(progress), progress, delta);
    if (progress >= 1) return;
  }
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
