import { EliminationSnapshot, Piece } from "../../core/contracts";
import { BlockPiece } from "./BlockPiece";

type TrayOptions = {
  onSelect: (index: number) => void;
  onDragStart: (index: number, event: PointerEvent) => void;
};

export class Tray {
  readonly root: HTMLDivElement;
  private readonly pieces: BlockPiece[] = [];

  constructor(options: TrayOptions) {
    this.root = document.createElement("div");
    this.root.className = "bp-tray";
    for (let i = 0; i < 3; i += 1) {
      const view = new BlockPiece({
        onSelect: options.onSelect,
        onDragStart: options.onDragStart,
      });
      this.pieces.push(view);
      this.root.appendChild(view.root);
    }
  }

  render(snapshot: EliminationSnapshot): void {
    this.pieces.forEach((view, index) => {
      const piece: Piece | null = snapshot.state.bag[index] ?? null;
      const selected = snapshot.state.selectedPieceIndex === index;
      view.render(index, piece, selected);
    });
  }
}
