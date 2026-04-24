import * as PIXI from "pixi.js";
import { getSetting } from "../../config.js";

const FALLBACK_TILE_COLORS = {
  2: 0xeee4da,
  4: 0xede0c8,
  8: 0xf2b179,
  16: 0xf59563,
  32: 0xf67c5f,
  64: 0xf65e3b,
  128: 0xedcf72,
  256: 0xedcc61,
  512: 0xedc850,
  1024: 0xedc53f,
  2048: 0xedc22e,
};

export async function mountGame2048Renderer(root, kernel) {
  const renderer = new Game2048Renderer(root, kernel);
  await renderer.mount();
  return renderer;
}

class Game2048Renderer {
  constructor(root, kernel) {
    this.root = root;
    this.kernel = kernel;
    this.snapshot = kernel.getSnapshot();
    this.prevSnapshot = this.snapshot;

    this.app = null;
    this.stageRoot = new PIXI.Container();
    this.board = new PIXI.Graphics();
    this.gridLayer = new PIXI.Container();
    this.slideLayer = new PIXI.Container();
    this.uiLayer = new PIXI.Container();
    this.tiles = [];
    this.slideTiles = [];
    this.tilePulse = Array(16).fill(0);
    this.pendingMoveMeta = null;
    this.activeSlide = null;

    this.scoreCard = new PIXI.Graphics();
    this.bestCard = new PIXI.Graphics();
    this.newGameButton = new PIXI.Graphics();
    this.scoreLabel = new PIXI.Text({ text: "SCORE", style: { fill: 0x776e65, fontSize: 12, fontWeight: "700" } });
    this.bestLabel = new PIXI.Text({ text: "BEST", style: { fill: 0x776e65, fontSize: 12, fontWeight: "700" } });
    this.scoreText = new PIXI.Text({ text: "0", style: { fill: 0x776e65, fontSize: 24, fontWeight: "700" } });
    this.bestText = new PIXI.Text({ text: "0", style: { fill: 0x776e65, fontSize: 24, fontWeight: "700" } });
    this.newGameText = new PIXI.Text({ text: "", style: { fill: 0xffffff, fontSize: 16, fontWeight: "700" } });
    this.headingText = new PIXI.Text({ text: "2048", style: { fill: 0x776e65, fontSize: 52, fontWeight: "700" } });
    this.statusText = new PIXI.Text({ text: "", style: { fill: 0x776e65, fontSize: 16 } });
    this.tipText = new PIXI.Text({ text: "", style: { fill: 0x776e65, fontSize: 14 } });
    this.newGameButtonBounds = { x: 0, y: 0, width: 0, height: 0 };

    this.modalLayer = new PIXI.Container();
    this.modalOverlay = new PIXI.Graphics();
    this.modalShadow = new PIXI.Graphics();
    this.modalCard = new PIXI.Graphics();
    this.modalCardHighlight = new PIXI.Graphics();
    this.modalAction = new PIXI.Graphics();
    this.modalTitle = new PIXI.Text({ text: "", style: { fill: 0x776e65, fontSize: 36, fontWeight: "700" } });
    this.modalDesc = new PIXI.Text({
      text: "",
      style: { fill: 0x776e65, fontSize: 16, align: "center", wordWrap: true, wordWrapWidth: 320 },
    });
    this.modalBtnText = new PIXI.Text({ text: "", style: { fill: 0xf9f6f2, fontSize: 18, fontWeight: "700" } });

    this.modalPulse = 0;
    this.tileSize = 0;
    this.boardSize = 0;
    this.boardX = 0;
    this.boardY = 0;
    this.swipeStartX = 0;
    this.swipeStartY = 0;

    this.unsubscribe = undefined;
    this.onKeydown = undefined;
    this.onPointerDown = undefined;
    this.onPointerUp = undefined;
    this.mergeAudio = null;
    this.audioUnlocked = false;
  }

