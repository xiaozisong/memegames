import * as PIXI from "pixi.js";
import { BoardView } from "./components/BoardView.js";
import { HudView } from "./components/HudView.js";
import { OverlayView } from "./components/OverlayView.js";
import { AnimationController } from "./systems/AnimationController.js";
import { ParticleSystem } from "./systems/ParticleSystem.js";

export async function mountMatch3Renderer(root, kernel) {
  root.innerHTML = "";
  root.style.display = "grid";
  root.style.placeItems = "center";
  root.style.background = "oklch(0.18 0.05 280)";
  root.style.overflow = "hidden";

  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.width = "100%";
  wrapper.style.height = "100%";
  wrapper.style.minHeight = "100dvh";
  wrapper.style.overflow = "hidden";
  wrapper.style.touchAction = "none";
  root.appendChild(wrapper);

  const backgroundImage = document.createElement("img");
  backgroundImage.style.position = "absolute";
  backgroundImage.style.inset = "0";
  backgroundImage.style.width = "100%";
  backgroundImage.style.height = "100%";
  backgroundImage.style.objectFit = "cover";
  backgroundImage.style.objectPosition = "center";
  backgroundImage.style.pointerEvents = "none";
  backgroundImage.style.opacity = "0";
  backgroundImage.style.transition = "opacity 220ms ease";
  backgroundImage.style.zIndex = "0";
  wrapper.appendChild(backgroundImage);

  const backgroundVideo = document.createElement("video");
  backgroundVideo.style.position = "absolute";
  backgroundVideo.style.inset = "0";
  backgroundVideo.style.width = "100%";
  backgroundVideo.style.height = "100%";
  backgroundVideo.style.objectFit = "cover";
  backgroundVideo.style.objectPosition = "center";
  backgroundVideo.style.pointerEvents = "none";
  backgroundVideo.style.opacity = "0";
  backgroundVideo.style.transition = "opacity 220ms ease";
  backgroundVideo.style.zIndex = "0";
  backgroundVideo.muted = true;
  backgroundVideo.loop = true;
  backgroundVideo.autoplay = true;
  backgroundVideo.playsInline = true;
  backgroundVideo.preload = "auto";
  wrapper.appendChild(backgroundVideo);

  const particleCanvas = document.createElement("canvas");
  particleCanvas.style.position = "absolute";
  particleCanvas.style.inset = "0";
  particleCanvas.style.pointerEvents = "none";
  particleCanvas.style.zIndex = "2";
  wrapper.appendChild(particleCanvas);

  const particleSystem = new ParticleSystem(particleCanvas, {
    maxParticles: 360,
    gravity: 16,
    shadowBlur: 14,
  });
  syncParticleCanvasSize(particleSystem, wrapper);

  const backgroundMusic = document.createElement("audio");
  backgroundMusic.preload = "auto";
  backgroundMusic.loop = true;
  backgroundMusic.crossOrigin = "anonymous";

  const clearSoundTemplate = document.createElement("audio");
  clearSoundTemplate.preload = "auto";
  clearSoundTemplate.crossOrigin = "anonymous";
  const activeClearSounds = new Set();

  const app = new PIXI.Application();
  await app.init({
    resizeTo: wrapper,
    antialias: true,
    backgroundAlpha: 0,
    autoDensity: true,
  });

  app.canvas.style.position = "absolute";
  app.canvas.style.inset = "0";
  app.canvas.style.zIndex = "1";
  app.canvas.style.width = "100%";
  app.canvas.style.height = "100%";
  app.canvas.style.touchAction = "none";
  wrapper.appendChild(app.canvas);

  const stage = app.stage;
  stage.eventMode = "static";
  stage.hitArea = app.screen;

  let snapshot = kernel.getSnapshot();
  const textures = await preloadTileTextures(snapshot.tileDefs ?? []);
  const tileDefsById = Object.fromEntries((snapshot.tileDefs ?? []).map((item) => [item.id, item]));

  const backgroundLayer = new PIXI.Container();
  const uiLayer = new PIXI.Container();
  const animationLayer = new PIXI.Container();
  const overlayLayer = new PIXI.Container();
  stage.addChild(backgroundLayer, uiLayer, animationLayer, overlayLayer);

  const boardView = new BoardView(uiLayer, tileDefsById, textures, toColorNumber);
  const hudView = new HudView(uiLayer, toColorNumber);
  const overlayView = new OverlayView(overlayLayer, toColorNumber);
  const animationController = new AnimationController(
    animationLayer,
    boardView,
    toColorNumber,
    particleSystem,
    (removedTiles, clearSnapshot) => playClearSound(removedTiles, clearSnapshot, clearSoundTemplate, activeClearSounds),
  );

  let lastEffectTick = -1;
  let selectedCell = null;
  let dragState = null;
  let isAnimating = false;
  let activeBackgroundMediaUrl = "";
  let activeBackgroundMediaType = "none";
  let activeBackgroundMusicUrl = "";
  let hasUnlockedAudio = false;

  const renderSnapshot = async (nextSnapshot) => {
    snapshot = nextSnapshot;
    const goalCount = Array.isArray(snapshot.goal?.items) && snapshot.goal.items.length > 0 ? snapshot.goal.items.length : 1;
    const layout = computeLayout(app.screen.width, app.screen.height, snapshot.rows, snapshot.cols, snapshot.presentation, goalCount);
    const mediaFit = resolveMediaFit(snapshot.presentation?.backgroundMediaFit);
    const mediaPosition = resolveMediaPosition(snapshot.presentation?.backgroundMediaPosition);
    backgroundImage.style.objectFit = mediaFit;
    backgroundImage.style.objectPosition = mediaPosition;
    backgroundVideo.style.objectFit = mediaFit;
    backgroundVideo.style.objectPosition = mediaPosition;
    const mediaInfo = syncBackgroundMedia(
      { imageEl: backgroundImage, videoEl: backgroundVideo },
      snapshot.colors.backgroundMedia,
      snapshot.colors.backgroundMediaType,
      clamp(snapshot.colors.backgroundMediaOpacity ?? 0.34, 0, 1),
      activeBackgroundMediaUrl,
      activeBackgroundMediaType,
    );
    activeBackgroundMediaUrl = mediaInfo.url;
    activeBackgroundMediaType = mediaInfo.type;
    syncBackgroundMusic(backgroundMusic, snapshot.presentation, hasUnlockedAudio, activeBackgroundMusicUrl);
    activeBackgroundMusicUrl = typeof snapshot.presentation?.backgroundMusic === "string" ? snapshot.presentation.backgroundMusic.trim() : "";
    drawBackground(backgroundLayer, snapshot, layout);
    hudView.render(snapshot, layout);
    boardView.renderFrame(snapshot, layout);

    const effectTick = snapshot.state.effects?.tick ?? -1;
    if (effectTick > lastEffectTick) {
      if (snapshot.state.effects?.swap || snapshot.state.effects?.invalidSwap || (snapshot.state.effects?.steps?.length ?? 0) > 0) {
        isAnimating = true;
        await animationController.playEffect(snapshot.state.effects, snapshot);
        isAnimating = false;
      }
      lastEffectTick = effectTick;
    }

    boardView.syncBoard(snapshot.state.board);
    boardView.setSelected(selectedCell);
    overlayView.render(snapshot, layout);
  };

  const attemptSwap = (from, to) => {
    if (isAnimating) return;
    if (!from || !to) return;
    selectedCell = null;
    boardView.setSelected(null);
    kernel.dispatch({ type: "try_swap", from, to });
  };

  const onPointerDown = (event) => {
    if (overlayView.hitButton(event.global)) {
      overlayView.setButtonPressed(true);
      dragState = null;
      return;
    }
    if (snapshot.state.overlay?.visible || isAnimating) return;
    const cell = boardView.cellFromPoint(event.global);
    if (!cell) return;
    dragState = { start: cell, origin: { x: event.global.x, y: event.global.y }, committed: false };
  };

  const onPointerMove = (event) => {
    if (snapshot.state.overlay?.visible) {
      overlayView.setButtonPressed(overlayView.hitButton(event.global));
      return;
    }
    if (!dragState || dragState.committed || isAnimating) return;
    const dx = event.global.x - dragState.origin.x;
    const dy = event.global.y - dragState.origin.y;
    const threshold = boardView.layout.cellSize * 0.28;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const delta = horizontal ? { row: 0, col: dx > 0 ? 1 : -1 } : { row: dy > 0 ? 1 : -1, col: 0 };
    const target = { row: dragState.start.row + delta.row, col: dragState.start.col + delta.col };
    if (target.row < 0 || target.col < 0 || target.row >= snapshot.rows || target.col >= snapshot.cols) {
      dragState.committed = true;
      dragState = null;
      return;
    }
    dragState.committed = true;
    attemptSwap(dragState.start, target);
    dragState = null;
  };

  const onPointerUp = (event) => {
    if (snapshot.state.overlay?.visible) {
      const shouldTrigger = overlayView.buttonPressed && overlayView.hitButton(event.global);
      overlayView.setButtonPressed(false);
      if (shouldTrigger) {
        hasUnlockedAudio = true;
        void attemptBackgroundMusicStart(backgroundMusic, snapshot.presentation);
        kernel.dispatch({ type: "start_or_restart" });
      }
      dragState = null;
      return;
    }
    if (isAnimating) {
      dragState = null;
      return;
    }
    const cell = boardView.cellFromPoint(event.global);
    if (!cell) {
      selectedCell = null;
      boardView.setSelected(null);
      dragState = null;
      return;
    }
    if (dragState?.committed) {
      dragState = null;
      return;
    }
    dragState = null;

    if (!selectedCell) {
      selectedCell = cell;
      boardView.setSelected(selectedCell);
      return;
    }
    if (selectedCell.row === cell.row && selectedCell.col === cell.col) {
      selectedCell = null;
      boardView.setSelected(null);
      return;
    }
    if (!isAdjacent(selectedCell, cell)) {
      selectedCell = cell;
      boardView.setSelected(selectedCell);
      return;
    }
    attemptSwap(selectedCell, cell);
  };

  stage.on("pointerdown", onPointerDown);
  stage.on("pointermove", onPointerMove);
  stage.on("pointerup", onPointerUp);
  stage.on("pointerupoutside", onPointerUp);

  const unsubscribe = kernel.subscribe((nextSnapshot) => {
    void renderSnapshot(nextSnapshot);
  });

  const onResize = () => {
    stage.hitArea = app.screen;
    syncParticleCanvasSize(particleSystem, wrapper);
    void renderSnapshot(snapshot);
  };
  window.addEventListener("resize", onResize);

  const particleTicker = (ticker) => {
    const dt = Math.max(0.001, ticker.deltaMS / 1000);
    particleSystem.update(dt);
    particleSystem.render();
  };
  app.ticker.add(particleTicker);

  await renderSnapshot(snapshot);

  return () => {
    unsubscribe();
    window.removeEventListener("resize", onResize);
    app.ticker.remove(particleTicker);
    stage.off("pointerdown", onPointerDown);
    stage.off("pointermove", onPointerMove);
    stage.off("pointerup", onPointerUp);
    stage.off("pointerupoutside", onPointerUp);
    backgroundVideo.pause();
    backgroundMusic.pause();
    backgroundMusic.removeAttribute("src");
    clearSoundTemplate.removeAttribute("src");
    for (const audio of activeClearSounds) {
      audio.pause();
      audio.removeAttribute("src");
    }
    activeClearSounds.clear();
    particleSystem.destroy();
    app.destroy(true, { children: true });
  };
}

