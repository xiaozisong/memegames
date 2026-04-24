export type LineAxis = "row" | "column";

export type ClearedLine = {
  axis: LineAxis;
  index: number;
};

export type LineClearInput<TCell> = {
  grid: readonly (readonly TCell[])[];
  axes?: readonly LineAxis[];
  isCellFilled: (cell: TCell, row: number, col: number) => boolean;
};

export type LineClearOutput = {
  clearedLines: ClearedLine[];
  clearedPositions: Array<{ row: number; col: number }>;
};

export function lineClearSystem<TCell>(input: LineClearInput<TCell>): LineClearOutput {
  const { grid, isCellFilled } = input;
  const axes = input.axes ?? ["row"];

  const rowCount = grid.length;
  const colCount = rowCount > 0 ? grid[0]!.length : 0;

  for (let row = 0; row < rowCount; row += 1) {
    if (grid[row]!.length !== colCount) {
      throw new Error("lineClearSystem expects a rectangular grid.");
    }
  }

  const fullRows = new Set<number>();
  const fullCols = new Set<number>();

  if (axes.includes("row")) {
    for (let row = 0; row < rowCount; row += 1) {
      let full = true;
      for (let col = 0; col < colCount; col += 1) {
        if (!isCellFilled(grid[row]![col]!, row, col)) {
          full = false;
          break;
        }
      }
      if (full) fullRows.add(row);
    }
  }

  if (axes.includes("column")) {
    for (let col = 0; col < colCount; col += 1) {
      let full = true;
      for (let row = 0; row < rowCount; row += 1) {
        if (!isCellFilled(grid[row]![col]!, row, col)) {
          full = false;
          break;
        }
      }
      if (full) fullCols.add(col);
    }
  }

  const clearedKeys = new Set<string>();
  for (const row of fullRows) {
    for (let col = 0; col < colCount; col += 1) {
      clearedKeys.add(`${row}:${col}`);
    }
  }
  for (const col of fullCols) {
    for (let row = 0; row < rowCount; row += 1) {
      clearedKeys.add(`${row}:${col}`);
    }
  }

  const clearedLines: ClearedLine[] = [
    ...Array.from(fullRows).map((index) => ({ axis: "row" as const, index })),
    ...Array.from(fullCols).map((index) => ({ axis: "column" as const, index }))
  ];

  const clearedPositions = Array.from(clearedKeys).map((key) => {
    const [row, col] = key.split(":").map(Number);
    return { row, col };
  });

  return { clearedLines, clearedPositions };
}
