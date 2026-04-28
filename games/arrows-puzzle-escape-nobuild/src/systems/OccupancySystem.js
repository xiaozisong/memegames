export class OccupancySystem {
  build(board, worms = []) {
    const grid = Array.from({ length: board.width }, () => Array.from({ length: board.height }, () => null));
    const layeredWorms = [...worms].sort((left, right) => {
      const zDelta = (left?.zIndex || 0) - (right?.zIndex || 0);
      if (zDelta !== 0) return zDelta;
      return String(left?.id || "").localeCompare(String(right?.id || ""));
    });

    for (const worm of layeredWorms) {
      if (worm.removed) continue;
      for (const point of worm.path || []) {
        if (!this.inBounds(board, point)) continue;
        grid[point.x][point.y] = worm.id;
      }
    }

    return { grid };
  }

  getTopWormId(occupancy, point) {
    if (!occupancy?.grid || !point) return null;
    return occupancy.grid?.[point.x]?.[point.y] ?? null;
  }

  inBounds(board, point) {
    return point.x >= 0 && point.y >= 0 && point.x < board.width && point.y < board.height;
  }

  serialize(occupancy, board) {
    const rows = [];
    for (let y = 0; y < board.height; y += 1) {
      const row = [];
      for (let x = 0; x < board.width; x += 1) {
        row.push(occupancy?.grid?.[x]?.[y] ?? null);
      }
      rows.push(row);
    }
    return rows;
  }
}
