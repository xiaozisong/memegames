import * as PIXI from "pixi.js";
import {
  applyEntityDisplayScale,
  createEntityView,
  getAssetSource,
  getAssetViewKey,
  hasAssetSource,
  preloadAssetConfigs,
  toColorNumber,
} from "./RendererFactory.js";

export async function mountTowerDefenseRenderer(root, kernel) {
  const initialSnapshot = kernel.getSnapshot();

  if (typeof root.__pixiCleanup === "function") {
    root.__pixiCleanup();
  }

  root.innerHTML = "";
  root.style.display = "grid";
  root.style.placeItems = "center";
  root.style.background = initialSnapshot.world?.backgroundColor ?? "#0f172a";
  root.style.overflow = "hidden";

  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.width = "100%";
  wrapper.style.height = "100%";
  wrapper.style.minHeight = "100dvh";
  wrapper.style.overflow = "hidden";
  wrapper.style.touchAction = "manipulation";
  wrapper.style.background = initialSnapshot.world?.backgroundColor ?? "#0f172a";
  wrapper.style.backgroundPosition = "center";
  wrapper.style.backgroundRepeat = "no-repeat";
  wrapper.style.backgroundSize = "cover";
  root.appendChild(wrapper);

  const app = new PIXI.Application();
  await app.init({
    resizeTo: wrapper,
    antialias: true,
    backgroundAlpha: 0,
    autoDensity: true,
  });

  app.canvas.style.position = "absolute";
  app.canvas.style.inset = "0";
  app.canvas.style.width = "100%";
  app.canvas.style.height = "100%";
  wrapper.appendChild(app.canvas);

  await preloadAssetConfigs(Object.values(initialSnapshot.assets ?? {}));

  const stage = app.stage;
  stage.eventMode = "static";
  stage.hitArea = app.screen;

  const sceneRoot = new PIXI.Container();
  const screenUiLayer = new PIXI.Container();
  const backgroundLayer = new PIXI.Container();
  const slotLayer = new PIXI.Container();
  const entityLayer = new PIXI.Container();
  const healthLayer = new PIXI.Container();
  const uiLayer = new PIXI.Container();
  const overlayLayer = new PIXI.Container();
  sceneRoot.addChild(backgroundLayer, slotLayer, entityLayer, healthLayer, uiLayer, overlayLayer);
  stage.addChild(sceneRoot, screenUiLayer);

  const backgroundFill = new PIXI.Graphics();
  const backgroundGrid = new PIXI.Graphics();
  const slotGraphics = new PIXI.Graphics();
  const healthGraphics = new PIXI.Graphics();
  backgroundLayer.addChild(backgroundFill, backgroundGrid);
  slotLayer.addChild(slotGraphics);
  healthLayer.addChild(healthGraphics);

  const towerContainer = new PIXI.Container();
  const enemyContainer = new PIXI.Container();
  const bulletContainer = new PIXI.Container();
  const baseContainer = new PIXI.Container();
  const subBaseContainer = new PIXI.Container();
  entityLayer.addChild(towerContainer, enemyContainer, bulletContainer, subBaseContainer, baseContainer);

  const goldHudPanel = new PIXI.Graphics();
  const waveHudPanel = new PIXI.Graphics();
  const damageFlash = new PIXI.Graphics();
  const goldText = createText(28, 0xfacc15, "700");
  const waveText = createText(24, 0xffffff, "700");
  const baseInfoText = createText(16, 0xfef08a, "700");
  goldText.anchor.set(0.5);
  waveText.anchor.set(0.5);
  baseInfoText.style.align = "center";
  screenUiLayer.addChild(damageFlash, goldHudPanel, waveHudPanel, goldText, waveText);
  uiLayer.addChild(baseInfoText);

  const baseUpgradeHitArea = new PIXI.Graphics();
  baseUpgradeHitArea.eventMode = "static";
  baseUpgradeHitArea.cursor = "pointer";
  uiLayer.addChild(baseUpgradeHitArea);

  const overlayContainer = new PIXI.Container();
  const overlayShade = new PIXI.Graphics();
  const overlayCard = new PIXI.Graphics();
  const overlayImage = new PIXI.Sprite();
  overlayImage.anchor.set(0.5, 0);
  const overlayButton = new PIXI.Graphics();
  const overlayTitle = createText(42, 0xffffff, "700");
  overlayTitle.style.align = "center";
  const overlayBody = createText(20, 0xcbd5e1, "400");
  overlayBody.style.wordWrap = true;
  overlayBody.style.breakWords = true;
  overlayBody.style.wordWrapWidth = 460;
  overlayBody.style.align = "center";
  const overlayButtonText = createText(22, 0x08111f, "700");
  overlayButton.eventMode = "static";
  overlayButton.cursor = "pointer";
  bindOverlayButtonFeedback(overlayButton, overlayButtonText);
  overlayButton.on("pointertap", () => {
    audioController.unlock();
    audioController.playBgm();
    kernel.dispatch({ type: "start_or_restart" });
  });
  overlayContainer.addChild(overlayShade, overlayCard, overlayImage, overlayButton, overlayTitle, overlayBody, overlayButtonText);
  overlayLayer.addChild(overlayContainer);

  const dialogContainer = new PIXI.Container();
  const dialogShade = new PIXI.Graphics();
  const dialogCard = new PIXI.Graphics();
  const dialogTitle = createText(34, 0xffffff, "700");
  dialogTitle.style.align = "center";
  const dialogBody = createText(18, 0xcbd5e1, "400");
  dialogBody.style.wordWrap = true;
  dialogBody.style.wordWrapWidth = 420;
  dialogBody.style.align = "center";
  const dialogCancelButton = new PIXI.Graphics();
  const dialogConfirmButton = new PIXI.Graphics();
  const dialogCancelText = createText(20, 0xe2e8f0, "700");
  const dialogConfirmText = createText(20, 0x08111f, "700");
  dialogCancelButton.eventMode = "static";
  dialogCancelButton.cursor = "pointer";
  dialogConfirmButton.eventMode = "static";
  dialogConfirmButton.cursor = "pointer";
  dialogContainer.addChild(
    dialogShade,
    dialogCard,
    dialogCancelButton,
    dialogConfirmButton,
    dialogTitle,
    dialogBody,
    dialogCancelText,
    dialogConfirmText,
  );
  overlayLayer.addChild(dialogContainer);

  const slotTooltipContainer = new PIXI.Container();
  const slotTooltipCard = new PIXI.Graphics();
  const slotTooltipLabel = createText(18, 0xe2e8f0, "700");
  slotTooltipLabel.style.wordWrap = true;
  slotTooltipLabel.style.breakWords = true;
  slotTooltipLabel.style.align = "center";
  const slotTooltipCancelButton = new PIXI.Graphics();
  const slotTooltipConfirmButton = new PIXI.Graphics();
  const slotTooltipCancelText = createText(16, 0xcbd5e1, "700");
  const slotTooltipConfirmText = createText(16, 0x08111f, "700");
  slotTooltipContainer.addChild(
    slotTooltipCard,
    slotTooltipLabel,
    slotTooltipCancelButton,
    slotTooltipConfirmButton,
    slotTooltipCancelText,
    slotTooltipConfirmText,
  );
  uiLayer.addChild(slotTooltipContainer);
  slotTooltipCancelButton.eventMode = "static";
  slotTooltipCancelButton.cursor = "pointer";
  slotTooltipConfirmButton.eventMode = "static";
  slotTooltipConfirmButton.cursor = "pointer";

  const towerViews = new Map();
  const enemyViews = new Map();
  const bulletViews = new Map();
  const slotButtons = new Map();
  let baseView = null;
  let subBaseView = null;
  let snapshot = initialSnapshot;
  const runtime = {
    snapshot,
    previousSnapshot: snapshot,
    dialog: createDialogState(),
    slotTooltip: createSlotTooltipState(),
    hitFlashMs: 0,
    towerPulseMs: new Map(),
  };
  const audioController = createAudioController(initialSnapshot.audio);

  const onUserInteract = () => {
    audioController.unlock();
    if (runtime.snapshot?.state?.started) {
      audioController.playBgm();
    }
  };
  wrapper.addEventListener("pointerdown", onUserInteract, { passive: true });

  dialogCancelButton.on("pointertap", () => {
    closeDialog(runtime);
    renderSnapshot(runtime.snapshot);
  });
  dialogConfirmButton.on("pointertap", () => {
    const onConfirm = runtime.dialog.onConfirm;
    closeDialog(runtime);
    if (typeof onConfirm === "function") onConfirm();
    renderSnapshot(runtime.snapshot);
  });
  slotTooltipCancelButton.on("pointertap", () => {
    closeSlotTooltip(runtime);
    renderSnapshot(runtime.snapshot);
  });
  slotTooltipConfirmButton.on("pointertap", () => {
    const onConfirm = runtime.slotTooltip.onConfirm;
    closeSlotTooltip(runtime);
    if (typeof onConfirm === "function") onConfirm();
    renderSnapshot(runtime.snapshot);
  });

  baseUpgradeHitArea.on("pointertap", () => {
    if (snapshot.state.overlay?.visible || runtime.dialog.visible || !snapshot.state.started || snapshot.state.isOver) return;
    closeSlotTooltip(runtime);
    const nextCost = snapshot.state.base.nextUpgradeCost;
    if (nextCost == null) {
      openInfoDialog(runtime, "基地已满级", "当前基地等级已经达到上限。");
      renderSnapshot(runtime.snapshot);
      return;
    }
    openSlotTooltip(
      runtime,
      snapshot.state.base.x,
      snapshot.state.base.y,
      `是否升级主基地？所需花费${nextCost}$。`,
      "取消",
      "升级",
      () => {
        kernel.dispatch({ type: "upgrade_base" });
      },
    );
    renderSnapshot(runtime.snapshot);
  });

  function renderSnapshot(nextSnapshot) {
    const previousSnapshot = runtime.snapshot;
    const deltaMs = Math.max(0, Number(nextSnapshot?.state?.timeMs ?? 0) - Number(previousSnapshot?.state?.timeMs ?? 0));
    updateFeedbackState(runtime, previousSnapshot, nextSnapshot, deltaMs);
    snapshot = nextSnapshot;
    runtime.previousSnapshot = previousSnapshot;
    runtime.snapshot = nextSnapshot;
    stage.hitArea = new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height);
    applyBackgroundResource(wrapper, nextSnapshot);
    syncAudioFeedback(audioController, runtime, previousSnapshot, nextSnapshot);

    layoutScene(sceneRoot, app.screen, snapshot.world);
    drawBackground(backgroundFill, backgroundGrid, snapshot);
    syncSlotButtons(slotLayer, slotButtons, runtime, kernel, slotGraphics, renderSnapshot);

    subBaseView = syncSingletonEntity(subBaseContainer, subBaseView, snapshot.assets.subBase, (view) => {
      view.position.set(snapshot.state.subBase.x, snapshot.state.subBase.y);
      view.alpha = 0.5 + 0.5 * Math.max(0.15, snapshot.state.subBase.hp / snapshot.state.subBase.maxHp);
    });

    baseView = syncSingletonEntity(baseContainer, baseView, snapshot.assets.base, (view) => {
      view.position.set(snapshot.state.base.x, snapshot.state.base.y);
      view.rotation = 0;
      view.alpha = 1;
    });

    syncEntityMap(
      towerContainer,
      towerViews,
      snapshot.state.towers,
      (entity) => resolveTowerAsset(snapshot.assets.tower, entity),
      (view, entity) => {
        view.position.set(entity.x, entity.y);
        applyEntityDisplayScale(view, getTowerPulseScale(runtime, entity.id));
        bindTowerInteraction(view, entity.id, runtime, kernel, renderSnapshot);
      },
    );
    syncEntityMap(
      enemyContainer,
      enemyViews,
      snapshot.state.enemies,
      (entity) => resolveEnemyAsset(snapshot.assets, entity),
      (view, entity) => {
        view.position.set(entity.x, entity.y);
        view.alpha = 0.5 + 0.5 * Math.max(0.15, entity.hp / entity.maxHp);
        applyEntityDisplayScale(view, Number(entity.visualScale ?? 1));
      },
    );
    syncEntityMap(bulletContainer, bulletViews, snapshot.state.bullets, snapshot.assets.bullet, (view, entity) => {
      view.position.set(entity.x, entity.y);
    });

    drawHealthBars(healthGraphics, snapshot);
    renderDamageFlash(damageFlash, runtime, app.screen);
    renderHud(
      snapshot,
      app.screen,
      goldHudPanel,
      waveHudPanel,
      goldText,
      waveText,
      baseInfoText,
      baseUpgradeHitArea,
    );
    renderSlotTooltip(
      runtime,
      snapshot,
      slotTooltipContainer,
      slotTooltipCard,
      slotTooltipLabel,
      slotTooltipCancelButton,
      slotTooltipConfirmButton,
      slotTooltipCancelText,
      slotTooltipConfirmText,
    );
    renderOverlay(snapshot, overlayContainer, overlayShade, overlayCard, overlayImage, overlayButton, overlayTitle, overlayBody, overlayButtonText);
    renderDialog(runtime, snapshot, dialogContainer, dialogShade, dialogCard, dialogTitle, dialogBody, dialogCancelButton, dialogConfirmButton, dialogCancelText, dialogConfirmText);
  }

  const unsubscribe = kernel.subscribe(renderSnapshot);
  app.ticker.add(() => {
    kernel.dispatch({ type: "tick", deltaMs: app.ticker.deltaMS });
  });

  const onResize = () => renderSnapshot(snapshot);
  window.addEventListener("resize", onResize);

  root.__pixiCleanup = () => {
    unsubscribe();
    window.removeEventListener("resize", onResize);
    wrapper.removeEventListener("pointerdown", onUserInteract);
    audioController.destroy();
    app.destroy(true);
  };
}

