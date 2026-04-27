import * as PIXI from "pixi.js";
import { getSetting } from "../../config.js";
import { EndscreenView } from "./domui/EndscreenView.js";
import { HudView } from "./domui/HudView.js";
import { ensureUiLayerStyles } from "./domui/theme.js";

const NPC_SKIN_SLOT_COUNT = 6;

export class SnakeRenderer {
  constructor(root, kernel) {
    this.root = root;
    this.kernel = kernel;
    this.snapshot = kernel.getSnapshot();

    this.app = null;
    this.wrapper = null;
    this.backgroundMediaLayer = null;
    this.backgroundMediaNode = null;
    this.domUiLayer = null;
    this.hudView = null;
    this.endscreenView = null;
    this.unsubscribe = null;
    this.onKeyDown = null;
    this.onPointerDown = null;
    this.audioUnlocked = false;
    this.audioNodes = {
      bgm: null,
      eat: null,
      death: null,
    };
    this.skinTextures = {
      playerBody: null,
      playerHead: null,
      npcBody: null,
      npcHead: null,
      food: null,
    };
    this.npcSkinTextures = {
      body: new Map(),
      head: new Map(),
    };
    this.skinTextureUrls = {
      playerBody: "",
      playerHead: "",
      npcBody: "",
      npcHead: "",
      food: "",
    };
    this.skinTexturePending = new Map();
    this.skinTextureFailed = new Set();
    this.spritePools = {
      body: [],
      head: [],
      food: [],
    };
    this.lastEffects = {
      eatSeq: this.snapshot.effects?.eatSeq ?? 0,
      deathSeq: this.snapshot.effects?.deathSeq ?? 0,
    };
    this.lastRenderedFoodIds = [];
    this.bestLength = this.loadBestLength();
    this.lastHandledSummaryRoundId = null;
    this.backgroundMediaSignature = "";

    this.camera = { x: 0, y: 0 };
    this.boostButtonBounds = { x: 0, y: 0, radius: 0 };
    this.joystickBounds = { x: 0, y: 0, radius: 0 };
    this.zoom = this.getNumber("gameplay.params.cameraZoom", 0.54);

    this.stageRoot = new PIXI.Container();
    this.backgroundLayer = new PIXI.Graphics();
    this.boundaryLayer = new PIXI.Graphics();
    this.foodLayer = new PIXI.Graphics();
    this.foodSpriteLayer = new PIXI.Container();
    this.deathParticleLayer = new PIXI.Graphics();
    this.snakeShadowLayer = new PIXI.Graphics();
    this.snakeLayer = new PIXI.Graphics();
    this.snakeCoreLayer = new PIXI.Graphics();
    this.snakeBodySpriteLayer = new PIXI.Container();
    this.snakeHeadLayer = new PIXI.Graphics();
    this.snakeHeadSpriteLayer = new PIXI.Container();
    this.overlayLayer = new PIXI.Container();

    this.boostButtonOuter = new PIXI.Graphics();
    this.boostButtonInner = new PIXI.Graphics();
    this.boostButtonGlow = new PIXI.Graphics();
    this.boostLabelText = this.createText("", 18, 0xeafbff, "700");
    this.boostLabelText.anchor.set(0.5);

    this.joystickBase = new PIXI.Graphics();
    this.joystickRing = new PIXI.Graphics();
    this.joystickKnob = new PIXI.Graphics();
    this.joystickLabelText = this.createText("", 15, 0xeafbff, "700");
    this.joystickLabelText.anchor.set(0.5);
  }

