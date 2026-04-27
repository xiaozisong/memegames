import * as PIXI from "pixi.js";
import { pickSceneAssetUrl } from "../systems/SceneAssetLibrary.js";

export class SceneView {
  constructor(parent, toColorNumber) {
    this.toColorNumber = toColorNumber;
    this.root = new PIXI.Container();
    this.scene = new PIXI.Container();
    parent.addChild(this.root);
    this.root.addChild(this.scene);

    this.shadow = new PIXI.Graphics();
    this.panel = new PIXI.Graphics();
    this.target = new PIXI.Graphics();
    this.targetSprite = new PIXI.Sprite();
    this.targetSprite.anchor.set(0.5);
    this.starLayer = new PIXI.Graphics();
    this.starSpriteLayer = new PIXI.Container();
    this.ropeLayer = new PIXI.Graphics();
    this.anchorLayer = new PIXI.Graphics();
    this.candy = new PIXI.Graphics();
    this.candySprite = new PIXI.Sprite();
    this.candySprite.anchor.set(0.5);
    this.foreground = new PIXI.Graphics();
    this.scene.addChild(
      this.shadow,
      this.panel,
      this.target,
      this.targetSprite,
      this.starLayer,
      this.starSpriteLayer,
      this.ropeLayer,
      this.anchorLayer,
      this.candy,
      this.candySprite,
      this.foreground,
    );

    this.lastSnapshot = null;
    this.lastLayout = null;
    this.hoveredRopeId = null;
    this.lastLevelId = null;
    this.previousRopeStates = new Map();
    this.cutRopeAnimations = new Map();
  }

  render(snapshot, layout, assetLibrary) {
    this.lastSnapshot = snapshot;
    this.lastLayout = layout;
    this.syncRopeAnimationState(snapshot);

    const world = snapshot.world ?? { width: 1000, height: 1600 };
    this.root.position.set(0, 0);
    this.scene.position.set(layout.scene.x, layout.scene.y);
    this.scene.scale.set(layout.scene.scale);

    this.drawSceneFrame(world, snapshot);
    this.drawTarget(snapshot, assetLibrary);
    this.drawStars(snapshot, assetLibrary);
    this.drawRopes(snapshot);
    this.drawCandy(snapshot, assetLibrary);
    this.drawForeground(snapshot);
  }

  setHoveredRopeId(ropeId) {
    if (this.hoveredRopeId === ropeId) return;
    this.hoveredRopeId = ropeId ?? null;
    if (this.lastSnapshot && this.lastLayout) {
      this.drawRopes(this.lastSnapshot);
    }
  }

  hitTestRope(globalPoint) {
    if (!this.lastSnapshot?.state?.candy || !this.lastLayout) return null;
    const worldPoint = this.globalToWorld(globalPoint);
    const candy = this.lastSnapshot.state.candy;
    const ropes = this.lastSnapshot.state.ropes ?? [];
    const tolerance = 40 / Math.max(0.001, this.lastLayout.scene.scale);
    let bestMatch = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const rope of ropes) {
      if (!rope.active) continue;
      const distance = pointToSegmentDistance(worldPoint, rope.anchor, { x: candy.x, y: candy.y });
      if (distance <= tolerance && distance < bestDistance) {
        bestDistance = distance;
        bestMatch = rope.id;
      }
    }

