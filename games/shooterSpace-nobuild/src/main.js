import { GameLoop } from "./core/gameLoop.js";
import { GameState } from "./core/state.js";
import { Player } from "./entities/Player.js";
import { Renderer } from "./render/Renderer.js";
import { BossSystem } from "./systems/BossSystem.js";
import { CleanupSystem } from "./systems/CleanupSystem.js";
import { CollisionSystem } from "./systems/CollisionSystem.js";
import { InputSystem } from "./systems/InputSystem.js";
import { ParticleSystem } from "./systems/ParticleSystem.js";
import { PowerUpSystem } from "./systems/PowerUpSystem.js";
import { SimulationSystem } from "./systems/SimulationSystem.js";
import { SpawnSystem } from "./systems/SpawnSystem.js";
import { SystemManager } from "./systems/SystemManager.js";
import { WaveSystem } from "./systems/WaveSystem.js";

const FALLBACK_CONFIG = {
  meta: {
    id: "shooter-space",
    title: "雷霆战机",
    description: "纵版飞机大战，原生 Canvas + JavaScript，无构建依赖。"
  },
  world: {
    width: 480,
    height: 800,
    padding: 24
  },
  player: {
    width: 46,
    height: 60,
    speed: 360,
    pointerFollowLerp: 12,
    autoFireInterval: 0.18,
    maxFirepowerLevel: 3,
    maxHealth: 6,
    invulnerabilityDuration: 0.42
  },
  bullet: {
    width: 8,
    height: 20,
    speed: 720,
    spreadVelocityX: 180
  },
  enemy: {
    width: 42,
    height: 56,
    baseHealth: 1,
    waveHealthBonus: 0.2,
    contactDamage: 2,
    baseSpawnInterval: 0.82,
    spawnIntervalFloor: 0.32,
    difficultyRamp: 0.018,
    minSpeed: 140,
    maxSpeed: 260,
    driftAmplitudeMin: 12,
    driftAmplitudeMax: 42,
    driftFrequencyMin: 1.4,
    driftFrequencyMax: 2.8,
    scoreMin: 20,
    scoreMax: 55
  },
  powerUp: {
    width: 26,
    height: 26,
    speed: 140,
    value: 1,
    dropChance: 0.2,
    bossDropCount: 2,
    color: "#fde047"
  },
  wave: {
    intervalSeconds: 10,
    enemySpeedRamp: 0.14,
    enemyCountRamp: 0.5
  },
  boss: {
    spawnIntervalSeconds: 30,
    width: 176,
    height: 118,
    baseHealth: 42,
    waveHealthBonus: 0.22,
    moveSpeed: 140,
    bulletSpeed: 220,
    bulletInterval: 1.12,
    bulletIntervalMin: 0.68,
    patternInterval: 6,
    scoreReward: 600
  },
  background: {
    scrollSpeed: 130,
    starCountNear: 54,
    starCountFar: 80,
    gridSpacing: 48
  },
  ui: {
    scoreLabel: "SCORE",
    fireLabel: "FIRE",
    waveLabel: "WAVE",
    bossLabel: "BOSS",
    gameOverTitle: "任务失败",
    gameOverSubtitle: "敌机突破防线，点击屏幕或按 Enter / R 重新出击"
  }
};

function deepMerge(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? [...override] : [...base];
  }

  if (typeof base !== "object" || base === null) {
    return override ?? base;
  }

  const result = { ...base };
  if (typeof override !== "object" || override === null) {
    return result;
  }

  for (const [key, value] of Object.entries(override)) {
    result[key] = key in base ? deepMerge(base[key], value) : value;
  }

  return result;
}

async function loadConfig() {
  try {
    const response = await fetch(new URL("./config.json", import.meta.url));
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }

    const json = await response.json();
    return deepMerge(FALLBACK_CONFIG, json);
  } catch (error) {
    console.warn("[shooterSpace] Using fallback config.", error);
    return deepMerge(FALLBACK_CONFIG, {});
  }
}

function bootstrapRound(state, renderer, config, systems) {
  state.resetRound();
  state.setPlayer(new Player(config));
  renderer.resize(state);
  systems.onRoundStart(state);
}

export async function bootstrap(options = {}) {
  const root = options.root ?? document.querySelector("#app");
  if (!root) {
    throw new Error("Missing #app container.");
  }

  const baseConfig = await loadConfig();
  const config = deepMerge(baseConfig, options.configOverrides ?? {});
  document.title = `${config.meta.title} - Shooter Space`;

  const state = new GameState(config);
  const renderer = new Renderer(root, config);
  const systems = new SystemManager();

  systems.register("simulation", new SimulationSystem(config, renderer));
  systems.register("wave", new WaveSystem(config));
  systems.register("spawn", new SpawnSystem(config));
  systems.register("boss", new BossSystem(config));
  systems.register("collision", new CollisionSystem());
  systems.register("powerUp", new PowerUpSystem(config));
  systems.register("particle", new ParticleSystem(config));
  systems.register("cleanup", new CleanupSystem());

  const inputSystem = new InputSystem(renderer.canvas, state);
  systems.register("input", inputSystem);
  systems.initialize(state);

  bootstrapRound(state, renderer, config, systems);

  const handleResize = () => {
    renderer.resize(state);
  };
  window.addEventListener("resize", handleResize);

  const update = (delta) => {
    if (state.consumeRestart()) {
      bootstrapRound(state, renderer, config, systems);
      return;
    }

    systems.update(delta, state);
  };

  const loop = new GameLoop(update, () => renderer.render(state));
  loop.start();

  window.addEventListener("beforeunload", () => {
    loop.stop();
    systems.dispose();
  });
}
