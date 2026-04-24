import * as PIXI from "pixi.js";
import { gsap } from "gsap";
import { ParticleSystem } from "../common/ParticleSystem.js";

const BEST_KEY = "games:elimination-template:best";
const ADD_BLEND_MODE = PIXI.BLEND_MODES?.ADD ?? "add";
const BLOCK_MATERIAL_VERSION = 3;
const DEFAULT_BLOCK_COLOR_SEQUENCE = ["#fecb29", "#990ffc", "#199afc", "#cdff2e", "#fd0058", "#25ffcd"];
const GEM_COLOR_SEQUENCE = ["#fecb29", "#990ffc", "#199afc", "#cdff2e", "#fd0058", "#25ffcd"];
const GEM_COLOR_MAP = {
  red: "#fd0058",
  blue: "#199afc",
  green: "#25ffcd",
  yellow: "#fecb29",
  purple: "#990ffc",
  lime: "#cdff2e",
  pink: "#fd0058",
  cyan: "#25ffcd",
  magenta: "#990ffc",
  gold: "#fecb29",
};
let activeBlockColorSequence = [...DEFAULT_BLOCK_COLOR_SEQUENCE];

export async function mountBlockPlacementRenderer(root, kernel) {
  root.innerHTML = "";
  root.style.display = "grid";
  root.style.placeItems = "center";
  root.style.background = "#070910";

  const wrapper = document.createElement("div");
  wrapper.style.width = "100%";
  wrapper.style.height = "100%";
  wrapper.style.minHeight = "100dvh";
  wrapper.style.position = "relative";
  wrapper.style.touchAction = "none";
  wrapper.style.overflow = "hidden";
  root.appendChild(wrapper);

  const backgroundImage = document.createElement("img");
  backgroundImage.style.position = "absolute";
  backgroundImage.style.inset = "0";
  backgroundImage.style.width = "100%";
  backgroundImage.style.height = "100%";
  backgroundImage.style.objectFit = "cover";
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

  const backgroundAudio = document.createElement("audio");
  backgroundAudio.style.display = "none";
  backgroundAudio.muted = true;
  backgroundAudio.loop = true;
  backgroundAudio.autoplay = true;
  backgroundAudio.preload = "auto";
  wrapper.appendChild(backgroundAudio);

  const backgroundMusic = document.createElement("audio");
  backgroundMusic.style.display = "none";
  backgroundMusic.muted = true;
  backgroundMusic.loop = true;
  backgroundMusic.autoplay = true;
  backgroundMusic.preload = "auto";
  wrapper.appendChild(backgroundMusic);

  const particleCanvas = document.createElement("canvas");
  particleCanvas.style.position = "absolute";
  particleCanvas.style.inset = "0";
  particleCanvas.style.pointerEvents = "none";
  particleCanvas.style.zIndex = "5";
  wrapper.appendChild(particleCanvas);

  const particleSystem = new ParticleSystem(particleCanvas, {
    maxParticles: 200,
    gravity: 12,
    shadowBlur: 12,
  });
  syncParticleCanvasSize(particleSystem, wrapper);

  const app = new PIXI.Application();
  await app.init({
    resizeTo: wrapper,
    antialias: true,
    backgroundAlpha: 0,
    autoDensity: true,
  });
  app.canvas.style.position = "absolute";
  app.canvas.style.inset = "0";
  app.canvas.style.zIndex = "2";
  app.canvas.style.width = "100%";
  app.canvas.style.height = "100%";
  wrapper.appendChild(app.canvas);

  const stage = app.stage;
  stage.eventMode = "static";
  stage.hitArea = app.screen;

  let activeBackgroundMediaUrl = "";
  let activeBackgroundMediaType = "none";
  let activeBackgroundMusicUrl = "";
  let backgroundAudioUnlocked = false;

  const unlockBackgroundMediaAudio = () => {
    if (backgroundAudioUnlocked) return;
    backgroundAudioUnlocked = true;
    backgroundVideo.muted = false;
    backgroundAudio.muted = false;
    backgroundMusic.muted = false;
    backgroundVideo.volume = 1;
    backgroundAudio.volume = 1;
    backgroundMusic.volume = 0.55;
    if (activeBackgroundMediaType === "video" && activeBackgroundMediaUrl) {
      backgroundVideo.play().catch(() => {});
    }
    if (activeBackgroundMediaType === "audio" && activeBackgroundMediaUrl) {
      backgroundAudio.play().catch(() => {});
    }
    if (activeBackgroundMusicUrl) {
      backgroundMusic.play().catch(() => {});
    }
  };

  const backgroundLayer = new PIXI.Container();
  const uiLayer = new PIXI.Container();
  const overlayLayer = new PIXI.Container();
  overlayLayer.eventMode = "none";
  const animationLayer = new PIXI.Container();
  stage.addChild(backgroundLayer, overlayLayer, uiLayer, animationLayer);

  const boardGrid = new BoardGrid(uiLayer, app.renderer);
  const tray = new Tray(uiLayer, boardGrid);
  const hud = new HUD(uiLayer, () => {
    unlockBackgroundMediaAudio();
    kernel.dispatch({ type: "start_or_restart" });
  });
  const animation = new AnimationController(animationLayer, uiLayer, app.renderer, particleSystem);
  const dragController = new DragController(stage, boardGrid, tray, {
    onPreview: (preview) => kernel.dispatch({ type: "set_preview", ...preview }),
    onDrop: (drop) => {
      kernel.dispatch({ type: "place_at", ...drop });
      kernel.dispatch({ type: "clear_preview" });
    },
    onLeave: () => kernel.dispatch({ type: "clear_preview" }),
    onSelect: (index) => kernel.dispatch({ type: "select_piece", index }),
  });

  let activeSnapshot = kernel.getSnapshot();
  let previousEffectTick = -1;
  let previousBagPieceCount = countBagPieces(activeSnapshot?.state?.bag);
  let latestLayout = null;
  let latestBeamColor = "#33BDFF";

  window.addEventListener("pointerdown", unlockBackgroundMediaAudio, { once: true, capture: true });

  const render = (snapshot) => {
    activeSnapshot = snapshot;
    activeBlockColorSequence = Array.isArray(snapshot?.colors?.pieceColors) && snapshot.colors.pieceColors.length > 0
      ? snapshot.colors.pieceColors.filter((item) => typeof item === "string" && item.trim())
      : [...DEFAULT_BLOCK_COLOR_SEQUENCE];
    animation.sweepTransient();
    const mediaInfo = syncBackgroundMedia(
      {
        imageEl: backgroundImage,
        videoEl: backgroundVideo,
        audioEl: backgroundAudio,
      },
      snapshot.colors?.backgroundMedia ?? snapshot.colors?.backgroundVideo ?? "",
      snapshot.colors?.backgroundMediaType ?? "auto",
      activeBackgroundMediaUrl,
      activeBackgroundMediaType,
    );
    activeBackgroundMediaUrl = mediaInfo.url;
    activeBackgroundMediaType = mediaInfo.type;
    activeBackgroundMusicUrl = syncBackgroundMusic(
      backgroundMusic,
      snapshot.colors?.backgroundMusic ?? "",
      activeBackgroundMusicUrl,
    );
    drawBackground(backgroundLayer, snapshot, app.screen.width, app.screen.height);
    const layout = computeLayout(app.screen.width, app.screen.height, snapshot.rows, snapshot.cols);
    latestLayout = layout;
    latestBeamColor = snapshot.colors?.primary ?? "#33BDFF";

    boardGrid.render(snapshot, layout);
    tray.render(snapshot, layout);
    persistBest(snapshot.state.score);
    const best = Number.parseInt(localStorage.getItem(BEST_KEY) ?? "0", 10) || 0;
    hud.render(snapshot, best, layout);
    drawSceneOverlay(overlayLayer, snapshot, layout);

    if (snapshot.state.effects.tick !== previousEffectTick) {
      const effects = snapshot.state.effects;
      animation.playSnap(boardGrid, effects.placedCells);
      animation.playClear(boardGrid, effects.clearedCells, effects.lineBursts, layout);
      const currentBagPieceCount = countBagPieces(snapshot.state.bag);
      const isBagRefilledAfterFullUse =
        effects.placedCells.length > 0 && previousBagPieceCount === 1 && currentBagPieceCount === 3;
      if (isBagRefilledAfterFullUse) {
        animation.triggerDangerBeam();
      }
      if (effects.placedCells.length > 0) {
        animation.playShake(2.2, 0.14);
      }
      if (effects.clearedLines > 1 && effects.comboText) {
        animation.playCombo(effects.comboText, layout);
        animation.playShake(5.6, 0.24);
      }
      if (effects.gemBursts.length > 0) {
        const flights = effects.gemBursts
          .map((gem) => {
            const from = boardGrid.getCellCenter(gem.row, gem.col);
            const to = hud.getGemTargetCenter(gem.type);
            if (!from || !to) return null;
            return { from, to, color: colorByGem(gem.type) };
          })
          .filter(Boolean);
        animation.playGemFlights(flights);
      }
      previousEffectTick = effects.tick;
      previousBagPieceCount = currentBagPieceCount;
    }
    animation.renderDangerBeam(layout, latestBeamColor);
  };

  const unsubscribe = kernel.subscribe(render);
  const onResize = () => {
    stage.hitArea = app.screen;
    syncParticleCanvasSize(particleSystem, wrapper);
    render(activeSnapshot);
  };
  window.addEventListener("resize", onResize);

  const particleTicker = (ticker) => {
    const dt = ticker.deltaMS * 0.001;
    particleSystem.update(dt);
    particleSystem.render();
    if (boardGrid.shouldRefreshExpiredEffects()) {
      render(activeSnapshot);
      return;
    }
    if (latestLayout) {
      animation.renderDangerBeam(latestLayout, latestBeamColor);
    }
  };
  app.ticker.add(particleTicker);

  dragController.bind((payload) => {
    if (!activeSnapshot.state.started || activeSnapshot.state.isOver) return null;
    return activeSnapshot.state.bag[payload.index] ?? null;
  });

  const teardown = () => {
    unsubscribe();
    dragController.dispose();
    animation.dispose();
    boardGrid.dispose();
    app.ticker.remove(particleTicker);
    particleSystem.destroy();
    backgroundImage.removeAttribute("src");
    backgroundVideo.pause();
    backgroundVideo.removeAttribute("src");
    backgroundVideo.load();
    backgroundAudio.pause();
    backgroundAudio.removeAttribute("src");
    backgroundAudio.load();
    backgroundMusic.pause();
    backgroundMusic.removeAttribute("src");
    backgroundMusic.load();
    window.removeEventListener("resize", onResize);
    app.destroy(true, { children: true });
    wrapper.remove();
  };

  window.addEventListener("beforeunload", teardown, { once: true });
}

