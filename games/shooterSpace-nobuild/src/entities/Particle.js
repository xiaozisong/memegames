export class Particle {
  constructor({ x, y, vx, vy, life, size, color, drag = 1.8 }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
    this.drag = drag;
    this.isDestroyed = false;
  }

  update(delta) {
    this.life -= delta;
    if (this.life <= 0) {
      this.isDestroyed = true;
      return;
    }

    const damping = Math.max(0, 1 - this.drag * delta);
    this.vx *= damping;
    this.vy *= damping;
    this.x += this.vx * delta;
    this.y += this.vy * delta;
  }

  get alpha() {
    return Math.max(0, this.life / this.maxLife);
  }
}
