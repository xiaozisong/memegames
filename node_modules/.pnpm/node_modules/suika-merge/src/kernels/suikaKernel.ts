import * as Matter from "matter-js";
import { getSetting } from "../config";
import {
  FruitSnapshot,
  GameKernel,
  KernelAction,
  KernelListener,
  OverlayState,
  SuikaSnapshot,
} from "../core/contracts";

type FruitDef = {
  type: string;
  radius: number;
  color: string;
  score: number;
};

type MergeRule = {
  from: string;
  to: string;
};

type FruitEntity = {
  id: string;
  type: string;
  body: Matter.Body;
  color: string;
  radius: number;
  score: number;
  dangerMs: number;
};

type MergeIntent = {
  leftId: string;
  rightId: string;
  targetType: string;
  x: number;
  y: number;
};

export class SuikaKernel implements GameKernel {
  id = "physics-merge";
  private listeners: KernelListener[] = [];
  private readonly engine = Matter.Engine.create();
  private readonly world = this.engine.world;
  private readonly fixedDeltaMs = getSetting<number>("physics.step.fixedDeltaMs", 16.6667);

  private readonly baseWorldWidth = getSetting<number>("gameplay.world.width", 390);
  private readonly baseWorldHeight = getSetting<number>("gameplay.world.height", 760);
  private worldWidth = this.baseWorldWidth;
  private worldHeight = this.baseWorldHeight;
  private readonly wallThickness = getSetting<number>("gameplay.world.wallThickness", 30);
  private readonly baseGroundHeight = getSetting<number>("gameplay.world.groundHeight", 76);
  private readonly baseSpawnY = getSetting<number>("gameplay.spawnY", 88);
  private readonly baseWarningLineY = getSetting<number>("gameplay.gameOverLine", 120);
  private readonly warningHoldMs = getSetting<number>("gameplay.warningHoldMs", 1500);
  private readonly spawnCooldownMs = getSetting<number>("gameplay.spawnCooldownMs", 260);
  private readonly baseSpawnXRange = getSetting<[number, number]>("gameplay.spawnXRange", [64, 326]);
  private readonly fruitScale = Math.max(0.5, getSetting<number>("gameplay.fruitScale", 1));
  private readonly spawnWeights = getSetting<Record<string, number>>("gameplay.spawnWeights", {});
  private readonly rollingRestitution = getSetting<number>("physics.material.restitution", 0.12);
  private readonly rollingFriction = getSetting<number>("physics.material.friction", 0.018);
  private readonly rollingFrictionStatic = getSetting<number>("physics.material.frictionStatic", 0.05);
  private readonly rollingFrictionAir = getSetting<number>("physics.material.frictionAir", 0.003);
  private readonly spawnSpin = getSetting<number>("physics.material.spawnSpin", 0.06);
  private readonly configuredFruitAssets = getSetting<Record<string, string>>("assets.fruits", {});
  private readonly assetFruitTypes = this.resolveAssetFruitTypes();
  private readonly fruitDefs = this.resolveFruitDefs();
  private readonly mergeRules = this.resolveMergeRules();
  private readonly bossType = getSetting<string>(
    "gameplay.boss.type",
    this.assetFruitTypes.find((item) => item.toLowerCase() === "fruitboss") ?? "fruitBoss",
  );
  private readonly bossMaxPerRound = getSetting<number>("gameplay.boss.maxPerRound", 1);
  private readonly bossMergeChance = Math.max(0, Math.min(1, getSetting<number>("gameplay.boss.mergeChance", 1)));

  private readonly ruleToType = new Map<string, string>();
  private readonly typeToDef = new Map<string, FruitDef>();
  private readonly spawnTypePool: string[] = [];

  private readonly fruits = new Map<string, FruitEntity>();
  private readonly mergeQueue: MergeIntent[] = [];
  private worldBounds: Matter.Body[] = [];
  private score = 0;
  private nextFruitType = "fruit1";
  private fruitSeq = 0;
  private lastSpawnAt = -9999;
  private accumulatorMs = 0;
  private bossCreatedCount = 0;

  private state = {
    started: false,
    isGameOver: false,
    message: "Tap Start",
    overlay: {
      visible: true,
      title: "Suika Merge",
      body: "Tap screen to drop fruits. Merge same fruits!",
      buttonText: "Start",
    } as OverlayState,
  };

  constructor() {
    this.engine.gravity.y = getSetting<number>("gameplay.gravity", 1);
    for (const rule of this.mergeRules) {
      this.ruleToType.set(rule.from, rule.to);
    }
    for (const def of this.fruitDefs) {
      this.typeToDef.set(def.type, def);
      if (this.ruleToType.has(def.type)) this.spawnTypePool.push(def.type);
    }
    if (this.spawnTypePool.length === 0) this.spawnTypePool.push(this.fruitDefs[0]?.type ?? "fruit1");
    this.setupWorldBounds();
    this.setupCollisionListener();
    this.nextFruitType = this.randomSpawnType();
  }

