import { getSetting } from "../config.js";
import { FoodSystem } from "../systems/FoodSystem.js";
import { InputSystem } from "../systems/InputSystem.js";
import { LeaderboardSystem } from "../systems/LeaderboardSystem.js";
import { NpcSystem } from "../systems/NpcSystem.js";
import { SnakeSystem } from "../systems/SnakeSystem.js";

export class SnakeKernel {
  constructor() {
    this.inputSystem = new InputSystem();
    this.foodSystem = new FoodSystem();
    this.leaderboardSystem = new LeaderboardSystem();
    this.npcSystem = new NpcSystem();
    this.snakeSystem = new SnakeSystem();
    this.listeners = [];
    this.nextRoundId = 1;
    this.state = this.createInitialState();
  }

  createInitialState(overrides = {}) {
    const world = {
      width: this.getNumber("gameplay.params.worldWidth", 3200),
      height: this.getNumber("gameplay.params.worldHeight", 3200),
    };
    const playerSnake = this.snakeSystem.createInitialPlayer(world);
    const npcs = this.npcSystem.createNpcs(world, this.snakeSystem, [playerSnake.head]);
    const foods = this.foodSystem.createInitialFood(world, playerSnake.head);

    return {
      roundId: overrides.roundId ?? this.nextRoundId++,
      world,
      viewport: { width: 1280, height: 720 },
      playerSnake,
      npcs,
      foods,
      deathParticles: [],
      effects: {
        eatSeq: 0,
        deathSeq: 0,
      },
      score: 0,
      elapsed: overrides.elapsed ?? 0,
      boosting: false,
      gameOver: false,
      gameOverReason: null,
      roundSummary: null,
      playerHitBoundary: false,
      autoRestartTimer: 0,
      playerRestartTimer: 0,
      statusText: "Collect food, avoid other snakes.",
      input: {
        joystick: {
          base: { x: 0, y: 0 },
          knob: { x: 0, y: 0 },
          radius: 0,
          active: false,
        },
      },
      leaderboard: [],
    };
  }

  getInputSystem() {
    return this.inputSystem;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
  }

  dispatch(action) {
    if (action.type === "reset") {
      this.state = this.createInitialState();
      this.notify();
    }
  }

  tick(deltaMs, viewport) {
    const rawDeltaSeconds = Math.max(0.001, deltaMs / 1000);
    const deltaSeconds = Math.min(0.05, rawDeltaSeconds);
    this.state.viewport = {
      width: Math.max(1, viewport.width),
      height: Math.max(1, viewport.height),
    };
    const input = this.inputSystem.getState(this.state.viewport, this.state.playerSnake.angle);
    this.state.input = input;
    this.state.boosting = input.boosting;

    if (this.state.gameOver) {
      this.notify();
      return this.getSnapshot();
    }

    if (!this.state.playerSnake.alive) {
      this.updateDeathParticles(rawDeltaSeconds);
      this.advanceRoundTimer(deltaSeconds);
      if (!this.state.gameOver) {
        this.maybeRespawnPlayer(rawDeltaSeconds);
        this.state.statusText = "You crashed. Restarting in the same round...";
      } else {
        this.state.statusText = this.getStatusText();
      }
      this.notify();
      return this.getSnapshot();
    }

    if (this.state.playerSnake.alive) {
      const desiredAngle = Math.atan2(input.aimVector.y, input.aimVector.x);
      const playerMoveResult = this.snakeSystem.updateSnake(
        this.state.playerSnake,
        {
          desiredAngle,
          boosting: input.boosting,
        },
        deltaSeconds,
        this.state.world,
        { allowBoundaryDeath: true },
      );
      this.state.playerHitBoundary = playerMoveResult?.hitBoundary === true;
    } else {
      this.state.playerHitBoundary = false;
    }

    for (const npc of this.state.npcs) {
      this.npcSystem.updateNpc(npc, this.state, this.snakeSystem, deltaSeconds);
      if (!npc.alive && npc.respawnTimer <= 0) {
        this.npcSystem.respawnNpc(npc, this.state, this.snakeSystem);
      }
    }

    this.resolveFoodConsumption();
    this.resolveDeaths();
    this.updateDeathParticles(rawDeltaSeconds);
    this.advanceRoundTimer(deltaSeconds);
    this.state.leaderboard = this.leaderboardSystem.build(this.state);
    this.state.statusText = this.getStatusText();
    this.notify();
    return this.getSnapshot();
  }

