import * as PIXI from "pixi.js";
import { SceneView } from "./components/SceneView.js";
import { computeSceneLayout } from "./sceneLayout.js";
import { BackgroundAudioController } from "./systems/BackgroundAudioController.js";
import { SlashEffectSystem } from "./systems/SlashEffectSystem.js";
import { pickSceneAssetUrl, SceneAssetLibrary } from "./systems/SceneAssetLibrary.js";
import { HudView } from "./domui/HudView.js";
import { Modal } from "./domui/Modal.js";
import { ensureUiLayerStyles, uiTheme } from "./domui/theme.js";

export async function mountCutRopeRenderer(root, kernel) {
  root.innerHTML = "";
  root.style.background = uiTheme.background;
  root.style.overflow = "hidden";

  ensureUiLayerStyles();

  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.width = "100%";
  wrapper.style.height = "100%";
  wrapper.style.minHeight = "100dvh";
  wrapper.style.overflow = "hidden";
  wrapper.style.touchAction = "none";
  root.appendChild(wrapper);

  const uiLayer = document.createElement("div");
  uiLayer.id = "ui-layer";
  wrapper.appendChild(uiLayer);

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
  app.canvas.style.zIndex = "1";
  app.canvas.style.touchAction = "none";
  wrapper.appendChild(app.canvas);

  const stage = app.stage;
  stage.eventMode = "static";
  stage.hitArea = app.screen;

  const backgroundAudio = new BackgroundAudioController();
  const sceneAssetLibrary = new SceneAssetLibrary();
  const backgroundLayer = new PIXI.Container();
  const sceneLayer = new PIXI.Container();
  const effectLayer = new PIXI.Container();
  stage.addChild(backgroundLayer, sceneLayer, effectLayer);

  const sceneView = new SceneView(sceneLayer, toColorNumber);
  const slashEffectSystem = new SlashEffectSystem(effectLayer, toColorNumber);
  const hudView = new HudView();
  const modalView = new Modal();
  uiLayer.append(hudView.element, modalView.element);

  let snapshot = kernel.getSnapshot();
  let currentLayout = computeSceneLayout(app.screen.width, app.screen.height, snapshot.world);
  let swipeState = null;
  let lastOutcomeSignature = "";
  let lastTickTime = performance.now();

  const renderSnapshot = (nextSnapshot) => {
    snapshot = nextSnapshot;
    currentLayout = computeSceneLayout(app.screen.width, app.screen.height, snapshot.world);
    sceneAssetLibrary.preloadFromSnapshot(snapshot);
    drawBackground(backgroundLayer, currentLayout, uiTheme, snapshot, sceneAssetLibrary);
    sceneView.render(snapshot, currentLayout, sceneAssetLibrary);
    slashEffectSystem.syncTheme(snapshot);
    backgroundAudio.sync(snapshot);
    hudView.render(snapshot);
    modalView.render(snapshot);

    if (snapshot.state?.overlay?.visible) {
      sceneView.setHoveredRopeId(null);
    }

    const outcomeSignature = snapshot.state?.isOver ? `${snapshot.state.didWin}:${snapshot.state.level?.index}:${snapshot.state.message}` : "";
    if (outcomeSignature && outcomeSignature !== lastOutcomeSignature) {
      console.info(snapshot.state.didWin ? "[cut-rope] win" : "[cut-rope] fail", snapshot.state.message);
      lastOutcomeSignature = outcomeSignature;
    }
    if (!outcomeSignature) {
      lastOutcomeSignature = "";
    }
  };

  const onPointerDown = (event) => {
    backgroundAudio.unlock();
    if (!snapshot.state?.started || snapshot.state?.isOver) return;
    swipeState = {
      lastGlobal: { x: event.global.x, y: event.global.y },
    };
    sceneView.setHoveredRopeId(sceneView.hitTestRope(event.global));
  };

  const onPointerMove = (event) => {
    if (!snapshot.state?.started || snapshot.state?.isOver) {
      sceneView.setHoveredRopeId(null);
      return;
    }
    const hoverRopeId = sceneView.hitTestRope(event.global);
    sceneView.setHoveredRopeId(hoverRopeId);
    if (!swipeState) return;

    const currentGlobal = { x: event.global.x, y: event.global.y };
    const cutIds = sceneView.hitTestRopeSweep(swipeState.lastGlobal, currentGlobal);
    slashEffectSystem.addTrail(swipeState.lastGlobal, currentGlobal, {
      hit: cutIds.length > 0,
      hitCount: cutIds.length,
    });
    if (cutIds.length > 0) {
      for (const ropeId of cutIds) {
        kernel.dispatch({ type: "cut_rope", ropeId });
      }
    }

    swipeState = {
      lastGlobal: currentGlobal,
    }
  };

  const onPointerOut = () => {
    sceneView.setHoveredRopeId(null);
    swipeState = null;
  };

  const onPointerUp = () => {
    swipeState = null;
  };

  stage.on("pointerdown", onPointerDown);
  stage.on("pointermove", onPointerMove);
  stage.on("pointerup", onPointerUp);
  stage.on("pointerupoutside", onPointerUp);
  stage.on("pointerout", onPointerOut);

  hudView.restartButton.onClick(() => {
    backgroundAudio.unlock();
    kernel.dispatch({ type: "restart_level" });
  });

  modalView.button.onClick(() => {
    backgroundAudio.unlock();
    kernel.dispatch({ type: "start_or_continue" });
  });

  const unsubscribe = kernel.subscribe((nextSnapshot) => {
    renderSnapshot(nextSnapshot);
  });
  const unsubscribeAssets = sceneAssetLibrary.subscribe(() => {
    renderSnapshot(snapshot);
  });

  const onResize = () => {
    stage.hitArea = app.screen;
    renderSnapshot(snapshot);
  };
  window.addEventListener("resize", onResize);

  const tick = () => {
    const now = performance.now();
    const dt = Math.min(1 / 20, Math.max(0.001, (now - lastTickTime) / 1000));
    lastTickTime = now;
    slashEffectSystem.update(dt);
    kernel.dispatch({ type: "tick", dt });
  };
  app.ticker.add(tick);

  renderSnapshot(snapshot);

  return () => {
    unsubscribe();
    unsubscribeAssets();
    window.removeEventListener("resize", onResize);
    app.ticker.remove(tick);
    stage.off("pointerdown", onPointerDown);
    stage.off("pointermove", onPointerMove);
    stage.off("pointerup", onPointerUp);
    stage.off("pointerupoutside", onPointerUp);
    stage.off("pointerout", onPointerOut);
    backgroundAudio.destroy();
    app.destroy(true, { children: true });
  };
}

