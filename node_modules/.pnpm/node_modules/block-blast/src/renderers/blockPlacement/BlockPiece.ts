import { Piece } from "../../core/contracts";

type BlockPieceOptions = {
  onSelect: (index: number) => void;
  onDragStart: (index: number, event: PointerEvent) => void;
};

export class BlockPiece {
  readonly root: HTMLButtonElement;
  private readonly grid: HTMLDivElement;
  private readonly options: BlockPieceOptions;
  private index = -1;
  private piece: Piece | null = null;

  constructor(options: BlockPieceOptions) {
    this.options = options;
    this.root = document.createElement("button");
    this.root.type = "button";
    this.root.className = "bp-piece";

    this.grid = document.createElement("div");
    this.grid.className = "bp-piece-grid";
    this.root.appendChild(this.grid);

    this.root.addEventListener("click", () => {
      if (this.index >= 0 && this.piece) this.options.onSelect(this.index);
    });

    this.root.addEventListener("pointerdown", (event) => {
      if (this.index < 0 || !this.piece) return;
      this.root.setPointerCapture(event.pointerId);
      this.options.onDragStart(this.index, event);
    });
  }

  render(index: number, piece: Piece | null, selected: boolean): void {
    this.index = index;
    this.piece = piece;
    this.root.classList.toggle("is-selected", selected);
    this.root.classList.toggle("is-empty", !piece);
    this.grid.innerHTML = "";

    if (!piece) return;
    const maxRow = Math.max(...piece.cells.map((c) => c.row)) + 1;
    const maxCol = Math.max(...piece.cells.map((c) => c.col)) + 1;
    this.grid.style.setProperty("--rows", String(maxRow));
    this.grid.style.setProperty("--cols", String(maxCol));

    for (const cell of piece.cells) {
      const tile = document.createElement("div");
      tile.className = "bp-piece-cell";
      tile.style.gridRow = String(cell.row + 1);
      tile.style.gridColumn = String(cell.col + 1);
      tile.style.setProperty("--piece-color", piece.color);
      if (cell.gemId) tile.dataset.gem = cell.gemId;
      this.grid.appendChild(tile);
    }
  }
}