function persistBest(score) {
  const current = Number.parseInt(localStorage.getItem(BEST_KEY) ?? "0", 10) || 0;
  if (score > current) localStorage.setItem(BEST_KEY, String(score));
}

function colorByGem(type) {
  const key = String(type ?? "").toLowerCase();
  if (GEM_COLOR_MAP[key]) return GEM_COLOR_MAP[key];
  if (GEM_COLOR_SEQUENCE.length === 0) return "#a57cff";
  const idx = hashString(key || "gem") % GEM_COLOR_SEQUENCE.length;
  return GEM_COLOR_SEQUENCE[idx];
}

function colorByBlock(seed) {
  const key = String(seed ?? "").toLowerCase();
  if (activeBlockColorSequence.includes(key)) return key;
  if (activeBlockColorSequence.length === 0) return "#199afc";
  const idx = hashString(key || "block") % activeBlockColorSequence.length;
  return activeBlockColorSequence[idx];
}

function countBagPieces(bag) {
  if (!Array.isArray(bag)) return 0;
  let count = 0;
  for (const piece of bag) {
    if (piece) count += 1;
  }
  return count;
}

const COLOR_PARSE_CACHE = new Map();
let colorProbeContext = null;

function hexToNumber(colorValue, fallback = 0xffffff) {
  return parseColorValue(colorValue, intToHex(fallback)).int;
}

function computeLayout(width, height, rows, cols) {
  const safeWidth = Math.max(320, width);
  const safeHeight = Math.max(480, height);
  const compact = safeWidth < 520 || safeHeight < 760;
  const hudHeight = compact ? 112 : 130;
  const trayHeight = compact ? 138 : 164;
  const horizontalPadding = compact ? 12 : 18;
  const topGap = compact ? 8 : 10;
  const bottomGap = compact ? 10 : 14;
  const availableHeight = Math.max(220, safeHeight - hudHeight - trayHeight - topGap - bottomGap);
  const boardSize = Math.max(220, Math.min(safeWidth - horizontalPadding * 2, availableHeight));
  const boardX = (safeWidth - boardSize) * 0.5;
  const boardY = hudHeight + topGap + (compact ? 100 : 106);
  const cellGap = compact ? 4 : 5;
  const cellPadding = compact ? 10 : 12;
  const cellSize = (boardSize - cellPadding * 2 - cellGap * (cols - 1)) / cols;

  return {
    width: safeWidth,
    height: safeHeight,
    compact,
    hudHeight,
    trayHeight,
    boardX,
    boardY,
    boardSize,
    cellGap,
    cellPadding,
    cellSize,
    rows,
    cols,
  };
}

function drawBackground(layer, snapshot, width, height) {
  layer.removeChildren();
  const backgroundMediaUrl = String(snapshot?.colors?.backgroundMedia ?? snapshot?.colors?.backgroundVideo ?? "").trim();
  const backgroundMediaType = resolveBackgroundMediaType(backgroundMediaUrl, snapshot?.colors?.backgroundMediaType ?? "auto");
  const hasVisualBackground = isVisualBackgroundType(backgroundMediaType) && Boolean(backgroundMediaUrl);

  if (hasVisualBackground) {
    return;
  }

  const bg = new PIXI.Graphics();
  bg.rect(0, 0, width, height).fill({
    color: hexToNumber(snapshot.colors.bgTop, 0x080a19),
    alpha: 1,
  });
  bg.rect(0, height * 0.42, width, height * 0.58).fill({
    color: hexToNumber(snapshot.colors.bgBottom, 0x100925),
    alpha: 0.82,
  });
  layer.addChild(bg);

  // Cyberpunk fallback theme when no visual background asset is configured.
  const neonHaze = new PIXI.Graphics();
  neonHaze.ellipse(width * 0.5, height * 0.24, width * 0.46, height * 0.18).fill({
    color: hexToNumber(snapshot.colors.primary, 0x33bdff),
    alpha: 0.08,
  });
  neonHaze.ellipse(width * 0.58, height * 0.3, width * 0.3, height * 0.12).fill({
    color: hexToNumber(snapshot.colors.accent, 0x8a63ff),
    alpha: 0.065,
  });
  layer.addChild(neonHaze);

  const vignette = new PIXI.Graphics();
  vignette.rect(0, 0, width, height * 0.18).fill({ color: 0x04070f, alpha: 0.38 });
  vignette.rect(0, height * 0.82, width, height * 0.18).fill({ color: 0x04070f, alpha: 0.42 });
  vignette.rect(0, 0, width * 0.12, height).fill({ color: 0x04070f, alpha: 0.3 });
  vignette.rect(width * 0.88, 0, width * 0.12, height).fill({ color: 0x04070f, alpha: 0.3 });
  layer.addChild(vignette);

  const grid = new PIXI.Graphics();
  const step = 26;
  const color = hexToNumber(snapshot.colors.primary, 0x33bdff);
  for (let x = 0; x <= width; x += step) {
    grid.moveTo(x, 0).lineTo(x, height);
  }
  for (let y = 0; y <= height; y += step) {
    grid.moveTo(0, y).lineTo(width, y);
  }
  grid.stroke({ color, alpha: 0.045, width: 1 });
  layer.addChild(grid);

  const horizon = new PIXI.Graphics();
  horizon.rect(0, height * 0.62, width, 2).fill({
    color: hexToNumber(snapshot.colors.accent, 0x8a63ff),
    alpha: 0.22,
  });
  horizon.rect(0, height * 0.62 - 10, width, 20).fill({
    color: hexToNumber(snapshot.colors.primary, 0x33bdff),
    alpha: 0.035,
  });
  layer.addChild(horizon);

}

function drawSceneOverlay(layer, snapshot, layout) {
  layer.removeChildren();
  const overlayAlpha = clamp(Number(snapshot?.colors?.sceneOverlayAlpha ?? 0), 0, 1);
  const overlayImage = String(snapshot?.colors?.sceneOverlayImage ?? "").trim();
  const overlayImageAlpha = clamp(Number(snapshot?.colors?.sceneOverlayImageAlpha ?? 0), 0, 1);

  if (overlayAlpha > 0) {
    const shade = new PIXI.Graphics();
    shade.eventMode = "none";
    shade.rect(0, 0, layout.width, layout.height).fill({ color: 0x000000, alpha: overlayAlpha });
    layer.addChild(shade);
  }

  if (overlayImage) {
    const sprite = PIXI.Sprite.from(overlayImage);
    sprite.eventMode = "none";
    sprite.x = 0;
    sprite.y = 0;
    sprite.width = layout.width;
    sprite.height = layout.height;
    sprite.alpha = overlayImageAlpha;
    layer.addChild(sprite);
  }
}

function syncBackgroundMedia(elements, nextUrl, configuredType, currentUrl, currentType) {
  const imageEl = elements?.imageEl;
  const videoEl = elements?.videoEl;
  const audioEl = elements?.audioEl;
  const normalizedNext = typeof nextUrl === "string" ? nextUrl.trim() : "";
  const normalizedCurrent = typeof currentUrl === "string" ? currentUrl.trim() : "";
  const nextType = resolveBackgroundMediaType(normalizedNext, configuredType);

  if (!normalizedNext || nextType === "none") {
    clearBackgroundMedia(imageEl, videoEl, audioEl);
    return { url: "", type: "none" };
  }

  if (normalizedNext === normalizedCurrent && nextType === currentType) {
    resumeBackgroundMedia(imageEl, videoEl, audioEl, nextType);
    return { url: normalizedCurrent, type: currentType };
  }

  clearBackgroundMedia(imageEl, videoEl, audioEl);

  if (nextType === "image" || nextType === "gif") {
    if (imageEl) {
      imageEl.setAttribute("src", normalizedNext);
      imageEl.style.opacity = "1";
    }
    return { url: normalizedNext, type: nextType };
  }

  if (nextType === "video") {
    if (videoEl) {
      videoEl.setAttribute("src", normalizedNext);
      videoEl.style.opacity = "0";
      videoEl.load();
      videoEl.play().then(() => {
        videoEl.style.opacity = "1";
      }).catch(() => {
        videoEl.style.opacity = "0";
      });
    }
    return { url: normalizedNext, type: nextType };
  }

  if (nextType === "audio") {
    if (audioEl) {
      audioEl.setAttribute("src", normalizedNext);
      audioEl.load();
      audioEl.play().catch(() => {});
    }
    return { url: normalizedNext, type: nextType };
  }

  return { url: "", type: "none" };
}

function clearBackgroundMedia(imageEl, videoEl, audioEl) {
  if (imageEl) {
    imageEl.style.opacity = "0";
    imageEl.removeAttribute("src");
  }
  if (videoEl) {
    videoEl.pause();
    videoEl.style.opacity = "0";
    videoEl.removeAttribute("src");
    videoEl.load();
  }
  if (audioEl) {
    audioEl.pause();
    audioEl.removeAttribute("src");
    audioEl.load();
  }
}

function syncBackgroundMusic(audioEl, nextUrl, currentUrl) {
  const normalizedNext = typeof nextUrl === "string" ? nextUrl.trim() : "";
  const normalizedCurrent = typeof currentUrl === "string" ? currentUrl.trim() : "";

  if (!normalizedNext) {
    if (audioEl) {
      audioEl.pause();
      audioEl.removeAttribute("src");
      audioEl.load();
    }
    return "";
  }

  if (normalizedNext === normalizedCurrent) {
    if (audioEl?.paused) audioEl.play().catch(() => {});
    return normalizedCurrent;
  }

  if (audioEl) {
    audioEl.pause();
    audioEl.setAttribute("src", normalizedNext);
    audioEl.load();
    audioEl.play().catch(() => {});
  }
  return normalizedNext;
}

function resumeBackgroundMedia(imageEl, videoEl, audioEl, mediaType) {
  if (mediaType === "image" || mediaType === "gif") {
    if (imageEl) imageEl.style.opacity = "1";
    return;
  }
  if (mediaType === "video") {
    if (videoEl) {
      if (videoEl.paused) videoEl.play().catch(() => {});
      videoEl.style.opacity = "1";
    }
    return;
  }
  if (mediaType === "audio" && audioEl?.paused) {
    audioEl.play().catch(() => {});
  }
}

function resolveBackgroundMediaType(url, configuredType) {
  const explicit = String(configuredType ?? "auto").trim().toLowerCase();
  if (explicit && explicit !== "auto") {
    if (["video", "image", "gif", "audio"].includes(explicit)) return explicit;
    return "none";
  }
  if (!url) return "none";
  const cleanUrl = url.split("?")[0].toLowerCase();
  if (/\.(mp4|webm|ogg|mov|m4v)$/.test(cleanUrl)) return "video";
  if (/\.(gif)$/.test(cleanUrl)) return "gif";
  if (/\.(png|jpg|jpeg|webp|avif|svg)$/.test(cleanUrl)) return "image";
  if (/\.(mp3|wav|aac|m4a|oga|flac)$/.test(cleanUrl)) return "audio";
  return "video";
}

