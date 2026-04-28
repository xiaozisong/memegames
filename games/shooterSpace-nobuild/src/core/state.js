export class GameState {
  constructor(config) {
    this.config = config;
    this.bounds = {
      width: config.world.width,
      height: config.world.height
    };
    this.viewport = {
      canvasWidth: 1,
      canvasHeight: 1,
      scale: 1,
      offsetX: 0,
      offsetY: 0
    };
    this.input = {
      moveLeft: false,
      moveRight: false,
      pointerActive: false,
      pointerX: 0,
      pointerWorldX: config.world.width / 2
    };
    this.restartRequested = false;
    this.player = null;
    this.resetRound();
  }

  resetRound() {
    this.elapsed = 0;
    this.score = 0;
    this.kills = 0;
    this.firepowerLevel = 1;
    this.gameOver = false;
    this.gameOverAt = 0;
    this.backgroundScroll = 0;
    this.bullets = [];
    this.enemies = [];
    this.powerUps = [];
    this.particles = [];
    this.bosses = [];
    this.player = null;
    this.spawn = {
      timer: 0.25
    };
    this.wave = {
      level: 1,
      nextIncreaseAt: this.config.wave.intervalSeconds
    };
    this.boss = {
      nextSpawnAt: this.config.boss.spawnIntervalSeconds,
      totalSpawned: 0
    };
    this.frameEvents = [];
    this.restartRequested = false;
  }

  setPlayer(player) {
    this.player = player;
  }

  setViewport(viewport) {
    this.viewport = viewport;
  }

  addBullet(bullet) {
    this.bullets.push(bullet);
  }

  addEnemy(enemy) {
    this.enemies.push(enemy);
  }

  addBoss(boss) {
    this.bosses.push(boss);
  }

  addPowerUp(powerUp) {
    this.powerUps.push(powerUp);
  }

  addParticle(particle) {
    this.particles.push(particle);
  }

  addScore(value) {
    this.score += value;
    this.kills += 1;
  }

  upgradeFirepower(levels = 1) {
    this.firepowerLevel = Math.min(
      this.firepowerLevel + levels,
      this.config.player.maxFirepowerLevel ?? this.firepowerLevel + levels
    );
  }

  beginFrame() {
    this.frameEvents = [];
  }

  emitEvent(type, payload = {}) {
    this.frameEvents.push({
      type,
      payload
    });
  }

  getEvents(type) {
    return this.frameEvents.filter((event) => event.type === type);
  }

  hasActiveBoss() {
    return this.bosses.some((boss) => !boss.isDestroyed);
  }

  requestRestart() {
    this.restartRequested = true;
  }

  consumeRestart() {
    const requested = this.restartRequested;
    this.restartRequested = false;
    return requested;
  }

  endGame() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.gameOverAt = this.elapsed;
  }

  cleanupDestroyed() {
    this.bullets = this.bullets.filter((bullet) => !bullet.isDestroyed);
    this.enemies = this.enemies.filter((enemy) => !enemy.isDestroyed);
    this.powerUps = this.powerUps.filter((powerUp) => !powerUp.isDestroyed);
    this.particles = this.particles.filter((particle) => !particle.isDestroyed);
    this.bosses = this.bosses.filter((boss) => !boss.isDestroyed);
  }
}