  async mount() {
    ensureUiLayerStyles();
    this.root.innerHTML = "";
    this.root.style.overflow = "hidden";

    this.wrapper = document.createElement("div");
    this.wrapper.style.position = "relative";
    this.wrapper.style.width = "100%";
    this.wrapper.style.height = "100%";
    this.wrapper.style.minHeight = "100dvh";
    this.wrapper.style.overflow = "hidden";
    this.wrapper.style.touchAction = "none";
    this.root.appendChild(this.wrapper);

    this.backgroundMediaLayer = document.createElement("div");
    this.backgroundMediaLayer.style.position = "absolute";
    this.backgroundMediaLayer.style.inset = "0";
    this.backgroundMediaLayer.style.zIndex = "0";
    this.backgroundMediaLayer.style.pointerEvents = "none";
    this.backgroundMediaLayer.style.overflow = "hidden";
    this.wrapper.appendChild(this.backgroundMediaLayer);

    this.domUiLayer = document.createElement("div");
    this.domUiLayer.id = "ui-layer";
    this.wrapper.appendChild(this.domUiLayer);

    this.hudView = new HudView();
    this.domUiLayer.appendChild(this.hudView.element);
    this.endscreenView = new EndscreenView({
      onPlayAgain: () => {
        this.kernel.dispatch({ type: "reset" });
      },
    });
    this.domUiLayer.appendChild(this.endscreenView.element);

    this.app = new PIXI.Application();
    await this.app.init({
      backgroundAlpha: 0,
      antialias: true,
      resizeTo: this.wrapper,
      autoDensity: true,
    });

    this.app.canvas.style.position = "absolute";
    this.app.canvas.style.inset = "0";
    this.app.canvas.style.width = "100%";
    this.app.canvas.style.height = "100%";
    this.app.canvas.style.zIndex = "1";
    this.app.canvas.style.touchAction = "none";
    this.wrapper.appendChild(this.app.canvas);

    this.app.stage.addChild(this.stageRoot);
    this.stageRoot.addChild(
      this.backgroundLayer,
      this.boundaryLayer,
      this.foodLayer,
      this.foodSpriteLayer,
      this.deathParticleLayer,
      this.snakeShadowLayer,
      this.snakeLayer,
      this.snakeCoreLayer,
      this.snakeBodySpriteLayer,
      this.snakeHeadLayer,
      this.snakeHeadSpriteLayer,
      this.overlayLayer,
    );

    this.overlayLayer.addChild(
      this.joystickBase,
      this.joystickRing,
      this.joystickKnob,
      this.joystickLabelText,
      this.boostButtonGlow,
      this.boostButtonOuter,
      this.boostButtonInner,
      this.boostLabelText,
    );

    this.kernel.getInputSystem().attach(this.app.canvas);
    this.unsubscribe = this.kernel.subscribe((next) => {
      this.snapshot = next;
    });

    this.onKeyDown = (event) => {
      this.unlockAudio();
      if (event.key.toLowerCase() === "r") {
        this.kernel.dispatch({ type: "reset" });
      }
    };
    this.onPointerDown = () => {
      this.unlockAudio();
    };
    window.addEventListener("keydown", this.onKeyDown);
    this.wrapper.addEventListener("pointerdown", this.onPointerDown, { passive: true });
    this.syncBackgroundMedia();
    this.syncAudio();

    this.app.ticker.add((ticker) => {
      this.layoutOverlay();
      this.kernel.tick(ticker.deltaMS, {
        width: this.wrapper.clientWidth,
        height: this.wrapper.clientHeight,
      });
      this.render();
    });
  }

  destroy() {
    this.unsubscribe?.();
    this.kernel.getInputSystem().detach();
    if (this.onKeyDown) window.removeEventListener("keydown", this.onKeyDown);
    if (this.onPointerDown) this.wrapper?.removeEventListener("pointerdown", this.onPointerDown);
    this.destroyAudioNode("bgm");
    this.destroyAudioNode("eat");
    this.destroyAudioNode("death");
    this.backgroundMediaNode?.remove();
    this.hudView?.element.remove();
    this.endscreenView?.element.remove();
    this.domUiLayer?.remove();
    this.backgroundMediaLayer?.remove();
    this.app?.destroy(true, { children: true });
  }

  render() {
    this.syncBackgroundMedia();
    this.syncAudio();
    this.syncSnakeSkinAssets();
    this.updateCamera();
    this.renderBackground();
    this.renderBoundary();
    this.renderFoods();
    this.renderDeathParticles();
    this.renderSnakes();
    this.renderOverlay();
    this.renderDomHud();
  }

  layoutOverlay() {
    const width = this.wrapper.clientWidth;
    const height = this.wrapper.clientHeight;

    const boostRadius = Math.max(42, Math.min(62, Math.min(width, height) * 0.09));
    this.boostButtonBounds = {
      x: width - boostRadius - 24,
      y: height - boostRadius - 24,
      radius: boostRadius,
    };
    this.kernel.getInputSystem().setBoostButtonBounds(this.boostButtonBounds);

    const joystickRadius = Math.max(
      48,
      Math.min(this.getNumber("gameplay.params.joystickRadius", 58), Math.min(width, height) * 0.12),
    );
    this.joystickBounds = {
      x: 24 + joystickRadius,
      y: height - joystickRadius - 24,
      radius: joystickRadius,
    };
    this.kernel.getInputSystem().setJoystickBounds(this.joystickBounds);
  }

  renderDomHud() {
    const roundLimitSeconds = this.getNumber("gameplay.params.roundTimeLimitSeconds", 120);
    this.syncRoundSummaryState();
    this.hudView?.render(this.snapshot, {
      score: this.getText("ui.text.scoreLabel", "得分"),
      time: this.getText("ui.text.timeLabel", "剩余时间"),
      timeValue: roundLimitSeconds > 0
        ? this.formatTime(Math.max(0, roundLimitSeconds - (this.snapshot.elapsed ?? 0)))
        : "",
      leaderboard: this.getText("ui.text.leaderboardTitle", "排行榜"),
    });
    this.endscreenView?.render(this.snapshot.gameOver ? this.snapshot.roundSummary : null, {
      timeout: this.getText("ui.text.roundTimeoutLabel", "时间到"),
      finished: this.getText("ui.text.roundFinishedLabel", "对局结束"),
      leaderboard: this.getText("ui.text.leaderboardTitle", "排行榜"),
      best: this.getText("ui.text.bestLabel", "历史最佳"),
      bestValue: this.bestLength,
      playAgain: this.getText("ui.text.playAgainLabel", "再玩一次"),
    });
  }

