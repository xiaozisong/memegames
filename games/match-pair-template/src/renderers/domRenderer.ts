import { BlockBlastSnapshot } from "../blockBlastEngine";
import { RendererPlugin } from "./types";

export const domRendererPlugin: RendererPlugin = {
  id: "dom",
  mount: ({ root, engine }) => {
    const style = document.createElement("style");
    style.textContent = `
      #app {
        min-height: 100vh;
        min-height: 100dvh;
        display: grid;
        place-items: center;
      }
      .game-shell {
        width: min(94vw, 600px);
        border-radius: 20px;
        box-shadow: 0 18px 48px rgba(0,0,0,0.28);
        backdrop-filter: blur(16px);
        padding: 16px;
        display: grid;
        gap: 14px;
      }
      .top-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
      .score-card, .icon-btn {
        border-radius: 14px;
        box-shadow: 0 10px 24px rgba(0,0,0,0.2);
        background: rgba(255,255,255,0.1);
      }
      .score-card { padding: 10px 14px; display: flex; align-items: center; gap: 10px; flex: 1; }
      .score-value { font-size: 22px; font-weight: 800; }
      .icon-btn {
        border: 0; width: 44px; height: 44px; cursor: pointer;
        transition: transform .2s ease, opacity .2s ease;
      }
      .icon-btn:hover { transform: translateY(-1px); opacity: 0.92; }
      .title { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.3px; }
      .subtitle { margin: 2px 0 0; opacity: .88; font-size: 13px; }
      .progress-track { height: 10px; border-radius: 999px; background: rgba(255,255,255,0.18); overflow: hidden; }
      .progress-fill { height: 100%; background: linear-gradient(90deg, #FFD93D, #FFB347); transition: width .25s ease; }
      .board {
        border-radius: 18px;
        box-shadow: inset 0 8px 20px rgba(0,0,0,0.24), 0 10px 24px rgba(0,0,0,0.2);
        padding: 10px;
        display: grid;
        gap: 6px;
        position: relative;
      }
      .board-cell {
        border-radius: 12px;
        box-shadow: inset 0 2px 6px rgba(255,255,255,0.06);
        transition: transform .12s ease, filter .2s ease;
        position: relative;
        overflow: hidden;
        cursor: pointer;
        min-height: 30px;
      }
      .board-cell:hover { transform: translateY(-1px); filter: brightness(1.04); }
      .filled::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(165deg, var(--highlight, rgba(255,255,255,0.25)), transparent 55%);
        pointer-events: none;
      }
      .filled::after {
        content: "";
        position: absolute;
        inset: auto 6% 8% 6%;
        height: 18%;
        border-radius: 999px;
        background: var(--shadow, rgba(0,0,0,0.2));
        pointer-events: none;
      }
      .gem-dot {
        position: absolute;
        right: 6px;
        top: 6px;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.18), 0 0 10px rgba(255,255,255,0.8);
      }
      .tray {
        border-radius: 16px;
        background: rgba(255,255,255,0.09);
        box-shadow: 0 10px 24px rgba(0,0,0,0.2);
        padding: 10px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0,1fr));
        gap: 10px;
      }
      .piece-card {
        border: 0;
        border-radius: 12px;
        background: rgba(255,255,255,0.08);
        min-height: 84px;
        cursor: pointer;
        transition: transform .18s ease, outline-color .18s ease;
        outline: 2px solid transparent;
        box-shadow: 0 8px 18px rgba(0,0,0,0.14);
        padding: 8px;
      }
      .piece-card.selected { transform: translateY(-2px); outline-color: rgba(255,255,255,0.65); }
      .piece-mini { display: grid; gap: 4px; place-content: center; width: 100%; height: 100%; }
      .mini-cell { border-radius: 8px; min-width: 16px; min-height: 16px; background: transparent; }
      .mini-cell.filled { box-shadow: inset 0 2px 4px rgba(255,255,255,0.22); }
      .status-row { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; opacity: 0.95; flex-wrap: wrap; }
      .cta { text-align: center; font-weight: 800; letter-spacing: 2px; color: white; text-shadow: 0 4px 8px rgba(0,0,0,0.3); margin-top: 2px; user-select: none; }
      .overlay {
        position: absolute;
        inset: 8px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        background: rgba(15, 23, 42, 0.66);
        backdrop-filter: blur(6px);
      }
      .overlay-card {
        border-radius: 16px;
        background: rgba(255,255,255,0.14);
        box-shadow: 0 14px 32px rgba(0,0,0,0.28);
        padding: 16px 20px;
        text-align: center;
        max-width: 320px;
      }
      .overlay button {
        margin-top: 10px;
        border: 0;
        border-radius: 12px;
        min-height: 42px;
        padding: 0 16px;
        color: white;
        background: linear-gradient(180deg, #6ea2ff, #3B6AF6);
        cursor: pointer;
        font-weight: 700;
      }
    `;
    document.head.appendChild(style);

    const shell = document.createElement("section");
    shell.className = "game-shell";
    root.innerHTML = "";
    root.appendChild(shell);

    const topRow = document.createElement("div");
    topRow.className = "top-row";
    const scoreCard = document.createElement("div");
    scoreCard.className = "score-card";
    const scoreText = document.createElement("div");
    scoreCard.appendChild(scoreText);
    const settingButton = document.createElement("button");
    settingButton.className = "icon-btn";
    settingButton.textContent = "⚙";
    settingButton.type = "button";
    settingButton.addEventListener("click", () => engine.setRelaxHint());
    topRow.append(scoreCard, settingButton);

    const headerBlock = document.createElement("div");
    const progressTrack = document.createElement("div");
    progressTrack.className = "progress-track";
    const progressFill = document.createElement("div");
    progressFill.className = "progress-fill";
    progressTrack.appendChild(progressFill);

    const statusRow = document.createElement("div");
    statusRow.className = "status-row";

    const board = document.createElement("div");
    board.className = "board";

    const tray = document.createElement("div");
    tray.className = "tray";

    const messageEl = document.createElement("div");
    messageEl.className = "subtitle";

    const cta = document.createElement("div");
    cta.className = "cta";

    const overlay = document.createElement("div");
    overlay.className = "overlay";

    shell.append(topRow, headerBlock, progressTrack, statusRow, board, tray, messageEl, cta);
    board.appendChild(overlay);

    const boardCells: HTMLDivElement[] = [];

    function render(snapshot: BlockBlastSnapshot): void {
      root.style.background = `linear-gradient(${snapshot.colors.bgTop}, ${snapshot.colors.bgBottom})`;
      shell.style.background = snapshot.colors.panel;
      shell.style.color = snapshot.colors.textPrimary;
      settingButton.style.color = snapshot.colors.iconColor;
      scoreText.innerHTML = `<div>${snapshot.scoreIcon} Score</div><div class="score-value" style="color:${snapshot.colors.textAccent}">${snapshot.state.score}</div>`;
      headerBlock.innerHTML = `<h2 class="title">${snapshot.title}</h2><p class="subtitle">${snapshot.subtitle}</p>`;
      cta.textContent = snapshot.ctaText;
      messageEl.textContent = snapshot.state.message;
      progressFill.style.width = `${Math.min(100, Math.round((snapshot.state.score / snapshot.targetScore) * 100))}%`;
      board.style.background = snapshot.colors.boardBg;
      board.style.gridTemplateColumns = `repeat(${snapshot.cols}, minmax(0, 1fr))`;

      const gemText = snapshot.gemTargets
        .map((target) => `${target.id}: ${snapshot.state.gemProgress[target.id] ?? 0}/${target.required}`)
        .join(" | ");
      statusRow.innerHTML = `
        <span>Moves ${snapshot.state.movesUsed}/${snapshot.moveLimit}</span>
        <span>Target ${snapshot.targetScore}</span>
        <span>${gemText || "No gem target"}</span>
      `;

      if (boardCells.length === 0) {
        for (let row = 0; row < snapshot.rows; row += 1) {
          for (let col = 0; col < snapshot.cols; col += 1) {
            const cell = document.createElement("div");
            cell.className = "board-cell";
            cell.addEventListener("click", () => engine.placeAt(row, col));
            boardCells.push(cell);
            board.appendChild(cell);
          }
        }
        board.appendChild(overlay);
      }

      for (let row = 0; row < snapshot.rows; row += 1) {
        for (let col = 0; col < snapshot.cols; col += 1) {
          const index = row * snapshot.cols + col;
          const dom = boardCells[index];
          const cell = snapshot.state.board[row][col];
          dom.classList.toggle("filled", cell.filled);
          dom.style.background = cell.filled ? cell.color : snapshot.colors.gridLine;
          dom.style.setProperty("--highlight", snapshot.colors.highlight);
          dom.style.setProperty("--shadow", snapshot.colors.shadow);
          dom.innerHTML = cell.gemId ? `<span class="gem-dot" title="${cell.gemId}"></span>` : "";
          if (cell.filled) {
            dom.style.setProperty("box-shadow", `inset 0 2px 6px rgba(255,255,255,0.06), 0 5px 12px ${snapshot.colors.shadow}`);
          }
        }
      }

      tray.innerHTML = "";
      snapshot.state.bag.forEach((piece, index) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = `piece-card ${snapshot.state.selectedPieceIndex === index ? "selected" : ""}`;
        if (!piece) {
          card.disabled = true;
          card.style.opacity = "0.35";
          card.textContent = "USED";
          tray.appendChild(card);
          return;
        }

        const maxRow = Math.max(...piece.cells.map((item) => item.row)) + 1;
        const maxCol = Math.max(...piece.cells.map((item) => item.col)) + 1;
        const mini = document.createElement("div");
        mini.className = "piece-mini";
        mini.style.gridTemplateRows = `repeat(${maxRow}, 1fr)`;
        mini.style.gridTemplateColumns = `repeat(${maxCol}, 1fr)`;

        for (let row = 0; row < maxRow; row += 1) {
          for (let col = 0; col < maxCol; col += 1) {
            const miniCell = document.createElement("div");
            miniCell.className = "mini-cell";
            const exists = piece.cells.some((cell) => cell.row === row && cell.col === col);
            if (exists) {
              miniCell.classList.add("filled");
              miniCell.style.background = piece.color;
            }
            mini.appendChild(miniCell);
          }
        }

        card.appendChild(mini);
        card.addEventListener("click", () => engine.selectPiece(index));
        tray.appendChild(card);
      });

      overlay.style.display = snapshot.state.overlay.visible ? "grid" : "none";
      overlay.innerHTML = `
        <div class="overlay-card">
          <h3 style="margin:0 0 8px 0;">${snapshot.state.overlay.title}</h3>
          <p style="margin:0;opacity:.9;">${snapshot.state.overlay.body}</p>
          <button type="button">${snapshot.state.overlay.buttonText}</button>
        </div>
      `;
      const actionButton = overlay.querySelector("button");
      actionButton?.addEventListener("click", () => engine.startOrRestart());
    }

    return {
      render,
      destroy: () => {
        shell.remove();
        style.remove();
      }
    };
  }
};
