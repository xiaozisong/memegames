const SVG_NS = "http://www.w3.org/2000/svg";

export function ensureWormDefs(svgRoot, options = {}) {
  let defs = svgRoot.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(SVG_NS, "defs");
    svgRoot.insertBefore(defs, svgRoot.firstChild);
  }

  if (!svgRoot.querySelector("#worm-shadow-blur")) {
    const shadowFilter = document.createElementNS(SVG_NS, "filter");
    shadowFilter.setAttribute("id", "worm-shadow-blur");
    shadowFilter.setAttribute("x", "-30%");
    shadowFilter.setAttribute("y", "-30%");
    shadowFilter.setAttribute("width", "170%");
    shadowFilter.setAttribute("height", "180%");
    shadowFilter.innerHTML = `
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
    `;
    defs.appendChild(shadowFilter);
  }

  if (!svgRoot.querySelector("#worm-head-shadow")) {
    const headShadow = document.createElementNS(SVG_NS, "filter");
    headShadow.setAttribute("id", "worm-head-shadow");
    headShadow.setAttribute("x", "-40%");
    headShadow.setAttribute("y", "-40%");
    headShadow.setAttribute("width", "190%");
    headShadow.setAttribute("height", "190%");
    headShadow.innerHTML = `
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.22)" flood-opacity="1" />
    `;
    defs.appendChild(headShadow);
  }

  if (!svgRoot.querySelector("#worm-specular-glow")) {
    const glowFilter = document.createElementNS(SVG_NS, "filter");
    glowFilter.setAttribute("id", "worm-specular-glow");
    glowFilter.setAttribute("x", "-40%");
    glowFilter.setAttribute("y", "-40%");
    glowFilter.setAttribute("width", "180%");
    glowFilter.setAttribute("height", "180%");
    glowFilter.innerHTML = `
      <feGaussianBlur stdDeviation="1.6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    `;
    defs.appendChild(glowFilter);
  }

  const gradientId = options.gradientId || "worm-body-gradient";
  let gradient = svgRoot.querySelector(`#${gradientId}`);
  if (!gradient) {
    gradient = document.createElementNS(SVG_NS, "linearGradient");
    gradient.setAttribute("id", gradientId);
    gradient.setAttribute("x1", "0%");
    gradient.setAttribute("y1", "0%");
    gradient.setAttribute("x2", "100%");
    gradient.setAttribute("y2", "100%");
    defs.appendChild(gradient);
  }
  gradient.innerHTML = `
    <stop offset="0%" stop-color="${options.highlightColor || "#fff8d6"}" stop-opacity="0.9"></stop>
    <stop offset="45%" stop-color="${options.baseColor || "#ffd24a"}" stop-opacity="1"></stop>
    <stop offset="100%" stop-color="${options.shadowColor || "#d48c10"}" stop-opacity="1"></stop>
  `;

  return defs;
}

