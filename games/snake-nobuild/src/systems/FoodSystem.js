import { getSetting } from "../config.js";

export class FoodSystem {
  constructor(random = Math.random) {
    this.random = random;
    this.nextFoodId = 1;
  }

  createInitialFood(world, avoidPoint) {
    const foods = [];
    this.ensureFoodCount(foods, world, avoidPoint);
    return foods;
  }

  ensureFoodCount(foods, world, avoidPoint) {
    const count = this.getNumber("gameplay.params.foodCount", 140);
    while (foods.length < count) {
      foods.push(this.spawnOne(world, avoidPoint));
    }
  }

  consume(foods, head, captureRadius) {
    const eaten = [];
    for (let i = foods.length - 1; i >= 0; i -= 1) {
      const item = foods[i];
      const distance = Math.hypot(item.x - head.x, item.y - head.y);
      if (distance <= captureRadius + item.radius) {
        eaten.push(item);
        foods.splice(i, 1);
      }
    }
    return eaten;
  }

  spawnOne(world, avoidPoint) {
    const safeDistance = this.getNumber("gameplay.params.foodSpawnSafeDistance", 260);
    const radiusMin = this.getNumber("gameplay.params.foodRadiusMin", 5);
    const radiusMax = this.getNumber("gameplay.params.foodRadiusMax", 10);
    let x = world.width * this.random();
    let y = world.height * this.random();

    if (avoidPoint) {
      let attempts = 0;
      while (attempts < 12 && Math.hypot(x - avoidPoint.x, y - avoidPoint.y) < safeDistance) {
        x = world.width * this.random();
        y = world.height * this.random();
        attempts += 1;
      }
    }

    return {
      id: this.nextFoodId++,
      x,
      y,
      radius: radiusMin + (radiusMax - radiusMin) * this.random(),
      color: this.pickColor(),
      phase: this.random() * Math.PI * 2,
    };
  }

  spawnBurstFromPoints(points, spread = 18) {
    const foods = [];
    const radiusMin = this.getNumber("gameplay.params.foodRadiusMin", 5);
    const radiusMax = this.getNumber("gameplay.params.foodRadiusMax", 10);

    for (const point of points) {
      foods.push({
        id: this.nextFoodId++,
        x: point.x + (this.random() - 0.5) * spread,
        y: point.y + (this.random() - 0.5) * spread,
        radius: radiusMin + (radiusMax - radiusMin) * this.random(),
        color: this.pickColor(),
        phase: this.random() * Math.PI * 2,
      });
    }

    return foods;
  }

  pickColor() {
    const palette = [
      this.getColor("theme.foodA", 0xffcc66),
      this.getColor("theme.foodB", 0x7ee7ff),
      this.getColor("theme.foodC", 0xff7ad9),
      this.getColor("theme.foodD", 0xa7ff83),
    ];
    return palette[Math.floor(this.random() * palette.length)];
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

  getColor(path, fallback) {
    const value = getSetting(path, fallback);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") return fallback;
    const normalized = value.trim();
    const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return fallback;
    return Number.parseInt(hex, 16);
  }
}
