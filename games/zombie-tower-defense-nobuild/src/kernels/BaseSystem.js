export function createBaseState(baseConfig) {
  return hydrateEconomyBase(
    {
      x: Number(baseConfig?.x ?? 0),
      y: Number(baseConfig?.y ?? 0),
      level: 1,
      gold: Math.max(0, Number(baseConfig?.startGold ?? 0)),
      goldProgress: 0,
    },
    baseConfig,
  );
}

export function updateBaseEconomy(base, deltaMs, baseConfig) {
  const safeDeltaMs = Math.max(0, Number(deltaMs) || 0);
  const progress = base.goldProgress + (safeDeltaMs / 1000) * base.goldRatePerSecond;
  const goldGained = Math.floor(progress);
  return {
    base: hydrateEconomyBase(
      {
        ...base,
        gold: base.gold + goldGained,
        goldProgress: progress - goldGained,
      },
      baseConfig,
    ),
    goldGained,
  };
}

export function upgradeBase(base, baseConfig) {
  if (base.level >= base.maxLevel) {
    return { success: false, reason: "max_level", base };
  }

  const goldCost = base.nextUpgradeCost;
  const nextLevel = base.level + 1;

  return {
    success: true,
    goldCost,
    base: hydrateEconomyBase(
      {
        ...base,
        level: nextLevel,
        gold: base.gold - goldCost,
      },
      baseConfig,
    ),
  };
}

export function createSubBaseState(subBaseConfig, position) {
  return hydrateGuardBase(
    {
      x: Number(position?.x ?? subBaseConfig?.x ?? 0),
      y: Number(position?.y ?? subBaseConfig?.y ?? 0),
      hp: Math.max(1, Number(subBaseConfig?.maxHp ?? 1)),
      recoveryLockMs: 0,
    },
    subBaseConfig,
  );
}

export function applyEnemyAttacksToBase(base, attackEvents, baseConfig) {
  const damageTaken = attackEvents.reduce((sum, event) => sum + Number(event?.damage ?? 0), 0);
  return {
    base: hydrateGuardBase(
      {
        ...base,
        hp: Math.max(0, base.hp - damageTaken),
        recoveryLockMs: Math.max(0, Number(baseConfig?.regenDelayMs ?? 0)),
      },
      baseConfig,
    ),
    damageTaken,
    hitCount: attackEvents.length,
  };
}

export function isBaseDestroyed(base) {
  return Number(base?.hp ?? 0) <= 0;
}

export function recoverSubBase(base, deltaMs, baseConfig) {
  const safeDeltaMs = Math.max(0, Number(deltaMs) || 0);
  const nextLockMs = Math.max(0, Number(base?.recoveryLockMs ?? 0) - safeDeltaMs);
  if (nextLockMs > 0) {
    return hydrateGuardBase(
      {
        ...base,
        recoveryLockMs: nextLockMs,
      },
      baseConfig,
    );
  }

  const healAmount = (safeDeltaMs / 1000) * Math.max(0, Number(baseConfig?.regenPerSecond ?? 0));
  return hydrateGuardBase(
    {
      ...base,
      hp: Math.min(Number(base?.maxHp ?? 0), Number(base?.hp ?? 0) + healAmount),
      recoveryLockMs: 0,
    },
    baseConfig,
  );
}

function hydrateEconomyBase(base, baseConfig) {
  const level = Math.max(1, Number(base?.level ?? 1));
  const maxLevel = Math.max(1, Number(baseConfig?.maxLevel ?? 5));
  const goldRatePerSecond = getGoldRate(baseConfig, level);
  return {
    x: Number(base?.x ?? 0),
    y: Number(base?.y ?? 0),
    level,
    maxLevel,
    gold: Math.max(0, Number(base?.gold ?? 0)),
    goldProgress: Number(base?.goldProgress ?? 0),
    goldRatePerSecond,
    nextUpgradeCost: level < maxLevel ? getBaseUpgradeCost(baseConfig, level) : null,
  };
}

function hydrateGuardBase(base, baseConfig) {
  const maxHp = Math.max(1, Number(baseConfig?.maxHp ?? 1));
  return {
    x: Number(base?.x ?? 0),
    y: Number(base?.y ?? 0),
    hp: Math.max(0, Math.min(maxHp, Number(base?.hp ?? maxHp))),
    maxHp,
    recoveryLockMs: Math.max(0, Number(base?.recoveryLockMs ?? 0)),
  };
}

function getGoldRate(baseConfig, level) {
  return Math.max(0, Number(baseConfig?.goldPerSecond ?? 0) + (level - 1) * Number(baseConfig?.goldRateUpgradeStep ?? 1));
}

function getBaseUpgradeCost(baseConfig, level) {
  return Math.max(1, Number(baseConfig?.upgradeBaseCost ?? 30) + (level - 1) * Number(baseConfig?.upgradeCostStep ?? 25));
}
