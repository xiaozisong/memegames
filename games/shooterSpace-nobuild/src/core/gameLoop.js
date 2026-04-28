export class GameLoop {
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.rafId = 0;
    this.lastTime = 0;
    this.running = false;
    this.frame = this.frame.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = window.requestAnimationFrame(this.frame);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    window.cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  frame(timestamp) {
    if (!this.running) return;

    const rawDelta = (timestamp - this.lastTime) / 1000;
    const delta = Math.min(rawDelta || 0, 1 / 20);
    this.lastTime = timestamp;

    this.update(delta, timestamp);
    this.render();

    this.rafId = window.requestAnimationFrame(this.frame);
  }
}
