import { animate } from "../utils/animation.js";
import { cellCenter, buildSmoothPath } from "../utils/geometry.js";
import { createWormSvg, ensureWormDefs } from "./worms/createWormSvg.js";

export class SvgPathRenderer {
  constructor(svgRoot, pathLayer, effectLayer, board, theme, onRunComplete = null) {
    this.svgRoot = svgRoot;
    this.pathLayer = pathLayer;
    this.effectLayer = effectLayer;
    this.board = board;
    this.theme = theme;
    this.onRunComplete = onRunComplete;

    this.clear();
  }

  clear(options = {}) {
    const { preserveEffects = false } = options;
    this.pathLayer.innerHTML = "";
    if (!preserveEffects) {
      this.effectLayer.querySelectorAll(".effect-particle").forEach((node) => node.remove());
    }
  }

  sync(worms, gameState) {
    this.renderWorms(worms, {
      activeWormId: gameState.effects?.run?.wormId || null,
      blockedWormIds: new Set(gameState.blockedWormIds || []),
    });
  }

  async playRun(run, worms, cellRenderer, shakeTarget) {
    const visualPath = Array.isArray(run?.displayPath) ? run.displayPath : [];
    if (!visualPath?.length) return;
    const activeEntry = this.renderWorms(worms, {
      activeWormId: run.wormId || null,
      blockedWormIds: new Set(),
    });
    if (!visualPath?.length) return;
    const activeParts = activeEntry?.parts;
    const guidePath = activeParts?.base;
    const totalLength = guidePath?.getTotalLength?.() ?? 0;

    if (run.path?.[0]) {
      cellRenderer.pulseCell(run.path[0]);
    }
    if (guidePath && totalLength > 0) {
      this.setRemovalProgress(activeParts, guidePath, totalLength, 0);
    }
    for (let index = 1; index < visualPath.length; index += 1) {
      const targetPoint = visualPath[index];
      if (run.segments[index - 1]?.result === "arrow") {
        cellRenderer.pulseCell(targetPoint);
      }

      await animate({
        duration: Math.max(
          50,
          Math.round((run.durationMs || this.board.stepDurationMs || 210) / Math.max(1, visualPath.length - 1)),
        ),
        onUpdate: (progress) => {
          if (guidePath && totalLength > 0) {
            const segmentProgress = (index - 1 + progress) / Math.max(1, visualPath.length - 1);
            this.setRemovalProgress(activeParts, guidePath, totalLength, segmentProgress);
          }
        },
      });
    }

    this.spawnBurst(run.activeCell);
    this.onRunComplete?.(run);
  }

  spawnBurst(point) {
    if (!point) return;
    const center = cellCenter(point.x, point.y, this.board);
    for (let index = 0; index < 16; index += 1) {
      const angle = (Math.PI * 2 * index) / 16;
      const distance = 24 + Math.random() * 16;
      const particle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      particle.classList.add("effect-particle");
      particle.setAttribute("cx", String(center.x));
      particle.setAttribute("cy", String(center.y));
      particle.setAttribute("r", String(2 + Math.random() * 3));
      particle.setAttribute("fill", this.theme.success);
      particle.setAttribute("filter", "url(#soft-glow)");
      this.effectLayer.appendChild(particle);
      const toX = center.x + Math.cos(angle) * distance;
      const toY = center.y + Math.sin(angle) * distance;
      particle.animate(
        [
          { transform: "translate(0px, 0px)", opacity: 1 },
          { transform: `translate(${toX - center.x}px, ${toY - center.y}px)`, opacity: 0 },
        ],
        { duration: 520, easing: "ease-out", fill: "forwards" },
      );
      setTimeout(() => particle.remove(), 560);
    }
  }

  shake(target) {
    if (!target?.animate) return;
    target.animate(
      [
        { transform: "translateX(0px)" },
        { transform: "translateX(-8px)" },
        { transform: "translateX(7px)" },
        { transform: "translateX(-4px)" },
        { transform: "translateX(0px)" },
      ],
      { duration: 280, easing: "ease-out" },
    );
  }

  renderWorms(worms = [], options = {}) {
    const { activeWormId = null, blockedWormIds = new Set() } = options;
    this.pathLayer.innerHTML = "";

    const orderedWorms = [...worms]
      .filter((worm) => !worm.removed)
      .sort((left, right) => (left.zIndex || 0) - (right.zIndex || 0));
    let activeEntry = null;
    for (const worm of orderedWorms) {
      const entry = this.createWormEntry(worm, {
        active: worm.id === activeWormId,
        blocked: blockedWormIds.has(worm.id),
      });
      this.pathLayer.appendChild(entry.group);
      if (worm.id === activeWormId) {
        activeEntry = entry;
      }
    }
    return activeEntry;
  }