  async mount() {
    this.app = new PIXI.Application();
    await this.app.init({
      background: this.getColor("theme.background", 0xfaf8ef),
      antialias: true,
      resizeTo: this.root,
    });

    this.root.innerHTML = "";
    this.root.appendChild(this.app.canvas);
    this.app.stage.addChild(this.stageRoot);
    this.stageRoot.addChild(this.board, this.gridLayer, this.slideLayer, this.uiLayer);
    this.uiLayer.addChild(
      this.scoreCard,
      this.bestCard,
      this.newGameButton,
      this.scoreLabel,
      this.bestLabel,
      this.scoreText,
      this.bestText,
      this.newGameText,
      this.headingText,
      this.statusText,
      this.tipText,
    );
    this.modalLayer.addChild(
      this.modalOverlay,
      this.modalShadow,
      this.modalCard,
      this.modalCardHighlight,
      this.modalAction,
      this.modalTitle,
      this.modalDesc,
      this.modalBtnText,
    );
    this.uiLayer.addChild(this.modalLayer);

    this.applyThemeText();
    this.initAudio();
    this.createTileViews();
    this.createSlideTileViews();
    this.bindEvents();
    this.unsubscribe = this.kernel.subscribe((next) => {
      this.prevSnapshot = this.snapshot;
      this.snapshot = next;
      this.syncAnimationsFromSnapshot(this.prevSnapshot, this.snapshot);
    });

    this.app.ticker.add((ticker) => {
      this.advanceFeedback(ticker.deltaMS / 1000);
      this.layout();
      this.renderBoard();
    });
  }

  destroy() {
    this.unsubscribe?.();
    if (this.onKeydown) window.removeEventListener("keydown", this.onKeydown);
    if (this.onPointerDown) this.app?.canvas.removeEventListener("pointerdown", this.onPointerDown);
    if (this.onPointerUp) {
      this.app?.canvas.removeEventListener("pointerup", this.onPointerUp);
      this.app?.canvas.removeEventListener("pointercancel", this.onPointerUp);
    }
    this.tiles.length = 0;
    if (this.mergeAudio) {
      this.mergeAudio.pause();
      this.mergeAudio.currentTime = 0;
      this.mergeAudio = null;
    }
    this.app?.destroy(true, { children: true });
  }

  bindEvents() {
    this.onKeydown = (event) => {
      this.unlockAudio();
      const key = event.key.toLowerCase();
      if (key === "r") {
        this.kernel.dispatch({ type: "start_or_restart" });
        return;
      }
      if (this.snapshot.overlay.visible) {
        if (key === "enter" || key === " ") this.kernel.dispatch({ type: "dismiss_overlay" });
        return;
      }
      const direction = this.resolveDirectionByKey(key);
      if (direction) this.dispatchMove(direction);
    };
    window.addEventListener("keydown", this.onKeydown);

    this.onPointerDown = (event) => {
      this.unlockAudio();
      if (this.snapshot.overlay.visible) {
        this.kernel.dispatch({ type: "dismiss_overlay" });
        return;
      }
      const rect = this.app.canvas.getBoundingClientRect();
      this.swipeStartX = event.clientX - rect.left;
      this.swipeStartY = event.clientY - rect.top;
    };

    this.onPointerUp = (event) => {
      if (this.snapshot.overlay.visible) return;
      const rect = this.app.canvas.getBoundingClientRect();
      const endX = event.clientX - rect.left;
      const endY = event.clientY - rect.top;
      const dx = endX - this.swipeStartX;
      const dy = endY - this.swipeStartY;
      if (this.isInsideNewGameButton(endX, endY)) {
        this.kernel.dispatch({ type: "start_or_restart" });
        return;
      }
      const threshold = this.getNumber("gameplay.params.swipeThreshold", 28);

      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
        this.kernel.dispatch({ type: "show_swipe_hint" });
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        this.dispatchMove(dx > 0 ? "right" : "left");
      } else {
        this.dispatchMove(dy > 0 ? "down" : "up");
      }
    };

