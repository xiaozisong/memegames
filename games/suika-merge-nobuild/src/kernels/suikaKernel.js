import MatterModule from "matter-js";
import { buildAssetMap, buildFruitTypes, buildMergeRules, buildSpawnWeights, getSetting, getSpawnXRange } from "../config.js";
const Matter = MatterModule.default ?? MatterModule;
export class SuikaKernel {
    constructor() {
        this.id = "physics-merge";
        this.listeners = [];
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;
        this.fixedDeltaMs = getSetting("physics_step_fixed_delta_ms", 16.6667);
        this.baseWorldWidth = getSetting("gameplay_world_width", 390);
        this.baseWorldHeight = getSetting("gameplay_world_height", 760);
        this.worldWidth = this.baseWorldWidth;
        this.worldHeight = this.baseWorldHeight;
        this.wallThickness = getSetting("gameplay_world_wall_thickness", 30);
        this.baseGroundHeight = getSetting("gameplay_world_ground_height", 76);
        this.baseSpawnY = getSetting("gameplay_spawn_y", 88);
        this.baseWarningLineY = getSetting("gameplay_game_over_line", 120);
        this.warningHoldMs = getSetting("gameplay_warning_hold_ms", 1500);
        this.spawnCooldownMs = getSetting("gameplay_spawn_cooldown_ms", 260);
        this.baseSpawnXRange = getSpawnXRange([64, 326]);
        this.fruitScale = Math.max(0.5, getSetting("gameplay_fruit_scale", 1));
        this.spawnWeights = buildSpawnWeights();
        this.rollingRestitution = getSetting("physics_material_restitution", 0.12);
        this.rollingFriction = getSetting("physics_material_friction", 0.018);
        this.rollingFrictionStatic = getSetting("physics_material_friction_static", 0.05);
        this.rollingFrictionAir = getSetting("physics_material_friction_air", 0.003);
        this.spawnSpin = getSetting("physics_material_spawn_spin", 0.06);
        this.configuredFruitAssets = buildAssetMap("asset_fruits_");
        this.assetFruitTypes = this.resolveAssetFruitTypes();
        this.fruitDefs = this.resolveFruitDefs();
        this.mergeRules = this.resolveMergeRules();
        this.bossType = getSetting("gameplay_boss_type", this.assetFruitTypes.find((item) => item.toLowerCase() === "fruitboss") ?? "fruitBoss");
        this.bossMaxPerRound = getSetting("gameplay_boss_max_per_round", 1);
        this.bossMergeChance = Math.max(0, Math.min(1, getSetting("gameplay_boss_merge_chance", 1)));
        this.ruleToType = new Map();
        this.typeToDef = new Map();
        this.spawnTypePool = [];
        this.fruits = new Map();
        this.mergeQueue = [];
        this.worldBounds = [];
        this.score = 0;
        this.nextFruitType = "fruit1";
        this.fruitSeq = 0;
        this.lastSpawnAt = -9999;
        this.accumulatorMs = 0;
        this.bossCreatedCount = 0;
        this.landingSfxTick = 0;
        this.state = {
            started: false,
            isGameOver: false,
            message: "Tap Start",
            overlay: {
                visible: true,
                title: "Suika Merge",
                body: "Tap screen to drop fruits. Merge same fruits!",
                buttonText: "Start",
            },
        };
        this.engine.gravity.y = getSetting("gameplay_gravity", 1);
        for (const rule of this.mergeRules) {
            this.ruleToType.set(rule.from, rule.to);
        }
        for (const def of this.fruitDefs) {
            this.typeToDef.set(def.type, def);
            if (this.ruleToType.has(def.type))
                this.spawnTypePool.push(def.type);
        }
        if (this.spawnTypePool.length === 0)
            this.spawnTypePool.push(this.fruitDefs[0]?.type ?? "fruit1");
        this.setupWorldBounds();
        this.setupCollisionListener();
        this.nextFruitType = this.randomSpawnType();
    }
    subscribe(listener) {
        this.listeners.push(listener);
        listener(this.getSnapshot());
        return () => {
            this.listeners = this.listeners.filter((item) => item !== listener);
        };
    }
    dispatch(action) {
        if (action.type === "start_or_restart") {
            if (this.state.isGameOver)
                this.resetGame();
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
        if (!this.state.started || this.state.isGameOver)
            return;
        if (action.type === "spawn_fruit") {
            this.spawnFruit(action.normalizedX);
            return;
        }
        if (action.type === "tick") {
            this.tickPhysics(action.deltaMs);
        }
    }
    getSnapshot() {
        const fruits = [];
        for (const fruit of this.fruits.values()) {
            const speed = fruit.body.speed ?? 0;
            fruits.push({
                id: fruit.id,
                type: fruit.type,
                x: fruit.body.position.x,
                y: fruit.body.position.y,
                angle: fruit.body.angle,
                radius: fruit.radius,
                color: fruit.color,
                speed,
                isSettled: !fruit.pendingLandingSfx && speed <= 0.35,
                pendingLandingSfx: !!fruit.pendingLandingSfx,
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
                landingSfxTick: this.landingSfxTick,
                overlay: { ...this.state.overlay },
            },
        };
    }
    setupWorldBounds() {
        this.rebuildWorldBounds();
    }
    rebuildWorldBounds() {
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
    setupCollisionListener() {
        Matter.Events.on(this.engine, "collisionStart", (event) => {
            for (const pair of event.pairs) {
                this.markLandingSfx(pair.bodyA, pair.bodyB);
                this.markLandingSfx(pair.bodyB, pair.bodyA);
                const leftId = pair.bodyA.label;
                const rightId = pair.bodyB.label;
                const left = this.fruits.get(leftId);
                const right = this.fruits.get(rightId);
                if (!left || !right)
                    continue;
                if (left.id === right.id)
                    continue;
                if (left.type !== right.type)
                    continue;
                const targetType = this.ruleToType.get(left.type);
                if (!targetType)
                    continue;
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
    markLandingSfx(body, otherBody) {
        const fruit = this.fruits.get(body.label);
        if (!fruit || !fruit.pendingLandingSfx)
            return;
        if (otherBody.label === fruit.id)
            return;
        fruit.pendingLandingSfx = false;
        this.landingSfxTick += 1;
    }
    enqueueMerge(intent) {
        const key = `${intent.leftId}|${intent.rightId}|${intent.targetType}`;
        const reverse = `${intent.rightId}|${intent.leftId}|${intent.targetType}`;
        const exists = this.mergeQueue.some((item) => {
            const current = `${item.leftId}|${item.rightId}|${item.targetType}`;
            return current === key || current === reverse;
        });
        if (!exists)
            this.mergeQueue.push(intent);
    }
    spawnFruit(normalizedX) {
        const now = performance.now();
        if (now - this.lastSpawnAt < this.spawnCooldownMs)
            return;
        this.lastSpawnAt = now;
        const type = this.nextFruitType;
        const [spawnMinX, spawnMaxX] = this.getSpawnRangeForType(type);
        const x = this.lerp(spawnMinX, spawnMaxX, this.clamp(normalizedX, 0, 1));
        this.createFruit(type, x, this.currentSpawnY, true);
        this.nextFruitType = this.randomSpawnType();
        this.state.message = `Dropped ${type}`;
        this.notify();
    }
    tickPhysics(deltaMs) {
        this.accumulatorMs += Math.max(0, deltaMs);
        while (this.accumulatorMs >= this.fixedDeltaMs) {
            Matter.Engine.update(this.engine, this.fixedDeltaMs);
            this.accumulatorMs -= this.fixedDeltaMs;
            this.processMergeQueue();
            this.checkGameOver(this.fixedDeltaMs);
            if (this.state.isGameOver)
                break;
        }
        this.notify();
    }
    processMergeQueue() {
        while (this.mergeQueue.length > 0) {
            const intent = this.mergeQueue.shift();
            const left = this.fruits.get(intent.leftId);
            const right = this.fruits.get(intent.rightId);
            if (!left || !right)
                continue;
            const canSpawnBoss = this.shouldSpawnBoss(intent.targetType);
            const targetType = canSpawnBoss ? intent.targetType : left.type;
            this.removeFruit(left.id);
            this.removeFruit(right.id);
            const merged = this.createFruit(targetType, intent.x, intent.y, false);
            if (!merged)
                continue;
            Matter.Body.setVelocity(merged.body, { x: 0, y: -1.2 });
            if (this.isBossType(merged.type))
                this.bossCreatedCount += 1;
            this.score += merged.score;
            this.state.message = `Merged to ${targetType}`;
        }
    }
    checkGameOver(deltaMs) {
        for (const fruit of this.fruits.values()) {
            if (fruit.body.position.y - fruit.radius <= this.currentWarningLineY) {
                fruit.dangerMs += deltaMs;
            }
            else {
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
    createFruit(type, x, y, sleeping) {
        const def = this.typeToDef.get(type);
        if (!def)
            return null;
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
        const fruit = {
            id,
            type,
            body,
            color: def.color,
            radius: def.radius,
            score: def.score,
            dangerMs: 0,
            pendingLandingSfx: sleeping,
        };
        this.fruits.set(id, fruit);
        return fruit;
    }
    removeFruit(id) {
        const fruit = this.fruits.get(id);
        if (!fruit)
            return;
        Matter.Composite.remove(this.world, fruit.body);
        this.fruits.delete(id);
    }
    resetGame() {
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
        this.landingSfxTick = 0;
    }
    resizeWorld(width, height) {
        const nextWidth = Math.max(220, Math.round(width));
        const nextHeight = Math.max(320, Math.round(height));
        if (nextWidth === this.worldWidth && nextHeight === this.worldHeight)
            return;
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
    notify() {
        const snapshot = this.getSnapshot();
        for (const listener of this.listeners)
            listener(snapshot);
    }
    randomSpawnType() {
        let totalWeight = 0;
        for (const type of this.spawnTypePool) {
            totalWeight += Math.max(0, this.spawnWeights[type] ?? 0);
        }
        if (totalWeight > 0) {
            let cursor = Math.random() * totalWeight;
            for (const type of this.spawnTypePool) {
                cursor -= Math.max(0, this.spawnWeights[type] ?? 0);
                if (cursor <= 0)
                    return type;
            }
        }
        const index = Math.floor(Math.random() * this.spawnTypePool.length);
        return this.spawnTypePool[index];
    }
    resolveAssetFruitTypes() {
        const keys = Object.keys(this.configuredFruitAssets).filter((key) => /^fruit/i.test(key));
        if (keys.length === 0)
            return ["fruit1", "fruit2", "fruit3", "fruit4", "fruit5", "fruitBoss"];
        return keys.sort((a, b) => this.sortFruitType(a, b));
    }
    resolveFruitDefs() {
        const fallbackDefs = this.assetFruitTypes.map((type, index) => ({
            type,
            radius: 16 + index * 6,
            color: "#ffffff",
            score: 10 + index * 25,
        }));
        const configured = buildFruitTypes();
        const configuredMap = new Map(configured.map((item) => [item.type, item]));
        return this.assetFruitTypes.map((type, index) => {
            const match = configuredMap.get(type);
            if (match) {
                return {
                    ...match,
                    radius: Math.max(8, match.radius * this.fruitScale),
                };
            }
            const base = fallbackDefs[index];
            return {
                type,
                radius: Math.max(8, base.radius * this.fruitScale),
                color: base.color,
                score: base.score,
            };
        });
    }
    resolveMergeRules() {
        const fallback = this.assetFruitTypes.slice(0, -1).map((type, index) => ({
            from: type,
            to: this.assetFruitTypes[index + 1],
        }));
        const configured = buildMergeRules();
        if (configured.length === 0)
            return fallback;
        const configuredMap = new Map(configured.map((item) => [item.from, item.to]));
        const rules = [];
        for (let i = 0; i < this.assetFruitTypes.length - 1; i += 1) {
            const from = this.assetFruitTypes[i];
            const to = configuredMap.get(from) ?? this.assetFruitTypes[i + 1];
            rules.push({ from, to });
        }
        return rules;
    }
    isBossType(type) {
        return type === this.bossType;
    }
    isBossBlocked(targetType) {
        if (!this.isBossType(targetType))
            return false;
        return this.bossCreatedCount >= Math.max(0, this.bossMaxPerRound);
    }
    shouldSpawnBoss(targetType) {
        if (!this.isBossType(targetType))
            return true;
        return Math.random() <= this.bossMergeChance;
    }
    get currentGroundHeight() {
        const ratio = this.worldHeight / this.baseWorldHeight;
        return this.clamp(this.baseGroundHeight * ratio, 36, this.worldHeight * 0.45);
    }
    get currentSpawnY() {
        return this.baseSpawnY * (this.worldHeight / this.baseWorldHeight);
    }
    get currentWarningLineY() {
        return this.baseWarningLineY * (this.worldHeight / this.baseWorldHeight);
    }
    get currentSpawnXRange() {
        const ratio = this.worldWidth / this.baseWorldWidth;
        return [this.baseSpawnXRange[0] * ratio, this.baseSpawnXRange[1] * ratio];
    }
    getSpawnRangeForType(type) {
        const radius = this.typeToDef.get(type)?.radius ?? 18;
        const minX = radius + 2;
        const maxX = Math.max(minX, this.worldWidth - radius - 2);
        return [minX, maxX];
    }
    sortFruitType(left, right) {
        const [leftNum, rightNum] = [left, right].map((name) => {
            const match = name.match(/^fruit(\d+)$/i);
            return match ? Number(match[1]) : Number.NaN;
        });
        const leftIsNum = Number.isFinite(leftNum);
        const rightIsNum = Number.isFinite(rightNum);
        if (leftIsNum && rightIsNum)
            return leftNum - rightNum;
        if (leftIsNum)
            return -1;
        if (rightIsNum)
            return 1;
        return left.localeCompare(right);
    }
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    lerp(min, max, t) {
        return min + (max - min) * t;
    }
}
