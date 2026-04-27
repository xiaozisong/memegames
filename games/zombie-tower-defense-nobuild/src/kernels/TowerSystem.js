export function createTowerSlot(definition, towerConfig) {
  const baseSlot = {
    id: String(definition?.id ?? `slot-${Math.random().toString(36).slice(2, 8)}`),
    x: Number(definition?.x ?? 0),
    y: Number(definition?.y ?? 0),
    built: false,
    level: 0,
    cooldownMs: 0,
  };
  return hydrateTowerSlot(baseSlot, towerConfig);
}

export function purchaseTowerSlot(slot, towerConfig) {
  if (slot.built) {
    return { success: false, reason: "already_built", slot };
  }

  const nextSlot = hydrateTowerSlot(
    {
      ...slot,
      built: true,
      level: 1,
      cooldownMs: 0,
    },
    towerConfig,
  );

  return {
    success: true,
    goldCost: nextSlot.purchaseCost,
    slot: nextSlot,
  };
}

export function upgradeTowerSlot(slot, towerConfig) {
  if (!slot.built) {
    return { success: false, reason: "not_built", slot };
  }
  if (slot.level >= slot.maxLevel) {
    return { success: false, reason: "max_level", slot };
  }

  const goldCost = slot.nextUpgradeCost;
  const nextSlot = hydrateTowerSlot(
    {
      ...slot,
      level: slot.level + 1,
    },
    towerConfig,
  );

  return {
    success: true,
    goldCost,
    slot: nextSlot,
  };
}

export function updateTowers(towerSlots, enemies, deltaMs) {
  const shots = [];
  const nextTowerSlots = [];
  const safeDeltaMs = Math.max(0, Number(deltaMs) || 0);

  for (const tower of towerSlots) {
    if (!tower.built) {
      nextTowerSlots.push({ ...tower });
      continue;
    }

    const cooldownMs = Math.max(0, tower.cooldownMs - safeDeltaMs);
    const target = pickTarget(tower, enemies);

    if (target && cooldownMs <= 0) {
      shots.push({
        towerId: tower.id,
        targetId: target.id,
        x: tower.x,
        y: tower.y,
        damage: tower.damage,
      });
      nextTowerSlots.push({
        ...tower,
        cooldownMs: tower.fireRateMs,
      });
      continue;
    }

    nextTowerSlots.push({
      ...tower,
      cooldownMs,
    });
  }

  return {
    towerSlots: nextTowerSlots,
    shots,
  };
}

export function getBuiltTowers(towerSlots) {
  return towerSlots.filter((slot) => slot.built).map((slot) => ({ ...slot }));
}

function pickTarget(tower, enemies) {
  let bestTarget = null;

  for (const enemy of enemies) {
    if (!bestTarget || enemy.distance > bestTarget.distance) {
      bestTarget = enemy;
    }
  }

  return bestTarget;
}

function hydrateTowerSlot(slot, towerConfig) {
  const built = Boolean(slot?.built);
  const level = built ? Math.max(1, Number(slot?.level ?? 1)) : 0;
  const maxLevel = Math.max(1, Number(towerConfig?.maxLevel ?? 5));
  const purchaseCost = Math.max(1, Number(towerConfig?.purchaseCost ?? 20));
  const damage = built ? Number(towerConfig?.baseDamage ?? 10) + (level - 1) * Number(towerConfig?.damageStep ?? 8) : 0;
  const range = built ? Number(towerConfig?.baseRange ?? 160) + (level - 1) * Number(towerConfig?.rangeStep ?? 12) : 0;
  const baseFireRateMs = Number(towerConfig?.baseFireRateMs ?? 900);
  const fireRateStepMs = Number(towerConfig?.fireRateStepMs ?? 80);
  const minFireRateMs = Number(towerConfig?.minFireRateMs ?? 420);
  const fireRateMs = built ? Math.max(minFireRateMs, baseFireRateMs - (level - 1) * fireRateStepMs) : baseFireRateMs;
  const nextUpgradeCost =
    built && level < maxLevel
      ? Math.max(1, Number(towerConfig?.upgradeBaseCost ?? 25) + (level - 1) * Number(towerConfig?.upgradeCostStep ?? 15))
      : null;

  return {
    id: String(slot?.id ?? ""),
    x: Number(slot?.x ?? 0),
    y: Number(slot?.y ?? 0),
    built,
    level,
    maxLevel,
    cooldownMs: Number(slot?.cooldownMs ?? 0),
    purchaseCost,
    nextUpgradeCost,
    damage,
    range,
    fireRateMs,
  };
}