    return bestMatch;
  }

  hitTestRopeSweep(globalStartPoint, globalEndPoint) {
    if (!this.lastSnapshot?.state?.candy || !this.lastLayout) return [];
    const start = this.globalToWorld(globalStartPoint);
    const end = this.globalToWorld(globalEndPoint);
    const candy = this.lastSnapshot.state.candy;
    const ropes = this.lastSnapshot.state.ropes ?? [];
    const tolerance = 34 / Math.max(0.001, this.lastLayout.scene.scale);
    const matches = [];

    for (const rope of ropes) {
      if (!rope.active) continue;
      const distance = segmentToSegmentDistance(start, end, rope.anchor, { x: candy.x, y: candy.y });
      if (distance <= tolerance) {
        matches.push({ id: rope.id, distance });
      }
    }

    return matches.sort((a, b) => a.distance - b.distance).map((item) => item.id);
  }

  globalToWorld(globalPoint) {
    const scale = this.lastLayout?.scene?.scale ?? 1;
    return {
      x: (globalPoint.x - (this.lastLayout?.scene?.x ?? 0)) / scale,
      y: (globalPoint.y - (this.lastLayout?.scene?.y ?? 0)) / scale,
    };
  }

  drawSceneFrame(world, snapshot) {
    this.shadow.clear();
    this.panel.clear();
  }

  drawTarget(snapshot, assetLibrary) {
    const target = snapshot.state?.target;
    if (!target) return;

    const colors = snapshot.colors ?? {};
    const didWin = Boolean(snapshot.state?.didWin);
    const targetFill = this.toColorNumber(didWin ? colors.targetActive : colors.targetFill, 0x7bf59f);
    const targetAssetUrl = pickSceneAssetUrl(snapshot, "target");
    const targetTexture = assetLibrary?.getTexture(targetAssetUrl) ?? null;

    if (targetTexture) {
      this.target.clear();
      this.target.visible = false;
      this.targetSprite.visible = true;
      this.targetSprite.texture = targetTexture;
      this.targetSprite.position.set(target.x, target.y);
      this.targetSprite.width = target.shape === "rect" ? target.width : target.radius * 2;
      this.targetSprite.height = target.shape === "rect" ? target.height : target.radius * 2;
      this.targetSprite.alpha = didWin ? 1 : 0.98;
      return;
    }

    this.target.visible = true;
    this.targetSprite.visible = false;
    this.target.clear();
    this.target.circle(target.x, target.y + 18, target.shape === "rect" ? target.width * 0.42 : target.radius * 0.8).fill({
      color: 0x000000,
      alpha: 0.16,
    });

    if (target.shape === "rect") {
      const width = target.width;
      const height = target.height;
      this.target.roundRect(target.x - width * 0.5, target.y - height * 0.5, width, height, 44).fill({
        color: targetFill,
        alpha: 0.94,
      });
      this.target.roundRect(target.x - width * 0.5, target.y - height * 0.5, width, height, 44).stroke({
        color: 0xffffff,
        alpha: 0.38,
        width: 4,
      });
      this.target.ellipse(target.x, target.y + 10, width * 0.22, height * 0.22).fill({ color: 0x0a1d12, alpha: 0.92 });
      this.target.circle(target.x - width * 0.18, target.y - height * 0.12, 13).fill({ color: 0xffffff, alpha: 0.85 });
      this.target.circle(target.x + width * 0.18, target.y - height * 0.12, 13).fill({ color: 0xffffff, alpha: 0.85 });
      this.target.circle(target.x - width * 0.18, target.y - height * 0.12, 5).fill({ color: 0x082033, alpha: 1 });
      this.target.circle(target.x + width * 0.18, target.y - height * 0.12, 5).fill({ color: 0x082033, alpha: 1 });
      return;
    }

    this.target.circle(target.x, target.y, target.radius).fill({ color: targetFill, alpha: 0.94 });
    this.target.circle(target.x, target.y, target.radius).stroke({ color: 0xffffff, alpha: 0.38, width: 4 });
    this.target.ellipse(target.x, target.y + target.radius * 0.15, target.radius * 0.4, target.radius * 0.32).fill({ color: 0x0a1d12, alpha: 0.94 });
    this.target.circle(target.x - target.radius * 0.28, target.y - target.radius * 0.18, 13).fill({ color: 0xffffff, alpha: 0.85 });
    this.target.circle(target.x + target.radius * 0.28, target.y - target.radius * 0.18, 13).fill({ color: 0xffffff, alpha: 0.85 });
    this.target.circle(target.x - target.radius * 0.28, target.y - target.radius * 0.18, 5).fill({ color: 0x082033, alpha: 1 });
    this.target.circle(target.x + target.radius * 0.28, target.y - target.radius * 0.18, 5).fill({ color: 0x082033, alpha: 1 });
  }

  drawStars(snapshot, assetLibrary) {
    const stars = snapshot.state?.stars ?? [];
    const colors = snapshot.colors ?? {};
    const starFill = this.toColorNumber(colors.starFill, 0xffd24d);
    const starAssetUrl = pickSceneAssetUrl(snapshot, "star");
    const starTexture = assetLibrary?.getTexture(starAssetUrl) ?? null;

    this.starLayer.clear();
    clearContainer(this.starSpriteLayer);

    if (starTexture) {
      this.starLayer.visible = false;
      this.starSpriteLayer.visible = true;
      for (const star of stars) {
        if (star.collected) continue;
        const sprite = new PIXI.Sprite(starTexture);
        sprite.anchor.set(0.5);
        sprite.position.set(star.x, star.y);
        sprite.width = star.radius * 2;
        sprite.height = star.radius * 2;
        this.starSpriteLayer.addChild(sprite);
      }
      return;
    }

    this.starLayer.visible = true;
    this.starSpriteLayer.visible = true;
    for (const star of stars) {
      if (star.collected) continue;
      const points = createStarPoints(star.x, star.y, star.radius, star.radius * 0.48, 5);
      this.starLayer.poly(points, true).fill({ color: starFill, alpha: 0.95 });
      this.starLayer.poly(points, true).stroke({ color: 0xffffff, alpha: 0.48, width: 3 });
      this.starLayer.circle(star.x, star.y, star.radius * 0.22).fill({ color: 0xffffff, alpha: 0.28 });
    }
  }

  drawRopes(snapshot) {
    const ropes = snapshot.state?.ropes ?? [];
    const candy = snapshot.state?.candy;
    if (!candy) return;

    const colors = snapshot.colors ?? {};
    const ropeColor = this.toColorNumber(colors.rope, 0xf3ddb0);
    const hoverColor = this.toColorNumber(colors.ropeHover, 0x7ce8ff);
    const cutColor = this.toColorNumber(colors.ropeCut, 0x6e88a8);
    const ropeWidth = Number(snapshot.presentation?.ropeWidth ?? 8);
    const hoverWidth = Number(snapshot.presentation?.ropeHoverWidth ?? 11);
    const elapsed = Number(snapshot.state?.elapsed ?? 0);

    this.ropeLayer.clear();
    this.anchorLayer.clear();

    for (const rope of ropes) {
      const active = Boolean(rope.active);
      const isHovered = active && rope.id === this.hoveredRopeId;
      const color = active ? (isHovered ? hoverColor : ropeColor) : cutColor;
      const width = active ? (isHovered ? hoverWidth : ropeWidth) : Math.max(3, ropeWidth * 0.45);

      this.anchorLayer.circle(rope.anchor.x, rope.anchor.y, 14).fill({ color: 0xe6edf8, alpha: 0.96 });
      this.anchorLayer.circle(rope.anchor.x, rope.anchor.y, 6).fill({ color: 0x233651, alpha: 0.92 });

      if (active) {
        const points = createActiveRopeCurvePoints(rope, candy, elapsed, isHovered);
        strokePath(this.ropeLayer, points, { color, width, alpha: 0.96 });
      } else {
        const points = createCutRopeStubPoints(rope, this.cutRopeAnimations.get(rope.id), elapsed);
        strokePath(this.ropeLayer, points, { color, width, alpha: 0.42 });
      }
    }
  }

  syncRopeAnimationState(snapshot) {
    const levelId = snapshot.state?.level?.id ?? null;
    if (this.lastLevelId !== levelId) {
      this.previousRopeStates.clear();
      this.cutRopeAnimations.clear();
      this.lastLevelId = levelId;
    }

    const ropes = snapshot.state?.ropes ?? [];
    const elapsed = Number(snapshot.state?.elapsed ?? 0);
    const nextStates = new Map();

    for (const rope of ropes) {
      const isActive = Boolean(rope.active);
      const wasActive = this.previousRopeStates.get(rope.id);
      if (wasActive === true && !isActive) {
        this.cutRopeAnimations.set(rope.id, { startedAt: elapsed });
      }
      if (isActive) {
        this.cutRopeAnimations.delete(rope.id);
      }
      nextStates.set(rope.id, isActive);
    }

    for (const ropeId of this.cutRopeAnimations.keys()) {
      if (!nextStates.has(ropeId)) {
        this.cutRopeAnimations.delete(ropeId);
      }
    }

    this.previousRopeStates = nextStates;
  }

  drawCandy(snapshot, assetLibrary) {
    const candy = snapshot.state?.candy;
    if (!candy) return;

    const colors = snapshot.colors ?? {};
    const fillColor = this.toColorNumber(colors.candyFill, 0xff7fb6);
    const glowColor = this.toColorNumber(colors.candyGlow, 0xffd7ea);
    const candyAssetUrl = pickSceneAssetUrl(snapshot, "candy");
    const candyTexture = assetLibrary?.getTexture(candyAssetUrl) ?? null;

    if (candyTexture) {
      this.candy.clear();
      this.candy.visible = false;
      this.candySprite.visible = true;
      this.candySprite.texture = candyTexture;
      this.candySprite.position.set(candy.x, candy.y);
      this.candySprite.rotation = candy.rotation ?? 0;
      this.candySprite.width = candy.radius * 2.45;
      this.candySprite.height = candy.radius * 2.45;
      return;
    }

    this.candy.visible = true;
    this.candySprite.visible = false;
    this.candy.clear();
    this.candy.circle(candy.x + 6, candy.y + 18, candy.radius * 0.96).fill({ color: 0x000000, alpha: 0.18 });
    this.candy.circle(candy.x, candy.y, candy.radius).fill({ color: fillColor, alpha: 1 });
    this.candy.circle(candy.x, candy.y, candy.radius).stroke({ color: 0xffffff, alpha: 0.54, width: 4 });

    const wrapperRadius = candy.radius * 1.18;
    const angle = candy.rotation ?? 0;
    const left = rotatePoint(candy.x - wrapperRadius, candy.y, candy.x, candy.y, angle);
    const right = rotatePoint(candy.x + wrapperRadius, candy.y, candy.x, candy.y, angle);

    this.candy.moveTo(left.x, left.y);
    this.candy.lineTo(candy.x - candy.radius * 0.74, candy.y - candy.radius * 0.18);
    this.candy.lineTo(candy.x - candy.radius * 0.74, candy.y + candy.radius * 0.18);
    this.candy.lineTo(left.x, left.y);
    this.candy.fill({ color: 0xffb1d0, alpha: 0.92 });

    this.candy.moveTo(right.x, right.y);
    this.candy.lineTo(candy.x + candy.radius * 0.74, candy.y - candy.radius * 0.18);
    this.candy.lineTo(candy.x + candy.radius * 0.74, candy.y + candy.radius * 0.18);
    this.candy.lineTo(right.x, right.y);
    this.candy.fill({ color: 0xffb1d0, alpha: 0.92 });

    this.candy.circle(candy.x - candy.radius * 0.28, candy.y - candy.radius * 0.32, candy.radius * 0.24).fill({
      color: glowColor,
      alpha: 0.72,
    });
  }

  drawForeground(snapshot) {
    this.foreground.clear();
  }
}

function pointToSegmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 0.0001) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  const projectedX = start.x + dx * t;
  const projectedY = start.y + dy * t;
  return Math.hypot(point.x - projectedX, point.y - projectedY);
}

function segmentToSegmentDistance(a0, a1, b0, b1) {
  if (segmentsIntersect(a0, a1, b0, b1)) return 0;
  return Math.min(
    pointToSegmentDistance(a0, b0, b1),
    pointToSegmentDistance(a1, b0, b1),
    pointToSegmentDistance(b0, a0, a1),
    pointToSegmentDistance(b1, a0, a1),
  );
}

function segmentsIntersect(a0, a1, b0, b1) {
  const o1 = orientation(a0, a1, b0);
  const o2 = orientation(a0, a1, b1);
  const o3 = orientation(b0, b1, a0);
  const o4 = orientation(b0, b1, a1);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a0, b0, a1)) return true;
  if (o2 === 0 && onSegment(a0, b1, a1)) return true;
  if (o3 === 0 && onSegment(b0, a0, b1)) return true;
  if (o4 === 0 && onSegment(b0, a1, b1)) return true;
  return false;
}

function orientation(p, q, r) {
  const value = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (Math.abs(value) < 0.0001) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(p, q, r) {
  return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
}

function rotatePoint(x, y, cx, cy, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

function createStarPoints(cx, cy, outerRadius, innerRadius, points) {
  const result = [];
  const totalPoints = Math.max(2, points) * 2;
  const step = Math.PI / Math.max(1, points);
  let angle = -Math.PI * 0.5;

  for (let index = 0; index < totalPoints; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    result.push(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    angle += step;
  }

  return result;
}

function clearContainer(container) {
  const removedChildren = container.removeChildren();
  for (const child of removedChildren) {
    child.destroy({ children: true });
  }
}

function createActiveRopeCurvePoints(rope, candy, elapsed, isHovered) {
  const start = rope.anchor;
  const end = { x: candy.x, y: candy.y };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / distance;
  const ny = dx / distance;
  const tangentialVelocity = candy.vx * nx + candy.vy * ny;
  const phase = elapsed * 11 + hashString(rope.id) * 0.17;
  const velocityBend = clamp(tangentialVelocity * 0.028, -18, 18);
  const rhythmicBend = Math.sin(phase) * clamp(distance * 0.018, 5, 14);
  const hoverBoost = isHovered ? 1.2 : 1;
  const bend = clamp((velocityBend + rhythmicBend) * hoverBoost, -24, 24);
  const control = {
    x: start.x + dx * 0.5 + nx * bend,
    y: start.y + dy * 0.5 + ny * bend,
  };
  return createQuadraticCurvePoints(start, control, end, 12);
}

function createCutRopeStubPoints(rope, animation, elapsed) {
  const start = rope.anchor;
  const age = Math.max(0, elapsed - Number(animation?.startedAt ?? elapsed));
  const progress = clamp(age / 0.5, 0, 1);
  const decay = 1 - progress;
  const phase = age * 22 + hashString(rope.id) * 0.11;
  const angle = Math.PI * 0.5 + Math.sin(phase) * 0.38 * decay;
  const length = 34 + Math.cos(phase * 0.9) * 8 * decay;
  const controlLength = length * (0.48 + 0.18 * decay);
  const end = {
    x: start.x + Math.cos(angle) * length,
    y: start.y + Math.sin(angle) * length,
  };
  const control = {
    x: start.x + Math.cos(angle - 0.22) * controlLength,
    y: start.y + Math.sin(angle - 0.22) * controlLength,
  };
  return createQuadraticCurvePoints(start, control, end, 8);
}

function createQuadraticCurvePoints(start, control, end, segments = 10) {
  const points = [start];
  const totalSegments = Math.max(2, Math.round(segments));
  for (let index = 1; index < totalSegments; index += 1) {
    const t = index / totalSegments;
    const oneMinusT = 1 - t;
    points.push({
      x: oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * control.x + t * t * end.x,
      y: oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * control.y + t * t * end.y,
    });
  }
  points.push(end);
  return points;
}

function strokePath(graphics, points, style) {
  if (!Array.isArray(points) || points.length < 2) return;
  graphics.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    graphics.lineTo(points[index].x, points[index].y);
  }
  graphics.stroke({
    color: style.color,
    width: style.width,
    alpha: style.alpha,
    cap: "round",
    join: "round",
  });
}

function hashString(value) {
  const text = String(value ?? "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 1000003;
  }
  return hash;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}
