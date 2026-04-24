import { EliminationSnapshot, GameKernel, Piece } from "../../core/contracts";
import { AnimationController } from "./AnimationController";
import { BoardGrid } from "./BoardGrid";
import { DragController } from "./DragController";
import { HUD } from "./HUD";
import { Tray } from "./Tray";
import { PlacementPreview } from "./types";

const BEST_KEY = "games:block-blast:best";

export async function mountBlockPlacementRenderer(
  root: HTMLElement,
  kernel: GameKernel,
): Promise<void> {
  root.innerHTML = "";
  root.classList.add("bp-root");

  const shell = document.createElement("div");
  shell.className = "bp-shell";
  root.appendChild(shell);

  const bg = document.createElement("div");
  bg.className = "bp-bg";
  shell.appendChild(bg);

  const hud = new HUD({
    onOverlayAction: () => kernel.dispatch({ type: "start_or_restart" }),
  });
  shell.appendChild(hud.root);
  shell.appendChild(hud.getOverlayElement());

  const board = new BoardGrid();
  shell.appendChild(board.root);

  let activeSnapshot = kernel.getSnapshot();
  let currentPreview: PlacementPreview | null = null;
  let dragPieceIndex: number | null = null;
  let previousSnapshot: EliminationSnapshot | null = null;

  const tray = new Tray({
    onSelect: (index) => kernel.dispatch({ type: "select_piece", index }),
    onDragStart: (index, event) => {
      dragPieceIndex = index;
      kernel.dispatch({ type: "select_piece", index });
      dragController.beginDrag(event);
    },
  });
  shell.appendChild(tray.root);

  const combo = document.createElement("div");
  combo.className = "bp-combo-text";
  combo.textContent = "COMBO";
  shell.appendChild(combo);

  const animation = new AnimationController(shell);
  const dragController = new DragController(board, shell, {
    onPreview: (preview) => {
      currentPreview = preview;
      render(activeSnapshot, false);
    },
    onDrop: (anchor) => {
      kernel.dispatch({ type: "place_at", row: anchor.row, col: anchor.col });
      currentPreview = null;
      dragPieceIndex = null;
    },
    getPiece: () => {
      if (dragPieceIndex === null) return null;
      return activeSnapshot.state.bag[dragPieceIndex] ?? null;
    },
    buildPreview: (piece: Piece, anchor) => board.previewFor(piece, anchor, activeSnapshot),
  });

  const render = (snapshot: EliminationSnapshot, withFx = true): void => {
    board.render({ snapshot, preview: currentPreview });
    tray.render(snapshot);
    persistBest(snapshot.state.score);
    const best = Number.parseInt(localStorage.getItem(BEST_KEY) ?? "0", 10) || 0;
    hud.render(snapshot, best);

    if (!withFx || !previousSnapshot) {
      previousSnapshot = snapshot;
      return;
    }

    const cleared = collectClearedCells(previousSnapshot, snapshot);
    if (cleared.length > 0) {
      const elements = cleared
        .map((item) => board.getCellElement(item.row, item.col))
        .filter((item): item is HTMLElement => !!item);
      animation.playClear(elements);
    }

    const placed = collectPlacedCells(previousSnapshot, snapshot);
    if (placed.length > 0) {
      for (const item of placed) {
        const cell = board.getCellElement(item.row, item.col);
        if (cell) animation.playSnap(cell);
      }
    }

    const lineDelta = countFilled(previousSnapshot) - countFilled(snapshot);
    if (lineDelta > 0 && snapshot.state.message.startsWith("COMBO")) {
      combo.textContent = snapshot.state.message;
      animation.playCombo();
      animation.playShake();
    }

    const gemFlights = collectGemFlights(previousSnapshot, snapshot, board, hud);
    if (gemFlights.length > 0) animation.playGemFlights(gemFlights);

    previousSnapshot = snapshot;
  };

  const unsubscribe = kernel.subscribe((snapshot) => {
    activeSnapshot = snapshot;
    render(snapshot);
  });

  const teardown = (): void => {
    unsubscribe();
    dragController.dispose();
    root.classList.remove("bp-root");
    shell.remove();
  };
  window.addEventListener("beforeunload", teardown, { once: true });
}

function persistBest(score: number): void {
  const current = Number.parseInt(localStorage.getItem(BEST_KEY) ?? "0", 10) || 0;
  if (score > current) localStorage.setItem(BEST_KEY, String(score));
}

function countFilled(snapshot: EliminationSnapshot): number {
  return snapshot.state.board.reduce(
    (sum, row) => sum + row.reduce((s, c) => s + (c.filled ? 1 : 0), 0),
    0,
  );
}

function collectPlacedCells(previous: EliminationSnapshot, current: EliminationSnapshot) {
  const out: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < current.rows; row += 1) {
    for (let col = 0; col < current.cols; col += 1) {
      if (!previous.state.board[row][col].filled && current.state.board[row][col].filled) {
        out.push({ row, col });
      }
    }
  }
  return out;
}

function collectClearedCells(previous: EliminationSnapshot, current: EliminationSnapshot) {
  const out: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < current.rows; row += 1) {
    for (let col = 0; col < current.cols; col += 1) {
      if (previous.state.board[row][col].filled && !current.state.board[row][col].filled) {
        out.push({ row, col });
      }
    }
  }
  return out;
}

function collectGemFlights(
  previous: EliminationSnapshot,
  current: EliminationSnapshot,
  board: BoardGrid,
  hud: HUD,
): Array<{ from: DOMRect; to: DOMRect; color: string }> {
  const list: Array<{ from: DOMRect; to: DOMRect; color: string }> = [];
  for (const target of current.gemTargets) {
    const prev = previous.state.gemProgress[target.id] ?? 0;
    const next = current.state.gemProgress[target.id] ?? 0;
    const gain = Math.max(0, next - prev);
    if (gain === 0) continue;
    const to = hud.getGemBadge(target.id)?.getBoundingClientRect();
    if (!to) continue;

    const sourceCells: HTMLElement[] = [];
    for (let row = 0; row < current.rows; row += 1) {
      for (let col = 0; col < current.cols; col += 1) {
        const before = previous.state.board[row][col];
        const after = current.state.board[row][col];
        if (before.gemId === target.id && before.filled && !after.filled) {
          const el = board.getCellElement(row, col);
          if (el) sourceCells.push(el);
        }
      }
    }
    for (const source of sourceCells.slice(0, gain)) {
      list.push({ from: source.getBoundingClientRect(), to, color: colorByGem(target.id) });
    }
  }
  return list;
}

function colorByGem(type: string): string {
  if (type === "red") return "#ff5f6d";
  if (type === "blue") return "#3ab9ff";
  if (type === "green") return "#55ff9d";
  if (type === "yellow") return "#ffe867";
  return "#a57cff";
}