async function preloadTileTextures(tileDefs) {
  await Promise.all(tileDefs.map((item) => PIXI.Assets.load(item.asset)));
  return Object.fromEntries(tileDefs.map((item) => [item.asset, PIXI.Texture.from(item.asset)]));
}

function syncParticleCanvasSize(particleSystem, wrapper) {
  const rect = wrapper.getBoundingClientRect();
  particleSystem.resize(rect.width, rect.height, window.devicePixelRatio || 1);
}

function syncBackgroundMusic(audioEl, presentation, hasUnlockedAudio, activeUrl) {
  const nextUrl = typeof presentation?.backgroundMusic === "string" ? presentation.backgroundMusic.trim() : "";
  const nextVolume = clamp(Number(presentation?.backgroundMusicVolume ?? 0.42), 0, 1);
  audioEl.volume = nextVolume;
  if (!nextUrl) {
    audioEl.pause();
    audioEl.removeAttribute("src");
    return;
  }
  if (activeUrl !== nextUrl) {
    audioEl.src = nextUrl;
    audioEl.load();
  }
  if (hasUnlockedAudio) {
    void audioEl.play().catch(() => {});
  }
}

function attemptBackgroundMusicStart(audioEl, presentation) {
  const nextUrl = typeof presentation?.backgroundMusic === "string" ? presentation.backgroundMusic.trim() : "";
  if (!nextUrl) return Promise.resolve();
  audioEl.volume = clamp(Number(presentation?.backgroundMusicVolume ?? 0.42), 0, 1);
  if (audioEl.src !== nextUrl) {
    audioEl.src = nextUrl;
    audioEl.load();
  }
  return audioEl.play().catch(() => {});
}