function layoutScene(sceneRoot, screen, world) {
  const scale = Math.min(screen.width / world.width, screen.height / world.height);
  sceneRoot.scale.set(scale);
  sceneRoot.position.set((screen.width - world.width * scale) * 0.5, (screen.height - world.height * scale) * 0.5);
}

function drawBackground(backgroundFill, backgroundGrid, snapshot) {
  const world = snapshot.world;
  if (hasAssetSource(snapshot.assets?.background)) {
    backgroundFill.clear();
    backgroundGrid.clear();
    return;
  }

  backgroundFill.clear();
  backgroundFill.rect(0, 0, world.width, world.height).fill({ color: toColorNumber(world.backgroundColor, 0x0f172a), alpha: 1 });

  backgroundGrid.clear();
  const gridColor = toColorNumber(world.gridColor, 0x1e293b);
  for (let x = 0; x <= world.width; x += 72) {
    backgroundGrid.rect(x, 0, 1, world.height).fill({ color: gridColor, alpha: 0.28 });
  }
  for (let y = 0; y <= world.height; y += 72) {
    backgroundGrid.rect(0, y, world.width, 1).fill({ color: gridColor, alpha: 0.28 });
  }
}

function syncSlotButtons(layer, slotButtons, runtime, kernel, slotGraphics, renderSnapshot) {
  const snapshot = runtime.snapshot;
  slotGraphics.clear();
  const slotColor = toColorNumber(snapshot.world.slotColor, 0x334155);
  const readyColor = toColorNumber(snapshot.world.slotReadyColor, 0x1d4ed8);

  const activeIds = new Set();
  for (const slot of snapshot.state.towerSlots) {
    activeIds.add(slot.id);
    let slotView = slotButtons.get(slot.id);
    if (!slotView) {
      const container = new PIXI.Container();
      const label = createText(16, 0xe2e8f0, "600");
      label.anchor.set(0.5, 0);
      const subLabel = createText(14, 0xcbd5e1, "500");
      subLabel.anchor.set(0.5, 0);
      const hit = new PIXI.Graphics();
      hit.eventMode = "static";
      hit.cursor = "pointer";
      hit.on("pointertap", () => {
        handleSlotTap(runtime, slot.id, kernel);
        renderSnapshot(runtime.snapshot);
      });
      container.addChild(label, subLabel, hit);
      layer.addChild(container);
      slotView = { container, label, subLabel, hit };
      slotButtons.set(slot.id, slotView);
    }

    const radius = 46;
    if (!slot.built) {
      slotGraphics.circle(slot.x, slot.y, radius + 7).fill({
        color: slotColor,
        alpha: 0.16,
      });
      drawDashedCircle(slotGraphics, slot.x, slot.y, radius, 18, 10, 0xffffff, 0.9, 3);
    }

    slotView.container.position.set(0, 0);
    slotView.label.text = slot.built ? `Lv.${slot.level}` : "";
    slotView.label.position.set(slot.x, slot.y + 58);
    slotView.subLabel.text = slot.built
      ? slot.nextUpgradeCost == null
        ? "已满级"
        : `升级 $${slot.nextUpgradeCost}`
      : "";
    slotView.subLabel.position.set(slot.x, slot.y + 80);

    slotView.hit.clear();
    slotView.hit.circle(slot.x, slot.y, 52).fill({ color: 0xffffff, alpha: 0.001 });
    slotView.hit.hitArea = new PIXI.Circle(slot.x, slot.y, 52);
  }

  for (const [id, slotView] of slotButtons.entries()) {
    if (activeIds.has(id)) continue;
    slotView.container.destroy({ children: true });
    slotButtons.delete(id);
  }
}

