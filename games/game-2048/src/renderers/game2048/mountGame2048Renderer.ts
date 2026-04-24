import { getSetting } from "../../config";
import { Direction, Game2048Snapshot, GameKernel } from "../../core/contracts";

type TileView = { box: any; label: any };

type RendererHandle = {
  update: (deltaTime: number) => void;
  destroy: () => void;
};

const FALLBACK_TILE_COLORS: Record<number, number> = {
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

export async function mountGame2048Renderer(root: HTMLElement, kernel: GameKernel): Promise<RendererHandle> {
  const renderer = new Game2048Renderer(root, kernel);
  await renderer.mount();
  return {
    update: (deltaTime) => renderer.update(deltaTime),
    destroy: () => renderer.destroy(),
  };
}

class Game2048Renderer {
  private readonly root: HTMLElement;
  private readonly kernel: GameKernel;

  private app: any;
  private readonly stageRoot = new PIXI.Container();
  private readonly board = new PIXI.Graphics();
  private readonly gridLayer = new PIXI.Container();
  private readonly uiLayer = new PIXI.Container();
  private readonly tiles: TileView[] = [];
  private readonly tilePulse: number[] = Array<number>(16).fill(0);

  private readonly scoreCard = new PIXI.Graphics();
  private readonly bestCard = new PIXI.Graphics();
  private readonly scoreLabel = new PIXI.Text({ text: "SCORE", style: { fill: 0x776e65, fontSize: 12, fontWeight: "700" } });
  private readonly bestLabel = new PIXI.Text({ text: "BEST", style: { fill: 0x776e65, fontSize: 12, fontWeight: "700" } });
  private readonly scoreText = new PIXI.Text({ text: "0", style: { fill: 0x776e65, fontSize: 24, fontWeight: "700" } });
  private readonly bestText = new PIXI.Text({ text: "0", style: { fill: 0x776e65, fontSize: 24, fontWeight: "700" } });
  private readonly statusText = new PIXI.Text({ text: "", style: { fill: 0x776e65, fontSize: 16 } });
  private readonly tipText = new PIXI.Text({ text: "", style: { fill: 0x776e65, fontSize: 14 } });

  private readonly modalLayer = new PIXI.Container();
  private readonly modalOverlay = new PIXI.Graphics();
  private readonly modalShadow = new PIXI.Graphics();
  private readonly modalCard = new PIXI.Graphics();
  private readonly modalCardHighlight = new PIXI.Graphics();
  private readonly modalAction = new PIXI.Graphics();
  private readonly modalTitle = new PIXI.Text({ text: "", style: { fill: 0x776e65, fontSize: 36, fontWeight: "700" } });
  private readonly modalDesc = new PIXI.Text({
    text: "",
    style: { fill: 0x776e65, fontSize: 16, align: "center", wordWrap: true, wordWrapWidth: 320 },
  });
  private readonly modalBtnText = new PIXI.Text({ text: "", style: { fill: 0xf9f6f2, fontSize: 18, fontWeight: "700" } });

  private snapshot: Game2048Snapshot;
  private prevSnapshot: Game2048Snapshot;
  private unsubscribe?: () => void;

  private modalPulse = 0;
  private tileSize = 0;
  private boardSize = 0;
  private boardX = 0;
  private boardY = 0;
  private swipeStartX = 0;
  private swipeStartY = 0;

  private onKeydown?: (event: KeyboardEvent) => void;
  private onPointerDown?: (event: PointerEvent) => void;
  private onPointerUp?: (event: PointerEvent) => void;

  constructor(root: HTMLElement, kernel: GameKernel) {
    this.root = root;
    this.kernel = kernel;
    this.snapshot = kernel.getSnapshot();
    this.prevSnapshot = this.snapshot;
  }

  async mount(): Promise<void> {
    this.app = new PIXI.Application();
    await this.app.init({
      background: this.getColor("theme.background", 0xfaf8ef),
      antialias: true,
      resizeTo: this.root,
    });

    this.root.appendChild(this.app.canvas);
    this.app.stage.addChild(this.stageRoot);
    this.stageRoot.addChild(this.board, this.gridLayer, this.uiLayer);
    this.uiLayer.addChild(
      this.scoreCard,
      this.bestCard,
      this.scoreLabel,
      this.bestLabel,
      this.scoreText,
      this.bestText,
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
    this.createTileViews();
    this.bindEvents();
    this.unsubscribe = this.kernel.subscribe((next) => {
      this.prevSnapshot = this.snapshot;
      this.snapshot = next;
      this.syncAnimationsFromSnapshot(this.prevSnapshot, this.snapshot);
    });
    this.layout();
    this.renderBoard();
  }

  update(deltaTime: number): void {
    this.advanceFeedback(deltaTime);
    this.layout();
    this.renderBoard();
  }

  destroy(): void {
    this.unsubscribe?.();
    if (this.onKeydown) window.removeEventListener("keydown", this.onKeydown);
    if (this.onPointerDown) this.app?.canvas.removeEventListener("pointerdown", this.onPointerDown);
    if (this.onPointerUp) {
      this.app?.canvas.removeEventListener("pointerup", this.onPointerUp);
      this.app?.canvas.removeEventListener("pointercancel", this.onPointerUp);
    }
    this.tiles.length = 0;
    this.app?.destroy(true, { children: true });
  }

  private bindEvents(): void {
    this.onKeydown = (event: KeyboardEvent): void => {
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
      if (direction) this.kernel.dispatch({ type: "move", direction });
    };
    window.addEventListener("keydown", this.onKeydown);

    this.onPointerDown = (event: PointerEvent): void => {
      if (this.snapshot.overlay.visible) {
        this.kernel.dispatch({ type: "dismiss_overlay" });
        return;
      }
      const rect = this.app.canvas.getBoundingClientRect();
      this.swipeStartX = event.clientX - rect.left;
      this.swipeStartY = event.clientY - rect.top;
    };

    this.onPointerUp = (event: PointerEvent): void => {
      if (this.snapshot.overlay.visible) return;
      const rect = this.app.canvas.getBoundingClientRect();
      const endX = event.clientX - rect.left;
      const endY = event.clientY - rect.top;
      const dx = endX - this.swipeStartX;
      const dy = endY - this.swipeStartY;
      const threshold = this.getNumber("gameplay.params.swipeThreshold", 28);

      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
        this.kernel.dispatch({ type: "show_swipe_hint" });
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        this.kernel.dispatch({ type: "move", direction: dx > 0 ? "right" : "left" });
      } else {
        this.kernel.dispatch({ type: "move", direction: dy > 0 ? "down" : "up" });
      }
    };

    this.app.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.app.canvas.addEventListener("pointerup", this.onPointerUp);
    this.app.canvas.addEventListener("pointercancel", this.onPointerUp);
  }

  private resolveDirectionByKey(key: string): Direction | null {
    if (key === "arrowleft" || key === "a") return "left";
    if (key === "arrowright" || key === "d") return "right";
    if (key === "arrowup" || key === "w") return "up";
    if (key === "arrowdown" || key === "s") return "down";
    return null;
  }

  private syncAnimationsFromSnapshot(previous: Game2048Snapshot, next: Game2048Snapshot): void {
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
  }

  private createTileViews(): void {
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

  private layout(): void {
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
    this.statusText.x = this.boardX;
    this.statusText.y = this.boardY - 64;
    this.tipText.x = this.boardX;
    this.tipText.y = this.boardY - 36;
    this.drawModal();
  }

  private drawScoreBoard(): void {
    const cardSize = 92;
    const gap = 10;
    const scoreX = this.boardX + this.boardSize - cardSize * 2 - gap;
    const y = this.boardY - 118;
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
  }

  private drawModal(): void {
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

  private renderBoard(): void {
    const gap = this.getNumber("gameplay.params.boardGap", 10);
    this.statusText.text = this.snapshot.statusText;
    let index = 0;

    for (let row = 0; row < this.snapshot.size; row += 1) {
      for (let col = 0; col < this.snapshot.size; col += 1) {
        const value = this.snapshot.board[row][col];
        const x = this.boardX + gap + col * (this.tileSize + gap);
        const y = this.boardY + gap + row * (this.tileSize + gap);
        const view = this.tiles[index];
        const pulse = this.tilePulse[index];
        const scale = value === 0 ? 1 : 1 + pulse * 0.32;
        const drawSize = this.tileSize * scale;
        const offset = (drawSize - this.tileSize) * 0.5;

        view.box.clear().roundRect(x - offset, y - offset, drawSize, drawSize, 10).fill(
          value === 0 ? this.getColor("theme.cell", 0xcdc1b4) : this.getTileColor(value),
        );
        view.box.alpha = value === 0 ? 0.42 : Math.min(1, 0.9 + pulse * 0.2);

        view.label.text = value === 0 ? "" : String(value);
        view.label.style.fill = value <= 4 ? this.getColor("theme.textDark", 0x776e65) : this.getColor("theme.textLight", 0xf9f6f2);
        view.label.style.fontSize = value >= 1024 ? 24 : value >= 128 ? 28 : 34;
        view.label.alpha = value === 0 ? 0 : view.box.alpha;
        view.label.x = x + this.tileSize * 0.5;
        view.label.y = y + this.tileSize * 0.5;
        index += 1;
      }
    }

    this.statusText.alpha = 1;
    this.scoreCard.alpha = 1;
    this.scoreText.alpha = 1;
    this.modalLayer.visible = this.snapshot.overlay.visible;
    this.modalLayer.alpha = this.snapshot.overlay.visible ? 1 : 0;
  }

  private advanceFeedback(deltaTime: number): void {
    const dt = Math.max(0.001, deltaTime);
    const decay = this.getNumber("gameplay.params.tilePulseDecay", 2.5);
    for (let i = 0; i < this.tilePulse.length; i += 1) {
      this.tilePulse[i] = Math.max(0, this.tilePulse[i] - dt * decay);
    }
    this.modalPulse += dt * 2.8;
    if (this.snapshot.overlay.visible) {
      const scale = 1 + Math.sin(this.modalPulse) * 0.015;
      this.modalAction.scale.set(scale, scale);
      this.modalBtnText.scale.set(scale, scale);
    } else {
      this.modalAction.scale.set(1, 1);
      this.modalBtnText.scale.set(1, 1);
    }
  }

  private applyThemeText(): void {
    const textDark = this.getColor("theme.textDark", 0x776e65);
    const textLight = this.getColor("theme.textLight", 0xf9f6f2);
    this.scoreLabel.style.fill = textDark;
    this.bestLabel.style.fill = textDark;
    this.scoreText.style.fill = textDark;
    this.bestText.style.fill = textDark;
    this.statusText.style.fill = textDark;
    this.tipText.style.fill = textDark;
    this.tipText.text = this.getText("ui.text.tip", "移动端支持滑动，按 R 重新开始");
    this.modalTitle.style.fill = textDark;
    this.modalDesc.style.fill = textDark;
    this.modalBtnText.style.fill = textLight;
  }

  private getTileColor(value: number): number {
    const color = getSetting(`theme.tiles.${value}`, undefined);
    return this.toColorHex(color, FALLBACK_TILE_COLORS[value] ?? this.getColor("theme.cell", 0xcdc1b4));
  }

  private getNumber(path: string, fallback: number): number {
    const value = getSetting(path, fallback);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return fallback;
  }

  private getText(path: string, fallback: string): string {
    const value = getSetting(path, fallback);
    return typeof value === "string" && value.length > 0 ? value : fallback;
  }

  private getColor(path: string, fallback: number): number {
    return this.toColorHex(getSetting(path, fallback), fallback);
  }

  private toColorHex(value: unknown, fallback: number): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") return fallback;
    const normalized = value.trim();
    const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return fallback;
    return Number.parseInt(hex, 16);
  }
}
