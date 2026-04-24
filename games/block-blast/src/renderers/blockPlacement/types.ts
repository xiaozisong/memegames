import { EliminationSnapshot, Piece } from "../../core/contracts";

export type CellRef = {
  row: number;
  col: number;
};

export type PlacementPreview = {
  anchor: CellRef;
  valid: boolean;
  cells: CellRef[];
};

export type BoardRenderContext = {
  snapshot: EliminationSnapshot;
  preview: PlacementPreview | null;
};

export type TraySelection = {
  index: number;
  piece: Piece;
};
