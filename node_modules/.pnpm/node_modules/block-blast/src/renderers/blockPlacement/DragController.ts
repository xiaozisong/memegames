import { Piece } from "../../core/contracts";
import { BoardGrid } from "./BoardGrid";
import { CellRef, PlacementPreview } from "./types";

type DragLifecycle = {
  onPreview: (preview: PlacementPreview | null) => void;
  onDrop: (anchor: CellRef) => void;
  getPiece: () => Piece | null;
  buildPreview: (piece: Piece, anchor: CellRef) => PlacementPreview;
};

export class DragController {
  private dragging = false;
  private pointerId: number | null = null;
  private ghost: HTMLDivElement | null = null;

  constructor(
    private board: BoardGrid,
    private host: HTMLElement,
    private lifecycle: DragLifecycle,
  ) {}

  beginDrag(event: PointerEvent): void {
    if (this.dragging) return;
    const piece = this.lifecycle.getPiece();
    if (!piece) return;
    this.dragging = true;
    this.pointerId = event.pointerId;
    this.ghost = this.createGhost(piece);
    this.host.appendChild(this.ghost);
    this.moveGhost(event.clientX, event.clientY);
    window.addEventListener("pointermove", this.handleMove);
    window.addEventListener("pointerup", this.handleUp);
  }

  dispose(): void {
    window.removeEventListener("pointermove", this.handleMove);
    window.removeEventListener("pointerup", this.handleUp);
    this.cleanup();
  }

  private handleMove = (event: PointerEvent): void => {
    if (!this.dragging) return;
    this.moveGhost(event.clientX, event.clientY);
    const piece = this.lifecycle.getPiece();
    if (!piece) {
      this.lifecycle.onPreview(null);
      return;
    }
    const anchor = this.board.getCellAtClientPosition(event.clientX, event.clientY);
    if (!anchor) {
      this.lifecycle.onPreview(null);
      return;
    }
    this.lifecycle.onPreview(this.lifecycle.buildPreview(piece, anchor));
  };

  private handleUp = (event: PointerEvent): void => {
    if (!this.dragging) return;
    if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
    const anchor = this.board.getCellAtClientPosition(event.clientX, event.clientY);
    this.lifecycle.onPreview(null);
    if (anchor) this.lifecycle.onDrop(anchor);
    this.cleanup();
  };

  private cleanup(): void {
    this.dragging = false;
    this.pointerId = null;
    this.ghost?.remove();
    this.ghost = null;
    window.removeEventListener("pointermove", this.handleMove);
    window.removeEventListener("pointerup", this.handleUp);
  }

  private createGhost(piece: Piece): HTMLDivElement {
    const ghost = document.createElement("div");
    ghost.className = "bp-drag-ghost";
    const maxRow = Math.max(...piece.cells.map((cell) => cell.row)) + 1;
    const maxCol = Math.max(...piece.cells.map((cell) => cell.col)) + 1;
    ghost.style.setProperty("--rows", String(maxRow));
    ghost.style.setProperty("--cols", String(maxCol));
    ghost.style.setProperty("--piece-color", piece.color);
    for (const cell of piece.cells) {
      const block = document.createElement("div");
      block.className = "bp-drag-cell";
      block.style.gridRow = String(cell.row + 1);
      block.style.gridColumn = String(cell.col + 1);
      ghost.appendChild(block);
    }
    return ghost;
  }

  private moveGhost(x: number, y: number): void {
    if (!this.ghost) return;
    this.ghost.style.left = `${x}px`;
    this.ghost.style.top = `${y}px`;
  }
}