export function createWormSvg({
  d,
  baseColor = "#f5c84c",
  highlightColor = "#fff5cb",
  shadowColor = "#c57f17",
  outlineColor = "rgba(0,0,0,0.15)",
  baseWidth = 26,
  outlineWidth = 1.6,
  shadowOffset = { x: 2, y: 3 },
  highlightOffset = { x: -2, y: -2 },
  className = "worm",
  pointerEvents = "visibleStroke",
  gradientId = "worm-body-gradient",
  showBody = true,
  showHitArea = true,
  showHead = true,
  showHeadHitArea = true,
  headPointerEvents = "all",
  headAnchor = "end",
  showInnerShading = false,
  showHighlight = true,
  showOutline = true,
} = {}) {
  const worm = document.createElementNS(SVG_NS, "g");
  worm.setAttribute("class", className);
  worm.setAttribute("pointer-events", "none");

  const shadow = createStrokePath(d, {
    className: "worm-shadow",
    stroke: "rgba(0,0,0,0.25)",
    strokeWidth: baseWidth + 4,
    opacity: 1,
    transform: `translate(${shadowOffset.x} ${shadowOffset.y})`,
    filter: "url(#worm-shadow-blur)",
  });

  const base = createStrokePath(d, {
    className: "worm-base",
    stroke: `url(#${gradientId})`,
    strokeWidth: baseWidth,
    opacity: 1,
  });

  const innerShade = createStrokePath(d, {
    className: "worm-inner-shading",
    stroke: shadowColor,
    strokeWidth: baseWidth,
    opacity: 0.34,
    dasharray: `${Math.round(baseWidth * 0.9)} ${Math.round(baseWidth * 1.45)}`,
    dashoffset: `${Math.round(baseWidth * 0.55)}`,
  });

  const highlight = createStrokePath(d, {
    className: "worm-highlight",
    stroke: "#ffffff",
    strokeWidth: +(baseWidth * 0.36).toFixed(2),
    opacity: 0.64,
    transform: `translate(${highlightOffset.x} ${highlightOffset.y})`,
    filter: "url(#worm-specular-glow)",
  });

  const outline = createStrokePath(d, {
    className: "worm-outline",
    stroke: outlineColor,
    strokeWidth: outlineWidth,
    opacity: 1,
  });

  const hitArea = createStrokePath(d, {
    className: "worm-hit-area",
    stroke: "rgba(0,0,0,0)",
    strokeWidth: baseWidth + 10,
    opacity: 1,
    pointerEvents,
  });

  if (showBody) {
    worm.append(shadow, base);
    if (showInnerShading) {
      worm.append(innerShade);
    }
    if (showHighlight) {
      worm.append(highlight);
    }
    if (showOutline) {
      worm.append(outline);
    }
  }
  if (showHitArea) {
    worm.append(hitArea);
  }
  if (showHead) {
    worm.appendChild(createWormHead({
      d,
      baseColor,
      highlightColor,
      shadowColor,
      baseWidth,
      showHeadHitArea,
      headPointerEvents,
      headAnchor,
    }));
  }
  worm._wormParts = {
    shadow,
    base,
    innerShade,
    highlight,
    outline,
    hitArea,
    head: worm.querySelector(".worm-head"),
  };
  return worm;
}

function createStrokePath(d, { className, stroke, strokeWidth, opacity, transform = "", filter = "", dasharray = "", dashoffset = "", pointerEvents = "none" }) {
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("class", className);
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", String(strokeWidth));
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("opacity", String(opacity));
  path.setAttribute("pointer-events", pointerEvents);
  if (transform) path.setAttribute("transform", transform);
  if (filter) path.setAttribute("filter", filter);
  if (dasharray) path.setAttribute("stroke-dasharray", dasharray);
  if (dashoffset) path.setAttribute("stroke-dashoffset", dashoffset);
  return path;
}