  syncBackgroundMedia() {
    if (!this.backgroundMediaLayer) return;
    const url = this.getText("presentation_background_media", "");
    const type = this.getText("presentation_background_media_type", "image").toLowerCase();
    const fit = this.getText("presentation_background_media_fit", "cover");
    const position = this.getText("presentation_background_media_position", "center center");
    const opacity = this.clamp(this.getNumber("presentation_background_media_opacity", 0.42), 0, 1);
    const baseColor = this.getText("theme_background", "#04111F");
    const signature = [url, type, fit, position, opacity, baseColor].join("|");
    if (signature === this.backgroundMediaSignature) return;
    this.backgroundMediaSignature = signature;

    this.backgroundMediaLayer.style.background = baseColor;
    this.backgroundMediaNode?.remove();
    this.backgroundMediaNode = null;

    if (!url) return;

    if (type === "video") {
      const video = document.createElement("video");
      video.src = url;
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      video.style.position = "absolute";
      video.style.inset = "0";
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = fit;
      video.style.objectPosition = position;
      video.style.opacity = String(opacity);
      video.style.filter = "saturate(0.92) brightness(0.76)";
      video.addEventListener("error", () => {
        video.remove();
        if (this.backgroundMediaNode === video) this.backgroundMediaNode = null;
      }, { once: true });
      this.backgroundMediaLayer.appendChild(video);
      this.backgroundMediaNode = video;
      return;
    }

    const media = document.createElement("div");
    media.style.position = "absolute";
    media.style.inset = "0";
    media.style.backgroundImage = `url("${url}")`;
    media.style.backgroundRepeat = "no-repeat";
    media.style.backgroundSize = fit;
    media.style.backgroundPosition = position;
    media.style.opacity = String(opacity);
    media.style.filter = "saturate(0.92) brightness(0.76)";
    media.style.transform = "scale(1.02)";
    this.backgroundMediaLayer.appendChild(media);
    this.backgroundMediaNode = media;
  }

  syncAudio() {
    const bgmUrl = this.getText("asset_audio_bgm", "");
    const bgm = this.ensureAudioNode("bgm", bgmUrl, true, this.getNumber("asset_audio_bgm_volume", 0.42));
    if (bgm && this.audioUnlocked && bgm.paused) {
      void bgm.play().catch(() => {});
    }

    this.ensureAudioNode("eat", this.getText("asset_audio_eat", ""), false, this.getNumber("asset_audio_eat_volume", 0.72));
    this.ensureAudioNode("death", this.getText("asset_audio_death", ""), false, this.getNumber("asset_audio_death_volume", 0.8));

    const effects = this.snapshot.effects ?? {};
    if ((effects.eatSeq ?? 0) > this.lastEffects.eatSeq) {
      this.playEffect("eat");
    }
    if ((effects.deathSeq ?? 0) > this.lastEffects.deathSeq) {
      this.playEffect("death");
    }
    this.lastEffects = {
      eatSeq: effects.eatSeq ?? 0,
      deathSeq: effects.deathSeq ?? 0,
    };
  }

  unlockAudio() {
    if (this.audioUnlocked) return;
    this.audioUnlocked = true;
    const bgm = this.audioNodes.bgm;
    if (bgm && bgm.paused) {
      void bgm.play().catch(() => {});
    }
  }

  ensureAudioNode(name, url, loop, volume) {
    const normalizedUrl = typeof url === "string" ? url.trim() : "";
    if (!normalizedUrl) {
      this.destroyAudioNode(name);
      return null;
    }

    let audio = this.audioNodes[name];
    if (!audio || audio.dataset.assetUrl !== normalizedUrl) {
      this.destroyAudioNode(name);
      audio = new Audio(normalizedUrl);
      audio.preload = "auto";
      audio.dataset.assetUrl = normalizedUrl;
      this.audioNodes[name] = audio;
    }

    audio.loop = loop;
    audio.volume = this.clamp(volume, 0, 1);
    return audio;
  }

  destroyAudioNode(name) {
    const audio = this.audioNodes[name];
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    this.audioNodes[name] = null;
  }

  playEffect(name) {
    const audio = this.audioNodes[name];
    if (!audio || !this.audioUnlocked) return;
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  }

