export class LayerSystem {
  sortWorms(worms = []) {
    return [...worms].sort((left, right) => {
      const zDelta = (left.zIndex || 0) - (right.zIndex || 0);
      if (zDelta !== 0) return zDelta;
      return String(left.id || "").localeCompare(String(right.id || ""));
    });
  }
}
