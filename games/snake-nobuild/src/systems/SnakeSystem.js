import { getSetting } from "../config.js";

export class SnakeSystem {
  createSnake({
    id,
    name,
    isPlayer,
    head,
    angle,
    currentLength,
    radius,
    baseSpeed,
    colors,
    skinId = null,
  }) {
    const body = this.seedBody(head, angle, currentLength);
    return {
      id,
      name,
      isPlayer,
      head,
      angle,
      radius,
      baseSpeed,
      speed: baseSpeed,
      body,
      currentLength,
      targetLength: currentLength,
      alive: true,
      respawnTimer: 0,
      colors,
      skinId,
    };
  }

  createInitialPlayer(world) {
    return this.createSnake({
      id: "player",
      name: "You",
      isPlayer: true,
      head: { x: world.width * 0.5, y: world.height * 0.5 },
      angle: -Math.PI * 0.5,
      currentLength: this.getNumber("gameplay.params.initialLength", 320),
      radius: this.getNumber("gameplay.params.snakeRadius", 18),
      baseSpeed: this.getNumber("gameplay.params.baseSpeed", 190),
      colors: {
        body: this.getColor("theme.snakeBody", 0x5ef2b8),
        core: this.getColor("theme.snakeCore", 0xc8fff0),
        head: this.getColor("theme.snakeHead", 0x9bffdf),
      },
    });
  }

  updateSnake(snake, control, deltaSeconds, world, options = {}) {
    if (!snake.alive) return;
    const desiredAngle = control.desiredAngle ?? snake.angle;
    const turnRate = this.getNumber("gameplay.params.turnRate", 3.8);
    const maxTurn = turnRate * deltaSeconds;
    const delta = this.normalizeAngle(desiredAngle - snake.angle);
    snake.angle += this.clamp(delta, -maxTurn, maxTurn);

    const boostMultiplier = this.getNumber("gameplay.params.boostMultiplier", 1.72);
    snake.speed = snake.baseSpeed * (control.boosting ? boostMultiplier : 1);
    snake.currentLength = this.advanceVisibleLength(snake, deltaSeconds);

    snake.head = {
      x: snake.head.x + Math.cos(snake.angle) * snake.speed * deltaSeconds,
      y: snake.head.y + Math.sin(snake.angle) * snake.speed * deltaSeconds,
    };

    const allowBoundaryDeath = options.allowBoundaryDeath === true;
    if (!allowBoundaryDeath) {
      snake.head.x = this.clamp(snake.head.x, snake.radius, world.width - snake.radius);
      snake.head.y = this.clamp(snake.head.y, snake.radius, world.height - snake.radius);
    }

    snake.body.push({ x: snake.head.x, y: snake.head.y });
    snake.body = this.trimBodyToLength(snake.body, snake.currentLength);

    return {
      hitBoundary: allowBoundaryDeath ? this.isOutOfBounds(snake, world) : false,
    };
  }

  grow(snake, amount) {
    const referenceLength = Math.max(snake.currentLength, snake.targetLength);
    const softCapStart = this.getNumber("gameplay.params.growthSoftCapStart", 2200);
    const softCapRange = this.getNumber("gameplay.params.growthSoftCapRange", 1600);
    const minMultiplier = this.getNumber("gameplay.params.growthSoftCapMinMultiplier", 0.2);
    let multiplier = 1;

    if (referenceLength > softCapStart) {
      const overflowRatio = (referenceLength - softCapStart) / Math.max(1, softCapRange);
      multiplier = Math.max(minMultiplier, 1 / (1 + overflowRatio));
    }

    snake.targetLength += amount * multiplier;
  }

  killSnake(snake) {
    snake.alive = false;
    snake.speed = 0;
    snake.currentLength = 0;
    snake.targetLength = 0;
    snake.body = [];
  }

  checkHeadToBodyCollision(headSnake, targetSnake, skipTailCount = 6) {
    if (!headSnake.alive || !targetSnake.alive) return false;
    const head = headSnake.head;
    const threshold = (headSnake.radius * 1.08) ** 2;
    const points = targetSnake.body;
    if (points.length < 2) return false;

    const endIndex = Math.max(1, points.length - skipTailCount);
    for (let i = 0; i < endIndex - 1; i += 1) {
      const distanceSq = this.distanceToSegmentSquared(head, points[i], points[i + 1]);
      if (distanceSq <= threshold) return true;
    }

    return false;
  }