    this.app.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.app.canvas.addEventListener("pointerup", this.onPointerUp);
    this.app.canvas.addEventListener("pointercancel", this.onPointerUp);
  }

  resolveDirectionByKey(key) {
    if (key === "arrowleft" || key === "a") return "left";
    if (key === "arrowright" || key === "d") return "right";
    if (key === "arrowup" || key === "w") return "up";
    if (key === "arrowdown" || key === "s") return "down";
    return null;
  }

  dispatchMove(direction) {
    this.pendingMoveMeta = {
      direction,
      board: this.snapshot.board.map((row) => [...row]),
    };
    this.kernel.dispatch({ type: "move", direction });
  }

  syncAnimationsFromSnapshot(previous, next) {
    if (next.score > previous.score) {
      this.playMergeAudio();
    }
    const spawnPulse = this.getNumber("gameplay.params.tilePulseSpawn", 0.34);
    const movePulse = this.getNumber("gameplay.params.tilePulseMove", 0.18);
    for (let row = 0; row < next.size; row += 1) {
      for (let col = 0; col < next.size; col += 1) {
        const index = row * next.size + col;
        const before = previous.board[row][col];
        const after = next.board[row][col];
        if (before === after || after === 0) continue;
        const pulse = before === 0 ? spawnPulse : movePulse;
        this.tilePulse[index] = Math.max(this.tilePulse[index], pulse);
      }
    }
    if (!previous.overlay.visible && next.overlay.visible) this.modalPulse = 0;
    this.startSlideAnimationIfNeeded(next);
  }

  createTileViews() {
    for (let i = 0; i < 16; i += 1) {
      const box = new PIXI.Graphics();
      const label = new PIXI.Text({
        text: "",
        style: {
          fill: this.getColor("theme.textDark", 0x776e65),
          fontSize: 34,
          fontWeight: "700",
        },
      });
      label.anchor.set(0.5);
      this.gridLayer.addChild(box, label);
      this.tiles.push({ box, label });
    }
  }

  createSlideTileViews() {
    for (let i = 0; i < 16; i += 1) {
      const box = new PIXI.Graphics();
      const label = new PIXI.Text({
        text: "",
        style: {
          fill: this.getColor("theme.textDark", 0x776e65),
          fontSize: 34,
          fontWeight: "700",
        },
      });
      label.anchor.set(0.5);
      box.visible = false;
      label.visible = false;
      this.slideLayer.addChild(box, label);
      this.slideTiles.push({ box, label });
    }
  }

  layout() {
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    const topOffset = this.getNumber("gameplay.params.boardTopOffset", 140);
    const padding = this.getNumber("gameplay.params.boardPadding", 18);
    const gap = this.getNumber("gameplay.params.boardGap", 10);
    const maxBoardFromWidth = Math.min(width - padding * 2, 520);
    const maxBoardFromHeight = Math.max(220, height - topOffset - padding);
    this.boardSize = Math.max(220, Math.min(maxBoardFromWidth, maxBoardFromHeight));
    this.tileSize = (this.boardSize - gap * (this.snapshot.size + 1)) / this.snapshot.size;
    this.boardX = (width - this.boardSize) * 0.5;
    this.boardY = Math.max(topOffset, (height - this.boardSize) * 0.5);

    this.board.clear().roundRect(this.boardX, this.boardY, this.boardSize, this.boardSize, 16).fill(this.getColor("theme.board", 0xbbada0));
    this.drawScoreBoard();
    this.headingText.x = this.boardX;
    this.headingText.y = this.boardY - 126;
    this.statusText.x = this.boardX;
    this.statusText.y = this.boardY - 70;
    this.tipText.x = this.boardX;
    this.tipText.y = this.boardY - 40;
    this.drawModal();
  }

  drawScoreBoard() {
    const cardSize = 92;
    const gap = 10;
    const scoreX = this.boardX + this.boardSize - cardSize * 2 - gap;
    const y = this.boardY + this.getNumber("gameplay.params.scorePanelOffsetY", -136);
    const bestX = scoreX + cardSize + gap;

    this.scoreCard.clear().roundRect(scoreX, y, cardSize, cardSize, 14).fill(this.getColor("theme.cell", 0xcdc1b4));
    this.bestCard.clear().roundRect(bestX, y, cardSize, cardSize, 14).fill(this.getColor("theme.board", 0xbbada0));

    this.scoreLabel.text = this.getText("ui.text.scoreLabel", "SCORE");
    this.bestLabel.text = this.getText("ui.text.bestLabel", "BEST");
    this.scoreLabel.x = scoreX + 14;
    this.scoreLabel.y = y + 12;
    this.bestLabel.x = bestX + 22;
    this.bestLabel.y = y + 12;

    this.scoreText.text = String(this.snapshot.score);
    this.bestText.text = String(this.snapshot.bestScore);
    this.scoreText.x = scoreX + cardSize * 0.5 - this.scoreText.width * 0.5;
    this.scoreText.y = y + 42;
    this.bestText.x = bestX + cardSize * 0.5 - this.bestText.width * 0.5;
    this.bestText.y = y + 42;

    const buttonX = scoreX;
    const buttonY = y + cardSize + gap;
    const buttonWidth = cardSize * 2 + gap;
    const buttonHeight = 42;
    this.newGameButton.clear().roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 12).fill(
      this.getColor("theme.controls.newGameButton", 0x8f7a67),
    );
    this.newGameText.text = this.getText("ui.text.newGameButton", "新游戏");
    this.newGameText.x = buttonX + buttonWidth * 0.5 - this.newGameText.width * 0.5;
    this.newGameText.y = buttonY + buttonHeight * 0.5 - this.newGameText.height * 0.5;
    this.newGameButtonBounds = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };
  }

  drawModal() {
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    const cardWidth = Math.min(380, width - 40);
    const cardHeight = 260;
    const x = (width - cardWidth) * 0.5;
    const y = (height - cardHeight) * 0.5;

    this.modalOverlay.clear().rect(0, 0, width, height).fill(this.getColor("theme.modal.overlay", 0x3a312a));
    this.modalOverlay.alpha = 0.35;

    this.modalShadow.clear().roundRect(x + 8, y + 10, cardWidth, cardHeight, 20).fill(this.getColor("theme.modal.shadow", 0x000000));
    this.modalShadow.alpha = 0.2;

    this.modalCard.clear().roundRect(x, y, cardWidth, cardHeight, 20).fill(this.getColor("theme.modal.card", 0xf7f2ea));
    this.modalCard.alpha = 0.95;

    this.modalCardHighlight
      .clear()
      .roundRect(x, y, cardWidth, cardHeight * 0.58, 20)
      .fill(this.getColor("theme.modal.cardHighlight", 0xffffff));
    this.modalCardHighlight.alpha = 0.16;

    const btnWidth = 190;
    const btnHeight = 50;
    const btnX = x + (cardWidth - btnWidth) * 0.5;
    const btnY = y + cardHeight - 78;
    this.modalAction.clear().roundRect(btnX, btnY, btnWidth, btnHeight, 14).fill(this.getColor("theme.modal.button", 0x8f7a66));
    this.modalAction.alpha = 0.96;

    this.modalTitle.text = this.snapshot.overlay.title;
    this.modalDesc.text = this.snapshot.overlay.body;
    this.modalBtnText.text = this.snapshot.overlay.buttonText;
    this.modalTitle.x = x + cardWidth * 0.5 - this.modalTitle.width * 0.5;
    this.modalTitle.y = y + 36;
    this.modalDesc.x = x + cardWidth * 0.5 - this.modalDesc.width * 0.5;
    this.modalDesc.y = y + 102;
    this.modalBtnText.x = btnX + btnWidth * 0.5 - this.modalBtnText.width * 0.5;
    this.modalBtnText.y = btnY + btnHeight * 0.5 - this.modalBtnText.height * 0.5;
  }

  renderBoard() {
    const gap = this.getNumber("gameplay.params.boardGap", 10);
    const statusFallback = this.getText("ui.text.statusReady", "合并相同方块，得到2048的方块!");
    this.statusText.text = this.snapshot.statusText && this.snapshot.statusText.trim().length > 0
      ? this.snapshot.statusText
      : statusFallback;
    const animatedDestinations = this.collectAnimatedDestinationSet();
    let index = 0;

    for (let row = 0; row < this.snapshot.size; row += 1) {
      for (let col = 0; col < this.snapshot.size; col += 1) {
        const value = this.snapshot.board[row][col];
        const x = this.boardX + gap + col * (this.tileSize + gap);
        const y = this.boardY + gap + row * (this.tileSize + gap);
        const view = this.tiles[index];
        const pulse = this.tilePulse[index];
        const destinationKey = this.cellKey(row, col);
        const shouldHideStaticValue = animatedDestinations.has(destinationKey);
        const renderValue = shouldHideStaticValue ? 0 : value;
        const scale = renderValue === 0 ? 1 : 1 + pulse * 0.32;
        const drawSize = this.tileSize * scale;
        const offset = (drawSize - this.tileSize) * 0.5;

        view.box.clear().roundRect(x - offset, y - offset, drawSize, drawSize, 10).fill(
          renderValue === 0 ? this.getColor("theme.cell", 0xcdc1b4) : this.getTileColor(renderValue),
        );
        view.box.alpha = renderValue === 0 ? 0.42 : Math.min(1, 0.9 + pulse * 0.2);

        view.label.text = renderValue === 0 ? "" : String(renderValue);
        view.label.style.fill = renderValue <= 4 ? this.getColor("theme.textDark", 0x776e65) : this.getColor("theme.textLight", 0xf9f6f2);
        view.label.style.fontSize = renderValue >= 1024 ? 24 : renderValue >= 128 ? 28 : 34;
        view.label.alpha = renderValue === 0 ? 0 : view.box.alpha;
        view.label.x = x + this.tileSize * 0.5;
        view.label.y = y + this.tileSize * 0.5;
        index += 1;
      }
    }

    this.renderSlideTiles();

    this.statusText.alpha = 1;
    this.scoreCard.alpha = 1;
    this.scoreText.alpha = 1;
    this.modalLayer.visible = this.snapshot.overlay.visible;
    this.modalLayer.alpha = this.snapshot.overlay.visible ? 1 : 0;
  }

  advanceFeedback(deltaTime) {
    const dt = Math.max(0.001, deltaTime);
    const decay = this.getNumber("gameplay.params.tilePulseDecay", 2.5);
    for (let i = 0; i < this.tilePulse.length; i += 1) {
      this.tilePulse[i] = Math.max(0, this.tilePulse[i] - dt * decay);
    }
    if (this.activeSlide) {
      this.activeSlide.elapsed += dt;
      if (this.activeSlide.elapsed >= this.activeSlide.duration) this.activeSlide = null;
    }
    this.modalAction.scale.set(1, 1);
    this.modalBtnText.scale.set(1, 1);
  }

  collectAnimatedDestinationSet() {
    if (!this.activeSlide || this.activeSlide.moves.length === 0) return new Set();
    const set = new Set();
    for (const move of this.activeSlide.moves) set.add(this.cellKey(move.toRow, move.toCol));
    return set;
  }

  renderSlideTiles() {
    for (let i = 0; i < this.slideTiles.length; i += 1) {
      this.slideTiles[i].box.visible = false;
      this.slideTiles[i].label.visible = false;
    }
    if (!this.activeSlide) return;

    const progress = Math.min(1, this.activeSlide.elapsed / this.activeSlide.duration);
    const eased = 1 - (1 - progress) ** 3;
    const limit = Math.min(this.activeSlide.moves.length, this.slideTiles.length);
    for (let i = 0; i < limit; i += 1) {
      const move = this.activeSlide.moves[i];
      const view = this.slideTiles[i];
      const from = this.cellToPixel(move.fromRow, move.fromCol);
      const to = this.cellToPixel(move.toRow, move.toCol);
      const x = from.x + (to.x - from.x) * eased;
      const y = from.y + (to.y - from.y) * eased;
      const pulse = this.tilePulse[move.toRow * this.snapshot.size + move.toCol];
      const scale = 1 + pulse * 0.2;
      const drawSize = this.tileSize * scale;
      const offset = (drawSize - this.tileSize) * 0.5;

      view.box.visible = true;
      view.box.clear().roundRect(x - offset, y - offset, drawSize, drawSize, 10).fill(this.getTileColor(move.value));
      view.box.alpha = 0.98;

      view.label.visible = true;
      view.label.text = String(move.value);
      view.label.style.fill = move.value <= 4 ? this.getColor("theme.textDark", 0x776e65) : this.getColor("theme.textLight", 0xf9f6f2);
      view.label.style.fontSize = move.value >= 1024 ? 24 : move.value >= 128 ? 28 : 34;
      view.label.alpha = 1;
      view.label.x = x + this.tileSize * 0.5;
      view.label.y = y + this.tileSize * 0.5;
    }
  }

  startSlideAnimationIfNeeded(next) {
    if (!this.pendingMoveMeta || this.boardsEqual(this.pendingMoveMeta.board, next.board)) {
      this.pendingMoveMeta = null;
      return;
    }
    const moves = this.buildSlideMoves(this.pendingMoveMeta.board, this.pendingMoveMeta.direction);
    if (moves.length === 0) {
      this.pendingMoveMeta = null;
      return;
    }
    this.activeSlide = {
      elapsed: 0,
      duration: this.getNumber("gameplay.params.slideDuration", 0.12),
      moves,
    };
    this.pendingMoveMeta = null;
  }

  buildSlideMoves(board, direction) {
    const size = board.length;
    const moves = [];
    const mapToCell = (lineIndex, targetIndex) => {
      if (direction === "left") return { row: lineIndex, col: targetIndex };
      if (direction === "right") return { row: lineIndex, col: size - 1 - targetIndex };
      if (direction === "up") return { row: targetIndex, col: lineIndex };
      return { row: size - 1 - targetIndex, col: lineIndex };
    };

    for (let lineIndex = 0; lineIndex < size; lineIndex += 1) {
      const entries = [];
      for (let offset = 0; offset < size; offset += 1) {
        const cell = mapToCell(lineIndex, offset);
        const value = board[cell.row][cell.col];
        if (value !== 0) entries.push({ ...cell, value });
      }
      let target = 0;
      for (let i = 0; i < entries.length; i += 1) {
        const current = entries[i];
        const next = entries[i + 1];
        const targetCell = mapToCell(lineIndex, target);
        if (next && next.value === current.value) {
          moves.push({ fromRow: current.row, fromCol: current.col, toRow: targetCell.row, toCol: targetCell.col, value: current.value });
          moves.push({ fromRow: next.row, fromCol: next.col, toRow: targetCell.row, toCol: targetCell.col, value: next.value });
          i += 1;
        } else {
          moves.push({ fromRow: current.row, fromCol: current.col, toRow: targetCell.row, toCol: targetCell.col, value: current.value });
        }
        target += 1;
      }
    }
    return moves.filter((move) => move.fromRow !== move.toRow || move.fromCol !== move.toCol);
  }

  boardsEqual(before, after) {
    if (before.length !== after.length) return false;
    for (let row = 0; row < before.length; row += 1) {
      for (let col = 0; col < before[row].length; col += 1) {
        if (before[row][col] !== after[row][col]) return false;
      }
    }
    return true;
  }

  cellKey(row, col) {
    return `${row}:${col}`;
  }

  cellToPixel(row, col) {
    const gap = this.getNumber("gameplay.params.boardGap", 10);
    return {
      x: this.boardX + gap + col * (this.tileSize + gap),
      y: this.boardY + gap + row * (this.tileSize + gap),
    };
  }

  applyThemeText() {
    const textDark = this.getColor("theme.textDark", 0x776e65);
    const textLight = this.getColor("theme.textLight", 0xf9f6f2);
    this.scoreLabel.style.fill = textDark;
    this.bestLabel.style.fill = textDark;
    this.scoreText.style.fill = textDark;
    this.bestText.style.fill = textDark;
    this.newGameText.style.fill = this.getColor("theme.controls.newGameText", 0xffffff);
    this.headingText.style.fill = textDark;
    this.headingText.text = this.getText("ui.text.headingTitle", "2048");
    this.statusText.style.fill = textDark;
    this.tipText.style.fill = textDark;
    this.tipText.text = this.getText("ui.text.tip", "");
    this.modalTitle.style.fill = textDark;
    this.modalDesc.style.fill = textDark;
    this.modalBtnText.style.fill = textLight;
  }

  isInsideNewGameButton(x, y) {
    const bounds = this.newGameButtonBounds;
    return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
  }

  getTileColor(value) {
    const color = getSetting(`theme.tiles.${value}`, undefined);
    return this.toColorHex(color, FALLBACK_TILE_COLORS[value] ?? this.getColor("theme.cell", 0xcdc1b4));
  }

  getNumber(path, fallback) {
    const value = getSetting(path, fallback);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
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

  initAudio() {
    const mergeAudioUrl = getSetting("asset_audio_merge", "");
    if (typeof mergeAudioUrl !== "string" || mergeAudioUrl.length === 0) return;
    this.mergeAudio = new Audio(mergeAudioUrl);
    this.mergeAudio.preload = "auto";
  }

  unlockAudio() {
    if (this.audioUnlocked || !this.mergeAudio) return;
    const maybePromise = this.mergeAudio.play();
    if (!maybePromise || typeof maybePromise.then !== "function") {
      this.mergeAudio.pause();
      this.mergeAudio.currentTime = 0;
      this.audioUnlocked = true;
      return;
    }
    maybePromise
      .then(() => {
        this.mergeAudio.pause();
        this.mergeAudio.currentTime = 0;
        this.audioUnlocked = true;
      })
      .catch(() => {
        // Ignore unlock failures until next input attempt.
      });
  }

  playMergeAudio() {
    if (!this.mergeAudio) return;
    if (!this.audioUnlocked) this.unlockAudio();
    this.mergeAudio.currentTime = 0;
    void this.mergeAudio.play().catch(() => {
      // Ignore autoplay or transient playback errors.
    });
  }
}
