export function computeSceneLayout(width, height, world) {
  const viewportWidth = Math.max(1, Number(width || 0));
  const viewportHeight = Math.max(1, Number(height || 0));
  const worldWidth = Math.max(1, Number(world?.width ?? 1000));
  const worldHeight = Math.max(1, Number(world?.height ?? 1600));
  const topSafeInset = 72;
  const bottomSafeInset = 24;
  const availableHeight = Math.max(1, viewportHeight - topSafeInset - bottomSafeInset);
  const scale = Math.max(0.1, Math.min(viewportWidth / worldWidth, availableHeight / worldHeight));
  const sceneWidth = worldWidth * scale;
  const sceneHeight = worldHeight * scale;
  const sceneX = (viewportWidth - sceneWidth) * 0.5;
  const sceneY = topSafeInset + (availableHeight - sceneHeight) * 0.5;

  return {
    width: viewportWidth,
    height: viewportHeight,
    padding: 0,
    headerHeight: 0,
    footerHeight: 0,
    scene: {
      x: sceneX,
      y: sceneY,
      width: sceneWidth,
      height: sceneHeight,
      scale,
    },
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}
