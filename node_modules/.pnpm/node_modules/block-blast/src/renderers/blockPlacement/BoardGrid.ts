import { EliminationSnapshot, Piece } from "../../core/contracts";
import { BoardRenderContext, CellRef, PlacementPreview } from "./types";

export class BoardGrid {
  readonly root: HTMLDivElement;
  private readonly cells: HTMLDivElement[] = [];
  private rows = 0;
  private cols = 0;

  constructor() {
    this.root = document.createElement("div");
    this.root.className = "bp-board";
  }

  render(context: BoardRenderContext): void {
    const { snapshot, preview } = context;
    if (snapshot.rows !== this.rows || snapshot.cols !== this.cols || this.cells.length === 0) {
      this.rows = snapshot.rows;
      this.cols = snapshot.cols;
      this.root.style.setProperty("--rows", String(snapshot.rows));
      this.root.style.setProperty("--cols", String(snapshot.cols));
      this.cells.length = 0;
      this.root.innerHTML = "";
      for (let i = 0; i < snapshot.rows * snapshot.cols; i += 1) {
        const cell = document.createElement("div");
        cell.className = "bp-cell";
        this.cells.push(cell);
        this.root.appendChild(cell);
      }
    }

    for (let row = 0; row < snapshot.rows; row += 1) {
      for (let col = 0; col < snapshot.cols; col += 1) {
        const index = row * snapshot.cols + col;
        const cell = snapshot.state.board[row][col];
        const element = this.cells[index];
        element.dataset.row = String(row);
        element.dataset.col = String(col);
        element.classList.toggle("is-filled", cell.filled);
        element.style.setProperty("--cell-color", cell.color);
        element.innerHTML = cell.gemId
          ? `<span class="bp-cell-gem" data-gem="${cell.gemId}"></span>`
          : "";
      }
    }
    this.drawPreview(preview);
  }

  previewFor(piece: Piece, anchor: CellRef, snapshot: EliminationSnapshot): PlacementPreview {
    const cells: CellRef[] = [];
    let valid = true;
    for (const cell of piece.cells) {
      const row = anchor.row + cell.row;
      const col = anchor.col + cell.col;
      cells.push({ row, col });
      if (row < 0 || col < 0 || row >= snapshot.rows || col >= snapshot.cols) valid = false;
      else if (snapshot.state.board[row][col].filled) valid = false;
    }
    return { anchor, valid, cells };
  }

  getCellAtClientPosition(x: number, y: number): CellRef | null {
    const rect = this.root.getBoundingClientRect();
    if (x < rect.left || y < rect.top || x > rect.right || y > rect.bottom) return null;
    const col = Math.floor(((x - rect.left) / rect.width) * this.cols);
    const row = Math.floor(((y - rect.top) / rect.height) * this.rows);
    if (row < 0 || col < 0 || row >= this.rows || col >= this.cols) return null;
    return { row, col };
  }

  getCellElement(row: number, col: number): HTMLElement | null {
    if (row < 0 || col < 0 || row >= this.rows || col >= this.cols) return null;
    return this.cells[row * this.cols + col] ?? null;
  }

  private drawPreview(preview: PlacementPreview | null): void {
    for (const cell of this.cells) {
      cell.classList.remove("is-preview-valid", "is-preview-invalid");
    }
    if (!preview) return;
    const className = preview.valid ? "is-preview-valid" : "is-preview-invalid";
    for (const cell of preview.cells) {
      const element = this.getCellElement(cell.row, cell.col);
      if (element) element.classList.add(className);
    }
  }
}
