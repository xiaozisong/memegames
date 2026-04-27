import { getPositionOnPath } from "./PathSystem.js";

export function createEnemy(id, waveConfig, enemyConfig, pathRuntime, assetConfig) {
  const distance = 0;
  const spawnX = Number(waveConfig?.spawnPoint?.x ?? getPositionOnPath(pathRuntime, distance).x);
  const spawnY = Number(waveConfig?.spawnPoint?.y ?? getPositionOnPath(pathRuntime, distance).y);
  const targetX = Number(waveConfig?.targetPoint?.x ?? pathRuntime?.points?.at(-1)?.x ?? spawnX);
  const targetY = Number(waveConfig?.targetPoint?.y ?? pathRuntime?.points?.at(-1)?.y ?? spawnY);
  const pathLength = Math.max(1, Math.hypot(targetX - spawnX, targetY - spawnY));
  const enemyTypeKey = String(waveConfig?.enemyTypeKey ?? "level1");
  const typeConfig = enemyConfig?.types?.[enemyTypeKey] ?? {};
  const hpMultiplier = Math.max(0.1, Number(typeConfig?.hpMultiplier ?? 1));
  const damageMultiplier = Math.max(0.1, Number(typeConfig?.damageMultiplier ?? 1));
  const speedMultiplier = Math.max(0.1, Number(typeConfig?.speedMultiplier ?? 1));
  const rewardMultiplier = Math.max(0.1, Number(typeConfig?.rewardMultiplier ?? 1));
  const sizeMultiplier = Math.max(0.1, Number(typeConfig?.sizeMultiplier ?? 1));
  const attackIntervalMs = Number(waveConfig.attackIntervalMs ?? enemyConfig.attackIntervalMs ?? 1000);
  const baseRadius = getEntityRadius(assetConfig, 18);
  return {
    id,
    x: spawnX,
    y: spawnY,
    distance,
    hp: Math.round(Number(waveConfig.enemyHp ?? enemyConfig.baseHp ?? 1) * hpMultiplier),
    maxHp: Math.round(Number(waveConfig.enemyHp ?? enemyConfig.baseHp ?? 1) * hpMultiplier),
    speed: Number(waveConfig.enemySpeed ?? enemyConfig.baseSpeed ?? 60) * speedMultiplier,
    damage: Math.max(1, Math.round(Number(waveConfig.touchDamage ?? enemyConfig.touchDamage ?? 1) * damageMultiplier)),
    rewardGold: Math.max(1, Math.round(Number(waveConfig.enemyReward ?? enemyConfig.rewardGold ?? 0) * rewardMultiplier)),
    attackIntervalMs,
    attackCooldownMs: attackIntervalMs,
    isAttackingBase: false,
    enemyTypeKey,
    assetKey: String(typeConfig?.assetKey ?? ""),
    label: String(typeConfig?.label ?? enemyTypeKey),
    isElite: enemyTypeKey === "level3",
    isBoss: enemyTypeKey === "boss",
    visualScale: sizeMultiplier,
    radius: baseRadius * sizeMultiplier,
    spawnX,
    spawnY,
    targetX,
    targetY,
    pathLength,
    attackX: spawnX,
    attackY: spawnY,
    useAttackSlot: Boolean(waveConfig?.useAttackSlot),
  };
}