  getSnapshot() {
    return {
      world: { ...this.state.world },
      viewport: { ...this.state.viewport },
      score: this.state.score,
      elapsed: this.state.elapsed,
      boosting: this.state.boosting,
      gameOver: this.state.gameOver,
      gameOverReason: this.state.gameOverReason,
      autoRestartTimer: this.state.autoRestartTimer,
      playerRestartTimer: this.state.playerRestartTimer,
      statusText: this.state.statusText,
      roundSummary: this.state.roundSummary
        ? {
          ...this.state.roundSummary,
          leaderboard: this.state.roundSummary.leaderboard.map((entry) => ({ ...entry })),
        }
        : null,
      input: {
        joystick: {
          base: { ...this.state.input.joystick.base },
          knob: { ...this.state.input.joystick.knob },
          radius: this.state.input.joystick.radius,
          active: this.state.input.joystick.active,
        },
      },
      playerSnake: this.serializeSnake(this.state.playerSnake),
      npcs: this.state.npcs.map((npc) => this.serializeSnake(npc)),
      foods: this.state.foods.map((item) => ({ ...item })),
      deathParticles: this.state.deathParticles.map((particle) => ({ ...particle })),
      leaderboard: this.state.leaderboard.map((entry) => ({ ...entry })),
      effects: { ...this.state.effects },
    };
  }

  serializeSnake(snake) {
    return {
      id: snake.id,
      name: snake.name,
      isPlayer: snake.isPlayer,
      alive: snake.alive,
      head: { ...snake.head },
      angle: snake.angle,
      radius: snake.radius,
      speed: snake.speed,
      baseSpeed: snake.baseSpeed,
      currentLength: snake.currentLength,
      targetLength: snake.targetLength,
      body: snake.body.map((point) => ({ ...point })),
      colors: { ...snake.colors },
      respawnTimer: snake.respawnTimer,
      skinId: snake.skinId ?? null,
    };
  }

  resolveFoodConsumption() {
    const snakes = [this.state.playerSnake, ...this.state.npcs];
    const growthPerFood = this.getNumber("gameplay.params.growthPerFood", 42);

    for (const snake of snakes) {
      if (!snake.alive) continue;
      const captureRadius = snake.radius + this.getNumber("gameplay.params.foodCaptureRadius", 12);
      const eatenFoods = this.foodSystem.consume(this.state.foods, snake.head, captureRadius);
      if (eatenFoods.length === 0) continue;

      this.snakeSystem.grow(snake, eatenFoods.length * growthPerFood);
      if (snake.isPlayer) {
        this.state.score += eatenFoods.length;
        this.state.effects.eatSeq += eatenFoods.length;
      }
    }

    this.foodSystem.ensureFoodCount(this.state.foods, this.state.world, this.state.playerSnake.head);
  }

  resolveDeaths() {
    const growthPerFood = this.getNumber("gameplay.params.growthPerFood", 42);
    const aliveNpcs = this.state.npcs.filter((snake) => snake.alive);
    const deadNpcIds = new Set();

    for (const npc of aliveNpcs) {
      const hitsPlayerBody = this.state.playerSnake.alive
        && this.snakeSystem.checkHeadToBodyCollision(npc, this.state.playerSnake, 6);
      if (hitsPlayerBody) {
        deadNpcIds.add(npc.id);
        continue;
      }

      for (const targetNpc of aliveNpcs) {
        if (npc.id === targetNpc.id) continue;
        if (this.snakeSystem.checkHeadToBodyCollision(npc, targetNpc, 6)) {
          deadNpcIds.add(npc.id);
          break;
        }
      }
    }

    for (const npc of aliveNpcs) {
      if (!deadNpcIds.has(npc.id) || !npc.alive) continue;
      this.dropSnakeAsFood(npc, growthPerFood);
      this.spawnDeathParticles(npc);
      this.snakeSystem.killSnake(npc);
      npc.respawnTimer = this.getNumber("gameplay.params.npcRespawnDelay", 4);
    }

    const playerHitsNpcBody = this.state.playerSnake.alive
      && this.state.npcs
        .filter((npc) => npc.alive)
        .some((npc) => this.snakeSystem.checkHeadToBodyCollision(this.state.playerSnake, npc, 6));

    if (this.state.playerSnake.alive && (this.state.playerHitBoundary || playerHitsNpcBody)) {
      const finalPlayerLength = Math.round(Math.max(this.state.playerSnake.currentLength, this.state.playerSnake.targetLength));
      const finalLeaderboard = this.leaderboardSystem.build(this.state);
      this.dropSnakeAsFood(this.state.playerSnake, growthPerFood);
      this.spawnDeathParticles(this.state.playerSnake);
      this.snakeSystem.killSnake(this.state.playerSnake);
      this.state.effects.deathSeq += 1;
      this.startPlayerRespawn({
        playerLength: finalPlayerLength,
        leaderboard: finalLeaderboard,
      });
    }

    this.state.playerHitBoundary = false;
  }