function drawHealthBars(healthGraphics, snapshot) {
  healthGraphics.clear();

  for (const enemy of snapshot.state.enemies) {
    drawBar(
      healthGraphics,
      enemy.x - 20,
      enemy.y - 34,
      40,
      6,
      enemy.hp / enemy.maxHp,
      0x2b0b12,
      0xef4444,
    );
  }

  drawBar(
    healthGraphics,
    snapshot.state.subBase.x - 56,
    snapshot.state.subBase.y - 74,
    112,
    10,
    snapshot.state.subBase.hp / snapshot.state.subBase.maxHp,
    0x2b0b12,
    0xdc2626,
  );
}

function renderHud(
  snapshot,
  screen,
  goldHudPanel,
  waveHudPanel,
  goldText,
  waveText,
  baseInfoText,
  baseUpgradeHitArea,
) {
  const margin = clamp(screen.width * 0.025, 10, 18);
  const gap = clamp(screen.width * 0.015, 8, 14);
  const hudHeight = clamp(screen.height * 0.055, 48, 68);
  const top = clamp(screen.height * 0.015, 10, 18);
  const goldWidth = clamp(screen.width * 0.24, 112, 190);
  const waveWidth = Math.max(160, screen.width - margin * 2 - gap - goldWidth);

  drawHudPill(goldHudPanel, margin, top, goldWidth, hudHeight, snapshot.world);
  drawHudPill(waveHudPanel, margin + goldWidth + gap, top, waveWidth, hudHeight, snapshot.world);

  goldText.style.fontSize = clamp(screen.width * 0.045, 22, 28);
  goldText.text = `$${snapshot.state.base.gold}`;
  goldText.position.set(margin + goldWidth * 0.5, top + hudHeight * 0.5);
  waveText.style.fontSize = clamp(screen.width * 0.034, 17, 22);
  waveText.text = `第 ${snapshot.waves.current} 波${
    snapshot.waves.intermissionMs > 0 ? ` (还有${Math.ceil(snapshot.waves.intermissionMs / 1000)}s)` : ""
  }`;
  waveText.position.set(margin + goldWidth + gap + waveWidth * 0.5, top + hudHeight * 0.5);

  baseInfoText.text = `Lv.${snapshot.state.base.level}\n+${snapshot.state.base.goldRatePerSecond}/s`;
  if (snapshot.state.base.y <= 280) {
    baseInfoText.anchor.set(0.5, 0);
    baseInfoText.position.set(snapshot.state.base.x, snapshot.state.base.y + 54);
  } else {
    baseInfoText.anchor.set(0.5, 1);
    baseInfoText.position.set(snapshot.state.base.x, snapshot.state.base.y - 86);
  }

  baseUpgradeHitArea.clear();
  baseUpgradeHitArea.circle(snapshot.state.base.x, snapshot.state.base.y, 62).fill({ color: 0xffffff, alpha: 0.001 });
  baseUpgradeHitArea.hitArea = new PIXI.Circle(snapshot.state.base.x, snapshot.state.base.y, 62);
}

