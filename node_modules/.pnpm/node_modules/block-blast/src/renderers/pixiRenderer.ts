import * as PIXI from "pixi.js";
import { BlockBlastSnapshot } from "../blockBlastEngine";
import { RendererPlugin } from "./types";

function toHex(color: unknown, fallback: number): number {
  if (typeof color !== "string" || !color.startsWith("#")) return fallback;
  const parsed = Number.parseInt(color.slice(1), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const pixiRendererPlugin: RendererPlugin = {
  id: "pixi",
  mount: async ({ root, engine }) => {
    let latestSnapshot: BlockBlastSnapshot | null = null;
    let prevScore = 0;
    let prevMessage = "";
    let pulseTimer = 0;
    let boardRect = { x: 0, y: 0, size: 0 };
    let cellMetrics = { size: 0, gap: 0, padding: 0, rows: 0, cols: 0 };
    let hoverAnchor: { row: number; col: number } | null = null;
    let previewParticleTimer = 0;
    let trayCardCenters: Array<{ x: number; y: number }> = [];
    let touchBoardDragActive = false;

    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const audioCtx = AudioCtx ? new AudioCtx() : null;
    const ensureAudioReady = (): void => {
      if (audioCtx && audioCtx.state === "suspended") {
        void audioCtx.resume();
      }
    };
    const playTone = (frequency: number, duration: number, type: OscillatorType, gain = 0.03): void => {
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const vol = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      vol.gain.setValueAtTime(0.0001, now);
      vol.gain.exponentialRampToValueAtTime(gain, now + 0.01);
      vol.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(vol);
      vol.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    };
    const playPlaceFx = (): void => {
      ensureAudioReady();
      playTone(320, 0.08, "triangle", 0.02);
    };
    const playClearFx = (): void => {
      ensureAudioReady();
      playTone(520, 0.08, "triangle", 0.03);
      playTone(760, 0.12, "sine", 0.028);
    };
    const playWinFx = (): void => {
      ensureAudioReady();
      playTone(660, 0.1, "sine", 0.03);
      playTone(880, 0.14, "triangle", 0.026);
    };

    root.innerHTML = "";
    root.style.display = "grid";
    root.style.placeItems = "center";
    root.style.background = "#4B63B7";
    root.style.minHeight = "100vh";
    root.style.minHeight = "100dvh";
    root.style.paddingTop = "env(safe-area-inset-top)";
    root.style.paddingRight = "env(safe-area-inset-right)";
    root.style.paddingBottom = "env(safe-area-inset-bottom)";
    root.style.paddingLeft = "env(safe-area-inset-left)";

    const wrapper = document.createElement("div");
    wrapper.style.width = "min(96vw, 680px)";
    wrapper.style.height = "min(92dvh, 920px)";
    wrapper.style.maxWidth = "calc(100vw - env(safe-area-inset-left) - env(safe-area-inset-right) - 8px)";
    wrapper.style.maxHeight = "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 8px)";
    wrapper.style.position = "relative";
    wrapper.style.borderRadius = "22px";
    wrapper.style.overflow = "hidden";
    wrapper.style.boxShadow = "0 20px 48px rgba(0,0,0,0.28)";
    wrapper.style.backdropFilter = "blur(8px)";
    root.appendChild(wrapper);

    const style = document.createElement("style");
    style.textContent = `
      @keyframes bb-score-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.07); }
        100% { transform: scale(1); }
      }
      @keyframes bb-float {
        0% { transform: translate(-50%, 0) scale(0.9); opacity: 0; }
        10% { opacity: 1; }
        100% { transform: translate(-50%, -44px) scale(1.08); opacity: 0; }
      }
      @keyframes bb-spark {
        0% { transform: translate(0, 0) scale(1); opacity: 0.95; }
        100% { transform: translate(var(--dx), var(--dy)) scale(0.25); opacity: 0; }
      }
      @keyframes bb-preview-particle {
        0% { transform: translate(0, 0) scale(0.8); opacity: 0; }
        20% { opacity: 0.9; }
        100% { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity: 0; }
      }
      @keyframes bb-drop-ghost {
        0% { transform: translate(-50%, -50%) scale(0.88); opacity: 0.3; }
        10% { opacity: 0.95; }
        100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    const app = new PIXI.Application();
    await app.init({
      resizeTo: wrapper,
      antialias: true,
      backgroundAlpha: 0
    });
    wrapper.appendChild(app.canvas);

    const hud = document.createElement("div");
    hud.style.position = "absolute";
    hud.style.inset = "12px";
    hud.style.display = "grid";
    hud.style.gridTemplateRows = "auto auto auto 1fr auto";
    hud.style.pointerEvents = "none";
    wrapper.appendChild(hud);

    const fxLayer = document.createElement("div");
    fxLayer.style.position = "absolute";
    fxLayer.style.inset = "0";
    fxLayer.style.pointerEvents = "none";
    fxLayer.style.overflow = "hidden";
    wrapper.appendChild(fxLayer);

    const topRow = document.createElement("div");
    topRow.style.display = "flex";
    topRow.style.alignItems = "center";
    topRow.style.justifyContent = "space-between";
    topRow.style.gap = "10px";
    topRow.style.pointerEvents = "auto";
    hud.appendChild(topRow);

    const scoreCard = document.createElement("div");
    scoreCard.style.borderRadius = "14px";
    scoreCard.style.background = "rgba(255,255,255,0.15)";
    scoreCard.style.boxShadow = "0 10px 24px rgba(0,0,0,0.22)";
    scoreCard.style.padding = "8px 12px";
    scoreCard.style.backdropFilter = "blur(8px)";
    scoreCard.style.color = "#fff";
    scoreCard.style.fontWeight = "700";
    scoreCard.style.transition = "transform .22s ease";
    topRow.appendChild(scoreCard);

    const settingBtn = document.createElement("button");
    settingBtn.type = "button";
    settingBtn.textContent = "⚙";
    settingBtn.style.border = "0";
    settingBtn.style.borderRadius = "12px";
    settingBtn.style.minWidth = "44px";
    settingBtn.style.height = "44px";
    settingBtn.style.background = "rgba(255,255,255,0.16)";
    settingBtn.style.color = "#CFE3FF";
    settingBtn.style.cursor = "pointer";
    settingBtn.style.transition = "transform .2s ease, opacity .2s ease";
    settingBtn.style.boxShadow = "0 10px 20px rgba(0,0,0,0.2)";
    settingBtn.addEventListener("mouseenter", () => {
      settingBtn.style.transform = "translateY(-1px)";
      settingBtn.style.opacity = "0.94";
    });
    settingBtn.addEventListener("mouseleave", () => {
      settingBtn.style.transform = "translateY(0)";
      settingBtn.style.opacity = "1";
    });
    settingBtn.addEventListener("click", () => {
      ensureAudioReady();
      playTone(460, 0.07, "triangle", 0.018);
      engine.setRelaxHint();
    });
    topRow.appendChild(settingBtn);

    const titleBlock = document.createElement("div");
    titleBlock.style.color = "#fff";
    titleBlock.style.marginTop = "6px";
    hud.appendChild(titleBlock);

    const progressWrap = document.createElement("div");
    progressWrap.style.height = "10px";
    progressWrap.style.borderRadius = "999px";
    progressWrap.style.background = "rgba(255,255,255,0.18)";
    progressWrap.style.overflow = "hidden";
    progressWrap.style.marginTop = "6px";
    const progressFill = document.createElement("div");
    progressFill.style.height = "100%";
    progressFill.style.width = "0%";
    progressFill.style.background = "linear-gradient(90deg,#FFD93D,#FFB347)";
    progressFill.style.transition = "width .25s ease";
    progressWrap.appendChild(progressFill);
    hud.appendChild(progressWrap);

    const status = document.createElement("div");
    status.style.marginTop = "8px";
    status.style.fontSize = "12px";
    status.style.color = "#fff";
    status.style.display = "flex";
    status.style.flexWrap = "wrap";
    status.style.gap = "8px";
    hud.appendChild(status);

    const cta = document.createElement("div");
    cta.style.textAlign = "center";
    cta.style.fontWeight = "800";
    cta.style.letterSpacing = "2px";
    cta.style.color = "#fff";
    cta.style.textShadow = "0 4px 8px rgba(0,0,0,0.3)";
    cta.style.marginTop = "8px";
    cta.style.marginBottom = "6px";
    hud.appendChild(cta);

    const overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.display = "none";
    overlay.style.placeItems = "center";
    overlay.style.pointerEvents = "none";
    wrapper.appendChild(overlay);

    const spawnFloatingScore = (gain: number): void => {
      const text = document.createElement("div");
      text.textContent = `+${gain}`;
      text.style.position = "absolute";
      text.style.left = `${boardRect.x + boardRect.size * 0.5}px`;
      text.style.top = `${boardRect.y + boardRect.size * 0.2}px`;
      text.style.fontSize = "20px";
      text.style.fontWeight = "900";
      text.style.letterSpacing = "0.6px";
      text.style.color = "#FFD93D";
      text.style.textShadow = "0 6px 16px rgba(0,0,0,0.35)";
      text.style.animation = "bb-float .62s ease-out forwards";
      fxLayer.appendChild(text);
      window.setTimeout(() => text.remove(), 700);
    };

    const spawnClearSparkles = (): void => {
      const centerX = boardRect.x + boardRect.size * 0.5;
      const centerY = boardRect.y + boardRect.size * 0.5;
      const count = 14;
      for (let i = 0; i < count; i += 1) {
        const spark = document.createElement("div");
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const distance = 28 + Math.random() * 56;
        spark.style.position = "absolute";
        spark.style.left = `${centerX}px`;
        spark.style.top = `${centerY}px`;
        spark.style.width = "7px";
        spark.style.height = "7px";
        spark.style.borderRadius = "50%";
        spark.style.background = i % 2 === 0 ? "#FFD93D" : "#FFFFFF";
        spark.style.boxShadow = "0 0 10px rgba(255,255,255,0.6)";
        spark.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
        spark.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
        spark.style.animation = `bb-spark ${430 + Math.random() * 220}ms ease-out forwards`;
        fxLayer.appendChild(spark);
        window.setTimeout(() => spark.remove(), 760);
      }
    };

    const canPlaceAt = (snapshot: BlockBlastSnapshot, piece: NonNullable<BlockBlastSnapshot["state"]["bag"][number]>, anchorRow: number, anchorCol: number): boolean => {
      for (const cell of piece.cells) {
        const row = anchorRow + cell.row;
        const col = anchorCol + cell.col;
        if (row < 0 || col < 0 || row >= snapshot.rows || col >= snapshot.cols) return false;
        if (snapshot.state.board[row][col].filled) return false;
      }
      return true;
    };

    const findFirstValidAnchor = (
      snapshot: BlockBlastSnapshot,
      piece: NonNullable<BlockBlastSnapshot["state"]["bag"][number]>
    ): { row: number; col: number } | null => {
      for (let row = 0; row < snapshot.rows; row += 1) {
        for (let col = 0; col < snapshot.cols; col += 1) {
          if (canPlaceAt(snapshot, piece, row, col)) return { row, col };
        }
      }
      return null;
    };

    const startPreviewParticles = (): void => {
      if (previewParticleTimer) return;
      previewParticleTimer = window.setInterval(() => {
        if (!latestSnapshot || !latestSnapshot.state.started || latestSnapshot.state.isOver) return;
        const selectedIndex = latestSnapshot.state.selectedPieceIndex;
        if (selectedIndex === null) return;
        const piece = latestSnapshot.state.bag[selectedIndex];
        if (!piece || !hoverAnchor || cellMetrics.size <= 0) return;
        const maxRow = Math.max(...piece.cells.map((cell) => cell.row));
        const maxCol = Math.max(...piece.cells.map((cell) => cell.col));
        const regionX = boardRect.x + cellMetrics.padding + hoverAnchor.col * (cellMetrics.size + cellMetrics.gap);
        const regionY = boardRect.y + cellMetrics.padding + hoverAnchor.row * (cellMetrics.size + cellMetrics.gap);
        const regionW = (maxCol + 1) * cellMetrics.size + maxCol * cellMetrics.gap;
        const regionH = (maxRow + 1) * cellMetrics.size + maxRow * cellMetrics.gap;
        const particle = document.createElement("div");
        particle.style.position = "absolute";
        particle.style.left = `${regionX + Math.random() * regionW}px`;
        particle.style.top = `${regionY + Math.random() * regionH}px`;
        particle.style.width = "6px";
        particle.style.height = "6px";
        particle.style.borderRadius = "50%";
        particle.style.background = "radial-gradient(circle at 30% 30%, #ffffff, #7dd3fc)";
        particle.style.boxShadow = "0 0 12px rgba(125,211,252,0.8)";
        particle.style.setProperty("--dx", `${(Math.random() - 0.5) * 28}px`);
        particle.style.setProperty("--dy", `${-18 - Math.random() * 24}px`);
        particle.style.animation = "bb-preview-particle 560ms ease-out forwards";
        fxLayer.appendChild(particle);
        window.setTimeout(() => particle.remove(), 620);
      }, 120);
    };

    const stopPreviewParticles = (): void => {
      if (!previewParticleTimer) return;
      window.clearInterval(previewParticleTimer);
      previewParticleTimer = 0;
    };

    const spawnDropGhost = (
      piece: NonNullable<BlockBlastSnapshot["state"]["bag"][number]>,
      from: { x: number; y: number },
      anchor: { row: number; col: number }
    ): void => {
      if (cellMetrics.size <= 0) return;
      const maxRow = Math.max(...piece.cells.map((cell) => cell.row));
      const maxCol = Math.max(...piece.cells.map((cell) => cell.col));
      const tileSize = Math.max(12, Math.min(20, cellMetrics.size * 0.9));
      const gap = Math.max(2, Math.round(tileSize * 0.12));
      const ghostW = (maxCol + 1) * tileSize + maxCol * gap;
      const ghostH = (maxRow + 1) * tileSize + maxRow * gap;
      const toX =
        boardRect.x +
        cellMetrics.padding +
        anchor.col * (cellMetrics.size + cellMetrics.gap) +
        (ghostW - cellMetrics.size) * 0.5 +
        ghostW * 0.5;
      const toY =
        boardRect.y +
        cellMetrics.padding +
        anchor.row * (cellMetrics.size + cellMetrics.gap) +
        (ghostH - cellMetrics.size) * 0.5 +
        ghostH * 0.5;

      const ghost = document.createElement("div");
      ghost.style.position = "absolute";
      ghost.style.left = `${from.x}px`;
      ghost.style.top = `${from.y}px`;
      ghost.style.width = `${ghostW}px`;
      ghost.style.height = `${ghostH}px`;
      ghost.style.transform = "translate(-50%, -50%)";
      ghost.style.filter = "drop-shadow(0 8px 14px rgba(0,0,0,0.3))";
      ghost.style.animation = "bb-drop-ghost 230ms cubic-bezier(0.2,0.8,0.2,1) forwards";
      ghost.style.setProperty("--tx", `${toX - from.x - ghostW * 0.5}px`);
      ghost.style.setProperty("--ty", `${toY - from.y - ghostH * 0.5}px`);
      ghost.style.display = "grid";
      ghost.style.gridTemplateColumns = `repeat(${maxCol + 1}, ${tileSize}px)`;
      ghost.style.gridTemplateRows = `repeat(${maxRow + 1}, ${tileSize}px)`;
      ghost.style.gap = `${gap}px`;
      for (let row = 0; row <= maxRow; row += 1) {
        for (let col = 0; col <= maxCol; col += 1) {
          const hasCell = piece.cells.some((cell) => cell.row === row && cell.col === col);
          const node = document.createElement("div");
          node.style.width = `${tileSize}px`;
          node.style.height = `${tileSize}px`;
          node.style.borderRadius = `${Math.max(6, Math.floor(tileSize * 0.25))}px`;
          if (hasCell) {
            node.style.background = `linear-gradient(180deg, rgba(255,255,255,0.28), transparent 45%), ${piece.color}`;
            node.style.boxShadow = "0 3px 9px rgba(0,0,0,0.24), inset 0 2px 3px rgba(255,255,255,0.35)";
          } else {
            node.style.opacity = "0";
          }
          ghost.appendChild(node);
        }
      }
      fxLayer.appendChild(ghost);
      window.setTimeout(() => ghost.remove(), 280);
    };

    const getAnchorFromPoint = (clientX: number, clientY: number): { row: number; col: number } | null => {
      if (cellMetrics.size <= 0) return null;
      const rect = wrapper.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const boardInnerX = boardRect.x + cellMetrics.padding;
      const boardInnerY = boardRect.y + cellMetrics.padding;
      const maxX = boardInnerX + cellMetrics.cols * cellMetrics.size + (cellMetrics.cols - 1) * cellMetrics.gap;
      const maxY = boardInnerY + cellMetrics.rows * cellMetrics.size + (cellMetrics.rows - 1) * cellMetrics.gap;
      if (localX < boardInnerX || localY < boardInnerY || localX > maxX || localY > maxY) return null;
      const step = cellMetrics.size + cellMetrics.gap;
      const col = Math.floor((localX - boardInnerX) / step);
      const row = Math.floor((localY - boardInnerY) / step);
      if (row < 0 || col < 0 || row >= cellMetrics.rows || col >= cellMetrics.cols) return null;
      return { row, col };
    };

    const placeSelectedAtAnchor = (anchor: { row: number; col: number }): void => {
      if (!latestSnapshot) return;
      const selectedIndex = latestSnapshot.state.selectedPieceIndex;
      if (selectedIndex === null) return;
      const selectedPiece = latestSnapshot.state.bag[selectedIndex];
      if (!selectedPiece) return;
      if (!canPlaceAt(latestSnapshot, selectedPiece, anchor.row, anchor.col)) return;
      const from = trayCardCenters[selectedIndex];
      if (from) spawnDropGhost(selectedPiece, from, anchor);
      ensureAudioReady();
      engine.placeAt(anchor.row, anchor.col);
    };

    const onPointerDown = (event: PointerEvent): void => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      const anchor = getAnchorFromPoint(event.clientX, event.clientY);
      if (!anchor) return;
      touchBoardDragActive = true;
      hoverAnchor = anchor;
      ensureAudioReady();
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (!touchBoardDragActive) return;
      const anchor = getAnchorFromPoint(event.clientX, event.clientY);
      hoverAnchor = anchor;
      event.preventDefault();
    };

    const onPointerUp = (event: PointerEvent): void => {
      if (!touchBoardDragActive) return;
      const anchor = getAnchorFromPoint(event.clientX, event.clientY) ?? hoverAnchor;
      if (anchor) placeSelectedAtAnchor(anchor);
      touchBoardDragActive = false;
      hoverAnchor = null;
      event.preventDefault();
    };

    wrapper.addEventListener("pointerdown", onPointerDown, { passive: false });
    wrapper.addEventListener("pointermove", onPointerMove, { passive: false });
    wrapper.addEventListener("pointerup", onPointerUp, { passive: false });
    wrapper.addEventListener("pointercancel", onPointerUp, { passive: false });

    function render(snapshot: BlockBlastSnapshot): void {
      latestSnapshot = snapshot;
      const width = wrapper.clientWidth;
      const height = wrapper.clientHeight;
      app.stage.removeChildren();
      root.style.background = `linear-gradient(${snapshot.colors.bgTop}, ${snapshot.colors.bgBottom})`;
      wrapper.style.background = "rgba(255,255,255,0.08)";

      const bg = new PIXI.Graphics();
      bg.rect(0, 0, width, height).fill({
        color: toHex(snapshot.colors.bgTop, 0x4b63b7)
      });
      app.stage.addChild(bg);
      const bgFade = new PIXI.Graphics();
      bgFade.rect(0, height * 0.4, width, height * 0.6).fill({
        color: toHex(snapshot.colors.bgBottom, 0x5e78d6),
        alpha: 0.48
      });
      app.stage.addChild(bgFade);

      const compact = width < 500 || height < 760;
      const tiny = width < 390 || height < 680;
      hud.style.inset = tiny ? "8px" : compact ? "10px" : "12px";

      const panelMargin = tiny ? 8 : compact ? 10 : 14;
      const panel = new PIXI.Graphics();
      panel.roundRect(panelMargin, panelMargin, width - panelMargin * 2, height - panelMargin * 2, compact ? 18 : 22).fill({
        color: 0xffffff,
        alpha: 0.12
      });
      app.stage.addChild(panel);

      const hudTopSpace = tiny ? 118 : compact ? 132 : 146;
      const trayHeight = tiny ? 92 : compact ? 108 : 128;
      const footerSpace = tiny ? 72 : compact ? 90 : 112;
      const boardPadding = tiny ? 6 : compact ? 8 : 10;
      const gap = tiny ? 3 : compact ? 4 : 6;
      const boardSize = Math.max(
        tiny ? 168 : 200,
        Math.min(width - panelMargin * 2 - 18, height - hudTopSpace - trayHeight - footerSpace)
      );
      const boardX = (width - boardSize) * 0.5;
      const boardY = hudTopSpace;
      boardRect = { x: boardX, y: boardY, size: boardSize };
      cellMetrics = { size: (boardSize - boardPadding * 2 - gap * (snapshot.cols - 1)) / snapshot.cols, gap, padding: boardPadding, rows: snapshot.rows, cols: snapshot.cols };

      scoreCard.innerHTML = `
        <div style="font-size:${compact ? "12px" : "13px"};opacity:.9;">${snapshot.scoreIcon} Score</div>
        <div style="font-size:${compact ? "20px" : "24px"};line-height:1.1;color:${snapshot.colors.textAccent};">${snapshot.state.score}</div>
      `;
      titleBlock.innerHTML = `
        <h2 style="margin:0;font-size:${compact ? "18px" : "20px"};font-weight:800;letter-spacing:.2px;">${snapshot.title}</h2>
        <p style="margin:2px 0 0;font-size:${compact ? "12px" : "13px"};opacity:.9;">${snapshot.subtitle}</p>
      `;
      cta.textContent = snapshot.ctaText;
      cta.style.fontSize = tiny ? "13px" : compact ? "14px" : "16px";
      status.innerHTML = "";
      const gemText = snapshot.gemTargets
        .map((target) => `${target.id}: ${snapshot.state.gemProgress[target.id] ?? 0}/${target.required}`)
        .join(" | ");
      const relaxOrMoves =
        snapshot.moveLimit > 0
          ? `Moves ${snapshot.state.movesUsed}/${snapshot.moveLimit}`
          : `Moves ${snapshot.state.movesUsed} (relax)`;
      status.textContent = `${relaxOrMoves} | Target ${snapshot.targetScore} | ${gemText || "No gem target"} | ${snapshot.state.message}`;
      progressFill.style.width = `${Math.min(100, Math.round((snapshot.state.score / snapshot.targetScore) * 100))}%`;

      const scoreGain = snapshot.state.score - prevScore;
      const messageChanged = snapshot.state.message !== prevMessage;
      if (scoreGain > 0) {
        scoreCard.style.animation = "bb-score-pulse .24s ease";
        window.clearTimeout(pulseTimer);
        pulseTimer = window.setTimeout(() => {
          scoreCard.style.animation = "";
        }, 260);
        spawnFloatingScore(scoreGain);
      }
      if (messageChanged && snapshot.state.message.includes("消除了")) {
        playClearFx();
        spawnClearSparkles();
      } else if (messageChanged && snapshot.state.message.includes("已放置")) {
        playPlaceFx();
      }
      if (messageChanged && snapshot.state.didWin) {
        playWinFx();
      }
      prevScore = snapshot.state.score;
      prevMessage = snapshot.state.message;

      const board = new PIXI.Graphics();
      board.roundRect(boardX, boardY, boardSize, boardSize, 18).fill({
        color: toHex(snapshot.colors.boardBg, 0x2e3a70)
      });
      board.roundRect(boardX + 2, boardY + 2, boardSize - 4, boardSize * 0.46, 18).fill({
        color: 0xffffff,
        alpha: 0.05
      });
      board.roundRect(boardX + 3, boardY + boardSize - 22, boardSize - 6, 16, 10).fill({
        color: 0x000000,
        alpha: 0.15
      });
      board.eventMode = "static";
      board.on("pointerout", () => {
        if (!touchBoardDragActive) hoverAnchor = null;
      });
      app.stage.addChild(board);

      const cellSize = cellMetrics.size;
      for (let row = 0; row < snapshot.rows; row += 1) {
        for (let col = 0; col < snapshot.cols; col += 1) {
          const cell = snapshot.state.board[row][col];
          const x = boardX + boardPadding + col * (cellSize + gap);
          const y = boardY + boardPadding + row * (cellSize + gap);
          const tileShadow = new PIXI.Graphics();
          tileShadow.roundRect(x + 1.5, y + 2, cellSize - 0.5, cellSize - 0.5, 10).fill({
            color: 0x000000,
            alpha: cell.filled ? 0.18 : 0.08
          });
          app.stage.addChild(tileShadow);

          const tile = new PIXI.Graphics();
          tile.roundRect(x, y, cellSize, cellSize, 10).fill({
            color: toHex(cell.filled ? cell.color : snapshot.colors.gridLine, 0x334155),
            alpha: cell.filled ? 1 : 0.9
          });
          if (cell.filled) {
            tile.roundRect(x + 1.2, y + 1.2, cellSize - 2.4, cellSize * 0.48, 9).fill({ color: 0xffffff, alpha: 0.2 });
            tile.roundRect(x + cellSize * 0.06, y + cellSize * 0.62, cellSize * 0.88, cellSize * 0.3, 8).fill({
              color: 0x000000,
              alpha: 0.08
            });
            tile.ellipse(x + cellSize * 0.5, y + cellSize * 0.9, cellSize * 0.32, Math.max(2, cellSize * 0.08)).fill({
              color: toHex(snapshot.colors.blockShadow, 0x000000),
              alpha: 0.24
            });
          }
          tile.eventMode = "static";
          tile.cursor = "pointer";
          tile.on("pointerover", () => {
            hoverAnchor = { row, col };
          });
          tile.on("pointertap", () => {
            ensureAudioReady();
            const selectedIndex = latestSnapshot?.state.selectedPieceIndex;
            const selectedPiece =
              selectedIndex !== null && selectedIndex !== undefined && latestSnapshot
                ? latestSnapshot.state.bag[selectedIndex]
                : null;
            if (selectedPiece && canPlaceAt(snapshot, selectedPiece, row, col)) {
              const from = trayCardCenters[selectedIndex];
              if (from) spawnDropGhost(selectedPiece, from, { row, col });
            }
            engine.placeAt(row, col);
          });
          app.stage.addChild(tile);

          if (cell.gemId) {
            const gem = new PIXI.Graphics();
            const gx = x + cellSize - 10;
            const gy = y + 10;
            gem.poly([gx + 1, gy - 4, gx + 6, gy + 1, gx + 1, gy + 6, gx - 4, gy + 1]).fill({
              color: 0x000000,
              alpha: 0.22
            });
            gem.poly([gx, gy - 5, gx + 5, gy, gx, gy + 5, gx - 5, gy]).fill({ color: 0xffffff, alpha: 0.95 });
            gem.poly([gx, gy - 4, gx + 4, gy, gx, gy + 4, gx - 4, gy]).fill({ color: 0x7dd3fc, alpha: 0.7 });
            gem.circle(gx - 1.2, gy - 1.2, 1.3).fill({ color: 0xfff5bd, alpha: 0.95 });
            app.stage.addChild(gem);
          }
        }
      }

      const selectedIndex = snapshot.state.selectedPieceIndex;
      const selectedPiece = selectedIndex !== null ? snapshot.state.bag[selectedIndex] : null;
      if (snapshot.state.started && !snapshot.state.isOver && selectedPiece) {
        const anchor = hoverAnchor ?? findFirstValidAnchor(snapshot, selectedPiece);
        if (anchor) {
          const isValid = canPlaceAt(snapshot, selectedPiece, anchor.row, anchor.col);
          const minRow = Math.min(...selectedPiece.cells.map((cell) => cell.row));
          const minCol = Math.min(...selectedPiece.cells.map((cell) => cell.col));
          const maxRow = Math.max(...selectedPiece.cells.map((cell) => cell.row));
          const maxCol = Math.max(...selectedPiece.cells.map((cell) => cell.col));
          const regionX = boardX + boardPadding + (anchor.col + minCol) * (cellSize + gap);
          const regionY = boardY + boardPadding + (anchor.row + minRow) * (cellSize + gap);
          const regionW = (maxCol - minCol + 1) * cellSize + (maxCol - minCol) * gap;
          const regionH = (maxRow - minRow + 1) * cellSize + (maxRow - minRow) * gap;
          const previewShadow = new PIXI.Graphics();
          previewShadow.roundRect(regionX + 2, regionY + regionH - 10, regionW - 4, 12, 8).fill({
            color: 0x000000,
            alpha: isValid ? 0.2 : 0.1
          });
          app.stage.addChild(previewShadow);
          for (const cell of selectedPiece.cells) {
            const px = boardX + boardPadding + (anchor.col + cell.col) * (cellSize + gap);
            const py = boardY + boardPadding + (anchor.row + cell.row) * (cellSize + gap);
            const preview = new PIXI.Graphics();
            preview.roundRect(px, py, cellSize, cellSize, 10).fill({
              color: isValid ? 0x7dd3fc : 0xff6b6b,
              alpha: isValid ? 0.26 : 0.2
            });
            preview.roundRect(px + 1, py + 1, cellSize - 2, cellSize * 0.45, 9).fill({
              color: 0xffffff,
              alpha: 0.18
            });
            preview.stroke({
              color: isValid ? 0xdbeafe : 0xffd6d6,
              alpha: 0.86,
              width: 1.5
            });
            app.stage.addChild(preview);
          }
          startPreviewParticles();
        } else {
          stopPreviewParticles();
        }
      } else {
        stopPreviewParticles();
      }

      const trayY = boardY + boardSize + (tiny ? 10 : compact ? 14 : 18);
      const trayH = trayHeight;
      const tray = new PIXI.Graphics();
      tray.roundRect(boardX, trayY, boardSize, trayH, 16).fill({ color: 0xffffff, alpha: 0.12 });
      app.stage.addChild(tray);

      const cardW = (boardSize - 24 - 20) / 3;
      const cardGap = tiny ? 8 : 10;
      trayCardCenters = [];
      snapshot.state.bag.forEach((piece, index) => {
        const cardX = boardX + 12 + index * (cardW + cardGap);
        const cardY = trayY + 10;
        trayCardCenters[index] = { x: cardX + cardW * 0.5, y: cardY + (trayH - 20) * 0.5 };
        const card = new PIXI.Graphics();
        card.roundRect(cardX, cardY, cardW, trayH - 20, 12).fill({
          color: 0xffffff,
          alpha: piece ? 0.2 : 0.07
        });
        card.roundRect(cardX + 1, cardY + 1, cardW - 2, (trayH - 20) * 0.45, 11).fill({
          color: 0xffffff,
          alpha: piece ? 0.12 : 0.04
        });
        card.stroke({
          color: 0xffffff,
          alpha: snapshot.state.selectedPieceIndex === index ? 0.8 : 0,
          width: 2
        });
        card.eventMode = piece ? "static" : "none";
        card.cursor = piece ? "pointer" : "default";
        if (piece) {
          card.on("pointertap", () => {
            ensureAudioReady();
            playTone(420 + index * 40, 0.06, "sine", 0.016);
            engine.selectPiece(index);
          });
          const maxRow = Math.max(...piece.cells.map((item) => item.row)) + 1;
          const maxCol = Math.max(...piece.cells.map((item) => item.col)) + 1;
          const miniSize = Math.min(tiny ? 14 : compact ? 16 : 18, (cardW - 20) / Math.max(maxCol, maxRow));
          const baseX = cardX + (cardW - maxCol * miniSize) * 0.5;
          const baseY = cardY + ((trayH - 20) - maxRow * miniSize) * 0.5;
          for (const mini of piece.cells) {
            const tile = new PIXI.Graphics();
            tile.roundRect(
              baseX + mini.col * miniSize,
              baseY + mini.row * miniSize,
              miniSize - 2,
              miniSize - 2,
              6
            ).fill({ color: toHex(piece.color, 0x3b6af6) });
            app.stage.addChild(tile);
          }
        }
        app.stage.addChild(card);
      });

      overlay.innerHTML = "";
      overlay.style.display = snapshot.state.overlay.visible ? "grid" : "none";
      overlay.style.background = snapshot.state.overlay.visible ? "rgba(15,23,42,0.58)" : "transparent";
      if (snapshot.state.overlay.visible) {
        const card = document.createElement("div");
        card.style.pointerEvents = "auto";
        card.style.borderRadius = "16px";
        card.style.background = "rgba(255,255,255,0.16)";
        card.style.boxShadow = "0 14px 32px rgba(0,0,0,0.28)";
        card.style.padding = "16px 20px";
        card.style.textAlign = "center";
        card.style.maxWidth = compact ? "290px" : "320px";
        card.style.color = "#fff";
        card.style.backdropFilter = "blur(8px)";
        card.innerHTML = `
          <h3 style="margin:0 0 8px 0;">${snapshot.state.overlay.title}</h3>
          <p style="margin:0;opacity:.9;">${snapshot.state.overlay.body}</p>
          <button type="button" style="margin-top:10px;border:0;border-radius:12px;min-height:44px;padding:0 18px;color:#fff;background:linear-gradient(180deg,#6ea2ff,#3B6AF6);font-weight:700;cursor:pointer;transition:transform .2s ease,opacity .2s ease;">${snapshot.state.overlay.buttonText}</button>
        `;
        const button = card.querySelector("button") as HTMLButtonElement | null;
        if (button) {
          button.addEventListener("mouseenter", () => {
            button.style.transform = "translateY(-1px)";
            button.style.opacity = "0.94";
          });
          button.addEventListener("mouseleave", () => {
            button.style.transform = "translateY(0)";
            button.style.opacity = "1";
          });
          button.addEventListener("click", () => engine.startOrRestart());
        }
        overlay.appendChild(card);
      }
    }

    const onResize = (): void => {
      if (!latestSnapshot) return;
      window.requestAnimationFrame(() => render(latestSnapshot));
    };
    window.addEventListener("resize", onResize);

    return {
      render,
      destroy: () => {
        wrapper.removeEventListener("pointerdown", onPointerDown);
        wrapper.removeEventListener("pointermove", onPointerMove);
        wrapper.removeEventListener("pointerup", onPointerUp);
        wrapper.removeEventListener("pointercancel", onPointerUp);
        window.removeEventListener("resize", onResize);
        window.clearTimeout(pulseTimer);
        stopPreviewParticles();
        style.remove();
        fxLayer.remove();
        if (audioCtx && audioCtx.state !== "closed") {
          void audioCtx.close();
        }
        app.destroy(true);
        wrapper.remove();
      }
    };
  }
};
