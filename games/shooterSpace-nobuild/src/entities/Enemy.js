export class Enemy {
  constructor({
    x,
    y,
    width,
    height,
    speed,
    driftAmplitude,
    driftFrequency,
    maxHealth = 1,
    contactDamage = 1,
    points,
    tint,
    seed
  }) {
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.width = width;
    this.height = height;
    this.speed = speed;
    this.driftAmplitude = driftAmplitude;
    this.driftFrequency = driftFrequency;
    this.maxHealth = Math.max(1, maxHealth);
    this.health = this.maxHealth;
    this.contactDamage = Math.max(1, contactDamage);
    this.points = points;
    this.tint = tint;
    this.seed = seed;
    this.isDestroyed = false;
    this.elapsed = 0;
    this.kind = "enemy";
  }

  update(delta, bounds) {
    this.elapsed += delta;
    this.y += this.speed * delta;
    this.x = this.baseX + Math.sin(this.elapsed * this.driftFrequency + this.seed) * this.driftAmplitude;

    const halfWidth = this.width / 2;
    this.x = Math.max(halfWidth, Math.min(bounds.width - halfWidth, this.x));

    if (this.y - this.height / 2 > bounds.height + 80) {
      this.isDestroyed = true;
    }
  }

  takeDamage(amount = 1) {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.isDestroyed = true;
      return true;
    }

    return false;
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