function playClearSound(removedTiles, snapshot, clearSoundTemplate, activeClearSounds) {
  const presentation = snapshot?.presentation ?? {};
  const tileDefs = Array.isArray(snapshot?.tileDefs) ? snapshot.tileDefs : [];
  const fallbackUrl = typeof presentation?.clearSound === "string" ? presentation.clearSound.trim() : "";
  const uniqueKinds = Array.from(new Set((removedTiles ?? []).map((item) => item?.kind).filter(Boolean)));
  const resolvedUrls = uniqueKinds
    .map((kind) => {
      const customUrl = tileDefs.find((item) => item?.id === kind)?.sound;
      if (typeof customUrl === "string" && customUrl.trim()) return customUrl.trim();
      return fallbackUrl;
    })
    .filter((value, index, array) => typeof value === "string" && value.trim() && array.indexOf(value) === index)
    .slice(0, 3);

  if (resolvedUrls.length > 0) {
    const volume = clamp(Number(presentation?.clearSoundVolume ?? 0.8), 0, 1);
    for (const url of resolvedUrls) {
      playAudioInstance(url, volume, clearSoundTemplate, activeClearSounds);
    }
    return;
  }
}

function playAudioInstance(url, volume, template, activeAudioSet) {
  if (template.src !== url) {
    template.src = url;
    template.load();
  }
  template.volume = volume;
  const audio = template.cloneNode();
  audio.volume = template.volume;
  activeAudioSet.add(audio);
  const cleanup = () => {
    audio.pause();
    audio.removeEventListener("ended", cleanup);
    audio.removeEventListener("error", cleanup);
    activeAudioSet.delete(audio);
  };
  audio.addEventListener("ended", cleanup);
  audio.addEventListener("error", cleanup);
  void audio.play().catch(cleanup);
}