export function updateEnemies(enemies, deltaMs, pathRuntime, basePosition) {
  const survivors = [];
  const baseAttacks = [];
  const deltaSeconds = Math.max(0, Number(deltaMs) || 0) / 1000;
  const safeDeltaMs = Math.max(0, Number(deltaMs) || 0);

  for (const enemy of enemies) {
    if (enemy.isAttackingBase) {
      const attackResult = updateBaseAttacker(enemy, safeDeltaMs, basePosition);
      survivors.push(attackResult.enemy);
      baseAttacks.push(...attackResult.baseAttacks);
      continue;
    }

    const totalPathLength = Math.max(1, Number(enemy.pathLength ?? pathRuntime.totalLength ?? 1));
    const stopDistance = enemy.useAttackSlot ? 0 : getEnemyStopDistance(enemy, basePosition);
    const attackStartDistance = enemy.useAttackSlot ? totalPathLength : Math.max(0, totalPathLength - stopDistance);
    const nextDistance = enemy.distance + enemy.speed * deltaSeconds;
    if (nextDistance >= attackStartDistance) {
      const attackPosition = getEnemyPosition(enemy, pathRuntime, attackStartDistance, totalPathLength);
      const attackResult = updateBaseAttacker(
        {
          ...enemy,
          distance: attackStartDistance,
          x: attackPosition.x,
          y: attackPosition.y,
          attackX: attackPosition.x,
          attackY: attackPosition.y,
          isAttackingBase: true,
        },
        safeDeltaMs,
        basePosition,
      );
      survivors.push(attackResult.enemy);
      baseAttacks.push(...attackResult.baseAttacks);
      continue;
    }

    const position = getEnemyPosition(enemy, pathRuntime, nextDistance, totalPathLength);
    survivors.push({
      ...enemy,
      distance: nextDistance,
      x: position.x,
      y: position.y,
    });
  }

  return { enemies: survivors, baseAttacks };
}

function getEnemyPosition(enemy, pathRuntime, distance, totalPathLength) {
  if (
    Number.isFinite(enemy?.spawnX) &&
    Number.isFinite(enemy?.spawnY) &&
    Number.isFinite(enemy?.targetX) &&
    Number.isFinite(enemy?.targetY)
  ) {
    const progress = clamp(distance / totalPathLength, 0, 1);
    return {
      x: enemy.spawnX + (enemy.targetX - enemy.spawnX) * progress,
      y: enemy.spawnY + (enemy.targetY - enemy.spawnY) * progress,
    };
  }

  return getPositionOnPath(pathRuntime, distance);
}

export function applyEnemyDamage(enemies, damageEvents) {
  if (!Array.isArray(damageEvents) || damageEvents.length === 0) {
    return {
      enemies: enemies.map((enemy) => ({ ...enemy })),
      killedEnemies: [],
    };
  }

  const damageByEnemyId = new Map();
  for (const event of damageEvents) {
    const enemyId = String(event?.enemyId ?? "");
    if (!enemyId) continue;
    const damage = Number(event?.damage ?? 0);
    damageByEnemyId.set(enemyId, (damageByEnemyId.get(enemyId) ?? 0) + damage);
  }

  const survivors = [];
  const killedEnemies = [];

  for (const enemy of enemies) {
    const damage = damageByEnemyId.get(enemy.id) ?? 0;
    const hp = enemy.hp - damage;
    if (hp <= 0) {
      killedEnemies.push({ ...enemy, hp: 0 });
      continue;
    }

    survivors.push({
      ...enemy,
      hp,
    });
  }

  return { enemies: survivors, killedEnemies };
}

export function getEntityRadius(assetConfig, fallback) {
  if (typeof assetConfig?.radius === "number") return assetConfig.radius;
  if (typeof assetConfig?.size === "number") return assetConfig.size * 0.5;
  if (typeof assetConfig?.width === "number" && typeof assetConfig?.height === "number") {
    return Math.max(assetConfig.width, assetConfig.height) * 0.5;
  }
  return fallback;
}

function updateBaseAttacker(enemy, deltaMs, basePosition) {
  const baseAttacks = [];
  let cooldownMs = Number(enemy.attackCooldownMs ?? enemy.attackIntervalMs ?? 1000) - deltaMs;
  const intervalMs = Math.max(120, Number(enemy.attackIntervalMs ?? 1000));

  while (cooldownMs <= 0) {
    baseAttacks.push({
      enemyId: enemy.id,
      damage: Number(enemy.damage ?? 0),
    });
    cooldownMs += intervalMs;
  }

  return {
    enemy: {
      ...enemy,
      x: Number(enemy?.attackX ?? enemy.x),
      y: Number(enemy?.attackY ?? enemy.y),
      isAttackingBase: true,
      attackIntervalMs: intervalMs,
      attackCooldownMs: cooldownMs,
    },
    baseAttacks,
  };
}

function getEnemyStopDistance(enemy, basePosition) {
  const enemyRadius = Math.max(0, Number(enemy?.radius ?? 0));
  const baseRadius = Math.max(0, Number(basePosition?.radius ?? 0));
  const padding = 10;
  return enemyRadius + baseRadius + padding;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