function drawHudPill(graphics, x, y, width, height, world) {
  graphics.clear();
  graphics.roundRect(x, y, width, height, height * 0.5).fill({ color: 0x020617, alpha: 0.82 });
  graphics.roundRect(x, y, width, height, height * 0.5).stroke({
    color: toColorNumber(world.accentColor, 0x38bdf8),
    alpha: 0.2,
    width: 2,
  });
}

function drawDashedCircle(graphics, x, y, radius, dashAngleDeg, gapAngleDeg, color, alpha, width) {
  const dashAngle = (dashAngleDeg * Math.PI) / 180;
  const gapAngle = (gapAngleDeg * Math.PI) / 180;
  const fullTurn = Math.PI * 2;

  for (let angle = -Math.PI * 0.5; angle < fullTurn - Math.PI * 0.5; angle += dashAngle + gapAngle) {
    const endAngle = Math.min(angle + dashAngle, fullTurn - Math.PI * 0.5);
    const startX = x + Math.cos(angle) * radius;
    const startY = y + Math.sin(angle) * radius;
    graphics.moveTo(startX, startY);
    graphics.arc(x, y, radius, angle, endAngle).stroke({
      color,
      alpha,
      width,
      cap: "round",
    });
  }
}

function applyBackgroundResource(wrapper, snapshot) {
  const source = getAssetSource(snapshot.assets?.background);
  wrapper.style.backgroundColor = snapshot.world?.backgroundColor ?? "#0f172a";
  wrapper.style.backgroundImage = source ? `url("${source}")` : "none";
}

function resolveEnemyAsset(assets, entity) {
  const key = String(entity?.assetKey ?? "");
  return assets?.[key] ?? assets?.enemyLevel1 ?? {};
}