  updateCamera() {
    const width = this.wrapper.clientWidth;
    const height = this.wrapper.clientHeight;
    const baseZoom = this.getNumber("gameplay.params.cameraZoom", 0.54);
    const minZoom = this.getNumber("gameplay.params.cameraZoomMin", 0.36);
    const zoomPer1000Length = this.getNumber("gameplay.params.cameraZoomPer1000Length", 0.075);
    const zoomSmooth = this.getNumber("gameplay.params.cameraZoomSmooth", 0.065);
    const initialLength = this.getNumber("gameplay.params.initialLength", 360);
    const focusSnake = this.snapshot.playerSnake;
    const focusLength = Math.max(focusSnake.currentLength ?? 0, focusSnake.targetLength ?? 0);
    const extraLength = Math.max(0, focusLength - initialLength);
    const dynamicZoom = baseZoom - (extraLength / 1000) * zoomPer1000Length;
    const targetZoom = this.clamp(dynamicZoom, minZoom, baseZoom);
    this.zoom += (targetZoom - this.zoom) * zoomSmooth;
    const visibleWidth = width / this.zoom;
    const visibleHeight = height / this.zoom;
    const lead = this.snapshot.boosting
      ? this.getNumber("gameplay.params.cameraBoostLead", 60)
      : this.getNumber("gameplay.params.cameraLead", 38);
    const anchorXRatio = this.getNumber("gameplay.params.cameraAnchorX", 0.5);
    const anchorYRatio = this.getNumber("gameplay.params.cameraAnchorY", 0.6);
    const targetX = focusSnake.head.x + Math.cos(focusSnake.angle) * lead - visibleWidth * anchorXRatio;
    const targetY = focusSnake.head.y + Math.sin(focusSnake.angle) * lead - visibleHeight * anchorYRatio;
    const smooth = this.getNumber("gameplay.params.cameraSmooth", 0.09);
    const edgePaddingRatio = this.getNumber("gameplay.params.cameraEdgePaddingRatio", 0.18);
    const edgePaddingX = Math.max(visibleWidth * edgePaddingRatio, visibleWidth * anchorXRatio);
    const edgePaddingY = Math.max(visibleHeight * edgePaddingRatio, visibleHeight * anchorYRatio);
    const minCameraX = -edgePaddingX;
    const maxCameraX = Math.max(minCameraX, this.snapshot.world.width - visibleWidth + edgePaddingX);
    const minCameraY = -edgePaddingY;
    const maxCameraY = Math.max(minCameraY, this.snapshot.world.height - visibleHeight + edgePaddingY);
    const clampedX = this.clamp(targetX, minCameraX, maxCameraX);
    const clampedY = this.clamp(targetY, minCameraY, maxCameraY);

    this.camera.x += (clampedX - this.camera.x) * smooth;
    this.camera.y += (clampedY - this.camera.y) * smooth;
  }

  renderBackground() {
    const width = this.wrapper.clientWidth;
    const height = this.wrapper.clientHeight;
    const spacing = this.getNumber("gameplay.params.backgroundGridSpacing", 120);
    const gridColor = this.getColor("theme.backgroundGrid", 0x0e2842);
    const visibleWidth = width / this.zoom;
    const visibleHeight = height / this.zoom;
    const startWorldX = Math.floor(this.camera.x / spacing) * spacing;
    const startWorldY = Math.floor(this.camera.y / spacing) * spacing;
    const endWorldX = this.camera.x + visibleWidth + spacing;
    const endWorldY = this.camera.y + visibleHeight + spacing;

    this.backgroundLayer.clear();
    this.backgroundLayer.lineStyle({ width: 1, color: gridColor, alpha: 0.55 });
    for (let worldX = startWorldX; worldX <= endWorldX; worldX += spacing) {
      const x = (worldX - this.camera.x) * this.zoom;
      this.backgroundLayer.moveTo(x, 0);
      this.backgroundLayer.lineTo(x, height);
    }
    for (let worldY = startWorldY; worldY <= endWorldY; worldY += spacing) {
      const y = (worldY - this.camera.y) * this.zoom;
      this.backgroundLayer.moveTo(0, y);
      this.backgroundLayer.lineTo(width, y);
    }
  }

  renderBoundary() {
    const topLeft = this.worldToScreen({ x: 0, y: 0 });
    const worldWidth = this.snapshot.world.width * this.zoom;
    const worldHeight = this.snapshot.world.height * this.zoom;
    const borderColor = this.getColor("theme.uiPanelBorder", 0x1d547a);

    this.boundaryLayer.clear();
    this.boundaryLayer.rect(topLeft.x - 8, topLeft.y - 8, worldWidth + 16, worldHeight + 16).stroke({
      width: Math.max(1.5, 2 * this.zoom),
      color: 0xffffff,
      alpha: 0.12,
    });

    this.boundaryLayer.rect(topLeft.x, topLeft.y, worldWidth, worldHeight).stroke({
      width: Math.max(2, 3 * this.zoom),
      color: borderColor,
      alpha: 0.82,
    });
  }

  renderFoods() {
    const width = this.wrapper.clientWidth;
    const height = this.wrapper.clientHeight;
    this.foodLayer.clear();
    let foodSpriteIndex = 0;
    const visibleFoods = [];

    for (const food of this.snapshot.foods) {
      const screen = this.worldToScreen(food);
      if (screen.x < -40 || screen.x > width + 40 || screen.y < -40 || screen.y > height + 40) {
        continue;
      }
      visibleFoods.push({ food, screen });
    }

    const renderCap = this.getNumber("gameplay.params.foodRenderCap", 110);
    const selectedFoods = this.selectFoodsForRender(visibleFoods, renderCap, width, height);

    for (const { food, screen } of selectedFoods) {
      const pulse = 0.88 + Math.sin(this.snapshot.elapsed * 4 + food.phase) * 0.12;
      const radius = food.radius * this.zoom;
      this.foodLayer.beginFill(food.color, 0.18);
      this.foodLayer.drawCircle(screen.x, screen.y, radius * pulse * 2.4);
      this.foodLayer.endFill();

      if (this.skinTextures.food) {
        const sprite = this.getSpriteFromPool("food", foodSpriteIndex);
        sprite.texture = this.skinTextures.food;
        sprite.x = screen.x;
        sprite.y = screen.y;
        sprite.rotation = food.phase + this.degToRad(this.getNumber("asset_food_rotation_deg", 0));
        this.applySpriteSize(sprite, Math.max(8, radius * 2 * pulse * this.getNumber("asset_food_image_scale", 1)), 1);
        sprite.alpha = 0.98;
        sprite.tint = 0xffffff;
        sprite.visible = true;
        foodSpriteIndex += 1;
        continue;
      }

      this.foodLayer.beginFill(food.color, 0.98);
      this.foodLayer.drawCircle(screen.x, screen.y, radius * pulse);
      this.foodLayer.endFill();

      this.foodLayer.beginFill(0xffffff, 0.45);
      this.foodLayer.drawCircle(screen.x - radius * 0.16, screen.y - radius * 0.16, radius * 0.24);
      this.foodLayer.endFill();
    }

    this.lastRenderedFoodIds = selectedFoods.map(({ food }) => food.id);
    this.hideUnusedSprites("food", foodSpriteIndex);
  }

