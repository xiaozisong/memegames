export function collectTouchedStars(candy, stars) {
  if (!candy) return [];
  const collectedIds = [];

  for (const star of stars ?? []) {
    if (!star || star.collected) continue;
    const distance = Math.hypot(candy.x - star.x, candy.y - star.y);
    if (distance <= candy.radius + star.radius) {
      star.collected = true;
      collectedIds.push(star.id);
    }
  }

  return collectedIds;
}

export function isCandyInsideTarget(candy, target, padding = 0) {
  if (!candy || !target) return false;
  if (target.shape === "rect") {
    const halfWidth = Number(target.width ?? 0) * 0.5 + padding;
    const halfHeight = Number(target.height ?? 0) * 0.5 + padding;
    return (
      candy.x + candy.radius >= target.x - halfWidth &&
      candy.x - candy.radius <= target.x + halfWidth &&
      candy.y + candy.radius >= target.y - halfHeight &&
      candy.y - candy.radius <= target.y + halfHeight
    );
  }

  const targetRadius = Number(target.radius ?? 0) + candy.radius * 0.4 + padding;
  return Math.hypot(candy.x - target.x, candy.y - target.y) <= targetRadius;
}

export function isCandyOutOfBounds(candy, world, margin = 160) {
  if (!candy || !world) return true;
  return (
    candy.x < -margin ||
    candy.x > Number(world.width ?? 0) + margin ||
    candy.y < -margin ||
    candy.y > Number(world.height ?? 0) + margin
  );
}
