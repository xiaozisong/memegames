import { boardPixelSize } from "../utils/geometry.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export class SvgGridRenderer {
  constructor(board, theme) {
    this.board = board;
    this.theme = theme;
    this.root = document.createElement("div");
    this.root.className = "svg-board-frame";
    this.svg = document.createElementNS(SVG_NS, "svg");
    this.svg.classList.add("game-board");
    this.svg.setAttribute("role", "img");
    this.svg.setAttribute("aria-label", "Arrows Puzzle Escape board");
    this.svg.style.overflow = "visible";
    this.root.appendChild(this.svg);

    this.defs = document.createElementNS(SVG_NS, "defs");
    this.gridLayer = document.createElementNS(SVG_NS, "g");
    this.gridLayer.id = "grid-layer";
    this.cellLayer = document.createElementNS(SVG_NS, "g");
    this.cellLayer.id = "cell-layer";
    this.pathLayer = document.createElementNS(SVG_NS, "g");
    this.pathLayer.id = "path-layer";
    this.effectLayer = document.createElementNS(SVG_NS, "g");
    this.effectLayer.id = "effect-layer";
    this.svg.append(this.defs, this.gridLayer, this.cellLayer, this.pathLayer, this.effectLayer);

    this.buildDefs();
    this.renderBoard();
  }

  buildDefs() {
    this.defs.innerHTML = "";
    const shadowFilter = document.createElementNS(SVG_NS, "filter");
    shadowFilter.setAttribute("id", "soft-shadow");
    shadowFilter.setAttribute("x", "-30%");
    shadowFilter.setAttribute("y", "-30%");
    shadowFilter.setAttribute("width", "160%");
    shadowFilter.setAttribute("height", "160%");
    shadowFilter.innerHTML = `
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="${this.theme.primary}" flood-opacity="0.12" />
    `;

    const glowFilter = document.createElementNS(SVG_NS, "filter");
    glowFilter.setAttribute("id", "soft-glow");
    glowFilter.innerHTML = `
      <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    `;

    const boardGradient = document.createElementNS(SVG_NS, "linearGradient");
    boardGradient.setAttribute("id", "board-gradient");
    boardGradient.setAttribute("x1", "0%");
    boardGradient.setAttribute("y1", "0%");
    boardGradient.setAttribute("x2", "0%");
    boardGradient.setAttribute("y2", "100%");
    boardGradient.innerHTML = `
      <stop offset="0%" stop-color="${this.theme.boardFill}" stop-opacity="1"></stop>
      <stop offset="100%" stop-color="${this.theme.backgroundTop}" stop-opacity="1"></stop>
    `;

    this.defs.append(shadowFilter, glowFilter, boardGradient);
  }

  renderBoard() {
    const { width, height } = boardPixelSize(this.board);
    this.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    this.svg.setAttribute("width", String(width));
    this.svg.setAttribute("height", String(height));
    this.gridLayer.innerHTML = "";
  }
}