function computeLayout(width, height, rows, cols, presentation = {}, goalCount = 1) {
  const viewportWidth = Math.max(1, width);
  const viewportHeight = Math.max(1, height);
  const compact = viewportWidth < 460;
  const padding = clamp(viewportWidth * 0.04, 14, 24);
  const normalizedGoalCount = clamp(Number(goalCount || 1), 1, 4);
  const baseHudHeight = compact ? 108 : 120;
  const hudHeight = baseHudHeight + Math.max(0, normalizedGoalCount - 1) * (compact ? 22 : 18);
  const hudBoardGap = clamp(Number(presentation.hudBoardGap ?? 12), 4, 40);
  const footerHeight = compact ? 72 : 84;
  const boardMax = Math.max(220, Math.min(viewportWidth - padding * 2, viewportHeight * 0.58));
  const available = Math.min(viewportWidth - padding * 2, viewportHeight - hudHeight - hudBoardGap - footerHeight - padding * 3);
  const boardSize = clamp(available, 220, boardMax);
  const boardX = (viewportWidth - boardSize) * 0.5;
  const topBound = padding + hudHeight + hudBoardGap;
  const bottomBound = viewportHeight - footerHeight - padding;
  const centeredBoardY = topBound + Math.max(0, (bottomBound - topBound - boardSize) * 0.5);
  const verticalBias = clamp(Number(presentation.boardVerticalBias ?? 0.2), -1, 1);
  const downShift = Math.max(0, bottomBound - centeredBoardY - boardSize);
  const upShift = Math.max(0, centeredBoardY - topBound);
  const boardY = centeredBoardY + (verticalBias >= 0 ? downShift * verticalBias : upShift * verticalBias);
  const hudY = Math.max(padding, boardY - hudHeight - hudBoardGap);
  const cellSize = boardSize / Math.max(rows, cols, 1);
  return {
    width: viewportWidth,
    height: viewportHeight,
    padding,
    hudHeight,
    hudY,
    hudBoardGap,
    footerHeight,
    boardSize,
    boardX,
    boardY,
    boardRadius: clamp(boardSize * 0.065, 20, 30),
    cellSize,
    cellRadius: clamp(cellSize * 0.18, 10, 16),
  };
}