function drawBackground(layer, layout, theme, snapshot, assetLibrary) {
  clearContainer(layer);
  const backgroundAssetUrl = pickSceneAssetUrl(snapshot, "background");
  const backgroundTexture = assetLibrary?.getTexture(backgroundAssetUrl) ?? null;

  if (backgroundTexture) {
    const sprite = new PIXI.Sprite(backgroundTexture);
    sprite.anchor.set(0.5);
    layoutCoverSprite(sprite, layout.width, layout.height);
    layer.addChild(sprite);
    return;
  }

  const background = new PIXI.Graphics();
  background.rect(0, 0, layout.width, layout.height).fill({ color: toColorNumber(theme.background, 0xf3f4f6), alpha: 1 });
  layer.addChild(background);
}

function clearContainer(container) {
  const removed = container.removeChildren();
  for (const child of removed) child.destroy({ children: true });
}

function layoutCoverSprite(sprite, width, height) {
  const textureWidth = Math.max(1, sprite.texture.width || sprite.texture.frame.width || 1);
  const textureHeight = Math.max(1, sprite.texture.height || sprite.texture.frame.height || 1);
  const scale = Math.max(width / textureWidth, height / textureHeight);
  sprite.position.set(width * 0.5, height * 0.5);
  sprite.width = textureWidth * scale;
  sprite.height = textureHeight * scale;
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}