  dropSnakeAsFood(snake, growthPerFood) {
    const density = this.getNumber("gameplay.params.deathFoodDensity", 2);
    const sourceLength = Math.max(snake.currentLength, snake.targetLength);
    const dropCount = Math.max(12, Math.round((sourceLength / Math.max(1, growthPerFood)) * density));
    const dropPoints = this.snakeSystem.createDropPoints(snake, dropCount);
    this.state.foods.push(...this.foodSystem.spawnBurstFromPoints(dropPoints, snake.radius * 0.7));
  }

  spawnDeathParticles(snake) {
    const count = this.getNumber("gameplay.params.deathParticleCount", 22);
    const colors = [snake.colors.head, snake.colors.body, snake.colors.core];
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.24;
      const speed = this.getNumber("gameplay.params.deathParticleSpeed", 220) * (0.65 + Math.random() * 0.7);
      this.state.deathParticles.push({
        id: `${snake.id}-death-${this.state.elapsed}-${index}`,
        x: snake.head.x,
        y: snake.head.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: this.getNumber("gameplay.params.deathParticleLife", 0.46),
        maxLife: this.getNumber("gameplay.params.deathParticleLife", 0.46),
        radius: snake.radius * (0.18 + Math.random() * 0.24),
        color: colors[index % colors.length],
      });
    }
  }

  updateDeathParticles(deltaSeconds) {
    if (this.state.deathParticles.length === 0) return;
    const drag = this.getNumber("gameplay.params.deathParticleDrag", 5.4);
    const nextParticles = [];
    for (const particle of this.state.deathParticles) {
      const life = particle.life - deltaSeconds;
      if (life <= 0) continue;
      const damping = Math.max(0, 1 - drag * deltaSeconds);
      nextParticles.push({
        ...particle,
        x: particle.x + particle.vx * deltaSeconds,
        y: particle.y + particle.vy * deltaSeconds,
        vx: particle.vx * damping,
        vy: particle.vy * damping,
        life,
      });
    }
    this.state.deathParticles = nextParticles;
  }

  advanceRoundTimer(deltaSeconds) {
    const limitSeconds = this.getNumber("gameplay.params.roundTimeLimitSeconds", 120);
    const nextElapsed = this.state.elapsed + deltaSeconds;
    if (limitSeconds > 0 && nextElapsed >= limitSeconds) {
      this.state.elapsed = limitSeconds;
      if (!this.state.gameOver) {
        this.endRound("timeout");
      }
      return;
    }
    this.state.elapsed = nextElapsed;
  }

  startPlayerRespawn() {
    this.state.playerRestartTimer = this.getNumber("gameplay.params.autoRestartDelay", 1.6);
  }

  maybeRespawnPlayer(rawDeltaSeconds) {
    this.state.playerRestartTimer = Math.max(0, this.state.playerRestartTimer - rawDeltaSeconds);
    if (this.state.playerRestartTimer > 0) return;
    this.state = this.createInitialState({
      roundId: this.state.roundId,
      elapsed: this.state.elapsed,
    });
  }

  endRound(reason, summaryOverrides = {}) {
    if (this.state.gameOver) return;
    this.state.gameOver = true;
    this.state.gameOverReason = reason;
    this.state.autoRestartTimer = 0;
    this.state.roundSummary = this.buildRoundSummary(reason, summaryOverrides);
  }

  getStatusText() {
    if (this.state.gameOverReason === "timeout") {
      return "Time is up. Tap Play Again to start a new round.";
    }
    return "Collect food, avoid larger snakes, hold boost to sprint.";
  }

  buildRoundSummary(reason, overrides = {}) {
    return {
      roundId: this.state.roundId,
      reason,
      elapsed: overrides.elapsed ?? this.state.elapsed,
      score: overrides.score ?? this.state.score,
      playerLength: overrides.playerLength ?? Math.round(Math.max(
        this.state.playerSnake.currentLength,
        this.state.playerSnake.targetLength,
      )),
      leaderboard: (overrides.leaderboard ?? this.leaderboardSystem.build(this.state)).map((entry) => ({ ...entry })),
    };
  }

  notify() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  getNumber(path, fallback) {
    const value = getSetting(path, fallback);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  }
}