  selectFoodsForRender(visibleFoods, renderCap, viewportWidth, viewportHeight) {
    if (visibleFoods.length <= renderCap) {
      return visibleFoods;
    }

    const prioritized = [];
    const visibleById = new Map(visibleFoods.map((entry) => [entry.food.id, entry]));
    const selectedIds = new Set();
    const preservedCap = Math.max(0, Math.floor(renderCap * 0.45));

    for (const id of this.lastRenderedFoodIds) {
      const entry = visibleById.get(id);
      if (!entry) continue;
      prioritized.push(entry);
      selectedIds.add(id);
      if (prioritized.length >= preservedCap) {
        break;
      }
    }

    const focus = this.snapshot.playerSnake?.head ?? {
      x: this.camera.x + viewportWidth * 0.5 / Math.max(this.zoom, 0.0001),
      y: this.camera.y + viewportHeight * 0.5 / Math.max(this.zoom, 0.0001),
    };

    const remaining = visibleFoods
      .filter(({ food }) => !selectedIds.has(food.id))
      .sort((left, right) => {
        const leftDistance = this.distanceSquared(left.food, focus);
        const rightDistance = this.distanceSquared(right.food, focus);
        if (leftDistance !== rightDistance) return leftDistance - rightDistance;
        return left.food.id - right.food.id;
      });

    for (const entry of remaining) {
      prioritized.push(entry);
      if (prioritized.length >= renderCap) break;
    }

    return prioritized;
  }

  renderSnakes() {
    const snakes = [...this.snapshot.npcs, this.snapshot.playerSnake].filter((snake) => snake.alive);
    this.syncSnakeSkinAssets();
    this.snakeShadowLayer.clear();
    this.snakeLayer.clear();
    this.snakeCoreLayer.clear();
    this.snakeHeadLayer.clear();
    let bodySpriteIndex = 0;
    let headSpriteIndex = 0;
    const thicknessScale = this.getNumber("gameplay.params.snakeThicknessScale", 0.84);

    for (const snake of snakes) {
      const points = this.sampleSnakePoints(snake.body);
      const shadowWidth = (snake.radius * 2 + 12) * this.zoom * thicknessScale;
      const bodyWidth = snake.radius * 2 * this.zoom * thicknessScale;
      const coreWidth = Math.max(6 * this.zoom, snake.radius * 0.92 * this.zoom * thicknessScale);
      this.drawSmoothStroke(this.snakeShadowLayer, points, shadowWidth, 0x03131f, snake.isPlayer ? 0.24 : 0.18);
      const usedBodyTexture = this.drawSnakeBodyTexture(snake, points, bodyWidth, bodySpriteIndex);
      bodySpriteIndex += usedBodyTexture;
      if (!usedBodyTexture) {
        this.drawSmoothStroke(this.snakeLayer, points, bodyWidth, snake.colors.body, snake.isPlayer ? 0.98 : 0.84);
        this.drawSmoothStroke(this.snakeCoreLayer, points, coreWidth, snake.colors.core, snake.isPlayer ? 0.34 : 0.26);
      }
    }

    for (const snake of snakes) {
      headSpriteIndex += this.drawSnakeHead(snake, headSpriteIndex);
    }

    this.hideUnusedSprites("body", bodySpriteIndex);
    this.hideUnusedSprites("head", headSpriteIndex);
  }

  renderOverlay() {
    const { x, y, radius } = this.boostButtonBounds;
    const isBoosting = this.snapshot.boosting;

    this.boostLabelText.text = this.getText("ui.text.boostLabel", "加速");

    this.boostButtonGlow.clear();

    this.boostButtonOuter.clear();
    this.boostButtonOuter.circle(x, y, radius).stroke({
      width: 3,
      color: 0xffffff,
      alpha: isBoosting ? 1 : 0.9,
    });

    this.boostButtonInner.clear();

    this.boostLabelText.x = x;
    this.boostLabelText.y = y;
    this.boostLabelText.alpha = isBoosting ? 1 : 0.88;
    this.renderJoystick();
  }

