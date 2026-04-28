function isIntersecting(a, b) {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

function damagePlayer(state, amount) {
  if (!state.player) {
    return false;
  }

  const previousHealth = state.player.health;
  const destroyed = state.player.takeDamage(amount);
  if (state.player.health === previousHealth) {
    return false;
  }

  const eventName = destroyed ? "playerDestroyed" : "playerDamaged";
  state.emitEvent(eventName, {
    x: state.player.x,
    y: state.player.y,
    health: state.player.health,
    maxHealth: state.player.maxHealth
  });

  if (destroyed) {
    state.endGame();
  }

  return destroyed;
}

export class CollisionSystem {
  update(state) {
    if (state.gameOver || !state.player) return;

    const playerBullets = state.bullets.filter((bullet) => bullet.owner === "player" && !bullet.isDestroyed);
    const enemyBullets = state.bullets.filter((bullet) => bullet.owner === "enemy" && !bullet.isDestroyed);

    for (let bulletIndex = 0; bulletIndex < playerBullets.length; bulletIndex += 1) {
      const bullet = playerBullets[bulletIndex];

      for (let enemyIndex = 0; enemyIndex < state.enemies.length; enemyIndex += 1) {
        const enemy = state.enemies[enemyIndex];
        if (enemy.isDestroyed) continue;

        if (isIntersecting(bullet.getBounds(), enemy.getBounds())) {
          bullet.isDestroyed = true;
          const destroyed = enemy.takeDamage(bullet.damage);
          if (destroyed) {
            state.addScore(enemy.points);
            state.emitEvent("enemyDestroyed", {
              x: enemy.x,
              y: enemy.y,
              tint: enemy.tint,
              points: enemy.points
            });
          }
          break;
        }
      }
    }

    for (let bulletIndex = 0; bulletIndex < playerBullets.length; bulletIndex += 1) {
      const bullet = playerBullets[bulletIndex];
      if (bullet.isDestroyed) continue;

      for (let bossIndex = 0; bossIndex < state.bosses.length; bossIndex += 1) {
        const boss = state.bosses[bossIndex];
        if (boss.isDestroyed) continue;

        if (isIntersecting(bullet.getBounds(), boss.getBounds())) {
          bullet.isDestroyed = true;
          const destroyed = boss.takeDamage(bullet.damage);
          if (destroyed) {
            state.addScore(boss.points);
            state.emitEvent("bossDestroyed", {
              x: boss.x,
              y: boss.y,
              tint: boss.tint,
              points: boss.points
            });
          }
          break;
        }
      }
    }

    const playerBounds = state.player.getBounds();

    for (let enemyIndex = 0; enemyIndex < state.enemies.length; enemyIndex += 1) {
      const enemy = state.enemies[enemyIndex];
      if (enemy.isDestroyed) continue;

      if (isIntersecting(playerBounds, enemy.getBounds())) {
        enemy.isDestroyed = true;
        state.emitEvent("enemyDestroyed", {
          x: enemy.x,
          y: enemy.y,
          tint: enemy.tint,
          points: enemy.points
        });
        if (damagePlayer(state, enemy.contactDamage ?? 1)) {
          break;
        }
      }
    }

    if (state.gameOver) return;

    for (let bossIndex = 0; bossIndex < state.bosses.length; bossIndex += 1) {
      const boss = state.bosses[bossIndex];
      if (boss.isDestroyed) continue;

      if (isIntersecting(playerBounds, boss.getBounds())) {
        damagePlayer(state, boss.contactDamage ?? 1);
        return;
      }
    }

    for (let bulletIndex = 0; bulletIndex < enemyBullets.length; bulletIndex += 1) {
      const bullet = enemyBullets[bulletIndex];
      if (isIntersecting(playerBounds, bullet.getBounds())) {
        bullet.isDestroyed = true;
        damagePlayer(state, bullet.damage ?? 1);
        return;
      }
    }
  }
}
