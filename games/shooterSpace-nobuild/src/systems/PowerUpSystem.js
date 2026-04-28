import { PowerUp } from "../entities/PowerUp.js";

function isIntersecting(a, b) {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

export class PowerUpSystem {
  constructor(config) {
    this.config = config;
  }

  update(_delta, state) {
    if (!state.gameOver) {
      this.spawnDropsFromEvents(state);
      this.handleCollection(state);
    }
  }

  spawnDropsFromEvents(state) {
    const enemyDrops = state.getEvents("enemyDestroyed");
    for (const event of enemyDrops) {
      if (Math.random() > this.config.powerUp.dropChance) continue;
      state.addPowerUp(this.createPowerUp(event.payload.x, event.payload.y));
    }

    const bossDrops = state.getEvents("bossDestroyed");
    for (const event of bossDrops) {
      const count = this.config.powerUp.bossDropCount;
      for (let index = 0; index < count; index += 1) {
        const spreadX = (index - (count - 1) / 2) * 24;
        state.addPowerUp(this.createPowerUp(event.payload.x + spreadX, event.payload.y + 8));
      }
    }
  }

  handleCollection(state) {
    if (!state.player) return;

    const playerBounds = state.player.getBounds();
    for (const powerUp of state.powerUps) {
      if (powerUp.isDestroyed) continue;

      if (isIntersecting(playerBounds, powerUp.getBounds())) {
        powerUp.collect();
        state.upgradeFirepower(powerUp.value);
        state.emitEvent("powerUpCollected", {
          x: powerUp.x,
          y: powerUp.y,
          value: powerUp.value
        });
      }
    }
  }

  createPowerUp(x, y) {
    return new PowerUp({
      x,
      y,
      width: this.config.powerUp.width,
      height: this.config.powerUp.height,
      speed: this.config.powerUp.speed,
      value: this.config.powerUp.value,
      color: this.config.powerUp.color
    });
  }
}