function resolveTowerAsset(assetConfig, entity) {
  const tint = getTowerLevelColor(entity?.level ?? 1);
  return {
    ...(assetConfig ?? {}),
    color: tint,
    tint,
  };
}

function getTowerLevelColor(level) {
  const palette = [
    0x60a5fa,
    0xb87333,
    0xfacc15,
    0xc084fc,
    0xf97316,
  ];
  const normalizedLevel = Math.max(1, Number(level) || 1);
  return palette[Math.min(palette.length - 1, normalizedLevel - 1)];
}

function bindTowerInteraction(view, slotId, runtime, kernel, renderSnapshot) {
  if (view.__towerTapBound === slotId) return;
  view.__towerTapBound = slotId;
  view.eventMode = "static";
  view.cursor = "pointer";
  view.hitArea = new PIXI.Circle(0, 0, 68);
  view.on("pointertap", () => {
    handleSlotTap(runtime, slotId, kernel);
    renderSnapshot(runtime.snapshot);
  });
}

function syncAudioFeedback(audioController, runtime, previousSnapshot, nextSnapshot) {
  if (nextSnapshot?.state?.started && !previousSnapshot?.state?.started) {
    audioController.playBgm();
  }

  const previousRecoveryLockMs = Number(previousSnapshot?.state?.subBase?.recoveryLockMs ?? 0);
  const nextRecoveryLockMs = Number(nextSnapshot?.state?.subBase?.recoveryLockMs ?? 0);
  if (nextRecoveryLockMs > previousRecoveryLockMs + 120) {
    audioController.play("hit");
  }

  const previousTowers = new Map((previousSnapshot?.state?.towers ?? []).map((tower) => [tower.id, tower]));
  for (const tower of nextSnapshot?.state?.towers ?? []) {
    const previousTower = previousTowers.get(tower.id);
    if (!previousTower) continue;
    if (Number(tower.cooldownMs ?? 0) > Number(previousTower.cooldownMs ?? 0)) {
      audioController.play("attack");
      break;
    }
  }
}

function renderOverlay(
  snapshot,
  overlayContainer,
  overlayShade,
  overlayCard,
  overlayImage,
  overlayButton,
  overlayTitle,
  overlayBody,
  overlayButtonText,
) {
  overlayContainer.visible = Boolean(snapshot.state.overlay?.visible);
  if (!overlayContainer.visible) return;

  const victoryImageSource = snapshot.state.didWin ? getAssetSource(snapshot.assets?.victory) : "";
  const showVictoryImage = Boolean(victoryImageSource);
  const cardWidth = 540;
  const contentWidth = cardWidth - 96;
  const buttonWidth = 240;
  const buttonHeight = 76;

  overlayTitle.style.fontSize = Math.max(24, Number(snapshot.state.overlay.titleFontSize ?? 56));
  overlayBody.style.fontSize = Math.max(16, Number(snapshot.state.overlay.bodyFontSize ?? 28));
  overlayBody.style.wordWrap = true;
  overlayBody.style.breakWords = true;
  overlayBody.style.wordWrapWidth = contentWidth;
  overlayBody.style.lineHeight = Math.round(Number(overlayBody.style.fontSize) * 1.32);
  overlayButtonText.style.fontSize = Math.max(18, Number(snapshot.state.overlay.buttonFontSize ?? 28));

  const titleText = String(snapshot.state.overlay.title ?? "");
  const bodyText = String(snapshot.state.overlay.body ?? "");
  const imageHeight = showVictoryImage ? 210 : 0;
  const bodyTopOffset = showVictoryImage ? 322 : 122;
  const bodyWidth = contentWidth;
  overlayBody.style.wordWrapWidth = bodyWidth;
  overlayBody.text = bodyText;
  const bodyMetrics = overlayBody.getLocalBounds();
  const minCardHeight = showVictoryImage ? 540 : 390;
  const contentHeight = bodyTopOffset + Math.max(44, Number(bodyMetrics?.height ?? overlayBody.height ?? 44)) + 48 + buttonHeight + 32;
  const cardHeight = Math.max(minCardHeight, contentHeight);
  const x = (snapshot.world.width - cardWidth) * 0.5;
  const y = (snapshot.world.height - cardHeight) * 0.5;
  const buttonX = x + (cardWidth - buttonWidth) * 0.5;
  const buttonY = y + cardHeight - 108;

  overlayShade.clear();

  overlayCard.clear();
  overlayCard.roundRect(x, y, cardWidth, cardHeight, 32).fill({ color: 0x0f172a, alpha: 0.96 });
  overlayCard.roundRect(x, y, cardWidth, cardHeight, 32).stroke({
    color: toColorNumber(snapshot.world.accentColor, 0x38bdf8),
    alpha: 0.34,
    width: 2,
  });

  overlayImage.visible = showVictoryImage;
  if (showVictoryImage) {
    overlayImage.texture = PIXI.Texture.from(victoryImageSource);
    overlayImage.width = cardWidth - 72;
    overlayImage.height = imageHeight;
    overlayImage.position.set(snapshot.world.width * 0.5, y + 88);
  }

  overlayButton.clear();
  overlayButton.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 20).fill({
    color: toColorNumber(snapshot.world.accentColor, 0x38bdf8),
    alpha: 1,
  });
  overlayButton.hitArea = new PIXI.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight);

  overlayTitle.text = titleText;
  overlayTitle.anchor.set(0.5, 0);
  overlayTitle.position.set(snapshot.world.width * 0.5, y + 34);

  overlayBody.anchor.set(0.5, 0);
  overlayBody.position.set(snapshot.world.width * 0.5, y + (showVictoryImage ? 322 : 122));

  overlayButtonText.text = snapshot.state.overlay.buttonText;
  overlayButtonText.anchor.set(0.5);
  overlayButtonText.position.set(buttonX + buttonWidth * 0.5, buttonY + buttonHeight * 0.5);
}