  isOutOfBounds(snake, world) {
    return (
      snake.head.x < snake.radius ||
      snake.head.x > world.width - snake.radius ||
      snake.head.y < snake.radius ||
      snake.head.y > world.height - snake.radius
    );
  }

  createDropPoints(snake, targetCount) {
    if (snake.body.length < 2 || targetCount <= 0) return [];
    const cumulative = [0];
    for (let i = 1; i < snake.body.length; i += 1) {
      const prev = snake.body[i - 1];
      const next = snake.body[i];
      cumulative.push(cumulative[cumulative.length - 1] + Math.hypot(next.x - prev.x, next.y - prev.y));
    }

    const totalLength = cumulative[cumulative.length - 1];
    if (totalLength <= 0) return snake.body.slice(0, targetCount).map((point) => ({ ...point }));

    const points = [];
    for (let i = 0; i < targetCount; i += 1) {
      const targetDistance = (i / Math.max(1, targetCount - 1)) * totalLength;
      let segmentIndex = 1;
      while (segmentIndex < cumulative.length && cumulative[segmentIndex] < targetDistance) {
        segmentIndex += 1;
      }
      const prevDistance = cumulative[segmentIndex - 1];
      const nextDistance = cumulative[segmentIndex] ?? prevDistance;
      const segmentSpan = Math.max(1e-6, nextDistance - prevDistance);
      const ratio = (targetDistance - prevDistance) / segmentSpan;
      const prev = snake.body[segmentIndex - 1];
      const next = snake.body[segmentIndex] ?? prev;
      points.push({
        x: prev.x + (next.x - prev.x) * ratio,
        y: prev.y + (next.y - prev.y) * ratio,
      });
    }
    return points;
  }

  seedBody(head, angle, length) {
    const points = [];
    const spacing = 8;
    const total = Math.max(8, Math.ceil(length / spacing));
    for (let i = total; i >= 0; i -= 1) {
      points.push({
        x: head.x - Math.cos(angle) * i * spacing,
        y: head.y - Math.sin(angle) * i * spacing,
      });
    }
    return points;
  }

  trimBodyToLength(body, maxLength) {
    if (body.length <= 1) return body;
    const kept = [body[body.length - 1]];
    let accumulated = 0;

    for (let i = body.length - 2; i >= 0; i -= 1) {
      const point = body[i];
      const next = kept[0];
      const segmentLength = Math.hypot(next.x - point.x, next.y - point.y);
      if (segmentLength === 0) continue;

      if (accumulated + segmentLength <= maxLength) {
        kept.unshift(point);
        accumulated += segmentLength;
        continue;
      }

      const remaining = Math.max(0, maxLength - accumulated);
      if (remaining > 0) {
        const ratio = remaining / segmentLength;
        kept.unshift({
          x: next.x + (point.x - next.x) * ratio,
          y: next.y + (point.y - next.y) * ratio,
        });
      }
      break;
    }

    return kept;
  }

  advanceVisibleLength(snake, deltaSeconds) {
    const growthSpeed = this.getNumber("gameplay.params.growthSmoothSpeed", 460);
    if (snake.currentLength >= snake.targetLength) return snake.currentLength;
    return Math.min(snake.targetLength, snake.currentLength + growthSpeed * deltaSeconds);
  }

  normalizeAngle(angle) {
    let value = angle;
    while (value > Math.PI) value -= Math.PI * 2;
    while (value < -Math.PI) value += Math.PI * 2;
    return value;
  }

  distanceToSegmentSquared(point, a, b) {
    const abX = b.x - a.x;
    const abY = b.y - a.y;
    const apX = point.x - a.x;
    const apY = point.y - a.y;
    const abLengthSq = abX * abX + abY * abY;
    if (abLengthSq === 0) {
      return apX * apX + apY * apY;
    }
    const t = this.clamp((apX * abX + apY * abY) / abLengthSq, 0, 1);
    const closestX = a.x + abX * t;
    const closestY = a.y + abY * t;
    const dx = point.x - closestX;
    const dy = point.y - closestY;
    return dx * dx + dy * dy;
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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