  subscribe(listener: KernelListener): () => void {
    this.listeners.push(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
  }

  dispatch(action: KernelAction): void {
    if (action.type === "start_or_restart") {
      if (this.state.isGameOver) this.resetGame();
      this.state.started = true;
      this.state.overlay.visible = false;
      this.state.message = "Tap to drop";
      this.notify();
      return;
    }
    if (action.type === "resize_world") {
      this.resizeWorld(action.width, action.height);
      return;
    }
    if (!this.state.started || this.state.isGameOver) return;
    if (action.type === "spawn_fruit") {
      this.spawnFruit(action.normalizedX);
      return;
    }
    if (action.type === "tick") {
      this.tickPhysics(action.deltaMs);
    }
  }

  getSnapshot(): SuikaSnapshot {
    const fruits: FruitSnapshot[] = [];
    for (const fruit of this.fruits.values()) {
      fruits.push({
        id: fruit.id,
        type: fruit.type,
        x: fruit.body.position.x,
        y: fruit.body.position.y,
        angle: fruit.body.angle,
        radius: fruit.radius,
        color: fruit.color,
      });
    }
    const [spawnXMin, spawnXMax] = this.getSpawnRangeForType(this.nextFruitType);
    return {
      mode: "physics-merge",
      world: {
        width: this.worldWidth,
        height: this.worldHeight,
        warningLineY: this.currentWarningLineY,
        spawnY: this.currentSpawnY,
        spawnXMin,
        spawnXMax,
        gravity: this.engine.gravity.y,
      },
      state: {
        fruits,
        score: this.score,
        nextFruitType: this.nextFruitType,
        started: this.state.started,
        isGameOver: this.state.isGameOver,
        message: this.state.message,
        overlay: { ...this.state.overlay },
      },
    };
  }

  private setupWorldBounds(): void {
    this.rebuildWorldBounds();
  }

  private rebuildWorldBounds(): void {
    if (this.worldBounds.length > 0) {
      Matter.Composite.remove(this.world, this.worldBounds);
      this.worldBounds.length = 0;
    }
    const t = this.wallThickness;
    const w = this.worldWidth;
    const h = this.worldHeight;
    const floorTopY = h - this.currentGroundHeight;
    this.worldBounds = [
      Matter.Bodies.rectangle(w * 0.5, floorTopY + t * 0.5, w + t * 2, t, { isStatic: true }),
      Matter.Bodies.rectangle(-t * 0.5, h * 0.5, t, h + t * 2, { isStatic: true }),
      Matter.Bodies.rectangle(w + t * 0.5, h * 0.5, t, h + t * 2, { isStatic: true }),
    ];
    Matter.Composite.add(this.world, this.worldBounds);
  }

  private setupCollisionListener(): void {
    Matter.Events.on(this.engine, "collisionStart", (event) => {
      for (const pair of event.pairs) {
        const leftId = pair.bodyA.label;
        const rightId = pair.bodyB.label;
        const left = this.fruits.get(leftId);
        const right = this.fruits.get(rightId);
        if (!left || !right) continue;
        if (left.id === right.id) continue;
        if (left.type !== right.type) continue;
        const targetType = this.ruleToType.get(left.type);
        if (!targetType) continue;
        const x = (left.body.position.x + right.body.position.x) * 0.5;
        const y = (left.body.position.y + right.body.position.y) * 0.5;
        this.enqueueMerge({
          leftId: left.id,
          rightId: right.id,
          targetType,
          x,
          y,
        });
      }
    });
  }

  private enqueueMerge(intent: MergeIntent): void {
    const key = `${intent.leftId}|${intent.rightId}|${intent.targetType}`;
    const reverse = `${intent.rightId}|${intent.leftId}|${intent.targetType}`;
    const exists = this.mergeQueue.some((item) => {
      const current = `${item.leftId}|${item.rightId}|${item.targetType}`;
      return current === key || current === reverse;
    });
    if (!exists) this.mergeQueue.push(intent);
  }

  private spawnFruit(normalizedX: number): void {
    const now = performance.now();
    if (now - this.lastSpawnAt < this.spawnCooldownMs) return;
    this.lastSpawnAt = now;
    const type = this.nextFruitType;
    const [spawnMinX, spawnMaxX] = this.getSpawnRangeForType(type);
    const x = this.lerp(spawnMinX, spawnMaxX, this.clamp(normalizedX, 0, 1));
    this.createFruit(type, x, this.currentSpawnY, true);
    this.nextFruitType = this.randomSpawnType();
    this.state.message = `Dropped ${type}`;
    this.notify();
  }

  private tickPhysics(deltaMs: number): void {
    this.accumulatorMs += Math.max(0, deltaMs);
    while (this.accumulatorMs >= this.fixedDeltaMs) {
      Matter.Engine.update(this.engine, this.fixedDeltaMs);
      this.accumulatorMs -= this.fixedDeltaMs;
      this.processMergeQueue();
      this.checkGameOver(this.fixedDeltaMs);
      if (this.state.isGameOver) break;
    }
    this.notify();
  }

  private processMergeQueue(): void {
    while (this.mergeQueue.length > 0) {
      const intent = this.mergeQueue.shift()!;
      const left = this.fruits.get(intent.leftId);
      const right = this.fruits.get(intent.rightId);
      if (!left || !right) continue;
      const canSpawnBoss = this.shouldSpawnBoss(intent.targetType);
      const targetType = canSpawnBoss ? intent.targetType : left.type;
      this.removeFruit(left.id);
      this.removeFruit(right.id);
      const merged = this.createFruit(targetType, intent.x, intent.y, false);
      if (!merged) continue;
      Matter.Body.setVelocity(merged.body, { x: 0, y: -1.2 });
      if (this.isBossType(merged.type)) this.bossCreatedCount += 1;
      this.score += merged.score;
      this.state.message = `Merged to ${targetType}`;
    }
  }

  private checkGameOver(deltaMs: number): void {
    for (const fruit of this.fruits.values()) {
      if (fruit.body.position.y - fruit.radius <= this.currentWarningLineY) {
        fruit.dangerMs += deltaMs;
      } else {
        fruit.dangerMs = Math.max(0, fruit.dangerMs - deltaMs * 2);
      }
      if (fruit.dangerMs >= this.warningHoldMs) {
        this.state.isGameOver = true;
        this.state.overlay = {
          visible: true,
          title: "Game Over",
          body: "Fruit stack crossed warning line.",
          buttonText: "Restart",
        };
        this.state.message = "Game Over";
        return;
      }
    }
  }

  private createFruit(type: string, x: number, y: number, sleeping: boolean): FruitEntity | null {
    const def = this.typeToDef.get(type);
    if (!def) return null;
    const id = `fruit-${this.fruitSeq++}`;
    const body = Matter.Bodies.circle(x, y, def.radius, {
      restitution: this.rollingRestitution,
      friction: this.rollingFriction,
      frictionStatic: this.rollingFrictionStatic,
      frictionAir: this.rollingFrictionAir,
      label: id,
    });
    Matter.Composite.add(this.world, body);
    Matter.Body.setAngularVelocity(body, sleeping ? 0 : (Math.random() * 2 - 1) * this.spawnSpin);
    const fruit: FruitEntity = {
      id,
      type,
      body,
      color: def.color,
      radius: def.radius,
      score: def.score,
      dangerMs: 0,
    };
    this.fruits.set(id, fruit);
    return fruit;
  }

  private removeFruit(id: string): void {
    const fruit = this.fruits.get(id);
    if (!fruit) return;
    Matter.Composite.remove(this.world, fruit.body);
    this.fruits.delete(id);
  }

  private resetGame(): void {
    for (const fruit of this.fruits.values()) {
      Matter.Composite.remove(this.world, fruit.body);
    }
    this.fruits.clear();
    this.mergeQueue.length = 0;
    this.score = 0;
    this.state.isGameOver = false;
    this.state.started = false;
    this.state.message = "Tap Start";
    this.state.overlay = {
      visible: true,
      title: "Suika Merge",
      body: "Tap screen to drop fruits. Merge same fruits!",
      buttonText: "Start",
    };
    this.nextFruitType = this.randomSpawnType();
    this.accumulatorMs = 0;
    this.bossCreatedCount = 0;
  }

  private resizeWorld(width: number, height: number): void {
    const nextWidth = Math.max(220, Math.round(width));
    const nextHeight = Math.max(320, Math.round(height));
    if (nextWidth === this.worldWidth && nextHeight === this.worldHeight) return;
    const ratioX = nextWidth / this.worldWidth;
    const ratioY = nextHeight / this.worldHeight;
    this.worldWidth = nextWidth;
    this.worldHeight = nextHeight;
    const floorTopY = this.worldHeight - this.currentGroundHeight;
    for (const fruit of this.fruits.values()) {
      const scaledX = fruit.body.position.x * ratioX;
      const scaledY = fruit.body.position.y * ratioY;
      const clampedX = this.clamp(scaledX, fruit.radius, this.worldWidth - fruit.radius);
      const clampedY = this.clamp(scaledY, fruit.radius, floorTopY - fruit.radius);
      Matter.Body.setPosition(fruit.body, { x: clampedX, y: clampedY });
    }
    this.rebuildWorldBounds();
    this.notify();
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }

  private randomSpawnType(): string {
    let totalWeight = 0;
    for (const type of this.spawnTypePool) {
      totalWeight += Math.max(0, this.spawnWeights[type] ?? 0);
    }
    if (totalWeight > 0) {
      let cursor = Math.random() * totalWeight;
      for (const type of this.spawnTypePool) {
        cursor -= Math.max(0, this.spawnWeights[type] ?? 0);
        if (cursor <= 0) return type;
      }
    }
    const index = Math.floor(Math.random() * this.spawnTypePool.length);
    return this.spawnTypePool[index]!;
  }

  private resolveAssetFruitTypes(): string[] {
    const keys = Object.keys(this.configuredFruitAssets).filter((key) => /^fruit/i.test(key));
    if (keys.length === 0) return ["fruit1", "fruit2", "fruit3", "fruit4", "fruit5", "fruitBoss"];
    return keys.sort((a, b) => this.sortFruitType(a, b));
  }

  private resolveFruitDefs(): FruitDef[] {
    const fallbackDefs = this.assetFruitTypes.map((type, index) => ({
      type,
      radius: 16 + index * 6,
      color: "#ffffff",
      score: 10 + index * 25,
    }));
    const configured = getSetting<FruitDef[]>("gameplay.fruitTypes", fallbackDefs);
    const configuredMap = new Map(configured.map((item) => [item.type, item]));
    return this.assetFruitTypes.map((type, index) => {
      const match = configuredMap.get(type);
      if (match) {
        return {
          ...match,
          radius: Math.max(8, match.radius * this.fruitScale),
        };
      }
      const base = fallbackDefs[index]!;
      return {
        type,
        radius: Math.max(8, base.radius * this.fruitScale),
        color: base.color,
        score: base.score,
      };
    });
  }

  private resolveMergeRules(): MergeRule[] {
    const fallback = this.assetFruitTypes.slice(0, -1).map((type, index) => ({
      from: type,
      to: this.assetFruitTypes[index + 1]!,
    }));
    const configured = getSetting<MergeRule[]>("gameplay.mergeRules", fallback);
    if (configured.length === 0) return fallback;
    const configuredMap = new Map(configured.map((item) => [item.from, item.to]));
    const rules: MergeRule[] = [];
    for (let i = 0; i < this.assetFruitTypes.length - 1; i += 1) {
      const from = this.assetFruitTypes[i]!;
      const to = configuredMap.get(from) ?? this.assetFruitTypes[i + 1]!;
      rules.push({ from, to });
    }
    return rules;
  }

  private isBossType(type: string): boolean {
    return type === this.bossType;
  }

  private isBossBlocked(targetType: string): boolean {
    if (!this.isBossType(targetType)) return false;
    return this.bossCreatedCount >= Math.max(0, this.bossMaxPerRound);
  }

  private shouldSpawnBoss(targetType: string): boolean {
    if (!this.isBossType(targetType)) return true;
    return Math.random() <= this.bossMergeChance;
  }

  private get currentGroundHeight(): number {
    const ratio = this.worldHeight / this.baseWorldHeight;
    return this.clamp(this.baseGroundHeight * ratio, 36, this.worldHeight * 0.45);
  }

  private get currentSpawnY(): number {
    return this.baseSpawnY * (this.worldHeight / this.baseWorldHeight);
  }

  private get currentWarningLineY(): number {
    return this.baseWarningLineY * (this.worldHeight / this.baseWorldHeight);
  }

  private get currentSpawnXRange(): [number, number] {
    const ratio = this.worldWidth / this.baseWorldWidth;
    return [this.baseSpawnXRange[0] * ratio, this.baseSpawnXRange[1] * ratio];
  }

  private getSpawnRangeForType(type: string): [number, number] {
    const radius = this.typeToDef.get(type)?.radius ?? 18;
    const minX = radius + 2;
    const maxX = Math.max(minX, this.worldWidth - radius - 2);
    return [minX, maxX];
  }

  private sortFruitType(left: string, right: string): number {
    const [leftNum, rightNum] = [left, right].map((name) => {
      const match = name.match(/^fruit(\d+)$/i);
      return match ? Number(match[1]) : Number.NaN;
    });
    const leftIsNum = Number.isFinite(leftNum);
    const rightIsNum = Number.isFinite(rightNum);
    if (leftIsNum && rightIsNum) return leftNum - rightNum;
    if (leftIsNum) return -1;
    if (rightIsNum) return 1;
    return left.localeCompare(right);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private lerp(min: number, max: number, t: number): number {
    return min + (max - min) * t;
  }
}
