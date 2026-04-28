import { Bullet } from "../entities/Bullet.js";
import { Boss } from "../entities/Boss.js";

export class BossSystem {
  constructor(config) {
    this.config = config;
  }

  onRoundStart(state) {
    state.boss.nextSpawnAt = this.config.boss.spawnIntervalSeconds;
    state.boss.totalSpawned = 0;
  }

  update(_delta, state) {
    if (state.gameOver) {
      return;
    }

    if (!state.hasActiveBoss() && state.elapsed >= state.boss.nextSpawnAt) {
      state.addBoss(this.createBoss(state));
      state.boss.totalSpawned += 1;
      state.boss.nextSpawnAt += this.config.boss.spawnIntervalSeconds;
      state.emitEvent("bossSpawned", {
        waveLevel: state.wave.level
      });
    }

    for (const boss of state.bosses) {
      if (!boss.canFire()) continue;
      this.firePattern(boss, state);
      boss.resetAttackCooldown();
    }
  }

  createBoss(state) {
    const waveBoost = 1 + (state.wave.level - 1) * this.config.boss.waveHealthBonus;
    return new Boss({
      x: this.config.world.width / 2,
      y: -this.config.boss.height,
      width: this.config.boss.width,
      height: this.config.boss.height,
      maxHealth: Math.round(this.config.boss.baseHealth * waveBoost),
      speed: this.config.boss.moveSpeed,
      points: this.config.boss.scoreReward,
      tint: "#fb7185",
      bulletSpeed: this.config.boss.bulletSpeed,
      bulletInterval: Math.max(
        this.config.boss.bulletIntervalMin,
        this.config.boss.bulletInterval - (state.wave.level - 1) * 0.05
      ),
      patternInterval: this.config.boss.patternInterval
    });
  }

  firePattern(boss, state) {
    if (boss.patternIndex === 0) {
      const spread = [-0.52, -0.24, 0, 0.24, 0.52];
      spread.forEach((angleFactor) => {
        state.addBullet(
          new Bullet({
            x: boss.x + angleFactor * 36,
            y: boss.y + boss.height * 0.32,
            vx: angleFactor * boss.bulletSpeed,
            vy: boss.bulletSpeed,
            width: 10,
            height: 22,
            color: "#fb7185",
            owner: "enemy",
            damage: 1
          })
        );
      });
      return;
    }

    const playerX = state.player?.x ?? this.config.world.width / 2;
    const dx = playerX - boss.x;
    const distance = Math.max(1, Math.hypot(dx, 260));
    const baseVx = (dx / distance) * boss.bulletSpeed * 0.8;

    [-1, 0, 1].forEach((lane) => {
      state.addBullet(
        new Bullet({
          x: boss.x + lane * 42,
          y: boss.y + boss.height * 0.28,
          vx: baseVx + lane * 36,
          vy: boss.bulletSpeed * 1.08,
          width: 12,
          height: 28,
          color: "#f97316",
          owner: "enemy",
          damage: 1
        })
      );
    });
  }
}
