export class PowerUp {
  constructor({ x, y, width, height, speed, value, color }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = speed;
    this.value = value;
    this.color = color;
    this.elapsed = 0;
    this.isDestroyed = false;
  }

  update(delta, bounds) {
    this.elapsed += delta;
    this.y += this.speed * delta;
    this.x += Math.sin(this.elapsed * 4) * 18 * delta;

    if (this.y - this.height / 2 > bounds.height + 60) {
      this.isDestroyed = true;
    }
  }

  collect() {
    this.isDestroyed = true;
  }

  getBounds() {
    return {
      left: this.x - this.width / 2,
      right: this.x + this.width / 2,
      top: this.y - this.height / 2,
      bottom: this.y + this.height / 2
    };
  }
}
