import {
  clone,
  getAssetConfig,
  getAudioConfig,
  getBaseConfig,
  getBulletConfig,
  getEnemyConfig,
  getOverlayConfig,
  getPathPoints,
  getSetting,
  getSubBaseConfig,
  getTowerConfig,
  getTowerSlotDefinitions,
  getWaveDefinitions,
} from "../config.js";
import { createOverlay } from "../core/contracts.js";
import {
  applyEnemyAttacksToBase,
  createBaseState,
  createSubBaseState,
  isBaseDestroyed,
  recoverSubBase,
  updateBaseEconomy,
  upgradeBase,
} from "./BaseSystem.js";
import { createBullet, updateBullets } from "./BulletSystem.js";
import { applyEnemyDamage, createEnemy, updateEnemies } from "./EnemySystem.js";
import { createPathRuntime, getPathEndPoint } from "./PathSystem.js";
import { createTowerSlot, getBuiltTowers, purchaseTowerSlot, updateTowers, upgradeTowerSlot } from "./TowerSystem.js";

export class TowerDefenseKernel {
  constructor() {
    this.id = "towerDefense";
    this.listeners = [];
    this.enemySerial = 0;
    this.bulletSerial = 0;

    this.title = getSetting("gameplay_title", "Zombie Tower Defense");
    this.subtitle = getSetting("gameplay_subtitle", "竖版尸潮塔防，购买并升级炮台守住基地。");
    this.world = {
      width: Number(getSetting("world_width", 720)),
      height: Number(getSetting("world_height", 1280)),
      backgroundColor: getSetting("world_background_color", "#0f172a"),
      gridColor: getSetting("world_grid_color", "#1e293b"),
      pathColor: getSetting("world_path_color", "#475569"),
      pathBorderColor: getSetting("world_path_border_color", "#94a3b8"),
      pathWidth: Number(getSetting("world_path_width", 56)),
      accentColor: getSetting("world_accent_color", "#38bdf8"),
      dangerColor: getSetting("world_danger_color", "#fb7185"),
      goldColor: getSetting("world_gold_color", "#facc15"),
      slotColor: getSetting("world_slot_color", "#334155"),
      slotReadyColor: getSetting("world_slot_ready_color", "#1d4ed8"),
    };

    this.assets = {
      background: getAssetConfig("background"),
      enemyLevel1: getAssetConfig("enemyLevel1"),
      enemyLevel2: getAssetConfig("enemyLevel2"),
      enemyLevel3: getAssetConfig("enemyLevel3"),
      bossEnemy: getAssetConfig("bossEnemy"),
      tower: getAssetConfig("tower"),
      bullet: getAssetConfig("bullet"),
      base: getAssetConfig("base"),
      subBase: getAssetConfig("subBase"),
      victory: getAssetConfig("victory"),
    };
    this.audio = getAudioConfig();
    this.overlayConfig = getOverlayConfig();

    this.pathRuntime = createPathRuntime(getPathPoints());
    this.enemyConfig = getEnemyConfig();
    this.bulletConfig = getBulletConfig();
    this.baseConfig = getBaseConfig();
    this.subBaseConfig = getSubBaseConfig();
    this.subBaseRadius = Math.max(
      0,
      Number(this.assets.subBase?.radius ?? (typeof this.assets.subBase?.size === "number" ? this.assets.subBase.size * 0.5 : 30)),
    );
    this.towerConfig = getTowerConfig();
    this.towerSlotDefinitions = getTowerSlotDefinitions();
    this.spawnLanes = normalizeSpawnLanes(clone(getSetting("spawn_lanes", [])), this.pathRuntime);
    this.waves = normalizeWaves(getWaveDefinitions(), this.enemyConfig);

    this.state = this.createInitialState({
      started: false,
      showOverlay: true,
    });
  }

