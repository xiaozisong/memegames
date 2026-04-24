import * as PIXI from "pixi.js";
import { createTileSprite } from "./TileSprite.js";

export class BoardView {
  constructor(container, tileDefsById, textures, toColorNumber) {
    this.container = new PIXI.Container();
    container.addChild(this.container);

    this.tileDefsById = tileDefsById;
    this.textures = textures;
    this.toColorNumber = toColorNumber;

    this.frameLayer = new PIXI.Container();
    this.tileLayer = new PIXI.Container();
    this.fxLayer = new PIXI.Container();
    this.selectionLayer = new PIXI.Container();
    this.container.addChild(this.frameLayer, this.tileLayer, this.fxLayer, this.selectionLayer);

    this.layout = null;
    this.board = [];
    this.tileSprites = new Map();
    this.selected = null;
  }

  renderFrame(snapshot, layout) {
    this.layout = layout;
    clearContainer(this.frameLayer);
    clearContainer(this.selectionLayer);

    const panel = new PIXI.Graphics();
    panel.roundRect(layout.boardX, layout.boardY, layout.boardSize, layout.boardSize, layout.boardRadius).fill({
      color: this.toColorNumber(snapshot.colors.boardBg, 0x1b1834),
      alpha: clamp(snapshot.colors.boardAlpha ?? 0.9, 0, 1),
    });
    panel.roundRect(layout.boardX, layout.boardY, layout.boardSize, layout.boardSize, layout.boardRadius).stroke({
      color: this.toColorNumber(snapshot.colors.primary, 0x7f6dff),
      alpha: 0.26,
      width: 2,
    });
    this.frameLayer.addChild(panel);

    const grid = new PIXI.Graphics();
    const glowColor = this.toColorNumber(snapshot.colors.gridLine, 0x5e4db8);
    for (let row = 0; row < snapshot.rows; row += 1) {
      for (let col = 0; col < snapshot.cols; col += 1) {
        const { x, y } = this.getCellTopLeft(row, col);
        grid.roundRect(x + 1, y + 1, layout.cellSize - 2, layout.cellSize - 2, layout.cellRadius).stroke({
          color: glowColor,
          alpha: 0.36,
          width: 1,
        });
      }
    }
    this.frameLayer.addChild(grid);
  }

  syncBoard(board) {
    if (!this.layout) return;
    this.board = board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
    const nextIds = new Set();

    for (let row = 0; row < board.length; row += 1) {
      for (let col = 0; col < board[row].length; col += 1) {
        const tile = board[row][col];
        if (!tile) continue;
        nextIds.add(tile.id);
        let sprite = this.tileSprites.get(tile.id);
        if (!sprite) {
          sprite = this.createSprite(tile);
          this.tileLayer.addChild(sprite);
          this.tileSprites.set(tile.id, sprite);
        }
        this.positionSprite(sprite, row, col);
        sprite.alpha = 1;
        sprite.scale.set(1);
      }
    }

    for (const [id, sprite] of Array.from(this.tileSprites.entries())) {
      if (nextIds.has(id)) continue;
      sprite.destroy({ children: true });
      this.tileSprites.delete(id);
    }

    this.renderSelection();
  }

  createSprite(tile) {
    const def = this.tileDefsById[tile.kind];
    const texture = this.textures[def?.asset] ?? PIXI.Texture.WHITE;
    const glowColor = this.toColorNumber(def?.glow || "oklch(0.75 0.18 260)", 0x8f6fff);
    return createTileSprite(tile, def, texture, this.layout.cellSize, glowColor, this.toColorNumber);
  }

  setSelected(cell) {
    this.selected = cell ? { ...cell } : null;
    this.renderSelection();
  }

  renderSelection() {
    clearContainer(this.selectionLayer);
    if (!this.selected || !this.layout) return;
    const tile = this.board[this.selected.row]?.[this.selected.col];
    if (!tile) return;
    const { x, y } = this.getCellTopLeft(this.selected.row, this.selected.col);
    const ring = new PIXI.Graphics();
    ring.roundRect(x + 4, y + 4, this.layout.cellSize - 8, this.layout.cellSize - 8, this.layout.cellRadius).stroke({
      color: this.toColorNumber("oklch(0.96 0.05 260)", 0xffffff),
      alpha: 0.9,
      width: 2.5,
    });
    this.selectionLayer.addChild(ring);
  }

  getTileSprite(id) {
    return this.tileSprites.get(id) ?? null;
  }

  removeTile(id) {
    const sprite = this.tileSprites.get(id);
    if (!sprite) return;
    sprite.destroy({ children: true });
    this.tileSprites.delete(id);
  }

  addSpawnedTile(tile, row, col, fromRow) {
    const sprite = this.createSprite(tile);
    this.tileLayer.addChild(sprite);
    this.tileSprites.set(tile.id, sprite);
    const fromCenter = this.getCellCenter(fromRow, col);
    sprite.position.set(fromCenter.x, fromCenter.y);
    return sprite;
  }

  positionSprite(sprite, row, col) {
    const center = this.getCellCenter(row, col);
    sprite.position.set(center.x, center.y);
  }

  getCellTopLeft(row, col) {
    return {
      x: this.layout.boardX + col * this.layout.cellSize,
      y: this.layout.boardY + row * this.layout.cellSize,
    };
  }

  getCellCenter(row, col) {
    return {
      x: this.layout.boardX + col * this.layout.cellSize + this.layout.cellSize * 0.5,
      y: this.layout.boardY + row * this.layout.cellSize + this.layout.cellSize * 0.5,
    };
  }

  cellFromPoint(global) {
    if (!this.layout) return null;
    const localX = global.x - this.layout.boardX;
    const localY = global.y - this.layout.boardY;
    if (localX < 0 || localY < 0 || localX > this.layout.boardSize || localY > this.layout.boardSize) return null;
    const row = Math.floor(localY / this.layout.cellSize);
    const col = Math.floor(localX / this.layout.cellSize);
    return { row, col };
  }

  replaceBoard(board) {
    this.syncBoard(board);
  }
}

function clearContainer(container) {
  const removed = container.removeChildren();
  for (const child of removed) child.destroy({ children: true });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}
