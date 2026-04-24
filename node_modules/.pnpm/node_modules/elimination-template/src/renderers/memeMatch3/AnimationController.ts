type EaseFn = (t: number) => number;

const easeOutCubic: EaseFn = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack: EaseFn = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export class AnimationController {
  tween(
    durationMs: number,
    update: (progress: number) => void,
    ease: EaseFn = easeOutCubic,
  ): Promise<void> {
    const start = performance.now();
    return new Promise((resolve) => {
      const tick = (now: number) => {
        const raw = Math.min(1, (now - start) / durationMs);
        update(ease(raw));
        if (raw >= 1) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  swap(durationMs: number, update: (progress: number) => void): Promise<void> {
    return this.tween(durationMs, update, easeOutCubic);
  }

  clear(durationMs: number, update: (progress: number) => void): Promise<void> {
    return this.tween(durationMs, update, easeOutCubic);
  }

  drop(durationMs: number, update: (progress: number) => void): Promise<void> {
    return this.tween(durationMs, update, easeOutBack);
  }

  combo(durationMs: number, update: (progress: number) => void): Promise<void> {
    return this.tween(durationMs, update, easeOutBack);
  }
}
