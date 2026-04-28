export class Bullet {
  constructor({
    x,
    y,
    vx = 0,
    vy,
    width,
    height,
    color = "#fde047",
    owner = "player",
    damage = 1,
    sprite = "",
    renderStyle = "default",
    glowBlur = 14,
    maxAge = Number.POSITIVE_INFINITY,
    widthGrowth = 0
  }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.width = width;
    this.height = height;
    this.color = color;
    this.owner = owner;
    this.damage = damage;
    this.sprite = sprite;
    this.renderStyle = renderStyle;
    this.glowBlur = glowBlur;
    this.maxAge = maxAge;
    this.widthGrowth = widthGrowth;
    this.age = 0;
    this.rotation = Math.atan2(this.vy, this.vx || 0.0001) + Math.PI / 2;
    this.speed = Math.hypot(this.vx, this.vy);
    this.seed = Math.random() * Math.PI * 2;
    this.waveOffset = 0;
    this.rotateOffset = 0;
    this.trail = [];
    this.trailLength = 0;
    this.spawnIndex = 0;
    this.beforeUpdateHooks = [];
    this.afterUpdateHooks = [];
    this.isDestroyed = false;
  }

  update(delta, bounds, state) {
    this.age += delta;

    for (const hook of this.beforeUpdateHooks) {
      hook(this, delta, state, bounds);
    }

    this.x += this.vx * delta;
    this.y += this.vy * delta;
    this.rotation = Math.atan2(this.vy, this.vx || 0.0001) + Math.PI / 2;

    for (const hook of this.afterUpdateHooks) {
      hook(this, delta, state, bounds);
    }

    if (this.age >= this.maxAge) {
      this.isDestroyed = true;
    }

    if (
      this.y + this.height < -40 ||
      this.y - this.height > bounds.height + 60 ||
      this.x + this.width < -40 ||
      this.x - this.width > bounds.width + 40
    ) {
      this.isDestroyed = true;
    }
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
