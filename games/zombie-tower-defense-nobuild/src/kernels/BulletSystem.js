import { getEntityRadius } from "./EnemySystem.js";

export function createBullet(id, shot, bulletConfig, assetConfig) {
  return {
    id,
    x: Number(shot?.x ?? 0),
    y: Number(shot?.y ?? 0),
    targetId: String(shot?.targetId ?? ""),
    damage: Number(shot?.damage ?? 0),
    speed: Number(bulletConfig?.speed ?? 380),
    radius: getEntityRadius(assetConfig, 6),
  };
}

export function updateBullets(bullets, enemies, deltaMs) {
  const enemyById = new Map(enemies.map((enemy) => [enemy.id, enemy]));
  const nextBullets = [];
  const damageEvents = [];
  const deltaSeconds = Math.max(0, Number(deltaMs) || 0) / 1000;

  for (const bullet of bullets) {
    const target = enemyById.get(bullet.targetId);
    if (!target) continue;

    const dx = target.x - bullet.x;
    const dy = target.y - bullet.y;
    const distance = Math.hypot(dx, dy);
    const step = bullet.speed * deltaSeconds;
    const hitDistance = bullet.radius + (target.radius ?? 0);

    if (distance <= Math.max(step, hitDistance)) {
      damageEvents.push({
        enemyId: target.id,
        damage: bullet.damage,
      });
      continue;
    }

    const ratio = distance <= 0 ? 1 : step / distance;
    nextBullets.push({
      ...bullet,
      x: bullet.x + dx * ratio,
      y: bullet.y + dy * ratio,
    });
  }

  return {
    bullets: nextBullets,
    damageEvents,
  };
}