function renderSlotTooltip(
  runtime,
  snapshot,
  slotTooltipContainer,
  slotTooltipCard,
  slotTooltipLabel,
  slotTooltipCancelButton,
  slotTooltipConfirmButton,
  slotTooltipCancelText,
  slotTooltipConfirmText,
) {
  slotTooltipContainer.visible = Boolean(runtime.slotTooltip.visible);
  if (!slotTooltipContainer.visible) return;

  const tooltipWidth = 260;
  const margin = 18;
  const bodyWidth = tooltipWidth - 32;
  const buttonWidth = 84;
  const buttonHeight = 36;

  slotTooltipLabel.style.wordWrapWidth = bodyWidth;
  slotTooltipLabel.text = runtime.slotTooltip.label;
  const labelBounds = slotTooltipLabel.getLocalBounds();
  const labelHeight = Math.max(22, Number(labelBounds?.height ?? slotTooltipLabel.height ?? 22));
  const tooltipHeight = Math.max(116, 16 + labelHeight + 18 + buttonHeight + 16);
  const x = clamp(runtime.slotTooltip.x - tooltipWidth * 0.5, margin, snapshot.world.width - tooltipWidth - margin);
  const preferredY = runtime.slotTooltip.y - tooltipHeight - 18;
  const y =
    preferredY < 150
      ? Math.min(snapshot.world.height - tooltipHeight - margin, runtime.slotTooltip.y + 42)
      : preferredY;
  const buttonY = y + tooltipHeight - buttonHeight - 16;
  const cancelX = x + 18;
  const confirmX = x + tooltipWidth - buttonWidth - 18;

  slotTooltipCard.clear();
  slotTooltipCard.roundRect(x, y, tooltipWidth, tooltipHeight, 22).fill({ color: 0x0f172a, alpha: 0.96 });
  slotTooltipCard.roundRect(x, y, tooltipWidth, tooltipHeight, 22).stroke({
    color: toColorNumber(snapshot.world.accentColor, 0x38bdf8),
    alpha: 0.28,
    width: 2,
  });

  slotTooltipLabel.anchor.set(0.5, 0);
  slotTooltipLabel.position.set(x + tooltipWidth * 0.5, y + 16);

  slotTooltipCancelButton.clear();
  slotTooltipCancelButton.roundRect(cancelX, buttonY, buttonWidth, buttonHeight, 18).fill({ color: 0x334155, alpha: 1 });
  slotTooltipCancelButton.hitArea = new PIXI.Rectangle(cancelX, buttonY, buttonWidth, buttonHeight);

  slotTooltipConfirmButton.clear();
  slotTooltipConfirmButton.roundRect(confirmX, buttonY, buttonWidth, buttonHeight, 18).fill({
    color: toColorNumber(snapshot.world.goldColor, 0xfacc15),
    alpha: 1,
  });
  slotTooltipConfirmButton.hitArea = new PIXI.Rectangle(confirmX, buttonY, buttonWidth, buttonHeight);

  slotTooltipCancelText.text = runtime.slotTooltip.cancelText;
  slotTooltipCancelText.anchor.set(0.5);
  slotTooltipCancelText.position.set(cancelX + buttonWidth * 0.5, buttonY + buttonHeight * 0.5);

  slotTooltipConfirmText.text = runtime.slotTooltip.confirmText;
  slotTooltipConfirmText.anchor.set(0.5);
  slotTooltipConfirmText.position.set(confirmX + buttonWidth * 0.5, buttonY + buttonHeight * 0.5);
}

function renderDialog(
  runtime,
  snapshot,
  dialogContainer,
  dialogShade,
  dialogCard,
  dialogTitle,
  dialogBody,
  dialogCancelButton,
  dialogConfirmButton,
  dialogCancelText,
  dialogConfirmText,
) {
  dialogContainer.visible = Boolean(runtime.dialog.visible);
  if (!dialogContainer.visible) return;

  const cardWidth = 500;
  const cardHeight = runtime.dialog.showCancel ? 290 : 250;
  const x = (snapshot.world.width - cardWidth) * 0.5;
  const y = (snapshot.world.height - cardHeight) * 0.5;
  const buttonWidth = runtime.dialog.showCancel ? 180 : 240;
  const buttonHeight = 64;
  const gap = 20;
  const leftButtonX = runtime.dialog.showCancel ? x + (cardWidth - buttonWidth * 2 - gap) * 0.5 : x + (cardWidth - buttonWidth) * 0.5;
  const rightButtonX = runtime.dialog.showCancel ? leftButtonX + buttonWidth + gap : leftButtonX;
  const buttonY = y + cardHeight - 92;

  dialogShade.clear();
  dialogShade.eventMode = "none";
  dialogShade.hitArea = null;

  dialogCard.clear();
  dialogCard.roundRect(x, y, cardWidth, cardHeight, 28).fill({ color: 0x111827, alpha: 0.98 });
  dialogCard.roundRect(x, y, cardWidth, cardHeight, 28).stroke({
    color: toColorNumber(snapshot.world.accentColor, 0x38bdf8),
    alpha: 0.3,
    width: 2,
  });

  dialogTitle.text = runtime.dialog.title;
  dialogTitle.anchor.set(0.5, 0);
  dialogTitle.position.set(snapshot.world.width * 0.5, y + 32);

  dialogBody.text = runtime.dialog.body;
  dialogBody.anchor.set(0.5, 0);
  dialogBody.position.set(snapshot.world.width * 0.5, y + 92);

  dialogCancelButton.visible = runtime.dialog.showCancel;
  dialogCancelText.visible = runtime.dialog.showCancel;
  dialogCancelButton.clear();
  dialogCancelButton.hitArea = null;
  if (runtime.dialog.showCancel) {
    dialogCancelButton.roundRect(leftButtonX, buttonY, buttonWidth, buttonHeight, 18).fill({ color: 0x334155, alpha: 1 });
    dialogCancelButton.hitArea = new PIXI.Rectangle(leftButtonX, buttonY, buttonWidth, buttonHeight);
    dialogCancelText.text = runtime.dialog.cancelText;
    dialogCancelText.anchor.set(0.5);
    dialogCancelText.position.set(leftButtonX + buttonWidth * 0.5, buttonY + buttonHeight * 0.5);
  }

  dialogConfirmButton.clear();
  dialogConfirmButton.roundRect(rightButtonX, buttonY, buttonWidth, buttonHeight, 18).fill({
    color: toColorNumber(snapshot.world.goldColor, 0xfacc15),
    alpha: 1,
  });
  dialogConfirmButton.hitArea = new PIXI.Rectangle(rightButtonX, buttonY, buttonWidth, buttonHeight);
  dialogConfirmText.text = runtime.dialog.confirmText;
  dialogConfirmText.anchor.set(0.5);
  dialogConfirmText.position.set(rightButtonX + buttonWidth * 0.5, buttonY + buttonHeight * 0.5);
}

