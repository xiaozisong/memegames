const SVG_NS = "http://www.w3.org/2000/svg";

export class SvgCellRenderer {
  constructor(cellLayer, board, theme) {
    this.cellLayer = cellLayer;
    this.board = board;
    this.theme = theme;
    this.cellMap = new Map();
  }

  render(boardState, gameState) {
    const nextKeys = new Set();
    for (const row of boardState.cells) {
      for (const cell of row) {
        const key = `${cell.x},${cell.y}`;
        nextKeys.add(key);
        let entry = this.cellMap.get(key);
        if (!entry) {
          entry = this.createCellElement(cell);
          this.cellLayer.appendChild(entry.group);
          this.cellMap.set(key, entry);
        }
        this.updateCell(entry, cell, gameState);
      }
    }

    for (const [key, entry] of this.cellMap.entries()) {
      if (nextKeys.has(key)) continue;
      entry.group.remove();
      this.cellMap.delete(key);
    }
  }

  createCellElement(cell) {
    const group = document.createElementNS(SVG_NS, "g");
    group.classList.add("cell");
    group.setAttribute("data-x", String(cell.x));
    group.setAttribute("data-y", String(cell.y));
    group.setAttribute("data-type", cell.type);

    const content = document.createElementNS(SVG_NS, "g");
    content.classList.add("cell-content");
    group.appendChild(content);

    return { group, background: null, content };
  }

  updateCell(entry, cell, gameState) {
    const stride = this.board.cellSize + this.board.gap;
    entry.group.setAttribute("transform", `translate(${cell.x * stride} ${cell.y * stride})`);
    entry.group.setAttribute("data-type", cell.type);
    entry.group.style.cursor = "default";
    entry.group.style.display = cell.type === "wall" || cell.type === "goal" ? "" : "none";

    entry.content.innerHTML = "";

    if (cell.type === "wall") {
      entry.content.appendChild(this.buildWall(cell));
    } else if (cell.type === "goal") {
      entry.content.appendChild(this.buildGoal(cell));
    }

    const isActive = Boolean(gameState.activeCell && gameState.activeCell.x === cell.x && gameState.activeCell.y === cell.y);
    entry.group.classList.toggle("is-active", isActive);
  }

  pulseCell(point) {
    const entry = this.cellMap.get(`${point.x},${point.y}`);
    if (!entry) return;
    entry.group.animate(
      [
        { transform: `${entry.group.getAttribute("transform")} scale(1)` },
        { transform: `${entry.group.getAttribute("transform")} scale(1.08)` },
        { transform: `${entry.group.getAttribute("transform")} scale(1)` },
      ],
      { duration: 160, easing: "ease-out" },
    );
  }

  buildWall() {
    const rect = document.createElementNS(SVG_NS, "rect");
    const inset = this.board.cellSize * 0.18;
    rect.setAttribute("x", String(inset));
    rect.setAttribute("y", String(inset));
    rect.setAttribute("width", String(this.board.cellSize - inset * 2));
    rect.setAttribute("height", String(this.board.cellSize - inset * 2));
    rect.setAttribute("rx", "14");
    rect.setAttribute("fill", this.theme.wallFill);
    return rect;
  }

  buildGoal() {
    const center = this.board.cellSize * 0.5;
    const group = document.createElementNS(SVG_NS, "g");
    const outer = document.createElementNS(SVG_NS, "circle");
    outer.setAttribute("cx", String(center));
    outer.setAttribute("cy", String(center));
    outer.setAttribute("r", String(this.board.cellSize * 0.22));
    outer.setAttribute("fill", "none");
    outer.setAttribute("stroke", this.theme.goalRing);
    outer.setAttribute("stroke-width", "6");
    outer.setAttribute("filter", "url(#soft-glow)");
    group.appendChild(outer);

    const inner = document.createElementNS(SVG_NS, "circle");
    inner.setAttribute("cx", String(center));
    inner.setAttribute("cy", String(center));
    inner.setAttribute("r", String(this.board.cellSize * 0.12));
    inner.setAttribute("fill", this.theme.goalFill);
    group.appendChild(inner);
    return group;
  }

}
