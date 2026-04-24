import * as PIXI from "pixi.js";
import { BoardCell, EliminationSnapshot } from "../../core/contracts";
import { AnimationController } from "./AnimationController";
import { Block } from "./Block";

type MemeDef = {
  id: string;
  label: string;
  color: string;
};

type SwapIntent = {
  from: { row: number; col: number };
  to: { row: number; col: number };
};

type BoardLayout = {
  x: number;
  y: number;
  size: number;
  padding: number;
  gap: number;
  cell: number;
};

function toHex(color: string, fallback: number): number {
  if (!color.startsWith("#")) return fallback;
  const parsed = Number.parseInt(color.slice(1), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isAdjacent(a: { row: number; col: number }, b: { row: number; col: number }): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

export class GridBoard {
  private app: PIXI.Application;
  private animation: AnimationController;
  private memes: Map<string, MemeDef>;
  private onSwap: (intent: SwapIntent) => void;

  private layout: BoardLayout = { x: 0, y: 0, size: 0, padding: 12, gap: 6, cell: 40 };
  private rows = 8;
  private cols = 8;
  private pointerDownCell: { row: number; col: number } | null = null;
  private pointerCurrentCell: { row: number; col: number } | null = null;
  private pointerDown = false;

  private bg = new PIXI.Graphics();
  private boardContainer = new PIXI.Graphics();
  private cellsLayer = new PIXI.Container();
  private overlaysLayer = new PIXI.Graphics();
  private blockLayer = new PIXI.Container();

  private blocks = new Map<string, Block>();
  private positions = new Map<string, { row: number; col: number }>();

  constructor(
    app: PIXI.Application,
    memes: MemeDef[],
    animation: AnimationController,
    onSwap: (intent: SwapIntent) => void,
  ) {
    this.app = app;
    this.animation = animation;
    this.onSwap = onSwap;
    this.memes = new Map(memes.map((m) => [m.id, m]));

    this.app.stage.addChild(this.bg);
    this.app.stage.addChild(this.boardContainer);
    this.app.stage.addChild(this.cellsLayer);
    this.app.stage.addChild(this.overlaysLayer);
    this.app.stage.addChild(this.blockLayer);

    this.blockLayer.eventMode = "static";
    this.blockLayer.cursor = "pointer";
    this.blockLayer.on("pointerdown", (event: any) => {
      this.pointerDown = true;
      const cell = this.pointToCell(event.global.x, event.global.y);
      this.pointerDownCell = cell;
      this.pointerCurrentCell = cell;
      if (!cell) return;
      const id = this.snapshotCellId(cell.row, cell.col);
      const block = id ? this.blocks.get(id) : null;
      block?.setPressed(true);
      this.drawDragPreview();
    });
    this.blockLayer.on("pointermove", (event: any) => {
      if (!this.pointerDown || !this.pointerDownCell) return;
      this.pointerCurrentCell = this.pointToCell(event.global.x, event.global.y);
      this.drawDragPreview();
    });
    this.blockLayer.on("pointerup", () => this.finishPointerGesture());
    this.blockLayer.on("pointerupoutside", () => this.finishPointerGesture());
  }

  private lastSnapshot: EliminationSnapshot | null = null;

  private finishPointerGesture(): void {
    if (!this.pointerDownCell || !this.pointerCurrentCell) {
      this.clearGestureState();
      return;
    }
    const from = this.pointerDownCell;
    const to = this.pointerCurrentCell;
    const fromId = this.snapshotCellId(from.row, from.col);
    const fromBlock = fromId ? this.blocks.get(fromId) : null;
    fromBlock?.setPressed(false);

    if (isAdjacent(from, to)) {
      this.onSwap({ from, to });
    }
    this.clearGestureState();
  }

  private clearGestureState(): void {
    this.pointerDown = false;
    this.pointerDownCell = null;
    this.pointerCurrentCell = null;
    this.overlaysLayer.clear();
  }

  private snapshotCellId(row: number, col: number): string | null {
    if (!this.lastSnapshot) return null;
    return this.lastSnapshot.state.board[row]?.[col]?.gemId ?? null;
  }

  resize(width: number, height: number, rows: number, cols: number): void {
    this.rows = rows;
    this.cols = cols;
    const topSpace = 170;
    const bottomSpace = 170;
    const size = Math.max(220, Math.min(width - 40, height - topSpace - bottomSpace));
    const x = (width - size) * 0.5;
    const y = topSpace;
    const compact = width < 480 || height < 760;
    const padding = compact ? 8 : 12;
    const gap = compact ? 4 : 6;
    const cell = (size - padding * 2 - gap * (cols - 1)) / cols;
    this.layout = { x, y, size, padding, gap, cell };
  }

  renderBoardFrame(snapshot: EliminationSnapshot): void {
    const { x, y, size, padding, gap, cell } = this.layout;
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;
    this.bg
      .clear()
      .rect(0, 0, w, h)
      .fill({ color: toHex(snapshot.colors.bgTop, 0x060a16) })
      .rect(0, h * 0.55, w, h * 0.45)
      .fill({ color: toHex(snapshot.colors.bgBottom, 0x0b1024), alpha: 0.8 });

    // Neon perspective grid background
    this.bg.stroke({ color: 0x2c3f86, alpha: 0.22, width: 1 });
    for (let i = 0; i <= 12; i += 1) {
      const t = i / 12;
      const gy = h * 0.22 + t * h * 0.78;
      const inset = t * w * 0.22;
      this.bg.moveTo(inset, gy);
      this.bg.lineTo(w - inset, gy);
    }
    for (let i = 0; i <= 10; i += 1) {
      const t = i / 10;
      const gx = t * w;
      this.bg.moveTo(gx, h * 0.28);
      this.bg.lineTo(w * 0.5 + (gx - w * 0.5) * 0.62, h);
    }

    this.boardContainer
      .clear()
      .roundRect(x, y, size, size, 22)
      .fill({ color: toHex(snapshot.colors.boardBg, 0x111a33), alpha: 0.96 })
      .stroke({ color: 0x00f6ff, alpha: 0.34, width: 1.6 });

    this.cellsLayer.removeChildren();
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const cx = x + padding + col * (cell + gap);
        const cy = y + padding + row * (cell + gap);
        const tile = new PIXI.Graphics();
        tile
          .roundRect(cx, cy, cell, cell, 10)
          .fill({ color: 0x162447, alpha: 0.88 })
          .stroke({ color: 0x2e4c87, alpha: 0.55, width: 1 });
        this.cellsLayer.addChild(tile);
      }
    }
  }

  async renderSnapshot(next: EliminationSnapshot): Promise<void> {
    const prev = this.lastSnapshot;
    this.lastSnapshot = next;

    const nextPos = new Map<string, { row: number; col: number; cell: BoardCell }>();
    for (let row = 0; row < next.rows; row += 1) {
      for (let col = 0; col < next.cols; col += 1) {
        const cell = next.state.board[row][col];
        if (!cell.gemId || !cell.filled) continue;
        nextPos.set(cell.gemId, { row, col, cell });
      }
    }

    const removed: string[] = [];
    for (const id of this.blocks.keys()) {
      if (!nextPos.has(id)) removed.push(id);
    }
    await Promise.all(
      removed.map(async (id) => {
        const block = this.blocks.get(id);
        if (!block) return;
        const sx = block.scale.x;
        const sa = block.alpha;
        await this.animation.clear(300, (p) => {
          block.scale.set(sx * (1 - p * 0.6));
          block.alpha = sa * (1 - p);
        });
        block.destroy();
        this.blocks.delete(id);
        this.positions.delete(id);
      }),
    );

    const dropPromises: Array<Promise<void>> = [];
    for (const [id, info] of nextPos.entries()) {
      const target = this.cellToWorld(info.row, info.col);
      const old = this.positions.get(id);
      let block = this.blocks.get(id);
      if (!block) {
        const meme = this.memes.get(info.cell.color) ?? {
          id: info.cell.color,
          label: "MM",
          color: "#3BC7FF",
        };
        block = new Block(
          {
            id,
            memeId: meme.id,
            label: meme.label,
            color: toHex(meme.color, 0x3bc7ff),
            row: info.row,
            col: info.col,
          },
          this.layout.cell,
        );
        block.position.set(target.x, this.layout.y - this.layout.cell * 0.9);
        this.blockLayer.addChild(block);
        this.blocks.set(id, block);
      }

      const fromX = block.position.x;
      const fromY = block.position.y;
      const deltaY = Math.abs(target.y - fromY);
      const isDrop = !old || target.y > fromY + 1;
      const duration = isDrop ? Math.min(420, 180 + deltaY * 0.65) : 200;
      const runner = isDrop ? this.animation.drop.bind(this.animation) : this.animation.swap.bind(this.animation);
      dropPromises.push(
        runner(duration, (p) => {
          block!.position.set(
            fromX + (target.x - fromX) * p,
            fromY + (target.y - fromY) * p,
          );
        }),
      );
      this.positions.set(id, { row: info.row, col: info.col });
    }

    await Promise.all(dropPromises);
  }

  showCombo(label: string): { x: number; y: number } {
    const { x, y, size } = this.layout;
    return { x: x + size * 0.5, y: y - 16 };
  }

  private pointToCell(x: number, y: number): { row: number; col: number } | null {
    const { x: bx, y: by, size, padding, cell, gap } = this.layout;
    if (x < bx + padding || y < by + padding || x > bx + size - padding || y > by + size - padding) {
      return null;
    }
    const col = Math.floor((x - bx - padding) / (cell + gap));
    const row = Math.floor((y - by - padding) / (cell + gap));
    if (row < 0 || col < 0 || row >= this.rows || col >= this.cols) return null;
    return { row, col };
  }

  private drawDragPreview(): void {
    this.overlaysLayer.clear();
    if (!this.pointerDownCell || !this.pointerCurrentCell) return;
    if (!isAdjacent(this.pointerDownCell, this.pointerCurrentCell)) return;
    const { row, col } = this.pointerCurrentCell;
    const { x, y } = this.cellToWorld(row, col);
    this.overlaysLayer
      .circle(x, y, Math.max(6, this.layout.cell * 0.18))
      .fill({ color: 0x52ffb8, alpha: 0.28 })
      .circle(x, y, Math.max(6, this.layout.cell * 0.18))
      .stroke({ color: 0x52ffb8, alpha: 0.85, width: 2 });
  }

  private cellToWorld(row: number, col: number): { x: number; y: number } {
    const { x, y, padding, gap, cell } = this.layout;
    return {
      x: x + padding + col * (cell + gap) + cell * 0.5,
      y: y + padding + row * (cell + gap) + cell * 0.5,
    };
  }
}