  renderDeathParticles() {
    this.deathParticleLayer.clear();
    for (const particle of this.snapshot.deathParticles ?? []) {
      const screen = this.worldToScreen(particle);
      const progress = 1 - particle.life / particle.maxLife;
      const radius = Math.max(1.5, particle.radius * this.zoom * (1 - progress * 0.45));
      const alpha = Math.max(0, 0.9 - progress);

      this.deathParticleLayer.beginFill(particle.color, alpha * 0.22);
      this.deathParticleLayer.drawCircle(screen.x, screen.y, radius * 2.2);
      this.deathParticleLayer.endFill();

      this.deathParticleLayer.beginFill(particle.color, alpha);
      this.deathParticleLayer.drawCircle(screen.x, screen.y, radius);
      this.deathParticleLayer.endFill();
    }
  }

  syncSnakeSkinAssets() {
    this.ensureSkinTexture("playerBody", this.getText("asset_snake_body_image", ""));
    this.ensureSkinTexture("playerHead", this.getText("asset_snake_head_image", ""));
    this.ensureSkinTexture("npcBody", this.getText("asset_npc_snake_body_image", ""));
    this.ensureSkinTexture("npcHead", this.getText("asset_npc_snake_head_image", ""));
    this.ensureSkinTexture("food", this.getText("asset_food_image", ""));
    for (let index = 1; index <= NPC_SKIN_SLOT_COUNT; index += 1) {
      this.ensureNpcSkinTexture("body", index);
      this.ensureNpcSkinTexture("head", index);
    }
  }

  ensureNpcSkinTexture(kind, index) {
    const key = `npcSkin${index}${kind === "body" ? "Body" : "Head"}`;
    const url = this.getText(`asset_npc_skin_${index}_${kind}_image`, "");
    this.ensureSkinTexture(key, url);
    const texture = this.skinTextures[key] ?? null;
    if (texture) {
      this.npcSkinTextures[kind].set(`npc-skin-${index}`, texture);
      return;
    }
    this.npcSkinTextures[kind].delete(`npc-skin-${index}`);
  }

  ensureSkinTexture(key, rawUrl) {
    const url = typeof rawUrl === "string" ? rawUrl.trim() : "";
    if (!url) {
      this.skinTextures[key] = null;
      this.skinTextureUrls[key] = "";
      return;
    }

    if (this.skinTextureUrls[key] !== url) {
      this.skinTextures[key] = null;
      this.skinTextureUrls[key] = url;
    }

    if (this.skinTextureUrls[key] === url && this.skinTextures[key]) {
      return;
    }

    if (this.skinTextureFailed.has(url) || this.skinTexturePending.has(url)) {
      return;
    }

    const task = PIXI.Assets.load(url)
      .then((resource) => {
        const texture = this.resolveTexture(resource, url);
        if (!texture) {
          this.skinTextureFailed.add(url);
          if (this.skinTextureUrls[key] === url) {
            this.skinTextures[key] = null;
          }
          return;
        }
        if (this.skinTextureUrls[key] === url) {
          this.skinTextures[key] = texture;
        }
      })
      .catch(() => {
        this.skinTextureFailed.add(url);
        if (this.skinTextureUrls[key] === url) {
          this.skinTextures[key] = null;
        }
      })
      .finally(() => {
        this.skinTexturePending.delete(url);
      });
    this.skinTexturePending.set(url, task);
  }

  resolveTexture(resource, url) {
    if (resource instanceof PIXI.Texture) return resource;
    if (resource?.texture instanceof PIXI.Texture) return resource.texture;
    try {
      const texture = PIXI.Texture.from(url);
      return texture instanceof PIXI.Texture ? texture : null;
    } catch {
      return null;
    }
  }

  drawSnakeBodyTexture(snake, points, bodyWidth, spriteStartIndex) {
    const texture = snake.isPlayer
      ? this.skinTextures.playerBody
      : this.npcSkinTextures.body.get(snake.skinId) ?? this.skinTextures.npcBody;
    if (!texture || points.length < 2) return 0;

    const spacing = Math.max(8, bodyWidth * this.getNumber(
      snake.isPlayer ? "asset_snake_body_spacing_ratio" : "asset_npc_snake_body_spacing_ratio",
      0.58,
    ));
    const height = Math.max(10, bodyWidth * this.getNumber(
      snake.isPlayer ? "asset_snake_body_image_scale" : "asset_npc_snake_body_image_scale",
      1,
    ));
    const rotation = this.degToRad(this.getNumber(
      snake.isPlayer ? "asset_snake_body_rotation_deg" : "asset_npc_snake_body_rotation_deg",
      0,
    ));
    const lengthScale = this.getNumber(
      snake.isPlayer ? "asset_snake_body_length_scale" : "asset_npc_snake_body_length_scale",
      1.08,
    );
    let spriteIndex = spriteStartIndex;
    let carry = 0;

    for (let index = 1; index < points.length; index += 1) {
      const prev = points[index - 1];
      const next = points[index];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const segmentLength = Math.hypot(dx, dy);
      if (segmentLength < 0.001) continue;

      const angle = Math.atan2(dy, dx) + rotation;
      let cursor = carry;
      while (cursor <= segmentLength) {
        const t = cursor / segmentLength;
        const sprite = this.getSpriteFromPool("body", spriteIndex);
        sprite.texture = texture;
        sprite.x = prev.x + dx * t;
        sprite.y = prev.y + dy * t;
        sprite.rotation = angle;
        this.applySpriteSize(sprite, height, lengthScale);
        sprite.alpha = snake.isPlayer ? 1 : 0.92;
        sprite.tint = 0xffffff;
        sprite.visible = true;
        spriteIndex += 1;
        cursor += spacing;
      }
      carry = cursor - segmentLength;
    }

    return spriteIndex - spriteStartIndex;
  }

