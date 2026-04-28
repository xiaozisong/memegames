import { Enemy } from "../entities/Enemy.js";

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export class SpawnSystem {
  constructor(config) {
    this.config = config;
  }

  update(delta, state) {
    if (state.gameOver || state.hasActiveBoss()) return;

    state.spawn.timer -= delta;
    if (state.spawn.timer > 0) return;

    const spawnCount = 1 + Math.floor((state.wave.level - 1) * this.config.wave.enemyCountRamp);
    for (let index = 0; index < spawnCount; index += 1) {
      state.addEnemy(this.createEnemy(state));
    }

    const enemyConfig = this.config.enemy;
    const difficulty = 1 + state.elapsed * enemyConfig.difficultyRamp + (state.wave.level - 1) * 0.16;
    const baseInterval = enemyConfig.baseSpawnInterval / difficulty;
    const nextInterval = Math.max(enemyConfig.spawnIntervalFloor, baseInterval);
    state.spawn.timer = nextInterval * randomBetween(0.82, 1.12);
  }

  createEnemy(state) {
    const enemyConfig = this.config.enemy;
    const worldPadding = this.config.world.padding;
    const progress = Math.min(1, state.elapsed / 50);
    const width = enemyConfig.width * randomBetween(0.88, 1.18);
    const height = enemyConfig.height * randomBetween(0.9, 1.2);
    const waveHealthScale = 1 + Math.max(0, state.wave.level - 1) * (enemyConfig.waveHealthBonus ?? 0);
    const x = randomBetween(worldPadding + width / 2, state.bounds.width - worldPadding - width / 2);
    const speedWaveBoost = 1 + (state.wave.level - 1) * this.config.wave.enemySpeedRamp;
    const speed = randomBetween(enemyConfig.minSpeed, enemyConfig.maxSpeed) * (1 + progress * 0.4) * speedWaveBoost;
    const hue = 340 - Math.round(randomBetween(0, 160));

    return new Enemy({
      x,
      y: -height,
      width,
      height,
      speed,
      driftAmplitude: randomBetween(enemyConfig.driftAmplitudeMin, enemyConfig.driftAmplitudeMax),
      driftFrequency: randomBetween(enemyConfig.driftFrequencyMin, enemyConfig.driftFrequencyMax),
      maxHealth: Math.max(1, Math.round((enemyConfig.baseHealth ?? 1) * randomBetween(0.9, 1.15) * waveHealthScale)),
      contactDamage: enemyConfig.contactDamage ?? 1,
      points: Math.round(randomBetween(enemyConfig.scoreMin, enemyConfig.scoreMax)),
      tint: `hsl(${hue} 90% 65%)`,
      seed: randomBetween(0, Math.PI * 2)
    });
  }
}
