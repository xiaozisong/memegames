export class BlockSystem {
  constructor(occupancySystem) {
    this.occupancySystem = occupancySystem;
  }

  isWormBlocked(worm, occupancy) {
    if (!worm || worm.removed) return false;
    for (const point of worm.path || []) {
      const topWormId = this.occupancySystem.getTopWormId(occupancy, point);
      if (topWormId && topWormId !== worm.id) {
        return true;
      }
    }
    return false;
  }

  collectBlockedIds(worms = [], occupancy) {
    const blockedIds = new Set();
    for (const worm of worms) {
      if (worm.removed) continue;
      if (this.isWormBlocked(worm, occupancy)) {
        blockedIds.add(worm.id);
      }
    }
    return blockedIds;
  }
}