  drawSnakeHead(snake, spriteIndex) {
    const texture = snake.isPlayer
      ? this.skinTextures.playerHead
      : this.npcSkinTextures.head.get(snake.skinId) ?? this.skinTextures.npcHead;
    if (texture) {
      return this.drawSnakeHeadTexture(snake, texture, spriteIndex);
    }

    const head = this.worldToScreen(snake.head);
    const headingX = Math.cos(snake.angle);
    const headingY = Math.sin(snake.angle);
    const radius = snake.radius * this.zoom * this.getNumber("gameplay.params.snakeHeadScale", 0.9);

    this.snakeHeadLayer.beginFill(0x03131f, 0.2);
    this.snakeHeadLayer.drawCircle(head.x + 5, head.y + 7, radius + 8);
    this.snakeHeadLayer.endFill();

    this.snakeHeadLayer.beginFill(snake.colors.head, 1);
    this.snakeHeadLayer.drawCircle(head.x, head.y, radius + 2);
    this.snakeHeadLayer.endFill();

    this.snakeHeadLayer.beginFill(0xffffff, snake.isPlayer ? 0.28 : 0.18);
    this.snakeHeadLayer.drawCircle(head.x - radius * 0.28, head.y - radius * 0.36, radius * 0.54);
    this.snakeHeadLayer.endFill();

    const eyeOffsetSide = radius * 0.42;
    const eyeOffsetForward = radius * 0.42;
    this.drawEye(head, headingX, headingY, eyeOffsetSide, eyeOffsetForward, -1);
    this.drawEye(head, headingX, headingY, eyeOffsetSide, eyeOffsetForward, 1);
    return 0;
  }

  drawSnakeHeadTexture(snake, texture, spriteIndex) {
    const head = this.worldToScreen(snake.head);
    const radius = snake.radius * this.zoom * this.getNumber("gameplay.params.snakeHeadScale", 0.9);
    const shadowRadius = radius + 8;

    this.snakeHeadLayer.beginFill(0x03131f, 0.2);
    this.snakeHeadLayer.drawCircle(head.x + 5, head.y + 7, shadowRadius);
    this.snakeHeadLayer.endFill();

    const sprite = this.getSpriteFromPool("head", spriteIndex);
    sprite.texture = texture;
    sprite.x = head.x;
    sprite.y = head.y;
    sprite.rotation = snake.angle + this.degToRad(this.getNumber(
      snake.isPlayer ? "asset_snake_head_rotation_deg" : "asset_npc_snake_head_rotation_deg",
      0,
    ));
    this.applySpriteSize(sprite, Math.max(
      12,
      radius * 2 * this.getNumber(
        snake.isPlayer ? "asset_snake_head_image_scale" : "asset_npc_snake_head_image_scale",
        1.12,
      ),
    ), 1);
    sprite.alpha = 1;
    sprite.tint = 0xffffff;
    sprite.visible = true;
    return 1;
  }

  drawEye(head, headingX, headingY, offsetSide, offsetForward, side) {
    const sideX = -headingY * offsetSide * side;
    const sideY = headingX * offsetSide * side;
    const eyeX = head.x + headingX * offsetForward + sideX;
    const eyeY = head.y + headingY * offsetForward + sideY;

    this.snakeHeadLayer.beginFill(0xffffff, 1);
    this.snakeHeadLayer.drawCircle(eyeX, eyeY, 4.6);
    this.snakeHeadLayer.endFill();

    this.snakeHeadLayer.beginFill(0x082133, 1);
    this.snakeHeadLayer.drawCircle(eyeX + headingX * 1.4, eyeY + headingY * 1.4, 2.1);
    this.snakeHeadLayer.endFill();
  }

  drawSmoothStroke(graphics, points, width, color, alpha) {
    if (points.length < 2) return;

    graphics.moveTo(points[0].x, points[0].y);
    if (points.length === 2) {
      graphics.lineTo(points[1].x, points[1].y);
      graphics.stroke({
        width,
        color,
        alpha,
        cap: "round",
        join: "round",
      });
      return;
    }

    for (let i = 1; i < points.length - 1; i += 1) {
      const current = points[i];
      const next = points[i + 1];
      const midX = (current.x + next.x) * 0.5;
      const midY = (current.y + next.y) * 0.5;
      graphics.quadraticCurveTo(current.x, current.y, midX, midY);
    }

    const penultimate = points[points.length - 2];
    const last = points[points.length - 1];
    graphics.quadraticCurveTo(penultimate.x, penultimate.y, last.x, last.y);
    graphics.stroke({
      width,
      color,
      alpha,
      cap: "round",
      join: "round",
    });
  }

