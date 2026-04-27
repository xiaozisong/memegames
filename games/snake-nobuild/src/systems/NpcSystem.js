import { getSetting } from "../config.js";

const NPC_NAMES = ["比比拉布", "良子", "嘎子", "潘子", "牢大", "郭老师", "耄耋", "曼波"];
const NPC_PALETTES = [
  { body: 0xff93a8, core: 0xffe1e8, head: 0xffc7d1 },
  { body: 0x9bbdff, core: 0xe8f0ff, head: 0xc2d7ff },
  { body: 0xffc062, core: 0xfff0d3, head: 0xffdeaa },
  { body: 0xc99aff, core: 0xf0e5ff, head: 0xddc0ff },
  { body: 0x97efb0, core: 0xe4ffea, head: 0xc0f8cc },
];
const NPC_SKIN_SLOT_COUNT = 6;

export class NpcSystem {
  constructor(random = Math.random) {
    this.random = random;
  }

  createNpcs(world, snakeSystem, avoidPoints = []) {
    const count = this.getNumber("gameplay.params.npcCount", 6);
    const skinPool = this.getNpcSkinPool();
    const npcs = [];
    for (let index = 0; index < count; index += 1) {
      const palette = NPC_PALETTES[index % NPC_PALETTES.length];
      const spawn = this.pickSpawnPoint(world, [...avoidPoints, ...npcs.map((npc) => npc.head)]);
      const skinId = this.pickNpcSkinId(skinPool, index);
      const npc = snakeSystem.createSnake({
        id: `npc-${index + 1}`,
        name: NPC_NAMES[index % NPC_NAMES.length],
        isPlayer: false,
        head: spawn,
        angle: this.random() * Math.PI * 2,
        currentLength: this.randomRange(
          this.getNumber("gameplay.params.npcInitialLengthMin", 240),
          this.getNumber("gameplay.params.npcInitialLengthMax", 560),
        ),
        radius: this.getNumber("gameplay.params.snakeRadius", 18),
        baseSpeed: this.getNumber("gameplay.params.baseSpeed", 190) * this.randomRange(0.88, 1.08),
        colors: palette,
        skinId,
      });
      npc.ai = this.createAiState(world);
      npcs.push(npc);
    }
    return npcs;
  }

  updateNpc(npc, state, snakeSystem, deltaSeconds) {
    if (!npc.alive) {
      if (npc.respawnTimer > 0) {
        npc.respawnTimer = Math.max(0, npc.respawnTimer - deltaSeconds);
      }
      return;
    }

    npc.ai.wanderTimer = Math.max(0, npc.ai.wanderTimer - deltaSeconds);
    const target = this.pickTarget(npc, state);
    const desiredAngle = Math.atan2(target.y - npc.head.y, target.x - npc.head.x);
    const distance = Math.hypot(target.x - npc.head.x, target.y - npc.head.y);

    snakeSystem.updateSnake(
      npc,
      {
        desiredAngle,
        boosting: distance > 320 && this.random() > 0.45,
      },
      deltaSeconds,
      state.world,
    );

    if (distance < 56 || npc.ai.wanderTimer <= 0) {
      npc.ai = this.createAiState(state.world);
    }
  }

  respawnNpc(npc, state, snakeSystem, avoidPoints = []) {
    const spawn = this.pickSpawnPoint(
      state.world,
      [
        state.playerSnake.head,
        ...avoidPoints,
        ...state.npcs.filter((item) => item.alive && item.id !== npc.id).map((item) => item.head),
      ],
    );
    const resetSnake = snakeSystem.createSnake({
      id: npc.id,
      name: npc.name,
      isPlayer: false,
      head: spawn,
      angle: this.random() * Math.PI * 2,
      currentLength: this.randomRange(
        this.getNumber("gameplay.params.npcInitialLengthMin", 240),
        this.getNumber("gameplay.params.npcInitialLengthMax", 560),
      ),
      radius: this.getNumber("gameplay.params.snakeRadius", 18),
      baseSpeed: this.getNumber("gameplay.params.baseSpeed", 190) * this.randomRange(0.9, 1.06),
      colors: npc.colors,
      skinId: npc.skinId ?? null,
    });

    npc.head = resetSnake.head;
    npc.angle = resetSnake.angle;
    npc.radius = resetSnake.radius;
    npc.speed = resetSnake.speed;
    npc.baseSpeed = resetSnake.baseSpeed;
    npc.body = resetSnake.body;
    npc.currentLength = resetSnake.currentLength;
    npc.targetLength = resetSnake.targetLength;
    npc.alive = true;
    npc.respawnTimer = 0;
    npc.ai = this.createAiState(state.world);
  }

  getNpcSkinPool() {
    const pool = [];
    for (let index = 1; index <= NPC_SKIN_SLOT_COUNT; index += 1) {
      const bodyUrl = this.getText(`asset_npc_skin_${index}_body_image`, "");
      const headUrl = this.getText(`asset_npc_skin_${index}_head_image`, "");
      if (bodyUrl || headUrl) {
        pool.push(`npc-skin-${index}`);
      }
    }
    return pool;
  }

  pickNpcSkinId(pool, index) {
    if (!Array.isArray(pool) || pool.length === 0) return null;
    const randomOffset = Math.floor(this.random() * pool.length);
    return pool[(index + randomOffset) % pool.length];
  }

  createAiState(world) {
    return {
      target: {
        x: this.random() * world.width,
        y: this.random() * world.height,
      },
      wanderTimer: this.randomRange(1.8, 4.2),
    };
  }

  pickTarget(npc, state) {
    let closestFood = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const food of state.foods) {
      const distance = Math.hypot(food.x - npc.head.x, food.y - npc.head.y);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestFood = food;
      }
    }

    if (closestFood && closestDistance < 560) {
      return { x: closestFood.x, y: closestFood.y };
    }

    if (state.playerSnake.alive && state.playerSnake.currentLength < npc.currentLength * 0.85) {
      const distanceToPlayer = Math.hypot(
        state.playerSnake.head.x - npc.head.x,
        state.playerSnake.head.y - npc.head.y,
      );
      if (distanceToPlayer < 420) {
        return { x: state.playerSnake.head.x, y: state.playerSnake.head.y };
      }
    }

    return npc.ai.target;
  }

  pickSpawnPoint(world, avoidPoints) {
    const margin = 220;
    let point = { x: world.width * 0.5, y: world.height * 0.5 };
    let attempts = 0;
    while (attempts < 24) {
      point = {
        x: margin + this.random() * Math.max(1, world.width - margin * 2),
        y: margin + this.random() * Math.max(1, world.height - margin * 2),
      };
      const isSafe = avoidPoints.every((item) => Math.hypot(point.x - item.x, point.y - item.y) >= 360);
      if (isSafe) return point;
      attempts += 1;
    }
    return point;
  }

  randomRange(min, max) {
    return min + (max - min) * this.random();
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

  getText(path, fallback) {
    const value = getSetting(path, fallback);
    return typeof value === "string" && value.length > 0 ? value : fallback;
  }
}
