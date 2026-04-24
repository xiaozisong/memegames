export function createGoalState(goal) {
  const goals = Array.isArray(goal) ? goal : [goal];
  return goals
    .filter(Boolean)
    .map((item) => ({
      type: item?.type ?? "collect",
      tileId: item?.tileId ?? "",
      target: Number(item?.target ?? 0),
      progress: 0,
    }));
}

export function applyGoalDelta(goalState, removedTiles) {
  if (!Array.isArray(goalState) || goalState.length === 0) return 0;
  let totalDelta = 0;
  for (const goal of goalState) {
    if (!goal || goal.type !== "collect") continue;
    const delta = removedTiles.filter((tile) => tile.kind === goal.tileId).length;
    goal.progress += delta;
    totalDelta += delta;
  }
  return totalDelta;
}

export function isGoalComplete(goalState) {
  if (!Array.isArray(goalState) || goalState.length === 0) return false;
  return goalState.every((goal) => goal.progress >= goal.target);
}

export function toGoalSnapshot(goalState, tileDefsById) {
  const items = Array.isArray(goalState)
    ? goalState.map((goal) => toGoalItemSnapshot(goal, tileDefsById)).filter(Boolean)
    : [];
  const primary = items[0] ?? createEmptyGoalSnapshot();
  return {
    ...primary,
    items,
    completed: items.length > 0 && items.every((item) => item.completed),
  };
}

function toGoalItemSnapshot(goalState, tileDefsById) {
  if (!goalState) return null;
  const tileDef = tileDefsById[goalState.tileId] ?? null;
  return {
    type: goalState.type,
    tileId: goalState.tileId,
    tileName: tileDef?.name ?? goalState.tileId,
    tileAsset: tileDef?.asset ?? "",
    tileGlow: tileDef?.glow ?? "",
    target: goalState.target,
    progress: goalState.progress,
    remaining: Math.max(0, goalState.target - goalState.progress),
    completed: goalState.progress >= goalState.target,
  };
}

function createEmptyGoalSnapshot() {
  return {
    type: "collect",
    tileId: "",
    tileName: "",
    tileAsset: "",
    tileGlow: "",
    target: 0,
    progress: 0,
    remaining: 0,
    completed: false,
  };
}
