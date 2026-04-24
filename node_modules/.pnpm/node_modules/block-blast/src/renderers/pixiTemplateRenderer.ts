import * as PIXI from "pixi.js";
import { EliminationSnapshot, GameKernel, Piece } from "../core/contracts";
import { getSetting } from "../config";
import {
  UiFeedbackMessagesConfig,
  buildStatusText,
  detectFeedbackFlags,
  getFeedbackMessage,
} from "./uiModel";

type UiTemplateConfig = {
  layout?: {
    root?: {
      regions?: string[];
      adaptiveRules?: {
        compactBreakpoint?: number;
      };
    };
    hud_top?: {
      slots?: string[];
    };
    tray?: {
      slotCountSource?: string;
    };
    background?: {
      layers?: string[];
    };
  };
};

type UiMechanicMappingConfig = {
  feedback?: Array<{
    mechanic: string;
    feedback: string[];
  }>;
};

type LayoutMetrics = {
  compact: boolean;
  panelMargin: number;
  boardX: number;
  boardY: number;
  boardSize: number;
  boardPadding: number;
  gridGap: number;
  cellSize: number;
  trayY: number;
  trayHeight: number;
  slotCount: number;
  cardWidth: number;
  cardGap: number;
};

type SafeInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type DragState = {
  active: boolean;
  pieceIndex: number | null;
  pointerX: number;
  pointerY: number;
  anchorRow: number | null;
  anchorCol: number | null;
  valid: boolean;
};