  createWormEntry(worm, { active = false, blocked = false } = {}) {
    const gradientId = `worm-gradient-${worm.id}`;
    const wormColor = worm.color || this.theme.primary || "#52e3ff";
    const palette = createBrightWormPalette(wormColor);
    ensureWormDefs(this.svgRoot, {
      gradientId,
      baseColor: palette.base,
      highlightColor: palette.highlight,
      shadowColor: palette.shadow,
    });

    const points = Array.isArray(worm.displayPath) ? worm.displayPath : [];
    const d = buildSmoothPath(points, this.board, Math.max(12, this.board.cellSize * 0.4));
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", `worm-instance${active ? " is-active" : ""}${blocked ? " is-blocked" : ""}`);
    group.setAttribute("data-worm-id", worm.id);
    group.setAttribute("data-start-x", String(worm.start?.x ?? worm.path[0]?.x ?? -1));
    group.setAttribute("data-start-y", String(worm.start?.y ?? worm.path[0]?.y ?? -1));
    group.setAttribute("data-z-index", String(worm.zIndex || 0));

    const wormNode = createWormSvg({
      d,
      gradientId,
      baseColor: palette.base,
      highlightColor: palette.highlight,
      shadowColor: palette.shadow,
      outlineColor: "rgba(0, 0, 0, 0.14)",
      baseWidth: Math.max(24, Math.min(38, this.board.cellSize * 0.5)),
      outlineWidth: 0,
      shadowOffset: { x: 4, y: 6 },
      highlightOffset: { x: -4.6, y: -4.6 },
      className: "worm",
      pointerEvents: "none",
      showBody: true,
      showHitArea: false,
      showHead: true,
      showHeadHitArea: true,
      headPointerEvents: "all",
      headAnchor: "end",
      showInnerShading: false,
      showHighlight: false,
      showOutline: false,
    });
    group.appendChild(wormNode);
    return {
      group,
      parts: wormNode._wormParts,
      worm,
    };
  }

  setRemovalProgress(parts, guidePath, totalLength, progress) {
    const clamped = Math.max(0, Math.min(1, progress));
    const visibleLength = Math.max(0.001, totalLength * (1 - clamped));
    for (const path of [parts?.shadow, parts?.base, parts?.highlight, parts?.outline]) {
      if (!path) continue;
      path.setAttribute("stroke-dasharray", `${visibleLength} ${totalLength}`);
      path.setAttribute("stroke-dashoffset", "0");
    }
    if (parts?.head) {
      const headLength = Math.max(0, visibleLength);
      const point = guidePath.getPointAtLength(headLength);
      const behind = guidePath.getPointAtLength(Math.max(0, headLength - 1));
      const angle = Math.atan2(point.y - behind.y, point.x - behind.x) * 180 / Math.PI;
      parts.head.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle})`);
      parts.head.setAttribute("opacity", String(1 - clamped * 0.9));
    }
  }

  playBlockedFeedback(wormId, shakeTarget) {
    const wormGroup = wormId ? this.pathLayer.querySelector(`[data-worm-id="${wormId}"]`) : null;
    const head = wormGroup?.querySelector?.(".worm-head");
    const baseTransform = head?.getAttribute?.("transform") || "";
    if (head && baseTransform) {
      const match = baseTransform.match(/translate\(([-\d.]+)\s+([-\d.]+)\)\s+rotate\(([-\d.]+)\)/);
      const translateX = match ? Number(match[1]) : 0;
      const translateY = match ? Number(match[2]) : 0;
      const baseAngle = match ? Number(match[3]) : 0;
      const swingAngles = [0, -18, 15, -11, 7, -4, 0];
      let frame = 0;
      const applyFrame = () => {
        if (frame >= swingAngles.length) {
          head.setAttribute("transform", baseTransform);
          return;
        }
        head.setAttribute(
          "transform",
          `translate(${translateX} ${translateY}) rotate(${baseAngle + swingAngles[frame]}) scale(1.03)`,
        );
        frame += 1;
        setTimeout(applyFrame, 42);
      };
      applyFrame();
      return;
    }
    if (!wormGroup) {
      this.shake(shakeTarget);
    }
  }
}

function createBrightWormPalette(color) {
  return {
    base: mixColor(color, "#ffffff", 0.22),
    highlight: mixColor(color, "#ffffff", 0.72),
    shadow: mixColor(color, "#ffffff", 0.35),
  };
}

function mixColor(colorA, colorB, ratio = 0.5) {
  const rgbA = parseHexColor(colorA);
  const rgbB = parseHexColor(colorB);
  const weight = Math.max(0, Math.min(1, ratio));
  const mixed = {
    r: Math.round(rgbA.r + (rgbB.r - rgbA.r) * weight),
    g: Math.round(rgbA.g + (rgbB.g - rgbA.g) * weight),
    b: Math.round(rgbA.b + (rgbB.b - rgbA.b) * weight),
  };
  return `rgb(${mixed.r}, ${mixed.g}, ${mixed.b})`;
}

function parseHexColor(color) {
  if (typeof color !== "string") {
    return { r: 82, g: 227, b: 255 };
  }
  const normalized = color.trim();
  if (/^#([0-9a-f]{3})$/i.test(normalized)) {
    const [, short] = normalized.match(/^#([0-9a-f]{3})$/i) || [];
    return {
      r: Number.parseInt(short[0] + short[0], 16),
      g: Number.parseInt(short[1] + short[1], 16),
      b: Number.parseInt(short[2] + short[2], 16),
    };
  }
  if (/^#([0-9a-f]{6})$/i.test(normalized)) {
    const [, full] = normalized.match(/^#([0-9a-f]{6})$/i) || [];
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    };
  }
  return { r: 82, g: 227, b: 255 };
}