function isVisualBackgroundType(mediaType) {
  return mediaType === "image" || mediaType === "gif" || mediaType === "video";
}

function createMaskedMediaNode(url, configuredType, x, y, width, height, radius, alpha = 1) {
  const normalizedUrl = String(url ?? "").trim();
  const mediaType = resolveBackgroundMediaType(normalizedUrl, configuredType);
  if (!normalizedUrl || !isVisualBackgroundType(mediaType)) return null;

  const container = new PIXI.Container();
  container.eventMode = "none";
  container.x = x;
  container.y = y;

  const sprite = PIXI.Sprite.from(normalizedUrl);
  sprite.eventMode = "none";
  sprite.x = 0;
  sprite.y = 0;
  sprite.width = width;
  sprite.height = height;
  sprite.alpha = clamp(alpha, 0, 1);

  const mask = new PIXI.Graphics();
  mask.eventMode = "none";
  mask.roundRect(0, 0, width, height, Math.max(0, radius)).fill({ color: 0xffffff, alpha: 1 });

  container.addChild(sprite, mask);
  container.mask = mask;
  return container;
}

class BoardGrid {
  constructor(parent, renderer) {
    this.container = new PIXI.Container();
    this.boardPanel = new PIXI.Graphics();
    this.surfaceLayer = new PIXI.Container();
    this.cellLayer = new PIXI.Container();
    this.previewLayer = new PIXI.Container();
    this.container.addChild(this.boardPanel, this.surfaceLayer, this.cellLayer, this.previewLayer);
    parent.addChild(this.container);
    this.renderer = renderer;
    this.cellBounds = new Map();
    this.blockTextureCache = new Map();
    this.styleConfig = null;
    this.effectState = {
      tick: -1,
      expireAt: 0,
      placed: new Set(),
      clearing: new Set(),
      refreshPending: false,
    };
  }

  render(snapshot, layout) {
    this.layout = layout;
    this.styleConfig = snapshot.colors ?? {};
    this.cellBounds.clear();
    this.container.x = 0;
    this.container.y = 0;

    this.boardPanel.clear();
    destroyContainerChildren(this.surfaceLayer);
    const boardRadius = clamp(Number(snapshot.colors?.boardRadius ?? 22), 0, 40);
    const boardAlpha = clamp(Number(snapshot.colors?.boardAlpha ?? 0.92), 0, 1);
    this.boardPanel.roundRect(layout.boardX, layout.boardY, layout.boardSize, layout.boardSize, boardRadius).fill({
      color: hexToNumber(snapshot.colors.boardBg, 0x111a33),
      alpha: boardAlpha,
    });
    this.boardPanel.roundRect(
      layout.boardX + 2,
      layout.boardY + 2,
      layout.boardSize - 4,
      layout.boardSize - 4,
      Math.max(0, boardRadius - 2),
    ).fill({
      color: 0xffffff,
      alpha: 0.03,
    });
    const boardMedia = createMaskedMediaNode(
      snapshot.colors?.boardMedia,
      snapshot.colors?.boardMediaType ?? "auto",
      layout.boardX,
      layout.boardY,
      layout.boardSize,
      layout.boardSize,
      boardRadius,
      Number(snapshot.colors?.boardMediaAlpha ?? 0.24),
    );
    if (boardMedia) this.surfaceLayer.addChild(boardMedia);

    destroyContainerChildren(this.cellLayer);
    destroyContainerChildren(this.previewLayer);
    this.consumeEffectState(snapshot.state.effects);
    const preview = snapshot.state.preview;
    const previewSet = new Map();
    const now = performance.now();
    const isEffectActive = now <= this.effectState.expireAt;
    const placedSet = isEffectActive ? this.effectState.placed : EMPTY_SET;
    const clearingSet = isEffectActive ? this.effectState.clearing : EMPTY_SET;
    if (preview) {
      for (const item of preview.cells) {
        previewSet.set(`${item.row}:${item.col}`, preview.valid ? "valid" : "invalid");
      }
    }

    for (let row = 0; row < layout.rows; row += 1) {
      for (let col = 0; col < layout.cols; col += 1) {
        const x = layout.boardX + layout.cellPadding + col * (layout.cellSize + layout.cellGap);
        const y = layout.boardY + layout.cellPadding + row * (layout.cellSize + layout.cellGap);
        this.cellBounds.set(`${row}:${col}`, { x, y, w: layout.cellSize, h: layout.cellSize });
        const model = snapshot.state.board[row][col];
        const key = `${row}:${col}`;
        const previewState = previewSet.get(key) ?? "none";

        const cell = new PIXI.Graphics();
        const blockHex = colorByBlock(model.color);
        const fillColor = model.filled ? hexToNumber(blockHex, 0x3ab8ff) : 0x0a0a0a;
        let fillAlpha = model.filled ? 1 : 0.3;

        if (previewState === "valid") {
          fillAlpha = 0.8;
        } else if (previewState === "invalid") {
          fillAlpha = 0.72;
        }

        if (model.filled) {
          const blockState = clearingSet.has(key) ? "clearing" : placedSet.has(key) ? "active" : "normal";
          const blockDisplay = this.createBlockDisplay(blockHex, x, y, layout.cellSize, blockState);
          blockDisplay.alpha = fillAlpha;
          this.cellLayer.addChild(blockDisplay);
        } else {
          cell.roundRect(x, y, layout.cellSize, layout.cellSize, 8).fill({ color: fillColor, alpha: fillAlpha });
        }
        // gem marker is intentionally hidden in block cells (logic still active in kernel).
        if (!model.filled || previewState !== "none" || model.gemId) {
          this.cellLayer.addChild(cell);
        }

        if (previewState !== "none") {
          const isValid = previewState === "valid";
          const previewColor = 0xffffff;
          const overlay = new PIXI.Graphics();
          overlay.roundRect(x + 0.6, y + 0.6, layout.cellSize - 1.2, layout.cellSize - 1.2, 7.4).fill({
            color: previewColor,
            alpha: isValid ? 0.12 : 0.16,
          });
          overlay.roundRect(x + 2.2, y + 2.2, layout.cellSize - 4.4, layout.cellSize - 4.4, 6.2).fill({
            color: previewColor,
            alpha: isValid ? 0.22 : 0.28,
          });
          overlay.roundRect(x + 0.8, y + 0.8, layout.cellSize - 1.6, layout.cellSize - 1.6, 7.4).stroke({
            color: previewColor,
            alpha: isValid ? 0.42 : 0.52,
            width: 0.9,
          });
          overlay.roundRect(x + 2.8, y + 2.4, layout.cellSize - 5.6, Math.max(3.6, layout.cellSize * 0.22), 4.4).fill({
            color: previewColor,
            alpha: isValid ? 0.18 : 0.22,
          });
          this.previewLayer.addChild(overlay);
        }
      }
    }
  }

  getCellAtPosition(x, y) {
    if (!this.layout) return null;
    if (
      x < this.layout.boardX ||
      y < this.layout.boardY ||
      x > this.layout.boardX + this.layout.boardSize ||
      y > this.layout.boardY + this.layout.boardSize
    ) {
      return null;
    }
    const localX = x - this.layout.boardX - this.layout.cellPadding;
    const localY = y - this.layout.boardY - this.layout.cellPadding;
    const span = this.layout.cellSize + this.layout.cellGap;
    const col = Math.floor(localX / span);
    const row = Math.floor(localY / span);
    if (row < 0 || col < 0 || row >= this.layout.rows || col >= this.layout.cols) return null;
    return { row, col };
  }

  getCellCenter(row, col) {
    const box = this.cellBounds.get(`${row}:${col}`);
    if (!box) return null;
    return { x: box.x + box.w * 0.5, y: box.y + box.h * 0.5 };
  }

  getLinePoints(axis, index) {
    const out = [];
    if (axis === "row") {
      for (let col = 0; col < this.layout.cols; col += 1) {
        const center = this.getCellCenter(index, col);
        if (center) out.push(center);
      }
      return out;
    }
    if (axis === "column") {
      for (let row = 0; row < this.layout.rows; row += 1) {
        const center = this.getCellCenter(row, index);
        if (center) out.push(center);
      }
    }
    return out;
  }

  getPieceAnchorCenter(anchorRow, anchorCol, piece) {
    if (!this.layout || !piece) return null;
    const maxRow = Math.max(...piece.cells.map((cell) => cell.row)) + 1;
    const maxCol = Math.max(...piece.cells.map((cell) => cell.col)) + 1;
    const originX = this.layout.boardX + this.layout.cellPadding + anchorCol * (this.layout.cellSize + this.layout.cellGap);
    const originY = this.layout.boardY + this.layout.cellPadding + anchorRow * (this.layout.cellSize + this.layout.cellGap);
    const width = maxCol * this.layout.cellSize + (maxCol - 1) * this.layout.cellGap;
    const height = maxRow * this.layout.cellSize + (maxRow - 1) * this.layout.cellGap;
    return {
      x: originX + width * 0.5,
      y: originY + height * 0.5,
    };
  }

  createBlockDisplay(baseHex, x, y, cellSize, state = "normal") {
    const mediaNode = createMaskedMediaNode(
      this.styleConfig?.blockMedia,
      this.styleConfig?.blockMediaType ?? "auto",
      x,
      y,
      cellSize,
      cellSize,
      Math.max(6, cellSize * clamp(Number(this.styleConfig?.blockRadius ?? 0.24), 0.08, 0.42)),
      Number(this.styleConfig?.blockMediaAlpha ?? 1),
    );
    if (mediaNode) return mediaNode;

    const texturePack = this.getBlockTexture(baseHex, cellSize, state);
    const sprite = new PIXI.Sprite(texturePack.texture);
    sprite.x = x;
    sprite.y = y;
    sprite.scale.set(texturePack.scale);
    return sprite;
  }

  getBlockTexture(baseHex, cellSize, state = "normal") {
    const radiusRatio = clamp(Number(this.styleConfig?.blockRadius ?? 0.24), 0.08, 0.42);
    const key = `${BLOCK_MATERIAL_VERSION}|${Math.round(cellSize)}|${baseHex}|${state}|${radiusRatio}`;
    const hit = this.blockTextureCache.get(key);
    if (hit) return hit;

    const dpr = window.devicePixelRatio || 1;
    const quality = clamp(Math.round(dpr * 1.35), 1, 3);
    const padding = 0;
    const canvas = document.createElement("canvas");
    const full = cellSize * quality;
    canvas.width = full;
    canvas.height = full;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      const fallback = { texture: PIXI.Texture.WHITE, padding: 0 };
      this.blockTextureCache.set(key, fallback);
      return fallback;
    }
    ctx.setTransform(quality, 0, 0, quality, 0, 0);