function toHex(color: string, fallback: number): number {
  if (!color.startsWith("#")) return fallback;
  const parsed = Number.parseInt(color.slice(1), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseCssPx(raw: string): number {
  const value = Number.parseFloat(raw.trim());
  return Number.isFinite(value) ? value : 0;
}

function hasRegion(template: UiTemplateConfig, region: string): boolean {
  const regions = template.layout?.root?.regions ?? [];
  return regions.length === 0 || regions.includes(region);
}

function hasHudSlot(template: UiTemplateConfig, slot: string): boolean {
  const slots = template.layout?.hud_top?.slots ?? [];
  return slots.length === 0 || slots.includes(slot);
}

function canPlacePieceAt(
  snapshot: EliminationSnapshot,
  pieceIndex: number,
  anchorRow: number,
  anchorCol: number,
): boolean {
  const selected = snapshot.state.bag[pieceIndex];
  if (!selected) return false;
  for (const cell of selected.cells) {
    const row = anchorRow + cell.row;
    const col = anchorCol + cell.col;
    if (row < 0 || col < 0 || row >= snapshot.rows || col >= snapshot.cols) return false;
    if (snapshot.state.board[row]?.[col]?.filled) return false;
  }
  return true;
}

function drawMiniPiece(
  graphics: any,
  piece: Piece,
  cardX: number,
  cardY: number,
  cardW: number,
  cardH: number,
): void {
  const maxRow = Math.max(...piece.cells.map((item) => item.row)) + 1;
  const maxCol = Math.max(...piece.cells.map((item) => item.col)) + 1;
  const miniSize = Math.min(16, (cardW - 20) / Math.max(maxCol, maxRow));
  const baseX = cardX + (cardW - maxCol * miniSize) * 0.5;
  const baseY = cardY + (cardH - maxRow * miniSize) * 0.5;
  const fillColor = toHex(piece.color, 0x3b6af6);

  for (const mini of piece.cells) {
    graphics
      .roundRect(
        baseX + mini.col * miniSize,
        baseY + mini.row * miniSize,
        miniSize - 2,
        miniSize - 2,
        5,
      )
      .fill({ color: fillColor });
  }
}

function computeLayout(
  width: number,
  height: number,
  cols: number,
  slotCount: number,
  compactBreakpoint: number,
  safeInsets: SafeInsets,
): LayoutMetrics {
  const usableWidth = Math.max(240, width - safeInsets.left - safeInsets.right);
  const usableHeight = Math.max(340, height - safeInsets.top - safeInsets.bottom);
  const compact = usableWidth < compactBreakpoint || usableHeight < 760;
  const panelMargin = compact ? 8 : 12;
  const hudTopSpace = compact
    ? clamp(usableHeight * 0.16, 94, 126)
    : clamp(usableHeight * 0.17, 122, 152);
  const trayHeight = compact
    ? clamp(usableHeight * 0.15, 92, 116)
    : clamp(usableHeight * 0.16, 112, 134);
  const footerSpace = compact
    ? clamp(usableHeight * 0.11, 68, 92)
    : clamp(usableHeight * 0.12, 86, 114);
  const boardPadding = compact ? 7 : 10;
  const gridGap = compact ? 3 : 6;
  const boardSize = Math.max(
    160,
    Math.min(
      usableWidth - panelMargin * 2 - 18,
      usableHeight - hudTopSpace - trayHeight - footerSpace,
    ),
  );
  const boardX = safeInsets.left + (usableWidth - boardSize) * 0.5;
  const boardY = safeInsets.top + hudTopSpace;
  const cellSize = (boardSize - boardPadding * 2 - gridGap * (cols - 1)) / cols;
  const trayY = boardY + boardSize + 14;
  const cardGap = compact ? 8 : 10;
  const cardWidth = Math.max(
    46,
    (boardSize - 24 - cardGap * (slotCount - 1)) / slotCount,
  );

  return {
    compact,
    panelMargin,
    boardX,
    boardY,
    boardSize,
    boardPadding,
    gridGap,
    cellSize,
    trayY,
    trayHeight,
    slotCount,
    cardWidth,
    cardGap,
  };
}

function resolveBoardAnchor(
  layout: LayoutMetrics,
  pointerX: number,
  pointerY: number,
  rows: number,
  cols: number,
): { row: number; col: number } | null {
  const inBoardX =
    pointerX >= layout.boardX + layout.boardPadding &&
    pointerX <= layout.boardX + layout.boardSize - layout.boardPadding;
  const inBoardY =
    pointerY >= layout.boardY + layout.boardPadding &&
    pointerY <= layout.boardY + layout.boardSize - layout.boardPadding;
  if (!inBoardX || !inBoardY) return null;

  const col = Math.floor(
    (pointerX - layout.boardX - layout.boardPadding) /
      (layout.cellSize + layout.gridGap),
  );
  const row = Math.floor(
    (pointerY - layout.boardY - layout.boardPadding) /
      (layout.cellSize + layout.gridGap),
  );
  if (row < 0 || col < 0 || row >= rows || col >= cols) return null;
  return { row, col };
}

export async function mountPixiTemplateRenderer(
  root: HTMLElement,
  kernel: GameKernel,
): Promise<void> {
  const uiTemplate = getSetting<UiTemplateConfig>("presentation.uiTemplate", {});
  const uiMapping = getSetting<UiMechanicMappingConfig>(
    "presentation.uiMechanicMapping",
    {},
  );
  const feedbackKeys = new Set(
    (uiMapping.feedback ?? []).flatMap((item) => item.feedback),
  );
  const compactBreakpoint =
    uiTemplate.layout?.root?.adaptiveRules?.compactBreakpoint ?? 500;
  const configuredBagSize = getSetting<number>(
    uiTemplate.layout?.tray?.slotCountSource ?? "gameplay.rules.bagSize.value",
    kernel.getSnapshot().bagSize,
  );
  const characterBlur = getSetting<number>("theme.effects.characterBlur", 18);
  const particleDensity = getSetting<number>("theme.effects.particleDensity", 0.55);
  const particleDrift = getSetting<number>("theme.effects.particleDrift", 0.3);
  const statusTemplate = getSetting<string>(
    "presentation.textTemplates.status",
    "{moves} | Target {target} | {gems} | {message}",
  );
  const rulePanelText = getSetting<string>(
    "presentation.textTemplates.rulePanel",
    "Fill rows and columns",
  );
  const bestStorageKey = getSetting<string>(
    "presentation.textTemplates.bestStorageKey",
    "block-blast:best",
  );
  const feedbackMessages = getSetting<UiFeedbackMessagesConfig>(
    "presentation.feedbackMessages",
    {
      relax_hint: "Try clearing a full line first.",
      select_piece_first: "Select a piece from the tray first.",
      invalid_placement: "That position cannot fit the selected piece.",
      piece_selected_to_place: "Piece selected, tap a cell to place.",
    },
  );

  root.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "template-root";
  root.appendChild(wrapper);
  wrapper.style.setProperty("--fx-character-blur", `${characterBlur}px`);
  wrapper.style.setProperty(
    "--fx-particle-opacity",
    `${Math.max(0.15, Math.min(1, particleDensity))}`,
  );
  wrapper.style.setProperty(
    "--fx-particle-drift-multiplier",
    `${Math.max(0.5, Math.min(2.5, 1 + particleDrift))}`,
  );

  const gameLayer = document.createElement("div");
  gameLayer.className = "game-layer";
  wrapper.appendChild(gameLayer);

  const fxLayer = document.createElement("div");
  fxLayer.className = "fx-layer";
  const backgroundLayers = uiTemplate.layout?.background?.layers ?? [];
  const useCharacter =
    backgroundLayers.length === 0 || backgroundLayers.includes("character_blur");
  const useParticles =
    backgroundLayers.length === 0 || backgroundLayers.includes("particle_field");
  fxLayer.innerHTML = `
    ${useCharacter ? '<div class="fx-character"></div>' : ""}
    ${useParticles
      ? '<div class="fx-particles"><span></span><span></span><span></span><span></span><span></span><span></span></div>'
      : ""}
  `;
  wrapper.appendChild(fxLayer);

  const app = new PIXI.Application();
  await app.init({ resizeTo: wrapper, antialias: true, backgroundAlpha: 0 });
  gameLayer.appendChild(app.canvas);

  const bgGraphics = new PIXI.Graphics();
  const panelGraphics = new PIXI.Graphics();
  const boardGraphics = new PIXI.Graphics();
  const cellsGraphics = new PIXI.Graphics();
  const placementPreviewGraphics = new PIXI.Graphics();
  const trayGraphics = new PIXI.Graphics();
  const trayPiecesGraphics = new PIXI.Graphics();
  const fxGraphics = new PIXI.Graphics();
  const boardHitArea = new PIXI.Graphics();
  const trayHitArea = new PIXI.Graphics();
  boardHitArea.eventMode = "static";
  trayHitArea.eventMode = "static";
  boardHitArea.cursor = "pointer";
  trayHitArea.cursor = "pointer";

  app.stage.addChild(bgGraphics);
  app.stage.addChild(panelGraphics);
  app.stage.addChild(boardGraphics);
  app.stage.addChild(cellsGraphics);
  app.stage.addChild(placementPreviewGraphics);
  app.stage.addChild(trayGraphics);
  app.stage.addChild(trayPiecesGraphics);
  app.stage.addChild(fxGraphics);
  app.stage.addChild(boardHitArea);
  app.stage.addChild(trayHitArea);

  const uiLayer = document.createElement("div");
  uiLayer.className = "ui-layer";
  wrapper.appendChild(uiLayer);

  const top = document.createElement("div");
  top.className = "ui-row-top";
  uiLayer.appendChild(top);
  top.style.display = hasRegion(uiTemplate, "hud_top") ? "flex" : "none";

  const scorePanel = document.createElement("div");
  scorePanel.className = "ui-card ui-hud-panel";
  top.appendChild(scorePanel);
  scorePanel.style.display = hasHudSlot(uiTemplate, "score_panel") ? "block" : "none";

  const rulePanel = document.createElement("div");
  rulePanel.className = "ui-card ui-hud-panel";
  top.appendChild(rulePanel);
  rulePanel.style.display = hasHudSlot(uiTemplate, "rule_panel") ? "block" : "none";

  const bestPanel = document.createElement("div");
  bestPanel.className = "ui-card ui-hud-panel";
  top.appendChild(bestPanel);
  bestPanel.style.display = hasHudSlot(uiTemplate, "best_panel") ? "block" : "none";

  const title = document.createElement("div");
  title.className = "ui-title";
  uiLayer.appendChild(title);
  title.style.display = hasRegion(uiTemplate, "hud_top") ? "block" : "none";

  const progressTrack = document.createElement("div");
  progressTrack.className = "ui-progress-track";
  const progressFill = document.createElement("div");
  progressFill.className = "ui-progress-fill";
  progressTrack.appendChild(progressFill);
  uiLayer.appendChild(progressTrack);
  progressTrack.style.display = hasHudSlot(uiTemplate, "goal_panel") ? "block" : "none";

  const status = document.createElement("div");
  status.className = "ui-status";
  uiLayer.appendChild(status);
  status.style.display = hasRegion(uiTemplate, "status_bar") ? "block" : "none";

  const cta = document.createElement("div");
  cta.className = "ui-cta";
  uiLayer.appendChild(cta);
  cta.style.display = hasRegion(uiTemplate, "status_bar") ? "block" : "none";

  const toast = document.createElement("div");
  toast.className = "ui-toast";
  wrapper.appendChild(toast);

  const overlay = document.createElement("div");
  overlay.className = "ui-overlay";
  wrapper.appendChild(overlay);
  const overlayCard = document.createElement("div");
  overlayCard.className = "ui-overlay-card";
  const overlayTitle = document.createElement("h3");
  const overlayBody = document.createElement("p");
  const overlayButton = document.createElement("button");
  overlayButton.type = "button";
  overlayCard.appendChild(overlayTitle);
  overlayCard.appendChild(overlayBody);
  overlayCard.appendChild(overlayButton);
  overlay.appendChild(overlayCard);
  overlayButton.addEventListener("click", () =>
    kernel.dispatch({ type: "start_or_restart" }),
  );

  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  let hintCooldown = 0;
  let latestSnapshot = kernel.getSnapshot();
  let previousSnapshot: EliminationSnapshot | null = null;
  let previousFilledCount = 0;
  let layout: LayoutMetrics | null = null;
  let suppressBoardTapUntil = 0;
  const dragState: DragState = {
    active: false,
    pieceIndex: null,
    pointerX: 0,
    pointerY: 0,
    anchorRow: null,
    anchorCol: null,
    valid: false,
  };
  const lineClearBursts: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: number;
  }> = [];
  let bestScore = 0;
  try {
    const saved = Number(window.localStorage.getItem(bestStorageKey));
    bestScore = Number.isFinite(saved) ? saved : 0;
  } catch {
    bestScore = 0;
  }

  const showToast = (message: string): void => {
    toast.textContent = message;
    toast.classList.add("visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("visible");
    }, 1400);
  };

  const triggerFeedbackClass = (className: string, holdMs: number): void => {
    wrapper.classList.remove(className);
    void wrapper.offsetWidth;
    wrapper.classList.add(className);
    setTimeout(() => wrapper.classList.remove(className), holdMs);
  };

  const spawnLineClearBurst = (): void => {
    if (!layout) return;
    const centerX = layout.boardX + layout.boardSize * 0.5;
    const centerY = layout.boardY + layout.boardSize * 0.5;
    for (let i = 0; i < 24; i += 1) {
      const angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.3;
      const speed = 1.2 + Math.random() * 2.4;
      lineClearBursts.push({
        x: centerX + (Math.random() - 0.5) * 40,
        y: centerY + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 22 + Math.floor(Math.random() * 10),
        size: 2 + Math.random() * 4,
        color: Math.random() > 0.5 ? 0x00f6ff : 0xff4fd8,
      });
    }
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate?.(24);
      } catch {
        // Ignore unsupported vibration runtime errors.
      }
    }
  };

  const drawDragPreview = (snapshot: EliminationSnapshot): void => {
    placementPreviewGraphics.clear();
    if (!layout) return;
    if (!dragState.active || dragState.pieceIndex === null) return;
    const piece = snapshot.state.bag[dragState.pieceIndex];
    if (!piece) return;

    for (const cell of piece.cells) {
      const ghostX = dragState.pointerX + cell.col * 14;
      const ghostY = dragState.pointerY + cell.row * 14;
      placementPreviewGraphics
        .roundRect(ghostX, ghostY, 12, 12, 4)
        .fill({ color: toHex(piece.color, 0x00f6ff), alpha: 0.52 })
        .stroke({ color: 0xffffff, alpha: 0.42, width: 1 });
    }

    if (dragState.anchorRow === null || dragState.anchorCol === null) return;
    const previewColor = dragState.valid ? 0x52ffb8 : 0xff5f75;
    for (const cell of piece.cells) {
      const row = dragState.anchorRow + cell.row;
      const col = dragState.anchorCol + cell.col;
      if (row < 0 || col < 0 || row >= snapshot.rows || col >= snapshot.cols) continue;
      const x =
        layout.boardX + layout.boardPadding + col * (layout.cellSize + layout.gridGap);
      const y =
        layout.boardY + layout.boardPadding + row * (layout.cellSize + layout.gridGap);
      placementPreviewGraphics
        .roundRect(x, y, layout.cellSize, layout.cellSize, 9)
        .fill({ color: previewColor, alpha: dragState.valid ? 0.26 : 0.22 })
        .stroke({
          color: previewColor,
          alpha: 0.82,
          width: Math.max(1, Math.min(2.5, layout.cellSize * 0.06)),
        });
    }
  };

  rulePanel.addEventListener("pointerdown", () => {
    kernel.dispatch({ type: "set_relax_hint" });
    showToast(
      getFeedbackMessage(
        feedbackMessages,
        "relax_hint",
        "Try clearing a full line first.",
      ),
    );
  });

  boardHitArea.on("pointertap", (event: any) => {
    if (!layout) return;
    if (dragState.active) return;
    if (Date.now() < suppressBoardTapUntil) return;
    if (latestSnapshot.state.overlay.visible) return;
    const x = event.global.x;
    const y = event.global.y;
    const inBoardX =
      x >= layout.boardX + layout.boardPadding &&
      x <= layout.boardX + layout.boardSize - layout.boardPadding;
    const inBoardY =
      y >= layout.boardY + layout.boardPadding &&
      y <= layout.boardY + layout.boardSize - layout.boardPadding;
    if (!inBoardX || !inBoardY) return;

    const col = Math.floor(
      (x - layout.boardX - layout.boardPadding) / (layout.cellSize + layout.gridGap),
    );
    const row = Math.floor(
      (y - layout.boardY - layout.boardPadding) / (layout.cellSize + layout.gridGap),
    );
    if (
      row < 0 ||
      col < 0 ||
      row >= latestSnapshot.rows ||
      col >= latestSnapshot.cols
    ) {
      return;
    }

    const selectedIndex = latestSnapshot.state.selectedPieceIndex;
    if (selectedIndex === null) {
      const now = Date.now();
      if (now >= hintCooldown) {
        hintCooldown = now + 1000;
        showToast(
          getFeedbackMessage(
            feedbackMessages,
            "select_piece_first",
            "Select a piece from the tray first.",
          ),
        );
      }
      return;
    }

    if (!canPlacePieceAt(latestSnapshot, selectedIndex, row, col)) {
      showToast(
        getFeedbackMessage(
          feedbackMessages,
          "invalid_placement",
          "That position cannot fit the selected piece.",
        ),
      );
      return;
    }

    kernel.dispatch({ type: "place_at", row, col });
  });

  trayHitArea.on("pointerdown", (event: any) => {
    if (!layout) return;
    if (latestSnapshot.state.overlay.visible) return;
    const x = event.global.x;
    const y = event.global.y;
    const inTrayX =
      x >= layout.boardX + 12 && x <= layout.boardX + layout.boardSize - 12;
    const inTrayY =
      y >= layout.trayY + 10 && y <= layout.trayY + layout.trayHeight - 10;
    if (!inTrayX || !inTrayY) return;

    const index = Math.floor((x - (layout.boardX + 12)) / (layout.cardWidth + layout.cardGap));
    if (index < 0 || index >= layout.slotCount) return;
    const piece = latestSnapshot.state.bag[index];
    if (!piece) return;

    kernel.dispatch({ type: "select_piece", index });
    dragState.active = true;
    dragState.pieceIndex = index;
    dragState.pointerX = x;
    dragState.pointerY = y;
    dragState.anchorRow = null;
    dragState.anchorCol = null;
    dragState.valid = false;
    showToast(
      getFeedbackMessage(
        feedbackMessages,
        "piece_selected_to_place",
        "Piece selected, tap a cell to place.",
      ),
    );
    fxLayer.classList.remove("tray-hint-pulse");
    void fxLayer.offsetWidth;
    fxLayer.classList.add("tray-hint-pulse");
    drawDragPreview(latestSnapshot);
  });

  app.ticker.add(() => {
    fxGraphics.clear();
    if (lineClearBursts.length === 0) return;
    for (let i = lineClearBursts.length - 1; i >= 0; i -= 1) {
      const p = lineClearBursts[i];
      p.life += 1;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy *= 0.97;
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      fxGraphics.circle(p.x, p.y, p.size).fill({ color: p.color, alpha: alpha * 0.95 });
      if (p.life >= p.maxLife) {
        lineClearBursts.splice(i, 1);
      }
    }
  });

  const updateDragFromPoint = (clientX: number, clientY: number): void => {
    if (!layout || !dragState.active) return;
    const rect = app.canvas.getBoundingClientRect();
    dragState.pointerX = clientX - rect.left;
    dragState.pointerY = clientY - rect.top;
    const anchor = resolveBoardAnchor(
      layout,
      dragState.pointerX,
      dragState.pointerY,
      latestSnapshot.rows,
      latestSnapshot.cols,
    );
    if (!anchor || dragState.pieceIndex === null) {
      dragState.anchorRow = null;
      dragState.anchorCol = null;
      dragState.valid = false;
      drawDragPreview(latestSnapshot);
      return;
    }
    dragState.anchorRow = anchor.row;
    dragState.anchorCol = anchor.col;
    dragState.valid = canPlacePieceAt(
      latestSnapshot,
      dragState.pieceIndex,
      anchor.row,
      anchor.col,
    );
    drawDragPreview(latestSnapshot);
  };

  const finishDrag = (): void => {
    if (!dragState.active) return;
    if (
      dragState.pieceIndex !== null &&
      dragState.anchorRow !== null &&
      dragState.anchorCol !== null
    ) {
      if (dragState.valid) {
        kernel.dispatch({
          type: "place_at",
          row: dragState.anchorRow,
          col: dragState.anchorCol,
        });
        suppressBoardTapUntil = Date.now() + 120;
        triggerFeedbackClass("placement-snap-flash", 260);
      } else {
        showToast(
          getFeedbackMessage(
            feedbackMessages,
            "invalid_placement",
            "That position cannot fit the selected piece.",
          ),
        );
      }
    }
    dragState.active = false;
    dragState.pieceIndex = null;
    dragState.anchorRow = null;
    dragState.anchorCol = null;
    dragState.valid = false;
    placementPreviewGraphics.clear();
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!dragState.active) return;
    updateDragFromPoint(event.clientX, event.clientY);
  };
  const onPointerUp = (): void => {
    finishDrag();
  };
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  const render = (snapshot: EliminationSnapshot): void => {
    latestSnapshot = snapshot;
    const width = wrapper.clientWidth;
    const height = wrapper.clientHeight;
    const wrapperStyles = window.getComputedStyle(wrapper);
    const safeInsets: SafeInsets = {
      top: parseCssPx(wrapperStyles.getPropertyValue("--safe-top")),
      right: parseCssPx(wrapperStyles.getPropertyValue("--safe-right")),
      bottom: parseCssPx(wrapperStyles.getPropertyValue("--safe-bottom")),
      left: parseCssPx(wrapperStyles.getPropertyValue("--safe-left")),
    };
    const slotCount = Math.max(
      1,
      configuredBagSize || snapshot.bagSize || snapshot.state.bag.length,
    );
    layout = computeLayout(
      width,
      height,
      snapshot.cols,
      slotCount,
      compactBreakpoint,
      safeInsets,
    );

    wrapper.style.setProperty("--ui-bg-top", snapshot.colors.bgTop);
    wrapper.style.setProperty("--ui-bg-bottom", snapshot.colors.bgBottom);
    wrapper.style.setProperty("--ui-panel", snapshot.colors.panel);
    wrapper.style.setProperty("--ui-text", snapshot.colors.textPrimary);
    wrapper.style.setProperty("--ui-accent", snapshot.colors.textAccent);

    bgGraphics
      .clear()
      .rect(0, 0, width, height)
      .fill({ color: toHex(snapshot.colors.bgTop, 0x4b63b7) })
      .rect(0, height * 0.4, width, height * 0.6)
      .fill({ color: toHex(snapshot.colors.bgBottom, 0x5e78d6), alpha: 0.45 });

    panelGraphics
      .clear()
      .roundRect(
        layout.panelMargin,
        layout.panelMargin,
        width - layout.panelMargin * 2,
        height - layout.panelMargin * 2,
        20,
      )
      .fill({ color: 0xffffff, alpha: 0.12 });

    boardGraphics
      .clear()
      .roundRect(
        layout.boardX,
        layout.boardY,
        layout.boardSize,
        layout.boardSize,
        18,
      )
      .fill({ color: toHex(snapshot.colors.boardBg, 0x2e3a70) });

    cellsGraphics.clear();
    for (let row = 0; row < snapshot.rows; row += 1) {
      for (let col = 0; col < snapshot.cols; col += 1) {
        const cell = snapshot.state.board[row][col];
        const x =
          layout.boardX + layout.boardPadding + col * (layout.cellSize + layout.gridGap);
        const y =
          layout.boardY + layout.boardPadding + row * (layout.cellSize + layout.gridGap);
        cellsGraphics
          .roundRect(x, y, layout.cellSize, layout.cellSize, 10)
          .fill({
            color: toHex(
              cell.filled ? cell.color : snapshot.colors.gridLine,
              0x334155,
            ),
            alpha: cell.filled ? 1 : 0.9,
          });
        if (cell.filled) {
          cellsGraphics
            .roundRect(x, y, layout.cellSize, layout.cellSize, 10)
            .stroke({
              color: toHex(snapshot.colors.highlight, 0x00f6ff),
              alpha: 0.65,
              width: Math.max(1, Math.min(2, layout.cellSize * 0.05)),
            });
          cellsGraphics
            .roundRect(
              x + 1,
              y + 1,
              layout.cellSize - 2,
              layout.cellSize * 0.5,
              9,
            )
            .fill({ color: 0xffffff, alpha: 0.17 });
        }
      }
    }

    if (snapshot.state.selectedPieceIndex !== null) {
      for (let row = 0; row < snapshot.rows; row += 1) {
        for (let col = 0; col < snapshot.cols; col += 1) {
          if (!canPlacePieceAt(snapshot, snapshot.state.selectedPieceIndex, row, col)) {
            continue;
          }
          const cx =
            layout.boardX +
            layout.boardPadding +
            col * (layout.cellSize + layout.gridGap) +
            layout.cellSize * 0.5;
          const cy =
            layout.boardY +
            layout.boardPadding +
            row * (layout.cellSize + layout.gridGap) +
            layout.cellSize * 0.5;
          cellsGraphics
            .circle(cx, cy, Math.max(3, Math.min(5, layout.cellSize * 0.12)))
            .fill({ color: 0xffffff, alpha: 0.18 });
        }
      }
    }

    trayGraphics
      .clear()
      .roundRect(
        layout.boardX,
        layout.trayY,
        layout.boardSize,
        layout.trayHeight,
        16,
      )
      .fill({ color: 0xffffff, alpha: 0.12 });

    trayPiecesGraphics.clear();
    for (let index = 0; index < layout.slotCount; index += 1) {
      const piece = snapshot.state.bag[index] ?? null;
      const cardX = layout.boardX + 12 + index * (layout.cardWidth + layout.cardGap);
      const cardY = layout.trayY + 10;
      const cardH = layout.trayHeight - 20;
      trayPiecesGraphics
        .roundRect(cardX, cardY, layout.cardWidth, cardH, 12)
        .fill({ color: 0xffffff, alpha: piece ? 0.15 : 0.06 })
        .stroke({
          color: 0xffffff,
          alpha: snapshot.state.selectedPieceIndex === index ? 0.8 : 0,
          width: 2,
        });
      if (piece) {
        drawMiniPiece(trayPiecesGraphics, piece, cardX, cardY, layout.cardWidth, cardH);
      }
    }
    drawDragPreview(snapshot);

    boardHitArea
      .clear()
      .roundRect(
        layout.boardX,
        layout.boardY,
        layout.boardSize,
        layout.boardSize,
        16,
      )
      .fill({ color: 0xffffff, alpha: 0.001 });

    trayHitArea
      .clear()
      .roundRect(
        layout.boardX,
        layout.trayY,
        layout.boardSize,
        layout.trayHeight,
        14,
      )
      .fill({ color: 0xffffff, alpha: 0.001 });

    if (snapshot.state.score > bestScore) {
      bestScore = snapshot.state.score;
      try {
        window.localStorage.setItem(bestStorageKey, String(bestScore));
      } catch {
        // Ignore storage failures.
      }
    }

    scorePanel.innerHTML = `
      <div class="ui-score-label">${snapshot.scoreIcon} SCORE</div>
      <div class="ui-score-value">${snapshot.state.score}</div>
    `;
    rulePanel.innerHTML = `
      <div class="ui-score-label">RULE</div>
      <div class="ui-score-value ui-hud-rule">${rulePanelText}</div>
    `;
    bestPanel.innerHTML = `
      <div class="ui-score-label">BEST</div>
      <div class="ui-score-value">${bestScore}</div>
    `;
    title.innerHTML = `<h2>${snapshot.title}</h2><p>${snapshot.subtitle}</p>`;
    cta.textContent = snapshot.ctaText;
    progressFill.style.width = `${Math.min(
      100,
      Math.round((snapshot.state.score / snapshot.targetScore) * 100),
    )}%`;
    status.textContent = buildStatusText(snapshot, statusTemplate);

    const feedback = detectFeedbackFlags(
      previousSnapshot,
      snapshot,
      previousFilledCount,
    );
    if (feedback.placed && feedbackKeys.has("placement_pulse")) {
      triggerFeedbackClass("feedback-placement-pulse", 360);
    }
    if (feedback.lineClearHappened && feedbackKeys.has("line_clear_flash")) {
      triggerFeedbackClass("feedback-line-clear", 420);
      spawnLineClearBurst();
    }
    if (feedback.goalAdvanced && feedbackKeys.has("goal_reached_bloom")) {
      triggerFeedbackClass("feedback-goal-bloom", 420);
    }
    previousFilledCount = feedback.filledCount;

    const showOverlay =
      hasRegion(uiTemplate, "overlay") && snapshot.state.overlay.visible;
    overlay.classList.toggle("visible", showOverlay);
    if (showOverlay) {
      overlayTitle.textContent = snapshot.state.overlay.title;
      overlayBody.textContent = snapshot.state.overlay.body;
      overlayButton.textContent = snapshot.state.overlay.buttonText;
    }
    previousSnapshot = snapshot;
  };

  const unsubscribe = kernel.subscribe(render);
  const onResize = (): void => render(kernel.getSnapshot());
  window.addEventListener("resize", onResize);

  const teardown = () => {
    unsubscribe();
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    app.destroy(true);
    if (toastTimer) clearTimeout(toastTimer);
    wrapper.remove();
  };
  window.addEventListener("beforeunload", teardown, { once: true });
}
