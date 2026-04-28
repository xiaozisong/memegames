import { Particle } from "../entities/Particle.js";

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export class ParticleSystem {
  constructor(config) {
    this.config = config;
  }

  update(_delta, state) {
    this.spawnExplosions(state);
  }

  spawnExplosions(state) {
    const enemyDestroyedEvents = state.getEvents("enemyDestroyed");
    enemyDestroyedEvents.forEach((event) => {
      this.spawnExplosion(state, event.payload.x, event.payload.y, event.payload.tint, 12, 180);
    });

    const bossDestroyedEvents = state.getEvents("bossDestroyed");
    bossDestroyedEvents.forEach((event) => {
      this.spawnExplosion(state, event.payload.x, event.payload.y, event.payload.tint, 36, 260);
    });

    const collectEvents = state.getEvents("powerUpCollected");
    collectEvents.forEach((event) => {
      this.spawnExplosion(state, event.payload.x, event.payload.y, "#fde047", 10, 120);
    });

    const playerDamagedEvents = state.getEvents("playerDamaged");
    playerDamagedEvents.forEach((event) => {
      this.spawnExplosion(state, event.payload.x, event.payload.y, "#38bdf8", 10, 110);
    });

    const playerHitEvents = state.getEvents("playerDestroyed");
    playerHitEvents.forEach((event) => {
      this.spawnExplosion(state, event.payload.x, event.payload.y, "#38bdf8", 28, 240);
    });
  }

  spawnExplosion(state, x, y, color, count, speed) {
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + randomBetween(-0.18, 0.18);
      const velocity = randomBetween(speed * 0.35, speed);
      state.addParticle(
        new Particle({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: randomBetween(0.25, 0.6),
          size: randomBetween(2, 6),
          color
        })
      );
    }
  }
}
