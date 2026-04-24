// Legacy reference renderer.
// Current no-build runtime uses `renderers/blockPlacement/mountBlockPlacementRenderer.js`.
// Keep this file only as an earlier simplified Pixi example; do not treat it as the active entrypoint.

import * as PIXI from "pixi.js";

function toHex(color, fallback) {
  if (!color.startsWith("#")) return fallback;
  const parsed = Number.parseInt(color.slice(1), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function mountPixiTemplateRenderer(root, kernel) {
  root.innerHTML = "";
  root.style.display = "grid";
  root.style.placeItems = "center";
  root.style.background = "#0B1024";

  const wrapper = document.createElement("div");
  wrapper.style.width = "min(96vw, 680px)";
  wrapper.style.height = "min(92dvh, 920px)";
  wrapper.style.borderRadius = "22px";
  wrapper.style.overflow = "hidden";
  wrapper.style.position = "relative";
  wrapper.style.boxShadow = "0 18px 42px rgba(0,0,0,0.28)";
  root.appendChild(wrapper);

  const app = new PIXI.Application();
  await app.init({ resizeTo: wrapper, antialias: true, backgroundAlpha: 0 });
  wrapper.appendChild(app.canvas);

  const hud = document.createElement("div");
  hud.style.position = "absolute";
  hud.style.inset = "10px";
  hud.style.display = "grid";
  hud.style.gridTemplateRows = "auto auto auto 1fr auto";
  hud.style.pointerEvents = "none";
  wrapper.appendChild(hud);

  const top = document.createElement("div");
  top.style.display = "flex";
  top.style.justifyContent = "space-between";
  top.style.gap = "8px";
  top.style.pointerEvents = "auto";
  hud.appendChild(top);

  const score = document.createElement("div");
  score.style.borderRadius = "14px";
  score.style.padding = "8px 12px";
  score.style.background = "rgba(255,255,255,0.16)";
  score.style.color = "#fff";
  top.appendChild(score);

  const setting = document.createElement("button");
  setting.type = "button";
  setting.textContent = "⚙";
  setting.style.border = "0";
  setting.style.borderRadius = "12px";
  setting.style.minWidth = "44px";
  setting.style.height = "44px";
  setting.style.cursor = "pointer";
  setting.style.color = "#fff";
  setting.style.background = "rgba(255,255,255,0.15)";
  setting.addEventListener("click", () => kernel.dispatch({ type: "set_relax_hint" }));
  top.appendChild(setting);

  const title = document.createElement("div");
  title.style.color = "#fff";
  hud.appendChild(title);

  const progressTrack = document.createElement("div");
  progressTrack.style.height = "10px";
  progressTrack.style.borderRadius = "999px";
  progressTrack.style.background = "rgba(255,255,255,0.2)";
  progressTrack.style.overflow = "hidden";
  const progressFill = document.createElement("div");
  progressFill.style.height = "100%";
  progressFill.style.width = "0%";
  progressFill.style.background = "linear-gradient(90deg,#00F6FF,#A66BFF)";
  progressFill.style.transition = "width .2s ease";
  progressTrack.appendChild(progressFill);
  hud.appendChild(progressTrack);

  const status = document.createElement("div");
  status.style.marginTop = "8px";
  status.style.fontSize = "12px";
  status.style.color = "#fff";
  hud.appendChild(status);

  const cta = document.createElement("div");
  cta.style.textAlign = "center";
  cta.style.fontWeight = "800";
  cta.style.letterSpacing = "2px";
  cta.style.color = "#fff";
  cta.style.marginBottom = "4px";
  hud.appendChild(cta);

  const overlay = document.createElement("div");
  overlay.style.position = "absolute";
  overlay.style.inset = "0";
  overlay.style.display = "none";
  overlay.style.placeItems = "center";
  overlay.style.pointerEvents = "none";
  wrapper.appendChild(overlay);

  const render = (snapshot) => {
    const width = wrapper.clientWidth;
    const height = wrapper.clientHeight;
    app.stage.removeChildren();

    const compact = width < 500 || height < 760;
    const panelMargin = compact ? 10 : 14;
    const hudTopSpace = compact ? 130 : 146;
    const trayHeight = compact ? 110 : 128;
    const footerSpace = compact ? 90 : 112;
    const boardPadding = compact ? 8 : 10;
    const gap = compact ? 4 : 6;
    const boardSize = Math.max(180, Math.min(width - panelMargin * 2 - 18, height - hudTopSpace - trayHeight - footerSpace));
    const boardX = (width - boardSize) * 0.5;
    const boardY = hudTopSpace;

    const bg = new PIXI.Graphics();
    bg.rect(0, 0, width, height).fill({ color: toHex(snapshot.colors.bgTop, 0x060a16) });
    bg.rect(0, height * 0.4, width, height * 0.6).fill({ color: toHex(snapshot.colors.bgBottom, 0x0b1024), alpha: 0.45 });
    app.stage.addChild(bg);

    const panel = new PIXI.Graphics();
    panel.roundRect(panelMargin, panelMargin, width - panelMargin * 2, height - panelMargin * 2, 20).fill({ color: 0xffffff, alpha: 0.12 });
    app.stage.addChild(panel);

    const board = new PIXI.Graphics();
    board.roundRect(boardX, boardY, boardSize, boardSize, 18).fill({ color: toHex(snapshot.colors.boardBg, 0x111a33) });
    app.stage.addChild(board);

    const cellSize = (boardSize - boardPadding * 2 - gap * (snapshot.cols - 1)) / snapshot.cols;
    for (let row = 0; row < snapshot.rows; row += 1) {
      for (let col = 0; col < snapshot.cols; col += 1) {
        const cell = snapshot.state.board[row][col];
        const x = boardX + boardPadding + col * (cellSize + gap);
        const y = boardY + boardPadding + row * (cellSize + gap);
        const tile = new PIXI.Graphics();
        tile.roundRect(x, y, cellSize, cellSize, 10).fill({ color: toHex(cell.filled ? cell.color : snapshot.colors.gridLine, 0x334155), alpha: cell.filled ? 1 : 0.9 });
        if (cell.filled) {
          tile.roundRect(x + 1, y + 1, cellSize - 2, cellSize * 0.5, 9).fill({ color: 0xffffff, alpha: 0.17 });
        }
        tile.eventMode = "static";
        tile.cursor = "pointer";
        tile.on("pointertap", () => kernel.dispatch({ type: "place_at", row, col }));
        app.stage.addChild(tile);
      }
    }

    const trayY = boardY + boardSize + 14;
    const tray = new PIXI.Graphics();
    tray.roundRect(boardX, trayY, boardSize, trayHeight, 16).fill({ color: 0xffffff, alpha: 0.12 });
    app.stage.addChild(tray);

    const cardW = (boardSize - 24 - 20) / 3;
    snapshot.state.bag.forEach((piece, index) => {
      const cardX = boardX + 12 + index * (cardW + 10);
      const cardY = trayY + 10;
      const card = new PIXI.Graphics();
      card.roundRect(cardX, cardY, cardW, trayHeight - 20, 12).fill({ color: 0xffffff, alpha: piece ? 0.15 : 0.06 });
      card.stroke({ color: 0xffffff, alpha: snapshot.state.selectedPieceIndex === index ? 0.8 : 0, width: 2 });
      if (piece) {
        card.eventMode = "static";
        card.cursor = "pointer";
        card.on("pointertap", () => kernel.dispatch({ type: "select_piece", index }));
        const maxRow = Math.max(...piece.cells.map((item) => item.row)) + 1;
        const maxCol = Math.max(...piece.cells.map((item) => item.col)) + 1;
        const miniSize = Math.min(16, (cardW - 20) / Math.max(maxCol, maxRow));
        const baseX = cardX + (cardW - maxCol * miniSize) * 0.5;
        const baseY = cardY + ((trayHeight - 20) - maxRow * miniSize) * 0.5;
        for (const mini of piece.cells) {
          const tile = new PIXI.Graphics();
          tile.roundRect(baseX + mini.col * miniSize, baseY + mini.row * miniSize, miniSize - 2, miniSize - 2, 5).fill({ color: toHex(piece.color, 0x3b6af6) });
          app.stage.addChild(tile);
        }
      }
      app.stage.addChild(card);
    });

    score.innerHTML = `
      <div style="font-size:12px;opacity:.9;">${snapshot.scoreIcon} Score</div>
      <div style="font-size:22px;line-height:1.1;color:${snapshot.colors.textAccent};font-weight:800;">${snapshot.state.score}</div>
    `;
    title.innerHTML = `<h2 style="margin:0;font-size:20px;">${snapshot.title}</h2><p style="margin:2px 0 0;opacity:.9;font-size:13px;">${snapshot.subtitle}</p>`;
    cta.textContent = snapshot.ctaText;
    progressFill.style.width = `${Math.min(100, Math.round((snapshot.state.score / snapshot.targetScore) * 100))}%`;
    const gemText = snapshot.gemTargets.map((target) => `${target.id}:${snapshot.state.gemProgress[target.id] ?? 0}/${target.required}`).join(" | ");
    const relaxOrMoves = snapshot.moveLimit > 0 ? `Moves ${snapshot.state.movesUsed}/${snapshot.moveLimit}` : `Moves ${snapshot.state.movesUsed} (relax)`;
    status.textContent = `${relaxOrMoves} | Target ${snapshot.targetScore} | ${gemText || "No gems"} | ${snapshot.state.message}`;

    overlay.innerHTML = "";
    overlay.style.display = snapshot.state.overlay.visible ? "grid" : "none";
    overlay.style.background = snapshot.state.overlay.visible ? "rgba(15,23,42,0.58)" : "transparent";
    if (snapshot.state.overlay.visible) {
      const card = document.createElement("div");
      card.style.pointerEvents = "auto";
      card.style.borderRadius = "16px";
      card.style.background = "rgba(255,255,255,0.16)";
      card.style.padding = "16px 20px";
      card.style.textAlign = "center";
      card.style.color = "#fff";
      card.innerHTML = `
        <h3 style="margin:0 0 8px 0;">${snapshot.state.overlay.title}</h3>
        <p style="margin:0;opacity:.9;">${snapshot.state.overlay.body}</p>
        <button type="button" style="margin-top:10px;border:0;border-radius:12px;min-height:44px;padding:0 18px;color:#fff;background:linear-gradient(180deg,#6ea2ff,#3B6AF6);font-weight:700;cursor:pointer;">${snapshot.state.overlay.buttonText}</button>
      `;
      const button = card.querySelector("button");
      button?.addEventListener("click", () => kernel.dispatch({ type: "start_or_restart" }));
      overlay.appendChild(card);
    }
  };

  const unsubscribe = kernel.subscribe(render);
  const onResize = () => render(kernel.getSnapshot());
  window.addEventListener("resize", onResize);

  const teardown = () => {
    unsubscribe();
    window.removeEventListener("resize", onResize);
    app.destroy(true);
    wrapper.remove();
  };
  window.addEventListener("beforeunload", teardown, { once: true });
}
