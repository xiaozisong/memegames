export class EndscreenView {
  constructor({ onPlayAgain }) {
    this.element = document.createElement("div");
    this.element.className = "snake-endscreen";

    this.panel = document.createElement("section");
    this.panel.className = "snake-card snake-endscreen-panel";

    this.kicker = document.createElement("div");
    this.kicker.className = "snake-endscreen-kicker";

    this.boardList = document.createElement("div");
    this.boardList.className = "snake-endscreen-list";

    this.boardTitle = document.createElement("div");
    this.boardTitle.className = "snake-endscreen-board-title";

    this.boardRows = document.createElement("div");
    this.boardRows.className = "snake-endscreen-board-rows";

    this.bestBlock = document.createElement("div");
    this.bestBlock.className = "snake-endscreen-best";

    this.bestLabel = document.createElement("div");
    this.bestLabel.className = "snake-endscreen-best-label";

    this.bestValue = document.createElement("div");
    this.bestValue.className = "snake-endscreen-best-value";

    this.playAgainButton = document.createElement("button");
    this.playAgainButton.type = "button";
    this.playAgainButton.className = "snake-endscreen-button";
    this.playAgainButton.addEventListener("click", () => {
      onPlayAgain?.();
    });

    this.boardList.append(this.boardTitle, this.boardRows);
    this.bestBlock.append(this.bestLabel, this.bestValue);
    this.panel.append(this.kicker, this.boardList, this.bestBlock, this.playAgainButton);
    this.element.appendChild(this.panel);
  }

  render(summary, labels) {
    const isVisible = Boolean(summary);
    this.element.style.display = isVisible ? "flex" : "none";
    if (!summary) return;

    this.kicker.textContent = labels.timeout;
    this.boardTitle.textContent = labels.leaderboard;
    this.bestLabel.textContent = labels.best;
    this.bestValue.textContent = String(Math.round(labels.bestValue ?? 0));
    this.playAgainButton.textContent = labels.playAgain;
    this.renderLeaderboard(summary.leaderboard ?? []);
  }

  renderLeaderboard(entries) {
    this.boardRows.innerHTML = "";
    for (const entry of entries.slice(0, 5)) {
      const row = document.createElement("div");
      row.className = `snake-board-row${entry.isPlayer ? " is-player" : ""}`;

      const rank = document.createElement("div");
      rank.className = "snake-board-rank";
      rank.textContent = `${entry.rank}.`;

      const name = document.createElement("div");
      name.className = "snake-board-name";
      name.textContent = entry.isPlayer ? "YOU" : entry.name;

      const score = document.createElement("div");
      score.className = "snake-board-score";
      score.textContent = String(entry.length);

      row.append(rank, name, score);
      this.boardRows.appendChild(row);
    }
  }
}