function drawBackground(layer, snapshot, layout) {
  clearContainer(layer);
  const backgroundMediaUrl = String(snapshot.colors?.backgroundMedia || "").trim();
  const backgroundMediaType = resolveMediaType(backgroundMediaUrl, snapshot.colors?.backgroundMediaType);
  if (backgroundMediaUrl && backgroundMediaType !== "none") {
    return;
  }

  const colors = snapshot.colors;
  const presentation = snapshot.presentation;
  const topColor = toColorNumber(colors.backgroundTop ?? colors.bg, 0x241238);
  const bottomColor = toColorNumber(colors.backgroundBottom ?? colors.grid, 0x4b2f7e);
  const primaryColor = toColorNumber(colors.primary, 0x906fff);
  const accentColor = toColorNumber(colors.accent, 0xff6bbd);
  const glowAlpha = clamp(presentation.backgroundGlowAlpha || 0.18, 0.04, 0.4);

  const bg = new PIXI.Graphics();
  const bands = 16;
  for (let index = 0; index < bands; index += 1) {
    const t0 = index / bands;
    const t1 = (index + 1) / bands;
    bg.rect(0, layout.height * t0, layout.width, Math.ceil(layout.height * (t1 - t0)) + 2).fill({
      color: mixColorNumbers(topColor, bottomColor, t0),
      alpha: 1,
    });
  }
  layer.addChild(bg);

  const haze = new PIXI.Graphics();
  haze.ellipse(layout.width * 0.5, layout.height * 0.14, layout.width * 0.38, layout.height * 0.11).fill({
    color: primaryColor,
    alpha: glowAlpha * 0.8,
  });
  haze.ellipse(layout.width * 0.2, layout.height * 0.32, layout.width * 0.22, layout.height * 0.16).fill({
    color: accentColor,
    alpha: glowAlpha * 0.58,
  });
  haze.ellipse(layout.width * 0.82, layout.height * 0.28, layout.width * 0.24, layout.height * 0.17).fill({
    color: primaryColor,
    alpha: glowAlpha * 0.52,
  });
  haze.ellipse(layout.width * 0.5, layout.height * 0.72, layout.width * 0.42, layout.height * 0.18).fill({
    color: accentColor,
    alpha: glowAlpha * 0.44,
  });
  haze.ellipse(layout.width * 0.5, layout.boardY + layout.boardSize * 0.46, layout.boardSize * 0.58, layout.boardSize * 0.24).fill({
    color: primaryColor,
    alpha: glowAlpha * 0.34,
  });
  haze.ellipse(layout.width * 0.5, layout.height * 1.02, layout.width * 0.78, layout.height * 0.22).fill({
    color: bottomColor,
    alpha: 0.22,
  });
  haze.blendMode = PIXI.BLEND_MODES?.ADD ?? "add";
  layer.addChild(haze);

  const softGlow = new PIXI.Graphics();
  softGlow.ellipse(layout.width * 0.5, layout.height * 0.18, layout.width * 0.24, layout.height * 0.06).fill({
    color: 0xffffff,
    alpha: glowAlpha * 0.12,
  });
  softGlow.ellipse(layout.width * 0.52, layout.height * 0.52, layout.width * 0.18, layout.height * 0.08).fill({
    color: 0xffffff,
    alpha: glowAlpha * 0.08,
  });
  softGlow.blendMode = PIXI.BLEND_MODES?.ADD ?? "add";
  layer.addChild(softGlow);

  const vignette = new PIXI.Graphics();
  vignette.rect(0, 0, layout.width, layout.height).fill({ color: topColor, alpha: 0.06 });
  vignette.rect(0, 0, layout.width, layout.height * 0.16).fill({ color: 0x04030a, alpha: 0.18 });
  vignette.rect(0, layout.height * 0.82, layout.width, layout.height * 0.18).fill({ color: 0x04030a, alpha: 0.16 });
  layer.addChild(vignette);
}