function syncSingletonEntity(layer, existingView, assetConfig, applyState) {
  const assetKey = getAssetViewKey(assetConfig);
  let view = existingView;
  if (!view || view.__assetKey !== assetKey) {
    if (view) {
      view.destroy();
    }
    view = createEntityView(assetConfig);
    view.__assetKey = assetKey;
    layer.addChild(view);
  }
  applyState(view);
  return view;
}

function syncEntityMap(layer, viewMap, items, assetConfigOrResolver, applyState) {
  const activeIds = new Set();

  for (const item of items) {
    activeIds.add(item.id);
    const assetConfig = typeof assetConfigOrResolver === "function" ? assetConfigOrResolver(item) : assetConfigOrResolver;
    const assetKey = getAssetViewKey(assetConfig);
    let view = viewMap.get(item.id);
    if (!view || view.__assetKey !== assetKey) {
      if (view) {
        view.destroy();
      }
      view = createEntityView(assetConfig);
      view.__assetKey = assetKey;
      layer.addChild(view);
      viewMap.set(item.id, view);
    }
    applyState(view, item);
  }

  for (const [id, view] of viewMap.entries()) {
    if (activeIds.has(id)) continue;
    view.destroy();
    viewMap.delete(id);
  }
}

function drawBar(graphics, x, y, width, height, progress, bgColor, fillColor) {
  graphics.roundRect(x, y, width, height, height * 0.5).fill({ color: bgColor, alpha: 0.92 });
  graphics.roundRect(x, y, width, height, height * 0.5).stroke({ color: 0xffffff, alpha: 0.1, width: 1 });
  graphics.roundRect(x, y, width * clamp(progress, 0, 1), height, height * 0.5).fill({ color: fillColor, alpha: 1 });
}

function renderDamageFlash(graphics, runtime, screen) {
  graphics.clear();
  if (runtime.hitFlashMs <= 0) return;

  const intensity = clamp(runtime.hitFlashMs / 220, 0, 1);
  const width = screen.width;
  const height = screen.height;
  const color = 0xef4444;
  const layers = [
    { inset: -34, lineWidth: 120, alpha: 0.05 },
    { inset: -20, lineWidth: 92, alpha: 0.08 },
    { inset: -6, lineWidth: 66, alpha: 0.12 },
    { inset: 10, lineWidth: 42, alpha: 0.18 },
    { inset: 26, lineWidth: 22, alpha: 0.24 },
  ];

  for (const layer of layers) {
    graphics
      .rect(layer.inset, layer.inset, width - layer.inset * 2, height - layer.inset * 2)
      .stroke({
        color,
        alpha: layer.alpha * intensity,
        width: layer.lineWidth,
        alignment: 0.5,
      });
  }
}

function updateFeedbackState(runtime, previousSnapshot, nextSnapshot, deltaMs) {
  runtime.hitFlashMs = Math.max(0, runtime.hitFlashMs - deltaMs);

  for (const [towerId, pulseMs] of runtime.towerPulseMs.entries()) {
    const nextPulseMs = Math.max(0, pulseMs - deltaMs);
    if (nextPulseMs <= 0) {
      runtime.towerPulseMs.delete(towerId);
    } else {
      runtime.towerPulseMs.set(towerId, nextPulseMs);
    }
  }

  const previousRecoveryLockMs = Number(previousSnapshot?.state?.subBase?.recoveryLockMs ?? 0);
  const nextRecoveryLockMs = Number(nextSnapshot?.state?.subBase?.recoveryLockMs ?? 0);
  if (nextRecoveryLockMs > previousRecoveryLockMs + 120) {
    runtime.hitFlashMs = 220;
  }

  const previousTowers = new Map((previousSnapshot?.state?.towers ?? []).map((tower) => [tower.id, tower]));
  const activeTowerIds = new Set();
  for (const tower of nextSnapshot?.state?.towers ?? []) {
    activeTowerIds.add(tower.id);
    const previousTower = previousTowers.get(tower.id);
    if (!previousTower) continue;
    if (Number(tower.cooldownMs ?? 0) > Number(previousTower.cooldownMs ?? 0) + Math.max(60, deltaMs)) {
      runtime.towerPulseMs.set(tower.id, 160);
    }
  }

  for (const towerId of Array.from(runtime.towerPulseMs.keys())) {
    if (!activeTowerIds.has(towerId)) {
      runtime.towerPulseMs.delete(towerId);
    }
  }
}

