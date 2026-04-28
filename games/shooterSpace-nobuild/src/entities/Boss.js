export class Boss {
  constructor({
    x,
    y,
    width,
    height,
    maxHealth,
    contactDamage = 1,
    speed,
    points,
    tint,
    bulletSpeed,
    bulletInterval,
    patternInterval
  }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.contactDamage = contactDamage;
    this.speed = speed;
    this.points = points;
    this.tint = tint;
    this.bulletSpeed = bulletSpeed;
    this.bulletInterval = bulletInterval;
    this.patternInterval = patternInterval;
    this.attackCooldown = bulletInterval;
    this.patternTimer = patternInterval;
    this.patternIndex = 0;
    this.direction = 1;
    this.enteredArena = false;
    this.isDestroyed = false;
  }

  update(delta, bounds, padding) {
    if (!this.enteredArena) {
      this.y += this.speed * delta;
      if (this.y >= 120) {
        this.y = 120;
        this.enteredArena = true;
      }
    } else {
      this.x += this.direction * this.speed * 0.85 * delta;
      const minX = padding + this.width / 2;
      const maxX = bounds.width - padding - this.width / 2;
      if (this.x <= minX || this.x >= maxX) {
        this.x = Math.max(minX, Math.min(maxX, this.x));
        this.direction *= -1;
      }
    }

    this.attackCooldown -= delta;
    this.patternTimer -= delta;
    if (this.patternTimer <= 0) {
      this.patternTimer += this.patternInterval;
      this.patternIndex = (this.patternIndex + 1) % 2;
    }
  }

  canFire() {
    return this.enteredArena && this.attackCooldown <= 0 && !this.isDestroyed;
  }

  resetAttackCooldown() {
    this.attackCooldown += this.bulletInterval;
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
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