    const w = cellSize;
    const h = cellSize;
    const x = 0;
    const y = 0;
    const radius = Math.max(6, cellSize * radiusRatio);
    const hsl = hexToHsl(baseHex);
    const stateBoost = state === "clearing" ? 8 : state === "active" ? 4 : 0;
    const topHue = (hsl.h + 6 + 360) % 360;
    const midHue = (hsl.h + 2 + 360) % 360;
    const bottomHue = (hsl.h - 8 + 360) % 360;
    const sat = clamp(hsl.s + 10 + stateBoost * 0.35, 48, 100);
    const topLight = clamp(hsl.l + 30 + stateBoost * 0.45, 52, 98);
    const midLight = clamp(hsl.l + 8 + stateBoost * 0.2, 34, 86);
    const bottomLight = clamp(hsl.l - 38 + stateBoost * 0.12, 12, 56);

    // 1. Body gradient: one directional light from top-right.
    const body = ctx.createLinearGradient(x + w * 0.78, y + h * 0.08, x + w * 0.22, y + h);
    body.addColorStop(0, hslToCss(topHue, clamp(sat + 8, 52, 100), topLight));
    body.addColorStop(0.24, hslToCss(midHue, sat, clamp(midLight + 4, 34, 90)));
    body.addColorStop(0.52, hslToCss(midHue, clamp(sat - 4, 40, 96), midLight));
    body.addColorStop(1, hslToCss(bottomHue, clamp(sat - 10, 32, 92), bottomLight));
    ctx.fillStyle = body;
    roundRectCanvas(ctx, x, y, w, h, radius);
    ctx.fill();

    ctx.save();
    roundRectCanvas(ctx, x + 0.6, y + 0.6, w - 1.2, h - 1.2, Math.max(4, radius - 1));
    ctx.clip();

    // 2. Single specular highlight: small and concentrated at top-right.
    const specX = x + w * 0.7;
    const specY = y + h * 0.25;
    const specRadius = clamp(w * 0.068, w * 0.05, w * 0.08);
    const spec = ctx.createRadialGradient(specX, specY, 0.2, specX, specY, specRadius);
    spec.addColorStop(0, state === "clearing" ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.86)");
    spec.addColorStop(0.32, "rgba(255,255,255,0.44)");
    spec.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = spec;
    ctx.fillRect(x, y, w, h);

    // 3. Bottom shadow: transparent to strong dark for gemstone depth.
    const depth = ctx.createLinearGradient(0, y + h * 0.4, 0, y + h);
    depth.addColorStop(0, "rgba(0,0,0,0)");
    depth.addColorStop(0.68, "rgba(0,0,0,0.24)");
    depth.addColorStop(1, state === "clearing" ? "rgba(0,0,0,0.48)" : "rgba(0,0,0,0.56)");
    ctx.fillStyle = depth;
    ctx.fillRect(x, y, w, h);
    ctx.restore();

    // 4. Thin rim light for crisp facet edge.
    ctx.strokeStyle = "rgba(255,255,255,0.34)";
    ctx.lineWidth = clamp(cellSize * 0.015, cellSize * 0.01, cellSize * 0.02);
    roundRectCanvas(ctx, x + 0.8, y + 0.8, w - 1.6, h - 1.6, Math.max(4, radius - 1));
    ctx.stroke();

    const texture = PIXI.Texture.from(canvas);
    const pack = { texture, padding, scale: 1 / quality };
    this.blockTextureCache.set(key, pack);
    return pack;
  }

  dispose() {
    for (const item of this.blockTextureCache.values()) {
      if (item.texture && item.texture !== PIXI.Texture.WHITE) {
        item.texture.destroy(true);
      }
    }
    this.blockTextureCache.clear();
  }

  consumeEffectState(effects) {
    if (!effects || effects.tick === this.effectState.tick) return;
    this.effectState.tick = effects.tick;
    this.effectState.expireAt = performance.now() + 220;
    this.effectState.placed = new Set((effects.placedCells ?? []).map((item) => `${item.row}:${item.col}`));
    this.effectState.clearing = new Set((effects.clearedCells ?? []).map((item) => `${item.row}:${item.col}`));
    this.effectState.refreshPending = this.effectState.placed.size > 0 || this.effectState.clearing.size > 0;
  }

  shouldRefreshExpiredEffects() {
    if (!this.effectState.refreshPending) return false;
    if (performance.now() <= this.effectState.expireAt) return false;
    this.effectState.refreshPending = false;
    return true;
  }

  getCellRect(row, col) {
    const box = this.cellBounds.get(`${row}:${col}`);
    if (!box) return null;
    return { ...box };
  }

  getRowRect(row) {
    if (!this.layout) return null;
    const first = this.getCellRect(row, 0);
    const last = this.getCellRect(row, this.layout.cols - 1);
    if (!first || !last) return null;
    return {
      x: first.x,
      y: first.y,
      width: last.x + last.w - first.x,
      height: first.h,
    };
  }
}

const EMPTY_SET = new Set();

class Tray {
  constructor(parent, boardGrid) {
    this.container = new PIXI.Container();
    this.pieceViews = [];
    this.boardGrid = boardGrid;
    parent.addChild(this.container);
  }

  render(snapshot, layout) {
    this.container.removeChildren();
    this.pieceViews = [];
    const cardH = layout.trayHeight - 10;
    const preferredBottomGap = layout.compact ? 8 : 10;
    const preferredY = layout.height - cardH - preferredBottomGap;
    const minY = layout.boardY + layout.boardSize + 6;
    const trayY = Math.max(minY, preferredY);
    const cardW = (layout.boardSize - 20) / 3;

    const trayShadeAlpha = clamp(Number(snapshot?.colors?.trayOverlayAlpha ?? 0), 0, 1);
    const trayOverlayImage = String(snapshot?.colors?.trayOverlayImage ?? "").trim();
    const trayOverlayImageAlpha = clamp(Number(snapshot?.colors?.trayOverlayImageAlpha ?? 0), 0, 1);

    if (trayShadeAlpha > 0 || trayOverlayImage) {
      const underlay = new PIXI.Graphics();
      underlay.eventMode = "none";
      underlay.roundRect(layout.boardX - 6, trayY - 8, layout.boardSize + 12, cardH + 16, 24).fill({
        color: 0x000000,
        alpha: trayShadeAlpha,
      });
      this.container.addChild(underlay);

      if (trayOverlayImage) {
        const sprite = PIXI.Sprite.from(trayOverlayImage);
        sprite.eventMode = "none";
        sprite.x = layout.boardX - 6;
        sprite.y = trayY - 8;
        sprite.width = layout.boardSize + 12;
        sprite.height = cardH + 16;
        sprite.alpha = trayOverlayImageAlpha;
        this.container.addChild(sprite);
      }
    }

    for (let index = 0; index < 3; index += 1) {
      const piece = snapshot.state.bag[index];
      const cardX = layout.boardX + index * (cardW + 10);

      const view = { index, bounds: { x: cardX, y: trayY, w: cardW, h: cardH }, piece };
      this.pieceViews.push(view);

      if (!piece) continue;
      const maxRow = Math.max(...piece.cells.map((c) => c.row)) + 1;
      const maxCol = Math.max(...piece.cells.map((c) => c.col)) + 1;
      const mini = Math.min(28, (cardW - 6) / Math.max(maxCol, maxRow));
      const offsetX = cardX + (cardW - maxCol * mini) * 0.5;
      const offsetY = trayY + (cardH - maxRow * mini) * 0.5;
      const miniCellSize = Math.max(14, mini - 0.5);
      for (const cell of piece.cells) {
        const x = offsetX + cell.col * mini;
        const y = offsetY + cell.row * mini;
        const baseHex = colorByBlock(piece.color);
        if (this.boardGrid?.createBlockDisplay) {
          const display = this.boardGrid.createBlockDisplay(baseHex, x, y, miniCellSize, "normal");
          this.container.addChild(display);
        } else {
          const g = new PIXI.Graphics();
          g.roundRect(x, y, miniCellSize, miniCellSize, Math.max(3, miniCellSize * 0.2)).fill({
            color: hexToNumber(baseHex, 0x3ab8ff),
          });
          g.roundRect(x, y, miniCellSize, miniCellSize, Math.max(3, miniCellSize * 0.2)).stroke({
            color: 0xa3f8ff,
            alpha: 0.6,
            width: 1,
          });
          this.container.addChild(g);
        }
      }
    }
  }

  hitPiece(x, y) {
    for (const piece of this.pieceViews) {
      const b = piece.bounds;
      if (x >= b.x && y >= b.y && x <= b.x + b.w && y <= b.y + b.h) return piece;
    }
    return null;
  }
}

class HUD {
  constructor(parent, onOverlayAction) {
    this.container = new PIXI.Container();
    this.onOverlayAction = onOverlayAction;
    this.gemAnchor = new Map();
    parent.addChild(this.container);
  }