  renderJoystick() {
    const joystick = this.snapshot.input?.joystick;
    if (!joystick) return;

    this.joystickBase.clear();
    this.joystickBase.lineStyle({ width: 2, color: 0xffffff, alpha: joystick.active ? 0.32 : 0.14 });
    this.joystickBase.drawCircle(joystick.base.x, joystick.base.y, joystick.radius + 8);

    this.joystickRing.clear();
    this.joystickRing.lineStyle({ width: 3, color: 0xffffff, alpha: joystick.active ? 0.56 : 0.24 });
    this.joystickRing.drawCircle(joystick.base.x, joystick.base.y, joystick.radius);

    this.joystickKnob.clear();
    this.joystickKnob.beginFill(0xffffff, joystick.active ? 0.34 : 0.2);
    this.joystickKnob.drawCircle(joystick.knob.x, joystick.knob.y, joystick.radius * 0.3);
    this.joystickKnob.endFill();

    this.joystickLabelText.x = joystick.base.x;
    this.joystickLabelText.y = joystick.base.y + joystick.radius + 10;
    this.joystickLabelText.alpha = joystick.active ? 1 : 0.82;
  }

  sampleSnakePoints(body) {
    if (!Array.isArray(body) || body.length === 0) return [];
    if (body.length === 1) return [this.worldToScreen(body[0])];

    const sampled = [];
    const minDistance = Math.max(2.5, 4.5 * this.zoom);
    const minDistanceSq = minDistance * minDistance;
    let lastKept = null;

    for (let index = 0; index < body.length; index += 1) {
      const isLast = index === body.length - 1;
      const point = this.worldToScreen(body[index]);
      if (!lastKept) {
        sampled.push(point);
        lastKept = point;
        continue;
      }

      const dx = point.x - lastKept.x;
      const dy = point.y - lastKept.y;
      if (isLast || dx * dx + dy * dy >= minDistanceSq) {
        sampled.push(point);
        lastKept = point;
      }
    }

    const pointCap = this.getNumber("gameplay.params.snakeRenderPointCap", 180);
    if (sampled.length <= pointCap) return sampled;

    const compacted = [];
    const stride = Math.ceil(sampled.length / pointCap);
    for (let index = 0; index < sampled.length; index += stride) {
      compacted.push(sampled[index]);
    }
    const lastPoint = sampled[sampled.length - 1];
    if (compacted[compacted.length - 1] !== lastPoint) {
      compacted.push(lastPoint);
    }
    return compacted;
  }

  getSpriteFromPool(kind, index) {
    const pool = this.spritePools[kind];
    if (pool[index]) return pool[index];

    const sprite = new PIXI.Sprite();
    sprite.anchor.set(0.5);
    pool.push(sprite);
    if (kind === "body") {
      this.snakeBodySpriteLayer.addChild(sprite);
    } else {
      this.snakeHeadSpriteLayer.addChild(sprite);
    }
    return sprite;
  }

  hideUnusedSprites(kind, usedCount) {
    const pool = this.spritePools[kind];
    for (let index = usedCount; index < pool.length; index += 1) {
      pool[index].visible = false;
    }
  }

  applySpriteSize(sprite, targetHeight, lengthScale = 1) {
    const textureWidth = Number(sprite.texture?.width ?? sprite.texture?.orig?.width ?? 0);
    const textureHeight = Number(sprite.texture?.height ?? sprite.texture?.orig?.height ?? 0);
    const aspect = textureWidth > 0 && textureHeight > 0 ? textureWidth / textureHeight : 1;
    sprite.height = targetHeight;
    sprite.width = targetHeight * aspect * lengthScale;
  }

  worldToScreen(point) {
    return {
      x: (point.x - this.camera.x) * this.zoom,
      y: (point.y - this.camera.y) * this.zoom,
    };
  }

  distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  createText(text, fontSize, fill, fontWeight) {
    return new PIXI.Text({
      text,
      style: {
        fill,
        fontSize,
        fontWeight,
        fontFamily: "Arial",
      },
    });
  }

  formatTime(totalSeconds) {
    const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  syncRoundSummaryState() {
    const summary = this.snapshot.roundSummary;
    if (!summary) return;
    if (summary.roundId === this.lastHandledSummaryRoundId) return;
    this.lastHandledSummaryRoundId = summary.roundId;
    const nextBest = Math.max(this.bestLength, Math.round(summary.playerLength ?? 0));
    if (nextBest === this.bestLength) return;
    this.bestLength = nextBest;
    this.saveBestLength(nextBest);
  }

  loadBestLength() {
    if (typeof window === "undefined" || !window.localStorage) return 0;
    const raw = window.localStorage.getItem("snake-nobuild-best-length");
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  saveBestLength(value) {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem("snake-nobuild-best-length", String(Math.max(0, Math.round(value))));
  }

  getNumber(path, fallback) {
    const value = getSetting(path, fallback);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  }

  getText(path, fallback) {
    const value = getSetting(path, fallback);
    return typeof value === "string" && value.length > 0 ? value : fallback;
  }

  getColor(path, fallback) {
    return this.toColorHex(getSetting(path, fallback), fallback);
  }

  toColorHex(value, fallback) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") return fallback;
    const normalized = value.trim();
    const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return fallback;
    return Number.parseInt(hex, 16);
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  degToRad(value) {
    return (value * Math.PI) / 180;
  }
}