function getTowerPulseScale(runtime, towerId) {
  const pulseMs = Number(runtime.towerPulseMs.get(towerId) ?? 0);
  if (pulseMs <= 0) return 1;

  const progress = 1 - clamp(pulseMs / 160, 0, 1);
  return 1 + Math.sin(progress * Math.PI) * 0.16;
}

function handleSlotTap(runtime, slotId, kernel) {
  const snapshot = runtime.snapshot;
  if (runtime.dialog.visible) return;
  if (snapshot.state.overlay?.visible || !snapshot.state.started || snapshot.state.isOver) return;
  const slot = snapshot.state.towerSlots.find((item) => item.id === slotId);
  if (!slot) return;

  if (!slot.built) {
    openSlotTooltip(
      runtime,
      slot.x,
      slot.y,
      `购买 $${slot.purchaseCost} ?`,
      "取消",
      "购买",
      () => {
        kernel.dispatch({ type: "purchase_or_upgrade_slot", slotId });
      },
    );
    return;
  }

  closeSlotTooltip(runtime);

  if (slot.nextUpgradeCost == null) {
    openInfoDialog(runtime, "炮台已满级", "当前炮台等级已经达到上限。");
    return;
  }

  openSlotTooltip(
    runtime,
    slot.x,
    slot.y,
    `是否升级炮台？所需花费${slot.nextUpgradeCost}$。`,
    "取消",
    "升级",
    () => {
      kernel.dispatch({ type: "purchase_or_upgrade_slot", slotId });
    },
  );
}

function createText(fontSize, fill, fontWeight) {
  return new PIXI.Text({
    text: "",
    style: new PIXI.TextStyle({
      fontFamily: "Arial",
      fontSize,
      fontWeight,
      fill,
    }),
  });
}

function bindOverlayButtonFeedback(button, label) {
  const pressIn = () => {
    button.alpha = 0.82;
    label.alpha = 0.92;
    label.scale.set(0.96);
  };
  const pressOut = () => {
    button.alpha = 1;
    label.alpha = 1;
    label.scale.set(1);
  };

  button.on("pointerdown", pressIn);
  button.on("pointerup", pressOut);
  button.on("pointerupoutside", pressOut);
  button.on("pointerout", pressOut);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function openConfirmDialog(runtime, title, body, cancelText, confirmText, onConfirm) {
  runtime.dialog = {
    visible: true,
    title,
    body,
    cancelText,
    confirmText,
    showCancel: true,
    onConfirm,
  };
}

function openInfoDialog(runtime, title, body) {
  runtime.dialog = {
    visible: true,
    title,
    body,
    cancelText: "",
    confirmText: "知道了",
    showCancel: false,
    onConfirm: null,
  };
}

function closeDialog(runtime) {
  runtime.dialog = createDialogState();
}

function openSlotTooltip(runtime, x, y, label, cancelText, confirmText, onConfirm) {
  runtime.slotTooltip = {
    visible: true,
    x,
    y,
    label,
    cancelText,
    confirmText,
    onConfirm,
  };
}

function closeSlotTooltip(runtime) {
  runtime.slotTooltip = createSlotTooltipState();
}

function createDialogState() {
  return {
    visible: false,
    title: "",
    body: "",
    cancelText: "取消",
    confirmText: "确认",
    showCancel: true,
    onConfirm: null,
  };
}

function createSlotTooltipState() {
  return {
    visible: false,
    x: 0,
    y: 0,
    label: "",
    cancelText: "取消",
    confirmText: "确认",
    onConfirm: null,
  };
}

function createAudioController(audioConfig = {}) {
  const bgm = createAudioEntry(audioConfig?.bgm);
  const effects = {
    hit: createAudioEntry(audioConfig?.hit),
    attack: createAudioEntry(audioConfig?.attack),
  };
  let unlocked = false;
  let bgmStarted = false;
  const lastPlayedAt = new Map();

  return {
    unlock() {
      unlocked = true;
    },
    playBgm() {
      if (!unlocked || bgmStarted || !bgm) return;
      bgmStarted = true;
      void bgm.play().catch(() => {
        bgmStarted = false;
      });
    },
    play(name) {
      if (!unlocked) return;
      const effect = effects[name];
      if (!effect) return;
      const now = performance.now();
      const minIntervalMs = name === "attack" ? 90 : 140;
      if (now - (lastPlayedAt.get(name) ?? 0) < minIntervalMs) return;
      lastPlayedAt.set(name, now);

      effect.currentTime = 0;
      void effect.play().catch(() => {});
    },
    destroy() {
      if (bgm) {
        bgm.pause();
        bgm.currentTime = 0;
      }
      for (const effect of Object.values(effects)) {
        if (!effect) continue;
        effect.pause();
        effect.currentTime = 0;
      }
    },
  };
}

function createAudioEntry(entry) {
  const src =
    typeof entry === "string"
      ? entry.trim()
      : typeof entry?.src === "string"
        ? entry.src.trim()
        : "";
  if (!src) return null;

  const audio = new Audio(src);
  audio.preload = "auto";
  audio.loop = Boolean(typeof entry === "object" ? entry?.loop : false);
  audio.volume = clamp(Number(typeof entry === "object" ? entry?.volume : 1) || 1, 0, 1);
  return audio;
}
