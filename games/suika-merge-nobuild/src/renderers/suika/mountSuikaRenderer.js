import * as PIXI from "pixi.js";
import { buildAssetMap, buildFruitTypes, getSetting } from "../../config.js";
import { FruitContainer } from "./FruitContainer.js";
import { HUD } from "./HUD.js";
import { DropIndicator } from "./DropIndicator.js";
import { loadFruitTextures, preloadTextures } from "./fruitAssets.js";
import { AudioFx } from "./audioFx.js";
export async function mountSuikaRenderer(root, kernel, options = {}) {
    root.innerHTML = "";
    root.classList.add("suika-root");
    const shell = document.createElement("div");
    shell.className = "suika-shell";
    root.appendChild(shell);
    const app = new PIXI.Application();
    await app.init({ resizeTo: shell, antialias: true, backgroundAlpha: 1, background: 0x0f1f33 });
    shell.appendChild(app.canvas);
    const hud = new HUD({
        onRestart: () => kernel.dispatch({ type: "start_or_restart" }),
    });
    shell.appendChild(hud.root);
    const board = new PIXI.Graphics();
    const fruitAssetMap = buildAssetMap("asset_fruits_");
    const audioAssetMap = buildAssetMap("asset_audio_");
    const warningShowDistance = getSetting("gameplay_warning_show_distance", 88);
    const warningStartDelayMs = Math.max(0, getSetting("gameplay_warning_start_delay_ms", 0));
    const warningUiHoldMs = Math.max(0, getSetting("gameplay_warning_ui_hold_ms", 220));
    const configuredGroundHeight = getSetting("gameplay_world_ground_height", 76);
    const audioFx = new AudioFx({ audioAssets: audioAssetMap });
    const bgAsset = fruitAssetMap.bg ?? "assets/fruits/bg.png";
    const groundAsset = fruitAssetMap.ground ?? "assets/fruits/ground.png";
    const warningAsset = fruitAssetMap.warning ?? "assets/fruits/warning.png";
    const boom1Asset = fruitAssetMap.boom1 ?? "assets/fruits/boom1.png";
    const boom2Asset = fruitAssetMap.boom2 ?? "assets/fruits/boom2.png";
    const fruitScale = Math.max(0.5, getSetting("gameplay_fruit_scale", 1));
    const fruitDefs = buildFruitTypes();
    const fruitRadiusByType = new Map(fruitDefs.map((item) => [item.type, item.radius * fruitScale]));
    const preloadTargets = {};
    for (const [key, url] of Object.entries(fruitAssetMap))
        preloadTargets[key] = url;
    preloadTargets.__bg = bgAsset;
    preloadTargets.__ground = groundAsset;
    preloadTargets.__warning = warningAsset;
    preloadTargets.__boom1 = boom1Asset;
    preloadTargets.__boom2 = boom2Asset;
    const preloadedTextures = await preloadTextures(preloadTargets, (completed, total) => {
        options.onAssetProgress?.(total > 0 ? completed / total : 1);
    });
    const bgTexture = preloadedTextures.get("__bg");
    const warningTexture = preloadedTextures.get("__warning");
    const groundTexture = preloadedTextures.get("__ground");
    const boom1Texture = preloadedTextures.get("__boom1");
    const boom2Texture = preloadedTextures.get("__boom2");
    shell.style.background = "#102238";
    const fruitTextureAssets = Object.fromEntries(Object.entries(fruitAssetMap).filter(([key]) => /^fruit/i.test(key)));
    const fruitTextures = new Map();
    const missingFruitAssets = {};
    for (const [key, url] of Object.entries(fruitTextureAssets)) {
        const texture = preloadedTextures.get(key);
        if (texture)
            fruitTextures.set(key, texture);
        else
            missingFruitAssets[key] = url;
    }
    if (Object.keys(missingFruitAssets).length > 0) {
        const loadedMissing = await loadFruitTextures(missingFruitAssets);
        for (const [key, texture] of loadedMissing) {
            fruitTextures.set(key, texture);
        }
    }
    const fruitContainer = new FruitContainer(fruitTextures, {
        mergeFrameA: boom1Texture,
        mergeFrameB: boom2Texture,
        onMerge: ({ targetType, radius }) => {
            audioFx.playMerge(targetType);
            if (targetType.toLowerCase() === "fruitboss" || radius >= 52) {
                audioFx.playBlast();
            }
        },
    });
    const dropIndicator = new DropIndicator(warningTexture);
    const background = new PIXI.Sprite(bgTexture ?? PIXI.Texture.EMPTY);
    background.anchor.set(0.5, 0);
    const ground = new PIXI.Sprite(groundTexture ?? PIXI.Texture.EMPTY);
    ground.anchor.set(0.5, 1);
    app.stage.addChild(background, board, ground, fruitContainer.root, dropIndicator.root);
    const syncKernelWorldSize = () => {
        kernel.dispatch({
            type: "resize_world",
            width: shell.clientWidth,
            height: shell.clientHeight,
        });
    };
    syncKernelWorldSize();
    let latest = kernel.getSnapshot();
    let previous = latest;
    let hasStartedOnce = false;
    let pointerX = latest.world.width * 0.5;
    let viewport = computeViewport(shell.clientWidth, shell.clientHeight, latest.world.width, latest.world.height);
    let shakeTimer = 0;
    let shakePower = 0;
    let roundStartedAtMs = 0;
    let warningLatchedUntilMs = 0;
    const render = (snapshot) => {
        latest = snapshot;
        if ((snapshot.state.landingSfxTick ?? 0) > (previous.state.landingSfxTick ?? 0)) {
            audioFx.playDrop();
        }
        if (snapshot.state.isGameOver && !previous.state.isGameOver) {
            audioFx.playGameOver();
            audioFx.playBlast();
            shakeTimer = 220;
            shakePower = 8;
        }
        if (snapshot.state.started && !previous.state.started) {
            audioFx.playStartOrRestart(hasStartedOnce);
            audioFx.playBgm();
            hasStartedOnce = true;
            roundStartedAtMs = performance.now();
        }
        if (snapshot.state.message.startsWith("Merged to watermelo") && previous.state.message !== snapshot.state.message) {
            shakeTimer = 220;
            shakePower = 6;
        }
        viewport = computeViewport(shell.clientWidth, shell.clientHeight, snapshot.world.width, snapshot.world.height);
        let offsetX = viewport.offsetX;
        let offsetY = viewport.offsetY;
        if (shakeTimer > 0) {
            const intensity = Math.max(0, shakeTimer / 220);
            const amount = shakePower * intensity;
            offsetX += (Math.random() * 2 - 1) * amount;
            offsetY += (Math.random() * 2 - 1) * amount * 0.45;
        }
        app.stage.position.set(offsetX, offsetY);
        app.stage.scale.set(viewport.scale);
        board.clear();
        const groundHeight = Math.max(36, Math.min(snapshot.world.height * 0.4, configuredGroundHeight));
        background.position.set(snapshot.world.width * 0.5, 0);
        background.width = snapshot.world.width;
        background.height = snapshot.world.height - groundHeight + 2;
        background.alpha = 1;
        ground.position.set(snapshot.world.width * 0.5, snapshot.world.height + 1);
        ground.width = snapshot.world.width;
        ground.height = groundHeight;
        ground.alpha = 1;
        fruitContainer.render(snapshot.state.fruits);
        const isWarningDelayReady = snapshot.state.started
            && (warningStartDelayMs === 0 || performance.now() - roundStartedAtMs >= warningStartDelayMs);
        const warningCandidates = snapshot.state.fruits.filter((fruit) => fruit.isSettled);
        const highestFruitTopY = warningCandidates.length > 0
            ? Math.min(...warningCandidates.map((fruit) => fruit.y - fruit.radius))
            : Number.POSITIVE_INFINITY;
        const warningDistance = highestFruitTopY - snapshot.world.warningLineY;
        const isNearWarningRaw = isWarningDelayReady
            && warningDistance >= 0
            && warningDistance <= warningShowDistance;
        if (isNearWarningRaw) {
            warningLatchedUntilMs = performance.now() + warningUiHoldMs;
        }
        const isNearWarning = isNearWarningRaw || performance.now() < warningLatchedUntilMs;
        const previewX = lerp(snapshot.world.spawnXMin, snapshot.world.spawnXMax, clamp(pointerX / snapshot.world.width, 0, 1));
        dropIndicator.render(snapshot.world.width, snapshot.world.warningLineY, previewX, isNearWarning, fruitTextures.get(snapshot.state.nextFruitType), fruitRadiusByType.get(snapshot.state.nextFruitType) ?? 18);
        hud.render(snapshot);
        previous = snapshot;
    };
    const onPointerMove = (event) => {
        pointerX = mapClientXToWorldX(event.clientX, shell, viewport, latest.world.width);
    };
    const onPointerDown = (event) => {
        audioFx.unlock();
        pointerX = mapClientXToWorldX(event.clientX, shell, viewport, latest.world.width);
        const normalizedX = clamp(pointerX / latest.world.width, 0, 1);
        kernel.dispatch({ type: "spawn_fruit", normalizedX });
    };
    app.canvas.addEventListener("pointermove", onPointerMove);
    app.canvas.addEventListener("pointerdown", onPointerDown);
    app.ticker.add((ticker) => {
        const deltaMs = ticker.deltaMS;
        kernel.dispatch({ type: "tick", deltaMs });
        fruitContainer.tick(deltaMs);
        dropIndicator.tick(deltaMs);
        shakeTimer = Math.max(0, shakeTimer - deltaMs);
    });
    const unsubscribe = kernel.subscribe(render);
    const onResize = () => {
        syncKernelWorldSize();
        render(kernel.getSnapshot());
    };
    window.addEventListener("resize", onResize);
    const teardown = () => {
        unsubscribe();
        window.removeEventListener("resize", onResize);
        app.canvas.removeEventListener("pointermove", onPointerMove);
        app.canvas.removeEventListener("pointerdown", onPointerDown);
        audioFx.stopBgm();
        app.destroy(true);
        shell.remove();
        root.classList.remove("suika-root");
    };
    window.addEventListener("beforeunload", teardown, { once: true });
}
function computeViewport(hostWidth, hostHeight, worldWidth, worldHeight) {
    const safeW = Math.max(100, hostWidth);
    const safeH = Math.max(100, hostHeight);
    // Use contain scaling: no stretch and no crop.
    const scale = Math.min(safeW / worldWidth, safeH / worldHeight);
    const offsetX = (hostWidth - worldWidth * scale) * 0.5;
    const offsetY = (hostHeight - worldHeight * scale) * 0.5;
    return { scale, offsetX, offsetY };
}
function mapClientXToWorldX(clientX, host, viewport, worldWidth) {
    const rect = host.getBoundingClientRect();
    const localX = clientX - rect.left - viewport.offsetX;
    return clamp(localX / viewport.scale, 0, worldWidth);
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function lerp(min, max, t) {
    return min + (max - min) * t;
}
