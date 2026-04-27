export class HudView {
  constructor() {
    this.element = document.createElement("div");
    this.element.className = "snake-hud";

    this.leftColumn = document.createElement("div");
    this.leftColumn.className = "snake-hud-column";

    this.rightColumn = document.createElement("div");
    this.rightColumn.className = "snake-hud-column is-right";

    this.scoreCard = document.createElement("section");
    this.scoreCard.className = "snake-card snake-score-card";

    this.scoreMetric = this.createMetric();
    this.scoreMetric.element.classList.add("is-inline");
    this.timeMetric = this.createMetric();
    this.timeMetric.element.classList.add("is-inline");
    this.scoreCard.append(this.scoreMetric.element, this.timeMetric.element);

    this.boardCard = document.createElement("section");
    this.boardCard.className = "snake-card snake-board-card";

    this.boardTitle = document.createElement("h3");
    this.boardTitle.className = "snake-board-title";

    this.boardList = document.createElement("div");
    this.boardList.className = "snake-board-list";

    this.boardCard.append(this.boardTitle, this.boardList);
    this.leftColumn.append(this.scoreCard);
    this.rightColumn.append(this.boardCard);
    this.element.append(this.leftColumn, this.rightColumn);
  }

  render(snapshot, labels) {
    this.scoreMetric.label.textContent = labels.score;
    this.scoreMetric.value.textContent = String(Math.round(snapshot.playerSnake?.currentLength ?? 0));
    this.timeMetric.label.textContent = labels.time;
    this.timeMetric.value.textContent = labels.timeValue ?? "";
    this.timeMetric.element.style.display = labels.timeValue ? "flex" : "none";

    this.boardTitle.textContent = labels.leaderboard;
    this.renderLeaderboard(snapshot.leaderboard ?? []);
  }

  renderLeaderboard(entries) {
    this.boardList.innerHTML = "";
    for (const entry of entries.slice(0, 6)) {
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
      this.boardList.appendChild(row);
    }
  }

  createMetric() {
    const element = document.createElement("div");
    element.className = "snake-score-metric";

    const label = document.createElement("div");
    label.className = "snake-score-label";

    const value = document.createElement("div");
    value.className = "snake-score-value";

    element.append(label, value);
    return { element, label, value };
  }
}