function createWormHead({ d, baseColor, highlightColor, shadowColor, baseWidth, showHeadHitArea, headPointerEvents, headAnchor }) {
  const probeSvg = document.createElementNS(SVG_NS, "svg");
  const probePath = document.createElementNS(SVG_NS, "path");
  probePath.setAttribute("d", d);
  probeSvg.appendChild(probePath);

  const totalLength = probePath.getTotalLength();
  const isEndAnchor = headAnchor !== "start";
  const anchorLength = isEndAnchor ? totalLength : 0;
  const anchor = probePath.getPointAtLength(anchorLength);
  const reference = isEndAnchor
    ? probePath.getPointAtLength(Math.max(0, totalLength - 8))
    : probePath.getPointAtLength(Math.min(totalLength, 8));
  const angle = Math.atan2(anchor.y - reference.y, anchor.x - reference.x) * 180 / Math.PI;

  const head = document.createElementNS(SVG_NS, "g");
  head.setAttribute("class", "worm-head");
  head.setAttribute("transform", `translate(${anchor.x} ${anchor.y}) rotate(${angle})`);
  head.setAttribute("pointer-events", "all");

  const radius = baseWidth * 0.58;

  const shadow = document.createElementNS(SVG_NS, "ellipse");
  shadow.setAttribute("cx", "2");
  shadow.setAttribute("cy", "5");
  shadow.setAttribute("rx", String(radius * 0.95));
  shadow.setAttribute("ry", String(radius * 0.78));
  shadow.setAttribute("fill", "rgba(0,0,0,0.18)");
  shadow.setAttribute("filter", "url(#worm-head-shadow)");

  const base = document.createElementNS(SVG_NS, "circle");
  base.setAttribute("cx", "0");
  base.setAttribute("cy", "0");
  base.setAttribute("r", String(radius));
  base.setAttribute("fill", baseColor);

  const shade = document.createElementNS(SVG_NS, "ellipse");
  shade.setAttribute("cx", "5");
  shade.setAttribute("cy", "7");
  shade.setAttribute("rx", String(radius * 0.78));
  shade.setAttribute("ry", String(radius * 0.58));
  shade.setAttribute("fill", shadowColor);
  shade.setAttribute("opacity", "0.24");

  const forehead = document.createElementNS(SVG_NS, "ellipse");
  forehead.setAttribute("cx", "-4");
  forehead.setAttribute("cy", "-6");
  forehead.setAttribute("rx", String(radius * 0.74));
  forehead.setAttribute("ry", String(radius * 0.44));
  forehead.setAttribute("fill", highlightColor);
  forehead.setAttribute("opacity", "0.72");
  forehead.setAttribute("filter", "url(#worm-specular-glow)");

  const eyeLeftWhite = document.createElementNS(SVG_NS, "circle");
  eyeLeftWhite.setAttribute("cx", String(-radius * 0.34));
  eyeLeftWhite.setAttribute("cy", String(-radius * 0.08));
  eyeLeftWhite.setAttribute("r", String(radius * 0.18));
  eyeLeftWhite.setAttribute("fill", "#ffffff");

  const eyeRightWhite = document.createElementNS(SVG_NS, "circle");
  eyeRightWhite.setAttribute("cx", String(radius * 0.16));
  eyeRightWhite.setAttribute("cy", String(-radius * 0.1));
  eyeRightWhite.setAttribute("r", String(radius * 0.18));
  eyeRightWhite.setAttribute("fill", "#ffffff");

  const eyeLeftPupil = document.createElementNS(SVG_NS, "circle");
  eyeLeftPupil.setAttribute("cx", String(-radius * 0.28));
  eyeLeftPupil.setAttribute("cy", String(-radius * 0.02));
  eyeLeftPupil.setAttribute("r", String(radius * 0.08));
  eyeLeftPupil.setAttribute("fill", "#161616");

  const eyeRightPupil = document.createElementNS(SVG_NS, "circle");
  eyeRightPupil.setAttribute("cx", String(radius * 0.22));
  eyeRightPupil.setAttribute("cy", String(0));
  eyeRightPupil.setAttribute("r", String(radius * 0.08));
  eyeRightPupil.setAttribute("fill", "#161616");

  const specLeft = document.createElementNS(SVG_NS, "circle");
  specLeft.setAttribute("cx", String(-radius * 0.16));
  specLeft.setAttribute("cy", String(-radius * 0.35));
  specLeft.setAttribute("r", String(radius * 0.08));
  specLeft.setAttribute("fill", "#ffffff");
  specLeft.setAttribute("opacity", "0.9");

  const specRight = document.createElementNS(SVG_NS, "circle");
  specRight.setAttribute("cx", String(radius * 0.05));
  specRight.setAttribute("cy", String(-radius * 0.28));
  specRight.setAttribute("r", String(radius * 0.05));
  specRight.setAttribute("fill", "#ffffff");
  specRight.setAttribute("opacity", "0.82");

  if (showHeadHitArea) {
    const hitArea = document.createElementNS(SVG_NS, "circle");
    hitArea.setAttribute("class", "worm-head-hit-area");
    hitArea.setAttribute("cx", "0");
    hitArea.setAttribute("cy", "0");
    hitArea.setAttribute("r", String(radius * 1.28));
    hitArea.setAttribute("fill", "rgba(0,0,0,0)");
    hitArea.setAttribute("pointer-events", headPointerEvents || "all");
    head.appendChild(hitArea);
  }

  head.append(
    shadow,
    base,
    shade,
    forehead,
    eyeLeftWhite,
    eyeRightWhite,
    eyeLeftPupil,
    eyeRightPupil,
    specLeft,
    specRight,
  );
  return head;
}
