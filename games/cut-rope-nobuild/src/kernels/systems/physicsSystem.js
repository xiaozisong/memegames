import { getActiveRopes } from "./levelSystem.js";

export function stepCandyPhysics(runtime, settings, dt, elapsedTime) {
  const candy = runtime?.candy;
  if (!candy) {
    return { activeRopeCount: 0 };
  }

  const activeRopes = getActiveRopes(runtime.ropes);
  const safeDt = clamp(dt, 0.001, 1 / 20);
  const gravity = Number(settings.gravity ?? 1800);
  const airDrag = Number(settings.airDrag ?? 0.06);
  const attachedDamping = Number(settings.attachedDamping ?? 0.14);
  const swayForce = Number(settings.swayForce ?? 240);
  const swayFrequency = Number(settings.swayFrequency ?? 0.55);

  if (activeRopes.length > 0) {
    const support = getSupportFrame(candy, activeRopes);
    const gravityAlongTangent = gravity * support.tangent.y;
    const driveForce = Math.sin(elapsedTime * Math.PI * 2 * swayFrequency) * swayForce;
    candy.vx += support.tangent.x * (gravityAlongTangent + driveForce) * safeDt;
    candy.vy += support.tangent.y * (gravityAlongTangent + driveForce) * safeDt;
  }

  candy.vy += gravity * safeDt;

  const damping = Math.exp(-(activeRopes.length > 0 ? attachedDamping : airDrag) * safeDt);
  candy.vx *= damping;
  candy.vy *= damping;

  candy.x += candy.vx * safeDt;
  candy.y += candy.vy * safeDt;

  solveRopeConstraints(candy, activeRopes, safeDt, Number(settings.constraintIterations ?? 4));
  candy.rotation = computeCandyRotation(candy, activeRopes);

  return { activeRopeCount: activeRopes.length };
}

function solveRopeConstraints(candy, activeRopes, dt, iterations) {
  if (activeRopes.length === 0) return;

  const totalIterations = Math.max(1, Math.round(iterations || 1));
  for (let iteration = 0; iteration < totalIterations; iteration += 1) {
    for (const rope of activeRopes) {
      const dx = candy.x - rope.anchor.x;
      const dy = candy.y - rope.anchor.y;
      const distance = Math.max(0.0001, Math.hypot(dx, dy));
      const normalX = dx / distance;
      const normalY = dy / distance;
      const correction = distance - rope.length;

      candy.x -= normalX * correction;
      candy.y -= normalY * correction;

      const radialVelocity = candy.vx * normalX + candy.vy * normalY;
      candy.vx -= normalX * radialVelocity * 0.9;
      candy.vy -= normalY * radialVelocity * 0.9;
    }
  }

  const maxVelocity = 1450;
  candy.vx = clamp(candy.vx, -maxVelocity, maxVelocity);
  candy.vy = clamp(candy.vy, -maxVelocity, maxVelocity);

  if (dt > 0) {
    candy.angularVelocity = clamp(candy.vx * 0.0032, -2.4, 2.4);
  }
}

function computeCandyRotation(candy, activeRopes) {
  if (activeRopes.length === 0) {
    return clamp(candy.rotation + candy.angularVelocity * (1 / 60), -1.3, 1.3);
  }

  const sum = activeRopes.reduce(
    (acc, rope) => {
      acc.x += candy.x - rope.anchor.x;
      acc.y += candy.y - rope.anchor.y;
      return acc;
    },
    { x: 0, y: 0 },
  );
  const angle = Math.atan2(sum.y, sum.x);
  return clamp(angle - Math.PI * 0.5, -1.15, 1.15);
}

function getSupportFrame(candy, activeRopes) {
  const sum = activeRopes.reduce(
    (acc, rope) => {
      acc.x += candy.x - rope.anchor.x;
      acc.y += candy.y - rope.anchor.y;
      return acc;
    },
    { x: 0, y: 0 },
  );
  const distance = Math.max(0.0001, Math.hypot(sum.x, sum.y));
  const normal = {
    x: sum.x / distance,
    y: sum.y / distance,
  };
  return {
    normal,
    tangent: {
      x: -normal.y,
      y: normal.x,
    },
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}