function syncBackgroundMedia(nodes, url, type, opacity, activeUrl, activeType) {
  const imageEl = nodes.imageEl;
  const videoEl = nodes.videoEl;
  const nextUrl = typeof url === "string" ? url.trim() : "";
  const nextType = resolveMediaType(nextUrl, type);

  if (!nextUrl || nextType === "none") {
    imageEl.style.opacity = "0";
    imageEl.removeAttribute("src");
    videoEl.style.opacity = "0";
    videoEl.pause();
    videoEl.removeAttribute("src");
    return { url: "", type: "none" };
  }

  if (nextType === "video") {
    imageEl.style.opacity = "0";
    imageEl.removeAttribute("src");
    if (activeUrl !== nextUrl || activeType !== "video") {
      videoEl.src = nextUrl;
      videoEl.load();
      void videoEl.play().catch(() => {});
    }
    videoEl.style.opacity = String(opacity);
    return { url: nextUrl, type: "video" };
  }

  videoEl.style.opacity = "0";
  videoEl.pause();
  videoEl.removeAttribute("src");
  if (activeUrl !== nextUrl || activeType !== nextType) {
    imageEl.src = nextUrl;
  }
  imageEl.style.opacity = String(opacity);
  return { url: nextUrl, type: nextType };
}

function resolveMediaType(url, preferredType) {
  const normalized = String(preferredType || "auto").trim().toLowerCase();
  if (normalized === "none") return "none";
  if (normalized === "video" || normalized === "image" || normalized === "gif") return normalized;
  const lower = String(url || "").toLowerCase();
  if (!lower) return "none";
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/.test(lower)) return "video";
  if (/\.gif(\?|#|$)/.test(lower)) return "gif";
  return "image";
}

function resolveMediaFit(value) {
  const normalized = String(value || "cover").trim().toLowerCase();
  return normalized === "contain" ? "contain" : "cover";
}

function resolveMediaPosition(value) {
  const normalized = String(value || "center center").trim().toLowerCase();
  const allowed = new Set(["left", "center", "right", "top", "bottom"]);
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1 && allowed.has(parts[0])) {
    return parts[0];
  }
  if (parts.length === 2 && allowed.has(parts[0]) && allowed.has(parts[1])) {
    return `${parts[0]} ${parts[1]}`;
  }
  return "center center";
}

function clearContainer(container) {
  const removed = container.removeChildren();
  for (const child of removed) child.destroy({ children: true });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function isAdjacent(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

function mixColorNumbers(a, b, t) {
  const p = clamp(t, 0, 1);
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * p);
  const g = Math.round(ag + (bg - ag) * p);
  const bMix = Math.round(ab + (bb - ab) * p);
  return (r << 16) | (g << 8) | bMix;
}

function toColorNumber(value, fallback = 0xffffff) {
  try {
    const color = new PIXI.Color(typeof value === "string" ? value : fallback);
    const [r, g, b] = color.toRgba();
    return (Math.round(clamp(r, 0, 1) * 255) << 16) | (Math.round(clamp(g, 0, 1) * 255) << 8) | Math.round(clamp(b, 0, 1) * 255);
  } catch {
    return fallback;
  }
}