  render(snapshot, best, layout) {
    this.container.removeChildren();
    this.gemAnchor.clear();
    const styles = snapshot.colors ?? {};
    const textResolution = Math.max(2, window.devicePixelRatio || 1);
    const hudPadding = 12;
    const cardGap = 12;
    const totalW = layout.width - hudPadding * 2 - cardGap * 2;
    const sideRatio = 0.27;
    const sideW = totalW * sideRatio;
    const middleW = totalW - sideW * 2;
    const cardWidths = [sideW, middleW, sideW];
    const baseCardH = layout.compact ? 68 : 84;
    const cardY = layout.compact ? 14 : 18;
    const labels = ["SCORE", "RULE", "BEST"];
    const values = [String(snapshot.state.score), snapshot.hudRuleText, String(best)];
    const ruleWrapWidth = Math.max(52, cardWidths[1] - 18);
    const ruleProbe = new PIXI.Text({
      text: values[1],
      style: {
        fill: hexToNumber(styles.hudValueRuleColor, 0xd4e2f8),
        fontSize: Number(styles.hudValueRuleFontSize ?? 11),
        fontWeight: "700",
        wordWrap: true,
        breakWords: true,
        wordWrapWidth: ruleWrapWidth,
        lineHeight: 13,
        fontFamily: styles.hudFontFamily || "Arial",
      },
    });
    ruleProbe.resolution = textResolution;
    const ruleRequiredHeight = Math.ceil((26 + ruleProbe.height + 12) - 0.5);
    ruleProbe.destroy();
    const cardHeights = [baseCardH, Math.max(baseCardH, ruleRequiredHeight), baseCardH];

    let cardX = hudPadding;
    for (let i = 0; i < 3; i += 1) {
      const cardW = cardWidths[i];
      const cardH = cardHeights[i];
      const x = cardX;
      const panelRadius = clamp(Number(styles.hudPanelRadius ?? 14), 6, 28);
      const aura = new PIXI.Graphics();
      aura.roundRect(x - 4, cardY - 4, cardW + 8, cardH + 8, panelRadius + 3).fill({
        color: i === 1 ? 0x936bff : 0x68f7ff,
        alpha: i === 1 ? 0.08 : 0.1,
      });
      aura.alpha = i === 1 ? 0.88 : 1;
      this.container.addChild(aura);
      const card = new PIXI.Graphics();
      drawGlowPanel(card, {
        x,
        y: cardY,
        w: cardW,
        h: cardH,
        radius: panelRadius,
        baseColor: hexToNumber(styles.hudPanelBg, 0x0a1230),
        baseAlpha: clamp(Number(styles.hudPanelAlpha ?? (i === 1 ? 0.45 : 0.56)), 0, 1),
        glowColor: i === 1 ? 0x936bff : 0x68f7ff,
        glowAlpha: i === 1 ? 0.36 : 0.58,
        innerAlpha: i === 1 ? 0.11 : 0.2,
      });
      this.container.addChild(card);
      const cardMedia = createMaskedMediaNode(
        styles.hudPanelMedia,
        styles.hudPanelMediaType ?? "auto",
        x,
        cardY,
        cardW,
        cardH,
        panelRadius,
        Number(styles.hudPanelMediaAlpha ?? 0.16),
      );
      if (cardMedia) this.container.addChild(cardMedia);

      const labelText = new PIXI.Text({
        text: labels[i],
        style: {
          fill: i === 1
            ? hexToNumber(styles.hudLabelRuleColor, 0xa5adc0)
            : hexToNumber(styles.hudLabelColor, i === 2 ? 0xb4d4e6 : 0xbfdcff),
          fontSize: i === 1
            ? Number(styles.hudRuleLabelFontSize ?? 10)
            : Number(styles.hudLabelFontSize ?? 11),
          fontWeight: i === 1 ? "600" : "700",
          letterSpacing: i === 1 ? 1.1 : 1.4,
          fontFamily: styles.hudFontFamily || "Arial",
        },
      });
      labelText.resolution = textResolution;
      labelText.x = Math.round(x + 10);
      labelText.y = Math.round(cardY + 8);
      if (i === 1) labelText.alpha = 0.82;
      if (i === 2) labelText.alpha = 0.9;
      this.container.addChild(labelText);

      const valueText = new PIXI.Text({
        text: values[i],
        style: {
          fill: i === 1
            ? hexToNumber(styles.hudValueRuleColor, 0xd4e2f8)
            : i === 2
              ? hexToNumber(styles.hudValueBestColor, 0xaedffd)
              : hexToNumber(styles.hudValueScoreColor, 0x7df7ff),
          fontSize: i === 1
            ? Number(styles.hudValueRuleFontSize ?? 11)
            : i === 2
              ? Number(styles.hudValueBestFontSize ?? 18)
              : Number(styles.hudValueScoreFontSize ?? 20),
          fontWeight: i === 1 ? "700" : i === 2 ? "700" : "800",
          wordWrap: i === 1,
          breakWords: i === 1,
          wordWrapWidth: i === 1 ? ruleWrapWidth : Math.max(52, cardW - 18),
          lineHeight: i === 1 ? 13 : undefined,
          fontFamily: styles.hudFontFamily || "Arial",
        },
      });
      valueText.resolution = textResolution;
      valueText.x = Math.round(x + 10);
      valueText.y = Math.round(cardY + 26);
      if (i === 1) valueText.alpha = 0.98;
      if (i === 2) valueText.alpha = 0.9; // BEST lighter than SCORE
      const maxValueWidth = Math.max(36, cardW - 18);
      if (i !== 1 && valueText.width > maxValueWidth) {
        const scale = clamp(maxValueWidth / valueText.width, 0.65, 1);
        valueText.scale.set(scale);
      }
      this.container.addChild(valueText);
      cardX += cardW + cardGap;
    }

    const scoreAnchor = { x: hudPadding + cardWidths[0] * 0.5, y: cardY + cardHeights[0] * 0.58 };
    for (const target of snapshot.gemTargets) {
      this.gemAnchor.set(target.id, scoreAnchor);
    }

    if (snapshot.state.overlay.visible) {
      const overlay = new PIXI.Graphics();
      overlay.rect(0, 0, layout.width, layout.height).fill({ color: 0x050a18, alpha: 0.62 });
      this.container.addChild(overlay);

      const cardW2 = Math.min(340, layout.width * 0.82);
      const cardH2 = 176;
      const x = (layout.width - cardW2) * 0.5;
      const y = (layout.height - cardH2) * 0.5;
      const overlayAura = new PIXI.Graphics();
      overlayAura.roundRect(x - 6, y - 6, cardW2 + 12, cardH2 + 12, 22).fill({
        color: 0x66f4ff,
        alpha: 0.1,
      });
      this.container.addChild(overlayAura);
      const card = new PIXI.Graphics();
      card.roundRect(x, y, cardW2, cardH2, 18).fill({ color: 0x0a1734, alpha: 0.95 });
      card.roundRect(x, y, cardW2, cardH2, 18).stroke({ color: 0x73f8ff, alpha: 0.72, width: 2 });
      this.container.addChild(card);

      const t1 = new PIXI.Text({
        text: snapshot.state.overlay.title,
        style: { fill: 0xe7f7ff, fontSize: 24, fontWeight: "800" },
      });
      t1.x = x + 24;
      t1.y = y + 24;
      this.container.addChild(t1);

      const t2 = new PIXI.Text({
        text: snapshot.state.overlay.body,
        style: { fill: 0xc8deff, fontSize: 14, wordWrap: true, wordWrapWidth: cardW2 - 48 },
      });
      t2.x = x + 24;
      t2.y = y + 66;
      this.container.addChild(t2);

      const btnW = 128;
      const btnH = 44;
      const bx = x + (cardW2 - btnW) * 0.5;
      const by = y + cardH2 - btnH - 20;
      const btnWrap = new PIXI.Container();
      btnWrap.x = bx + btnW * 0.5;
      btnWrap.y = by + btnH * 0.5;
      const btnGlow = new PIXI.Graphics();
      btnGlow.roundRect(-btnW * 0.5 - 6, -btnH * 0.5 - 6, btnW + 12, btnH + 12, 26).fill({ color: 0x66f4ff, alpha: 0.18 });
      btnWrap.addChild(btnGlow);
      const btn = new PIXI.Graphics();
      btn.roundRect(-btnW * 0.5, -btnH * 0.5, btnW, btnH, 22).fill({ color: 0x66f4ff, alpha: 0.95 });
      btn.roundRect(-btnW * 0.5, -btnH * 0.5, btnW, btnH, 22).stroke({ color: 0xffffff, alpha: 0.5, width: 1 });
      btnWrap.addChild(btn);
      const bt = new PIXI.Text({
        text: snapshot.state.overlay.buttonText,
        style: { fill: 0x09162d, fontSize: 16, fontWeight: "800" },
      });
      bt.x = -bt.width * 0.5;
      bt.y = -bt.height * 0.5;
      btnWrap.addChild(bt);
      btnWrap.eventMode = "static";
      btnWrap.cursor = "pointer";
      btnWrap.hitArea = new PIXI.Rectangle(-btnW * 0.5 - 8, -btnH * 0.5 - 8, btnW + 16, btnH + 16);
      let buttonPressed = false;
      gsap.to(btnGlow, {
        alpha: 0.28,
        duration: 0.9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      btnWrap.on("pointerover", () => {
        gsap.killTweensOf(btnWrap.scale);
        gsap.killTweensOf(btnGlow);
        gsap.to(btnWrap.scale, { x: 1.03, y: 1.03, duration: 0.16, ease: "power2.out" });
        gsap.to(btnGlow, { alpha: 0.34, duration: 0.16, ease: "power2.out" });
      });
      btnWrap.on("pointerout", () => {
        gsap.killTweensOf(btnWrap.scale);
        gsap.killTweensOf(btnGlow);
        gsap.to(btnWrap.scale, { x: 1, y: 1, duration: 0.18, ease: "power2.out" });
        gsap.to(btnGlow, { alpha: 0.22, duration: 0.18, ease: "power2.out" });
      });
      btnWrap.on("pointerdown", () => {
        buttonPressed = true;
        gsap.killTweensOf(btnWrap.scale);
        gsap.to(btnWrap.scale, { x: 0.96, y: 0.96, duration: 0.08, ease: "power2.out" });
        gsap.to(btnGlow, { alpha: 0.4, duration: 0.08, ease: "power2.out" });
      });
      btnWrap.on("pointerup", () => {
        const shouldTrigger = buttonPressed;
        buttonPressed = false;
        gsap.killTweensOf(btnWrap.scale);
        gsap.to(btnWrap.scale, { x: 1, y: 1, duration: 0.12, ease: "back.out(2)" });
        gsap.to(btnGlow, { alpha: 0.3, duration: 0.12, ease: "power2.out" });
        if (shouldTrigger) {
          gsap.fromTo(
            btnGlow,
            { alpha: 0.44 },
            { alpha: 0.24, duration: 0.16, ease: "power2.out" },
          );
          this.onOverlayAction();
        }
      });
      btnWrap.on("pointerupoutside", () => {
        buttonPressed = false;
        gsap.killTweensOf(btnWrap.scale);
        gsap.to(btnWrap.scale, { x: 1, y: 1, duration: 0.14, ease: "power2.out" });
        gsap.to(btnGlow, { alpha: 0.22, duration: 0.14, ease: "power2.out" });
      });
      this.container.addChild(btnWrap);
    }
  }

  getGemTargetCenter(type) {
    return this.gemAnchor.get(type) ?? null;
  }
}

class DragController {
  constructor(stage, boardGrid, tray, callbacks) {
    this.stage = stage;
    this.boardGrid = boardGrid;
    this.tray = tray;
    this.callbacks = callbacks;
    this.getPiece = null;
    this.dragging = false;
    this.dragPieceIndex = null;
    this.ghost = null;
    this.dragPiece = null;
    this.ghostVisualOffset = { x: 0, y: 0 };
    this.ghostNeedsInstantPosition = false;
  }

  bind(getPiece) {
    this.getPiece = getPiece;
    this.stage.on("pointerdown", this.onDown, this);
    this.stage.on("pointermove", this.onMove, this);
    this.stage.on("pointerup", this.onUp, this);
    this.stage.on("pointerupoutside", this.onUp, this);
  }

  onDown(event) {
    const x = event.global.x;
    const y = event.global.y;
    const hit = this.tray.hitPiece(x, y);
    if (!hit || !hit.piece) return;
    this.callbacks.onSelect(hit.index);
    this.dragging = true;
    this.dragPieceIndex = hit.index;
    this.dragPiece = hit.piece;
    this.ghost = this.createGhost(hit.piece);
    const base = this.boardGrid.layout?.cellSize ?? 22;
    this.ghostVisualOffset = {
      x: base * 0.08,
      y: -base * 0.16,
    };
    this.stage.addChild(this.ghost);
    this.ghostNeedsInstantPosition = true;
    this.moveGhost(x, y);
  }

  onMove(event) {
    if (!this.dragging || this.dragPieceIndex === null) return;
    const x = event.global.x;
    const y = event.global.y;
    this.moveGhost(x, y);
    const anchor = this.boardGrid.getCellAtPosition(x, y);
    if (!anchor) {
      this.callbacks.onLeave();
      this.moveGhost(x, y);
      return;
    }
    if (this.dragPiece) {
      const aligned = this.boardGrid.getPieceAnchorCenter(anchor.row, anchor.col, this.dragPiece);
      if (aligned) this.moveGhost(aligned.x + this.ghostVisualOffset.x, aligned.y + this.ghostVisualOffset.y);
      else this.moveGhost(x, y);
    }
    this.callbacks.onPreview({ row: anchor.row, col: anchor.col, pieceIndex: this.dragPieceIndex });
  }

  onUp(event) {
    if (!this.dragging || this.dragPieceIndex === null) return;
    const x = event.global.x;
    const y = event.global.y;
    const anchor = this.boardGrid.getCellAtPosition(x, y);
    if (anchor) this.callbacks.onDrop({ row: anchor.row, col: anchor.col, pieceIndex: this.dragPieceIndex });
    else this.callbacks.onLeave();
    this.destroyGhost();
    this.dragging = false;
    this.dragPieceIndex = null;
    this.dragPiece = null;
  }

  createGhost(piece) {
    const ghost = new PIXI.Container();
    ghost.alpha = 0.72;
    const maxRow = Math.max(...piece.cells.map((cell) => cell.row)) + 1;
    const maxCol = Math.max(...piece.cells.map((cell) => cell.col)) + 1;
    const boardCell = this.boardGrid.layout?.cellSize ?? 22;
    const boardGap = this.boardGrid.layout?.cellGap ?? 4;
    const size = Math.max(14, boardCell * 0.96);
    const step = size + boardGap * 0.85;
    const baseHex = colorByBlock(piece.color);
    for (const cell of piece.cells) {
      const x = cell.col * step;
      const y = cell.row * step;
      if (this.boardGrid?.createBlockDisplay) {
        const display = this.boardGrid.createBlockDisplay(baseHex, x, y, size - 1, "active");
        ghost.addChild(display);
      } else {
        const g = new PIXI.Graphics();
        g.roundRect(x, y, size - 1, size - 1, Math.max(4, size * 0.18)).fill({
          color: hexToNumber(baseHex, 0x3ab8ff),
        });
        g.roundRect(x, y, size - 1, size - 1, Math.max(4, size * 0.18)).stroke({
          color: 0xa6f9ff,
          alpha: 0.55,
          width: 1,
        });
        ghost.addChild(g);
      }
    }
    const totalW = maxCol * size + (maxCol - 1) * boardGap * 0.85;
    const totalH = maxRow * size + (maxRow - 1) * boardGap * 0.85;
    ghost.pivot.set(totalW * 0.5, totalH * 0.5);
    return ghost;
  }

  moveGhost(x, y) {
    if (!this.ghost) return;
    if (this.ghostNeedsInstantPosition) {
      gsap.killTweensOf(this.ghost);
      this.ghost.x = x;
      this.ghost.y = y;
      this.ghostNeedsInstantPosition = false;
      return;
    }
    gsap.to(this.ghost, {
      x,
      y,
      duration: 0.08,
      ease: "power2.out",
      overwrite: true,
    });
  }

  destroyGhost() {
    if (!this.ghost) return;
    gsap.killTweensOf(this.ghost);
    this.ghost.removeFromParent();
    this.ghost.destroy();
    this.ghost = null;
    this.ghostNeedsInstantPosition = false;
  }

  dispose() {
    this.stage.off("pointerdown", this.onDown, this);
    this.stage.off("pointermove", this.onMove, this);
    this.stage.off("pointerup", this.onUp, this);
    this.stage.off("pointerupoutside", this.onUp, this);
    this.destroyGhost();
  }
}

class AnimationController {
  constructor(animationLayer, uiLayer, renderer, particleSystem) {
    this.animationLayer = animationLayer;
    this.uiLayer = uiLayer;
    this.particleSystem = particleSystem;
    this.transientObjects = new Set();
    this.dangerBeam = new PIXI.Graphics();
    this.dangerBeam.blendMode = ADD_BLEND_MODE;
    this.beamStartAt = 0;
    this.beamActiveUntil = 0;
    this.beamDurationMs = 520;
    this.flashOverlay = new PIXI.Graphics();
    this.animationLayer.addChild(this.dangerBeam, this.flashOverlay);
    this.sparkTexture = this.createSparkTexture(renderer);
    this.flareTexture = this.createFlareTexture(renderer);
    this.smokeTexture = this.createSmokeTexture(renderer);
  }

  playSnap(boardGrid, placedCells) {
    for (const item of placedCells) {
      const center = boardGrid.getCellCenter(item.row, item.col);
      if (!center) continue;
      const cellRect = boardGrid.getCellRect(item.row, item.col);
      if (!cellRect) continue;
      const plate = new PIXI.Graphics();
      plate.roundRect(0, 0, cellRect.w, cellRect.h, 8).fill({ color: 0x9cfaff, alpha: 0.55 });
      plate.blendMode = ADD_BLEND_MODE;
      plate.pivot.set(cellRect.w * 0.5, cellRect.h * 0.5);
      plate.position.set(center.x, center.y);
      plate.scale.set(0.9);
      this.animationLayer.addChild(plate);
      this.trackTransient(plate, 500);
      gsap.to(plate.scale, { x: 1, y: 1, duration: 0.12, ease: "power2.out" });
      gsap.to(plate, {
        alpha: 0,
        duration: 0.16,
        ease: "power2.out",
        onComplete: () => this.disposeTransient(plate),
      });
    }
  }

  playClear(boardGrid, clearedCells, lineBursts = [], layout) {
    for (const item of clearedCells) {
      const cellRect = boardGrid.getCellRect(item.row, item.col);
      if (!cellRect) continue;
      const blast = new PIXI.Graphics();
      blast.roundRect(0, 0, cellRect.w, cellRect.h, 8).fill({ color: 0x74f8ff, alpha: 0.82 });
      blast.blendMode = ADD_BLEND_MODE;
      blast.pivot.set(cellRect.w * 0.5, cellRect.h * 0.5);
      blast.position.set(cellRect.x + cellRect.w * 0.5, cellRect.y + cellRect.h * 0.5);
      blast.scale.set(1);
      this.animationLayer.addChild(blast);
      this.trackTransient(blast, 700);
      gsap.to(blast.scale, { x: 1.28, y: 1.28, duration: 0.3, ease: "power2.out" });
      gsap.to(blast, { alpha: 0, duration: 0.3, ease: "power2.out", onComplete: () => this.disposeTransient(blast) });
    }

    if (lineBursts.length > 0 && layout) {
      const leadColor = colorByGem(lineBursts[0].gemType);
      this.playImpactFlash(layout, leadColor, 0.18);
    }

    for (const line of lineBursts) {
      const points = boardGrid.getLinePoints(line.axis, line.index);
      if (points.length === 0) continue;
      const colorHex = colorByGem(line.gemType);
      this.spawnLineBurst(points, line.axis, colorHex);
      if (line.axis === "row") this.playRowScanline(boardGrid, line.index, colorHex);
    }
  }

  playCombo(text, layout) {
    const combo = new PIXI.Text({
      text,
      style: {
        fill: 0x9ffbff,
        fontSize: 38,
        fontWeight: "900",
        stroke: 0x041226,
        strokeThickness: 4,
        dropShadow: true,
        dropShadowColor: 0x56f4ff,
        dropShadowBlur: 16,
        dropShadowDistance: 0,
      },
    });
    combo.x = layout.width * 0.5 - combo.width * 0.5;
    combo.y = layout.height * 0.52;
    combo.alpha = 1;
    combo.scale.set(0.75);
    this.animationLayer.addChild(combo);
    this.trackTransient(combo, 900);
    this.playComboAura(layout);
    this.playImpactFlash(layout, "#7df7ff", 0.26);
    gsap.to(combo, {
      y: layout.height * 0.52 - 28,
      alpha: 0,
      duration: 0.34,
      ease: "power2.out",
      onUpdate: () => {
        const p = 1 - Math.max(0, combo.alpha);
        combo.scale.set(0.75 + p * 0.45);
      },
      onComplete: () => this.disposeTransient(combo),
    });
  }

  playShake(amplitude = 5, duration = 0.22) {
    const baseX = this.uiLayer.x;
    const state = { t: 0 };
    gsap.to(state, {
      t: 1,
      duration,
      ease: "none",
      onUpdate: () => {
        const shake = Math.sin(state.t * 32) * (1 - state.t) * amplitude;
        this.uiLayer.x = baseX + shake;
      },
      onComplete: () => {
        this.uiLayer.x = baseX;
      },
    });
  }

  playGemFlights(entries) {
    for (const item of entries) {
      const orb = new PIXI.Graphics();
      orb.circle(item.from.x, item.from.y, 5).fill({ color: hexToNumber(item.color, 0xa57cff), alpha: 0.95 });
      this.animationLayer.addChild(orb);
      this.trackTransient(orb, 1100);
      gsap.to(orb, {
        x: item.to.x - item.from.x,
        y: item.to.y - item.from.y,
        alpha: 0,
        duration: 0.5,
        ease: "power2.in",
        onUpdate: () => {
          const p = 1 - Math.max(0, orb.alpha);
          orb.scale.set(1 - p * 0.5);
        },
        onComplete: () => this.disposeTransient(orb),
      });
    }
  }

  triggerDangerBeam() {
    const now = performance.now();
    this.beamStartAt = now;
    this.beamActiveUntil = now + this.beamDurationMs;
  }

  renderDangerBeam(layout, colorHex) {
    this.dangerBeam.clear();
    const now = performance.now();
    if (now > this.beamActiveUntil || this.beamStartAt <= 0) return;
    const progress = clamp((now - this.beamStartAt) / this.beamDurationMs, 0, 1);
    const yStart = layout.boardY + layout.boardSize * 0.52;
    const yEnd = layout.height + Math.max(12, layout.cellSize * 0.6);
    const y = yStart + (yEnd - yStart) * progress; // uniform downward speed
    const leftX = layout.boardX + 8;
    const rightX = layout.boardX + layout.boardSize - 8;
    const beamColor = hexToNumber(colorHex, 0x33bdff);
    const pulse = 0.45 + 0.35 * Math.abs(Math.sin(now / 170));

    // Horizontal beam from center region, moving down at constant speed.
    this.dangerBeam.moveTo(leftX, y).lineTo(rightX, y).stroke({
      color: beamColor,
      width: 7.4,
      alpha: pulse,
      cap: "round",
    });
    this.dangerBeam.moveTo(leftX, y).lineTo(rightX, y).stroke({
      color: 0xffffff,
      width: 1.9,
      alpha: 0.54,
      cap: "round",
    });
  }

  createSparkTexture(renderer) {
    const g = new PIXI.Graphics();
    g.roundRect(0, 0, 24, 6, 3).fill({ color: 0xffffff, alpha: 1 });
    const texture = renderer.generateTexture({
      target: g,
      frame: new PIXI.Rectangle(0, 0, 24, 6),
      resolution: 1,
    });
    g.destroy();
    return texture;
  }

  createFlareTexture(renderer) {
    const g = new PIXI.Graphics();
    g.circle(16, 16, 16).fill({ color: 0xffffff, alpha: 0.25 });
    g.circle(16, 16, 10).fill({ color: 0xffffff, alpha: 0.35 });
    g.circle(16, 16, 5).fill({ color: 0xffffff, alpha: 0.65 });
    const texture = renderer.generateTexture({
      target: g,
      frame: new PIXI.Rectangle(0, 0, 32, 32),
      resolution: 1,
    });
    g.destroy();
    return texture;
  }

  createSmokeTexture(renderer) {
    const g = new PIXI.Graphics();
    g.circle(20, 20, 18).fill({ color: 0xffffff, alpha: 0.18 });
    g.circle(20, 20, 12).fill({ color: 0xffffff, alpha: 0.12 });
    const texture = renderer.generateTexture({
      target: g,
      frame: new PIXI.Rectangle(0, 0, 40, 40),
      resolution: 1,
    });
    g.destroy();
    return texture;
  }

  spawnLineBurst(points, axis, colorHex) {
    const sample = points.filter((_, index) => index % 2 === 0);
    const ramp = buildGemGradientRamp(colorHex);
    const tint = ramp.tintStart;
    const baseDirection = axis === "row" ? Math.PI * 0.5 : 0;
    for (const point of sample) {
      // Usage example for generic Canvas ParticleSystem.
      this.particleSystem.spawnExplosion(point.x, point.y, {
        start: ramp.start,
        mid: ramp.mid,
        end: ramp.end,
      });

      const flare = new PIXI.Sprite(this.flareTexture);
      flare.anchor.set(0.5);
      flare.position.set(point.x, point.y);
      flare.tint = tint;
      flare.alpha = 0.9;
      flare.scale.set(0.25);
      flare.blendMode = ADD_BLEND_MODE;
      this.animationLayer.addChild(flare);
      this.trackTransient(flare, 800);
      gsap.to(flare, {
        alpha: 0,
        duration: 0.2,
        ease: "power2.out",
        onUpdate: () => {
          const p = 1 - Math.max(0, flare.alpha);
          flare.scale.set(0.25 + p * 0.85);
          flare.tint = gradientTintFromRamp(ramp, p);
        },
        onComplete: () => this.disposeTransient(flare),
      });

      for (let i = 0; i < 14; i += 1) {
        const spread = (Math.random() - 0.5) * (Math.PI * 0.9);
        const forward = Math.random() > 0.5 ? 1 : -1;
        const angle = baseDirection + spread * (axis === "row" ? 1 : 0.6) + (axis === "row" ? 0 : forward * Math.PI * 0.5);
        const distance = 22 + Math.random() * 48;
        const spark = new PIXI.Sprite(this.sparkTexture);
        spark.anchor.set(0.5);
        spark.position.set(point.x, point.y);
        spark.rotation = angle;
        spark.tint = tint;
        spark.alpha = 0.98;
        spark.scale.set(0.24 + Math.random() * 0.18, 0.08 + Math.random() * 0.06);
        spark.blendMode = ADD_BLEND_MODE;
        this.animationLayer.addChild(spark);
        this.trackTransient(spark, 900);
        gsap.to(spark, {
          x: point.x + Math.cos(angle) * distance,
          y: point.y + Math.sin(angle) * distance,
          alpha: 0,
          duration: 0.22 + Math.random() * 0.18,
          ease: "power2.out",
          onUpdate: () => {
            const p = 1 - Math.max(0, spark.alpha);
            spark.scale.x = Math.max(0.04, 0.38 - p * 0.26);
            spark.scale.y = Math.max(0.02, 0.11 - p * 0.08);
            spark.tint = gradientTintFromRamp(ramp, p);
          },
          onComplete: () => this.disposeTransient(spark),
        });
      }

      for (let i = 0; i < 4; i += 1) {
        const smoke = new PIXI.Sprite(this.smokeTexture);
        smoke.anchor.set(0.5);
        smoke.position.set(point.x, point.y);
        smoke.tint = tint;
        smoke.alpha = 0.22;
        smoke.scale.set(0.22 + Math.random() * 0.12);
        this.animationLayer.addChild(smoke);
        this.trackTransient(smoke, 1000);
        gsap.to(smoke, {
          x: point.x + (Math.random() - 0.5) * 34,
          y: point.y - 10 - Math.random() * 20,
          alpha: 0,
          duration: 0.38 + Math.random() * 0.18,
          ease: "power1.out",
          onUpdate: () => {
            const p = 1 - Math.max(0, smoke.alpha);
            smoke.scale.set(0.24 + p * 0.5);
            smoke.tint = gradientTintFromRamp(ramp, Math.min(1, p * 0.85));
          },
          onComplete: () => this.disposeTransient(smoke),
        });
      }
    }
  }

  playRowScanline(boardGrid, rowIndex, colorHex) {
    const rect = boardGrid.getRowRect(rowIndex);
    if (!rect) return;
    const beam = new PIXI.Graphics();
    const color = hexToNumber(colorHex, 0x7df7ff);
    const h = Math.max(6, rect.height * 0.42);
    beam.roundRect(0, 0, 64, h, h * 0.5).fill({ color, alpha: 0.78 });
    beam.blendMode = ADD_BLEND_MODE;
    beam.x = rect.x - 70;
    beam.y = rect.y + (rect.height - h) * 0.5;
    this.animationLayer.addChild(beam);
    this.trackTransient(beam, 700);
    const core = new PIXI.Graphics();
    core.roundRect(0, 0, 38, Math.max(3, h * 0.45), h * 0.3).fill({ color: 0xffffff, alpha: 0.92 });
    core.blendMode = ADD_BLEND_MODE;
    core.x = rect.x - 54;
    core.y = rect.y + (rect.height - Math.max(3, h * 0.45)) * 0.5;
    this.animationLayer.addChild(core);
    this.trackTransient(core, 700);
    gsap.to(beam, {
      x: rect.x + rect.width + 6,
      alpha: 0,
      duration: 0.3,
      ease: "power1.out",
      onComplete: () => this.disposeTransient(beam),
    });
    gsap.to(core, {
      x: rect.x + rect.width + 24,
      alpha: 0,
      duration: 0.3,
      ease: "power1.out",
      onComplete: () => this.disposeTransient(core),
    });
  }

  playImpactFlash(layout, colorHex, strength = 0.2) {
    gsap.killTweensOf(this.flashOverlay);
    this.flashOverlay.clear();
    this.flashOverlay.rect(0, 0, layout.width, layout.height).fill({
      color: hexToNumber(colorHex, 0x7df7ff),
      alpha: strength,
    });
    this.flashOverlay.blendMode = ADD_BLEND_MODE;
    this.flashOverlay.alpha = 1;
    gsap.to(this.flashOverlay, {
      alpha: 0,
      duration: 0.22,
      ease: "power2.out",
      onComplete: () => this.flashOverlay.clear(),
    });
  }

  playComboAura(layout) {
    const aura = new PIXI.Sprite(this.flareTexture);
    aura.anchor.set(0.5);
    aura.position.set(layout.width * 0.5, layout.height * 0.52);
    aura.tint = 0x7df7ff;
    aura.alpha = 0.88;
    aura.scale.set(0.7);
    aura.blendMode = ADD_BLEND_MODE;
    this.animationLayer.addChild(aura);
    this.trackTransient(aura, 900);
    gsap.to(aura, {
      alpha: 0,
      duration: 0.28,
      ease: "power2.out",
      onUpdate: () => {
        const p = 1 - Math.max(0, aura.alpha);
        aura.scale.set(0.7 + p * 1.15);
      },
      onComplete: () => this.disposeTransient(aura),
    });
  }

  trackTransient(displayObject, fallbackTtlMs = 900) {
    if (!displayObject) return;
    this.transientObjects.add(displayObject);
    if (fallbackTtlMs > 0) {
      displayObject.__cleanupTimer = window.setTimeout(() => {
        this.disposeTransient(displayObject);
      }, fallbackTtlMs);
    }
  }

  disposeTransient(displayObject) {
    if (!displayObject || displayObject.destroyed) return;
    if (displayObject.__cleanupTimer) {
      window.clearTimeout(displayObject.__cleanupTimer);
      displayObject.__cleanupTimer = 0;
    }
    this.transientObjects.delete(displayObject);
    gsap.killTweensOf(displayObject);
    if (displayObject.parent) displayObject.removeFromParent();
    displayObject.destroy();
  }

  sweepTransient() {
    for (const item of Array.from(this.transientObjects)) {
      if (!item || item.destroyed) {
        this.transientObjects.delete(item);
        continue;
      }
      if (!item.parent) {
        this.disposeTransient(item);
      }
    }
  }

  dispose() {
    for (const item of Array.from(this.transientObjects)) {
      this.disposeTransient(item);
    }
    this.transientObjects.clear();
    this.flashOverlay.clear();
    this.dangerBeam.clear();
    this.beamStartAt = 0;
    this.beamActiveUntil = 0;
    gsap.killTweensOf(this.flashOverlay);
    gsap.killTweensOf(this.dangerBeam);
    if (this.sparkTexture) this.sparkTexture.destroy(true);
    if (this.flareTexture) this.flareTexture.destroy(true);
    if (this.smokeTexture) this.smokeTexture.destroy(true);
  }
}

function tween(durationMs, onUpdate, onDone) {
  const state = { t: 0 };
  gsap.to(state, {
    t: 1,
    duration: durationMs / 1000,
    ease: "power2.out",
    onUpdate: () => onUpdate(state.t),
    onComplete: () => {
      if (onDone) onDone();
    },
  });
}

function syncParticleCanvasSize(particleSystem, wrapper) {
  const rect = wrapper.getBoundingClientRect();
  particleSystem.resize(rect.width, rect.height, window.devicePixelRatio || 1);
}

function destroyContainerChildren(container) {
  const removed = container.removeChildren();
  for (const child of removed) {
    child.destroy({ children: true });
  }
}

function drawRoundedBand(graphics, fromX, toX, centerY, thickness, color, alpha) {
  if (!graphics) return;
  const width = toX - fromX;
  if (!Number.isFinite(width) || width <= 0.5) return;
  const h = Math.max(1, thickness);
  const a = clamp(alpha, 0, 1);
  if (a <= 0) return;
  graphics.roundRect(fromX, centerY - h * 0.5, width, h, h * 0.5).fill({ color, alpha: a });
}

function drawGlowPanel(graphics, options) {
  if (!graphics || !options) return;
  const x = options.x ?? 0;
  const y = options.y ?? 0;
  const w = options.w ?? 0;
  const h = options.h ?? 0;
  const radius = options.radius ?? 12;
  const baseColor = options.baseColor ?? 0x0a1230;
  const baseAlpha = clamp(options.baseAlpha ?? 0.56, 0, 1);
  const glowColor = options.glowColor ?? 0x68f7ff;
  const glowAlpha = clamp(options.glowAlpha ?? 0.5, 0, 1);
  const innerAlpha = clamp(options.innerAlpha ?? 0.16, 0, 1);

  // Outer glow rim.
  graphics.roundRect(x - 1.5, y - 1.5, w + 3, h + 3, radius + 1).stroke({
    color: glowColor,
    alpha: glowAlpha,
    width: 2,
  });
  // Main panel body.
  graphics.roundRect(x, y, w, h, radius).fill({ color: baseColor, alpha: baseAlpha });
  // Inner panel glow.
  graphics.roundRect(x + 1.5, y + 1.5, w - 3, h - 3, Math.max(4, radius - 2)).fill({
    color: 0xffffff,
    alpha: innerAlpha,
  });
  // Sharp inner/outer edges.
  graphics.roundRect(x, y, w, h, radius).stroke({ color: 0xffffff, alpha: 0.08, width: 1 });
  graphics.roundRect(x + 1, y + 1, w - 2, h - 2, Math.max(4, radius - 1)).stroke({
    color: 0x081228,
    alpha: 0.48,
    width: 1,
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundRectCanvas(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function deriveBlockTones(hexColor, state = "normal") {
  const hsl = hexToHsl(hexColor);
  const hueJitter = ((hashString(hexColor) % 9) - 4) * 0.9;
  const hueStateShift = state === "clearing" ? 2.2 : state === "active" ? 1.1 : 0;
  const h = (hsl.h + hueJitter + hueStateShift + 360) % 360;
  const hTop = (h + 2.6 + 360) % 360;
  const hMid = h;
  const hBottom = (h - 3.1 + 360) % 360;
  const s = clamp(hsl.s + 10, 46, 98);
  const l = clamp(hsl.l + 10, 40, 86);
  const boost = state === "clearing" ? 13 : state === "active" ? 8 : 2;
  return {
    top: hslToCss(hTop, clamp(s + 14 + boost * 0.42, 54, 100), clamp(l + 22 + boost * 0.9, 50, 99)),
    mid: hslToCss(hMid, clamp(s + 7 + boost * 0.3, 46, 100), clamp(l + 10 + boost * 0.6, 40, 94)),
    bottom: hslToCss(hBottom, clamp(s + 1 + boost * 0.12, 28, 94), clamp(l - 8 + boost * 0.18, 28, 76)),
    edge: hslToCss(h, clamp(s + 12 + boost * 0.4, 50, 100), clamp(l + 16 + boost * 0.75, 34, 98)),
    glow: hslToCss(h, clamp(s + 16 + boost * 0.4, 58, 100), clamp(l + 16 + boost * 0.8, 44, 98)),
    glowSoft: hslaToCss(h, clamp(s + 10 + boost * 0.2, 44, 98), clamp(l + 10 + boost * 0.4, 36, 96), state === "normal" ? 0.16 : state === "active" ? 0.24 : 0.3),
    innerShadow: `hsla(${h.toFixed(1)} ${clamp(s - 18, 12, 78)}% ${clamp(l - 24, 18, 58)}% / ${state === "normal" ? "0.32" : state === "active" ? "0.38" : "0.44"})`,
    innerShadowStrong: `hsla(${hBottom.toFixed(1)} ${clamp(s - 16, 16, 80)}% ${clamp(l - 28, 16, 50)}% / ${state === "normal" ? "0.4" : state === "active" ? "0.46" : "0.52"})`,
    innerEdge: `hsla(${h.toFixed(1)} ${clamp(s - 26, 8, 70)}% ${clamp(l - 36, 8, 46)}% / ${state === "normal" ? "0.26" : state === "active" ? "0.34" : "0.42"})`,
  };
}

function hexToHsl(colorValue) {
  return parseColorValue(colorValue, "#3ab8ff").hsl;
}

function hslToCss(h, s, l) {
  return `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`;
}

function hslaToCss(h, s, l, a) {
  return `hsla(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}% / ${clamp(a, 0, 1).toFixed(3)})`;
}

function toAlphaColor(cssColor, alpha) {
  if (typeof cssColor !== "string") return cssColor;
  if (!cssColor.startsWith("hsl(")) return cssColor;
  return cssColor.replace("hsl(", "hsla(").replace(")", ` / ${clamp(alpha, 0, 1).toFixed(3)})`);
}

function buildGemGradientRamp(colorHex) {
  const start = normalizeHex(colorHex, "#7df7ff");
  const mid = "#ffffff";
  const end = mixHex(start, "#10152c", 0.58);
  return {
    start,
    mid,
    end,
    tintStart: hexToNumber(start, 0x7df7ff),
    tintMid: 0xffffff,
    tintEnd: hexToNumber(end, 0x36567d),
  };
}

function gradientTintFromRamp(ramp, progress) {
  const t = clamp(progress, 0, 1);
  if (t <= 0.5) {
    return lerpColorInt(ramp.tintStart, ramp.tintMid, t * 2);
  }
  return lerpColorInt(ramp.tintMid, ramp.tintEnd, (t - 0.5) * 2);
}

function lerpColorInt(a, b, t) {
  const p = clamp(t, 0, 1);
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = Math.round(ar + (br - ar) * p);
  const g = Math.round(ag + (bg - ag) * p);
  const bl = Math.round(ab + (bb - ab) * p);
  return (r << 16) | (g << 8) | bl;
}

function normalizeHex(value, fallback) {
  return parseColorValue(value, fallback).hex;
}

function mixHex(a, b, t) {
  const aa = parseColorValue(a, "#7df7ff");
  const bb = parseColorValue(b, "#10152c");
  const p = clamp(t, 0, 1);
  const r = Math.round(aa.r + (bb.r - aa.r) * p);
  const g = Math.round(aa.g + (bb.g - aa.g) * p);
  const bl = Math.round(aa.b + (bb.b - aa.b) * p);
  return rgbToHex(r, g, bl);
}

function expandShortHex(hex) {
  const raw = hex.replace("#", "");
  return raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
}

function parseColorValue(value, fallback = "#ffffff") {
  const input = typeof value === "string" ? value.trim() : "";
  const fallbackInput = typeof fallback === "string" ? fallback : intToHex(fallback);
  const cacheKey = `${input}__${fallbackInput}`;
  if (COLOR_PARSE_CACHE.has(cacheKey)) return COLOR_PARSE_CACHE.get(cacheKey);

  let parsed = parseHexColor(input);
  if (!parsed) {
    parsed = parseCssColor(input);
  }
  if (!parsed) {
    parsed = parseHexColor(fallbackInput) ?? parseCssColor(fallbackInput) ?? makeRgbColor(255, 255, 255, 1);
  }

  COLOR_PARSE_CACHE.set(cacheKey, parsed);
  return parsed;
}

function parseHexColor(value) {
  if (typeof value !== "string" || !value.startsWith("#")) return null;
  const raw = value.slice(1);
  if (![3, 4, 6, 8].includes(raw.length)) return null;
  const full = raw.length <= 4 ? raw.split("").map((item) => item + item).join("") : raw;
  const rgb = full.slice(0, 6);
  const alpha = full.length === 8 ? Number.parseInt(full.slice(6, 8), 16) / 255 : 1;
  const int = Number.parseInt(rgb, 16);
  if (!Number.isFinite(int)) return null;
  return makeRgbColor((int >> 16) & 255, (int >> 8) & 255, int & 255, alpha);
}

function parseCssColor(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  if (typeof document === "undefined") return null;
  if (typeof CSS !== "undefined" && typeof CSS.supports === "function" && !CSS.supports("color", value)) {
    return null;
  }
  const ctx = getColorProbeContext();
  if (!ctx) return null;

  ctx.clearRect(0, 0, 1, 1);
  ctx.globalCompositeOperation = "copy";
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, 1, 1);
  try {
    ctx.fillStyle = value;
  } catch {
    return null;
  }
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  return makeRgbColor(data[0], data[1], data[2], data[3] / 255);
}

function getColorProbeContext() {
  if (colorProbeContext) return colorProbeContext;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  colorProbeContext = canvas.getContext("2d", { willReadFrequently: true }) ?? canvas.getContext("2d");
  return colorProbeContext;
}

function makeRgbColor(r, g, b, a = 1) {
  const rr = clamp(Math.round(r), 0, 255);
  const gg = clamp(Math.round(g), 0, 255);
  const bb = clamp(Math.round(b), 0, 255);
  const aa = clamp(Number(a), 0, 1);
  return {
    r: rr,
    g: gg,
    b: bb,
    a: aa,
    int: (rr << 16) | (gg << 8) | bb,
    hex: rgbToHex(rr, gg, bb),
    hsl: rgbToHsl(rr, gg, bb),
    css: aa >= 0.999 ? rgbToHex(rr, gg, bb) : `rgba(${rr}, ${gg}, ${bb}, ${aa.toFixed(3)})`,
  };
}

function rgbToHex(r, g, b) {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function intToHex(value) {
  const safe = Number.isFinite(value) ? Number(value) : 0xffffff;
  return `#${(safe & 0xffffff).toString(16).padStart(6, "0")}`;
}

function rgbToHsl(r, g, b) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rr) h = ((gg - bb) / delta) % 6;
    else if (max === gg) h = (bb - rr) / delta + 2;
    else h = (rr - gg) / delta + 4;
  }
  h = (h * 60 + 360) % 360;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s: s * 100, l: l * 100 };
}

function hashString(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