  subscribe(listener) {
    this.listeners.push(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
  }

  dispatch(action) {
    if (!action || typeof action !== "object") return;

    if (action.type === "start_or_restart") {
      this.startOrRestart();
      return;
    }

    if (action.type === "tick") {
      this.tick(action.deltaMs);
      return;
    }

    if (action.type === "purchase_or_upgrade_slot") {
      this.purchaseOrUpgradeSlot(action.slotId);
      return;
    }

    if (action.type === "upgrade_base") {
      this.purchaseOrUpgradeBase();
    }
  }

  getSnapshot() {
    return {
      title: this.title,
      subtitle: this.subtitle,
      world: { ...this.world },
      path: this.pathRuntime.points.map((point) => ({ ...point })),
      assets: clone(this.assets),
      audio: clone(this.audio),
      waves: {
        current: this.waves.length === 0 ? 0 : Math.min(this.state.wave.currentWaveIndex + 1, this.waves.length),
        total: this.waves.length,
        remainingInWave: this.state.wave.remainingInWave,
        totalSpawned: this.state.wave.totalSpawned,
        totalToSpawn: this.state.wave.totalToSpawn,
        intermissionMs: this.state.wave.delayMs,
      },
      state: {
        started: this.state.started,
        isOver: this.state.isOver,
        didWin: this.state.didWin,
        message: this.state.message,
        overlay: { ...this.state.overlay },
        towerSlots: this.state.towerSlots.map((slot) => ({ ...slot })),
        enemies: this.state.enemies.map(({ spawnX, spawnY, targetX, targetY, pathLength, ...enemy }) => ({
          ...enemy,
          spawnX,
          spawnY,
          targetX,
          targetY,
          pathLength,
        })),
        towers: getBuiltTowers(this.state.towerSlots),
        bullets: this.state.bullets.map((bullet) => ({ ...bullet })),
        base: { ...this.state.base },
        subBase: { ...this.state.subBase },
        kills: this.state.kills,
        timeMs: this.state.timeMs,
      },
    };
  }

  startOrRestart() {
    this.enemySerial = 0;
    this.bulletSerial = 0;
    this.state = this.createInitialState({
      started: true,
      showOverlay: false,
    });
    this.setNotice("防线已启动", 1400);
    this.notify();
  }

  tick(deltaMs) {
    if (!this.state.started || this.state.isOver) return;

    const safeDeltaMs = Math.max(0, Math.min(50, Number(deltaMs) || 0));
    if (safeDeltaMs <= 0) return;

    this.state.timeMs += safeDeltaMs;
    this.state.noticeMs = Math.max(0, this.state.noticeMs - safeDeltaMs);

    const economyStep = updateBaseEconomy(this.state.base, safeDeltaMs, this.baseConfig);
    this.state.base = economyStep.base;

    this.advanceWaves(safeDeltaMs);

    const enemyMotion = updateActiveEnemies(this.state.enemies, safeDeltaMs, this.pathRuntime, {
      ...this.state.subBase,
      radius: this.subBaseRadius,
    });
    this.state.enemies = enemyMotion.enemies;

    if (enemyMotion.baseAttacks.length > 0) {
      const attackResult = applyEnemyAttacksToBase(this.state.subBase, enemyMotion.baseAttacks, this.subBaseConfig);
      this.state.subBase = attackResult.base;
      this.setNotice(`副基地被攻击 -${attackResult.damageTaken}`, 1800);
    } else {
      this.state.subBase = recoverSubBase(this.state.subBase, safeDeltaMs, this.subBaseConfig);
    }

    const towerStep = updateTowers(this.state.towerSlots, this.state.enemies, safeDeltaMs);
    this.state.towerSlots = towerStep.towerSlots;
    for (const shot of towerStep.shots) {
      this.state.bullets.push(createBullet(`bullet-${this.bulletSerial++}`, shot, this.bulletConfig, this.assets.bullet));
    }

    const bulletStep = updateBullets(this.state.bullets, this.state.enemies, safeDeltaMs);
    this.state.bullets = bulletStep.bullets;

    const damageResult = applyEnemyDamage(this.state.enemies, bulletStep.damageEvents);
    this.state.enemies = damageResult.enemies;
    this.state.kills += damageResult.killedEnemies.length;
    if (damageResult.killedEnemies.length > 0) {
      this.state.base.gold += damageResult.killedEnemies.reduce((sum, enemy) => sum + Number(enemy.rewardGold ?? 0), 0);
      this.setNotice(`已消灭 ${this.state.kills} 个僵尸`, 1200);
    }

    this.refreshAmbientMessage();

    if (isBaseDestroyed(this.state.subBase)) {
      this.state.isOver = true;
      this.state.didWin = false;
      this.state.overlay = createConfiguredOverlay(this.overlayConfig.defeat, this.overlayConfig.ui, {
        title: "副基地沦陷",
        body: "僵尸摧毁了副基地。点击重新布防。",
        buttonText: "重新开始",
      });
      this.state.overlay.visible = true;
      this.state.message = "防守失败";
      this.notify();
      return;
    }

    if (this.hasClearedAllWaves()) {
      this.state.isOver = true;
      this.state.didWin = true;
      this.state.overlay = createConfiguredOverlay(this.overlayConfig.victory, this.overlayConfig.ui, {
        title: "防守成功",
        body: "所有尸潮已清除，副基地安全。",
        buttonText: "再次挑战",
      });
      this.state.overlay.visible = true;
      this.state.message = "全部波次已清空";
      this.notify();
      return;
    }

    this.notify();
  }

  advanceWaves(deltaMs) {
    if (this.waves.length === 0) {
      this.state.wave.completed = true;
      return;
    }

    let timeBudget = deltaMs;

    while (timeBudget >= 0) {
      const waveState = this.state.wave;
      const waveConfig = this.waves[waveState.currentWaveIndex];

      if (!waveConfig) {
        waveState.completed = true;
        break;
      }

      if (waveState.remainingInWave <= 0) {
        if (waveState.currentWaveIndex >= this.waves.length - 1) {
          waveState.completed = true;
          break;
        }

        if (this.state.enemies.length > 0 || this.state.bullets.length > 0) {
          break;
        }

        if (waveState.delayMs <= 0) {
          waveState.delayMs = waveConfig.delayAfterMs;
        }

        const delaySlice = Math.min(timeBudget, waveState.delayMs);
        waveState.delayMs -= delaySlice;
        timeBudget -= delaySlice;

        if (waveState.delayMs > 0) break;

        waveState.currentWaveIndex += 1;
        waveState.remainingInWave = this.waves[waveState.currentWaveIndex]?.count ?? 0;
        waveState.spawnCooldownMs = 0;
        continue;
      }

      if (waveState.spawnCooldownMs > 0) {
        const cooldownSlice = Math.min(timeBudget, waveState.spawnCooldownMs);
        waveState.spawnCooldownMs -= cooldownSlice;
        timeBudget -= cooldownSlice;
        if (waveState.spawnCooldownMs > 0) break;
      }

      const waveSpawnIndex = waveConfig.count - waveState.remainingInWave;
      const laneIndex = waveState.totalSpawned % this.spawnLanes.length;
      const spawnLane = this.spawnLanes[laneIndex];
      const enemyTypeKey = selectEnemyTypeKey(waveState.currentWaveIndex, this.waves.length, waveConfig.count, waveSpawnIndex);
      const attackTargetPoint = getEnemyAttackTargetPoint(
        this.state.subBase,
        waveSpawnIndex,
        this.spawnLanes.length,
        this.subBaseRadius,
      );
      this.state.enemies.push(
        createEnemy(
          `enemy-${this.enemySerial++}`,
          {
            ...waveConfig,
            enemyTypeKey,
            spawnPoint: spawnLane,
            targetPoint: attackTargetPoint,
            useAttackSlot: true,
          },
          this.enemyConfig,
          this.pathRuntime,
          resolveEnemyAssetConfig(this.assets, this.enemyConfig, enemyTypeKey),
        ),
      );
      waveState.remainingInWave -= 1;
      waveState.totalSpawned += 1;
      waveState.spawnCooldownMs = waveConfig.spawnIntervalMs;

      if (timeBudget <= 0) break;
    }
  }

  hasClearedAllWaves() {
    return (
      this.state.wave.completed &&
      this.state.wave.totalSpawned >= this.state.wave.totalToSpawn &&
      this.state.enemies.length === 0 &&
      this.state.bullets.length === 0
    );
  }

  createInitialState(options) {
    const started = Boolean(options?.started);
    const overlay = createConfiguredOverlay(this.overlayConfig.intro, this.overlayConfig.ui, {
      title: "尸潮来袭",
      body: "点击开始，观察自动炮塔阻止僵尸摧毁副基地。",
      buttonText: "开始防守",
    });
    overlay.visible = Boolean(options?.showOverlay);

    return {
      started,
      isOver: false,
      didWin: false,
      message: started ? "防线已启动" : "点击开始，抵御尸潮。",
      noticeMs: 0,
      overlay,
      enemies: [],
      towerSlots: this.towerSlotDefinitions.map((slot) => createTowerSlot(slot, this.towerConfig)),
      bullets: [],
      base: createBaseState(this.baseConfig),
      subBase: createSubBaseState(this.subBaseConfig, getPathEndPoint(this.pathRuntime)),
      kills: 0,
      timeMs: 0,
      wave: {
        currentWaveIndex: 0,
        remainingInWave: this.waves[0]?.count ?? 0,
        spawnCooldownMs: 0,
        delayMs: 0,
        totalSpawned: 0,
        totalToSpawn: this.waves.reduce((sum, wave) => sum + wave.count, 0),
        completed: this.waves.length === 0,
      },
    };
  }

  purchaseOrUpgradeSlot(slotId) {
    if (!this.state.started || this.state.isOver) return;

    const index = this.state.towerSlots.findIndex((slot) => slot.id === slotId);
    if (index < 0) return;

    const slot = this.state.towerSlots[index];
    const result = slot.built ? upgradeTowerSlot(slot, this.towerConfig) : purchaseTowerSlot(slot, this.towerConfig);

    if (!result.success) {
      if (result.reason === "max_level") {
        this.setNotice("炮台已满级", 1500);
      }
      this.notify();
      return;
    }

    if (this.state.base.gold < result.goldCost) {
      this.setNotice("金币不足", 1500);
      this.notify();
      return;
    }

    this.state.base.gold -= result.goldCost;
    this.state.towerSlots[index] = result.slot;
    this.setNotice(slot.built ? `炮台升级到 Lv.${result.slot.level}` : "已购买炮台", 1600);
    this.notify();
  }

  purchaseOrUpgradeBase() {
    if (!this.state.started || this.state.isOver) return;

    const result = upgradeBase(this.state.base, this.baseConfig);
    if (!result.success) {
      if (result.reason === "max_level") {
        this.setNotice("基地已满级", 1500);
      }
      this.notify();
      return;
    }

    if (this.state.base.gold < result.goldCost) {
      this.setNotice("金币不足", 1500);
      this.notify();
      return;
    }

    this.state.base = result.base;
    this.setNotice(`基地升级到 Lv.${result.base.level}`, 1600);
    this.notify();
  }

  setNotice(message, durationMs = 1200) {
    this.state.message = message;
    this.state.noticeMs = durationMs;
  }

  refreshAmbientMessage() {
    if (this.state.noticeMs > 0) return;
    if (this.state.wave.delayMs > 0) {
      const seconds = Math.max(0, Math.ceil(this.state.wave.delayMs / 100) / 10);
      this.state.message = `第 ${Math.min(this.state.wave.currentWaveIndex + 1, this.waves.length)} 波已结束，${seconds}s 后进入下一波`;
      return;
    }
    if (this.state.enemies.some((enemy) => enemy.isAttackingBase)) {
      this.state.message = "僵尸正在围攻副基地";
      return;
    }
    if (this.state.wave.totalToSpawn <= 0) {
      this.state.message = "等待尸潮";
      return;
    }

    const waveNumber = this.waves.length === 0 ? 0 : Math.min(this.state.wave.currentWaveIndex + 1, this.waves.length);
    this.state.message = `Wave ${waveNumber}/${this.waves.length} | 金币 +${this.state.base.goldRatePerSecond}/s`;
  }

  notify() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}

function normalizeWaves(waves, enemyConfig) {
  if (!Array.isArray(waves) || waves.length === 0) {
    return [
      {
        count: 8,
        spawnIntervalMs: 900,
        enemyHp: Number(enemyConfig?.baseHp ?? 40),
        enemySpeed: Number(enemyConfig?.baseSpeed ?? 68),
        touchDamage: Number(enemyConfig?.touchDamage ?? 1),
        enemyReward: Number(enemyConfig?.rewardGold ?? 0),
        attackIntervalMs: Number(enemyConfig?.attackIntervalMs ?? 1000),
        delayAfterMs: 0,
      },
    ];
  }

  return waves.map((wave) => ({
    count: Math.max(1, Number(wave?.count ?? 1)),
    spawnIntervalMs: Math.max(100, Number(wave?.spawnIntervalMs ?? 900)),
    enemyHp: Math.max(1, Number(wave?.enemyHp ?? enemyConfig?.baseHp ?? 40)),
    enemySpeed: Math.max(10, Number(wave?.enemySpeed ?? enemyConfig?.baseSpeed ?? 68)),
    touchDamage: Math.max(1, Number(wave?.touchDamage ?? enemyConfig?.touchDamage ?? 1)),
    enemyReward: Math.max(0, Number(wave?.enemyReward ?? enemyConfig?.rewardGold ?? 0)),
    attackIntervalMs: Math.max(120, Number(wave?.attackIntervalMs ?? enemyConfig?.attackIntervalMs ?? 1000)),
    delayAfterMs: Math.max(0, Number(wave?.delayAfterMs ?? 0)),
  }));
}

function updateActiveEnemies(enemies, deltaMs, pathRuntime, baseState) {
  return updateEnemies(enemies, deltaMs, pathRuntime, {
    x: baseState?.x ?? 0,
    y: baseState?.y ?? 0,
    radius: Math.max(0, Number(baseState?.radius ?? 0)),
  });
}

function normalizeSpawnLanes(spawnLanes, pathRuntime) {
  const fallback = pathRuntime?.points?.[0] ?? { x: 360, y: 1160 };
  const lanes = Array.isArray(spawnLanes)
    ? spawnLanes
        .map((lane) => ({
          x: Number(lane?.x ?? fallback.x),
          y: Number(lane?.y ?? fallback.y),
        }))
        .filter((lane) => Number.isFinite(lane.x) && Number.isFinite(lane.y))
    : [];

  return lanes.length > 0 ? lanes : [fallback];
}

function selectEnemyTypeKey(waveIndex, totalWaves, waveCount, waveSpawnIndex) {
  const isFinalWave = waveIndex >= totalWaves - 1;
  if (isFinalWave && waveSpawnIndex === Math.floor((Math.max(1, waveCount) - 1) * 0.66)) {
    return "boss";
  }

  if (isFinalWave) {
    const pattern = ["level3", "level2", "level1", "level3", "level2", "level1"];
    return pattern[waveSpawnIndex % pattern.length];
  }

  if (waveIndex <= 1) return "level1";
  if (waveIndex <= 3) return waveSpawnIndex % 4 === 3 ? "level2" : "level1";
  if (waveIndex <= 6) {
    const pattern = ["level1", "level2", "level1", "level2", "level3"];
    return pattern[waveSpawnIndex % pattern.length];
  }
  if (waveIndex <= 8) {
    const pattern = ["level2", "level1", "level3", "level2", "level3"];
    return pattern[waveSpawnIndex % pattern.length];
  }

  const pattern = ["level3", "level2", "level1", "level3", "level2"];
  return pattern[waveSpawnIndex % pattern.length];
}

function resolveEnemyAssetConfig(assets, enemyConfig, enemyTypeKey) {
  const assetKey = enemyConfig?.types?.[enemyTypeKey]?.assetKey;
  return assets?.[assetKey] ?? assets?.enemyLevel1 ?? {};
}

function getEnemyAttackTargetPoint(subBase, waveSpawnIndex, laneCount, subBaseRadius) {
  const baseX = Number(subBase?.x ?? 0);
  const baseY = Number(subBase?.y ?? 0);
  const baseRingRadius = Math.max(52, Number(subBaseRadius ?? 0) + 34);
  const slotsPerRing = Math.max(8, laneCount * 4);
  const slotIndex = waveSpawnIndex % slotsPerRing;
  const ringIndex = Math.floor(waveSpawnIndex / slotsPerRing);
  const radius = baseRingRadius + ringIndex * 52;
  const angleStep = (Math.PI * 2) / slotsPerRing;
  const angle = -Math.PI * 0.5 + slotIndex * angleStep;

  return {
    x: baseX + Math.cos(angle) * radius,
    y: baseY + Math.sin(angle) * radius,
  };
}

function createConfiguredOverlay(copyConfig, uiConfig, fallback) {
  return createOverlay(copyConfig?.title ?? fallback.title, copyConfig?.body ?? fallback.body, copyConfig?.buttonText ?? fallback.buttonText, {
    titleFontSize: Number(uiConfig?.titleFontSize ?? 56),
    bodyFontSize: Number(uiConfig?.bodyFontSize ?? 28),
    buttonFontSize: Number(uiConfig?.buttonFontSize ?? 28),
  });
}
