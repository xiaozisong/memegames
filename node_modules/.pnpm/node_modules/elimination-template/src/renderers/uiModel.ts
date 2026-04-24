import { EliminationSnapshot } from "../core/contracts";

export type UiFeedbackMessagesConfig = {
  relax_hint?: string;
  select_piece_first?: string;
  invalid_placement?: string;
  piece_selected_to_place?: string;
};

export type FeedbackFlags = {
  placed: boolean;
  lineClearHappened: boolean;
  goalAdvanced: boolean;
  filledCount: number;
};

export function getFeedbackMessage(
  messages: UiFeedbackMessagesConfig,
  key: keyof UiFeedbackMessagesConfig,
  fallback: string,
): string {
  const value = messages[key];
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export function countFilledCells(snapshot: EliminationSnapshot): number {
  let total = 0;
  for (const row of snapshot.state.board) {
    for (const cell of row) {
      if (cell.filled) total += 1;
    }
  }
  return total;
}

export function detectFeedbackFlags(
  previousSnapshot: EliminationSnapshot | null,
  currentSnapshot: EliminationSnapshot,
  previousFilledCount: number,
): FeedbackFlags {
  const filledCount = countFilledCells(currentSnapshot);
  if (!previousSnapshot) {
    return {
      placed: false,
      lineClearHappened: false,
      goalAdvanced: false,
      filledCount,
    };
  }

  const placed = currentSnapshot.state.movesUsed > previousSnapshot.state.movesUsed;
  const previousSelected = previousSnapshot.state.selectedPieceIndex;
  const placedPieceCells =
    previousSelected !== null
      ? (previousSnapshot.state.bag[previousSelected]?.cells.length ?? 0)
      : 0;
  const expectedFilledAfterPlacement = previousFilledCount + placedPieceCells;
  const lineClearHappened = placed && filledCount < expectedFilledAfterPlacement;
  const goalAdvanced = currentSnapshot.state.score > previousSnapshot.state.score;

  return {
    placed,
    lineClearHappened,
    goalAdvanced,
    filledCount,
  };
}

export function buildStatusText(
  snapshot: EliminationSnapshot,
  template: string,
): string {
  const gemText = snapshot.gemTargets
    .map(
      (target) =>
        `${target.id}:${snapshot.state.gemProgress[target.id] ?? 0}/${target.required}`,
    )
    .join(" | ");
  const movesText =
    snapshot.moveLimit > 0
      ? `Moves ${snapshot.state.movesUsed}/${snapshot.moveLimit}`
      : `Moves ${snapshot.state.movesUsed} (relax)`;

  return template
    .replaceAll("{moves}", movesText)
    .replaceAll("{target}", String(snapshot.targetScore))
    .replaceAll("{gems}", gemText || "No gems")
    .replaceAll("{message}", snapshot.state.message);
}
