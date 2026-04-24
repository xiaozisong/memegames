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
    settingBtn.addEventListener("click", () => engine.setRelaxHint());
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

      const board = new PIXI.Graphics();
      board.roundRect(boardX, boardY, boardSize, boardSize, 18).fill({
        color: toHex(snapshot.colors.boardBg, 0x2e3a70)
      });
      app.stage.addChild(board);

      const cellSize = (boardSize - boardPadding * 2 - gap * (snapshot.cols - 1)) / snapshot.cols;
      for (let row = 0; row < snapshot.rows; row += 1) {
        for (let col = 0; col < snapshot.cols; col += 1) {
          const cell = snapshot.state.board[row][col];
          const x = boardX + boardPadding + col * (cellSize + gap);
          const y = boardY + boardPadding + row * (cellSize + gap);
          const tile = new PIXI.Graphics();
          tile.roundRect(x, y, cellSize, cellSize, 10).fill({
            color: toHex(cell.filled ? cell.color : snapshot.colors.gridLine, 0x334155),
            alpha: cell.filled ? 1 : 0.9
          });
          if (cell.filled) {
            tile.roundRect(x, y, cellSize, cellSize * 0.54, 10).fill({ color: 0xffffff, alpha: 0.16 });
            tile.ellipse(x + cellSize * 0.5, y + cellSize * 0.9, cellSize * 0.32, Math.max(2, cellSize * 0.08)).fill({
              color: toHex(snapshot.colors.blockShadow, 0x000000),
              alpha: 0.35
            });
          }
          tile.eventMode = "static";
          tile.cursor = "pointer";
          tile.on("pointertap", () => engine.placeAt(row, col));
          app.stage.addChild(tile);

          if (cell.gemId) {
            const gem = new PIXI.Graphics();
            gem.circle(x + cellSize - 9, y + 9, 4).fill({ color: 0xffffff, alpha: 0.95 });
            app.stage.addChild(gem);
          }
        }
      }

      const trayY = boardY + boardSize + (tiny ? 10 : compact ? 14 : 18);
      const trayH = trayHeight;
      const tray = new PIXI.Graphics();
      tray.roundRect(boardX, trayY, boardSize, trayH, 16).fill({ color: 0xffffff, alpha: 0.12 });
      app.stage.addChild(tray);

      const cardW = (boardSize - 24 - 20) / 3;
      const cardGap = tiny ? 8 : 10;
      snapshot.state.bag.forEach((piece, index) => {
        const cardX = boardX + 12 + index * (cardW + cardGap);
        const cardY = trayY + 10;
        const card = new PIXI.Graphics();
        card.roundRect(cardX, cardY, cardW, trayH - 20, 12).fill({
          color: 0xffffff,
          alpha: piece ? 0.15 : 0.07
        });
        card.stroke({
          color: 0xffffff,
          alpha: snapshot.state.selectedPieceIndex === index ? 0.8 : 0,
          width: 2
        });
        card.eventMode = piece ? "static" : "none";
        card.cursor = piece ? "pointer" : "default";
        if (piece) {
          card.on("pointertap", () => engine.selectPiece(index));
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
        window.removeEventListener("resize", onResize);
        app.destroy(true);
        wrapper.remove();
      }
    };
  }
};
