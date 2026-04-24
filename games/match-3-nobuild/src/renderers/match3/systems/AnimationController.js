import * as PIXI from "pixi.js";
import { gsap } from "gsap";

export class AnimationController {
  constructor(container, boardView, toColorNumber, particleSystem = null, playClearSound = null) {
    this.container = new PIXI.Container();
    container.addChild(this.container);
    this.boardView = boardView;
    this.toColorNumber = toColorNumber;
    this.particleSystem = particleSystem;
    this.playClearSound = playClearSound;
  }

  async playEffect(effect, snapshot) {
    if (!effect || effect.tick === undefined) return;

    if (effect.invalidSwap) {
      await this.playInvalidSwap(effect.invalidSwap, snapshot.presentation);
      return;
    }

    if (effect.swap) {
      await this.playSwap(effect.swap, snapshot.presentation);
    }

    for (const step of effect.steps ?? []) {
      if (step.type === "clear") {
        await this.playClear(step, snapshot.presentation, snapshot);
        if (step.cascade > 1) {
          this.playCascadeBadge(step.cascade);
        }
      } else if (step.type === "drop") {
        await this.playDrop(step, snapshot.presentation);
      } else if (step.type === "reshuffle") {
        await this.playReshuffle(step);
      }
    }
  }

  async playInvalidSwap(swap, presentation) {
    const a = this.boardView.getTileSprite(swap.ids[0]);
    const b = this.boardView.getTileSprite(swap.ids[1]);
    if (!a || !b) return;
    const posA = this.boardView.getCellCenter(swap.from.row, swap.from.col);
    const posB = this.boardView.getCellCenter(swap.to.row, swap.to.col);
    await timelinePromise((tl) => {
      tl.to(a, { x: posB.x, y: posB.y, duration: presentation.swapDurationMs / 1000, ease: "power2.out" }, 0);
      tl.to(b, { x: posA.x, y: posA.y, duration: presentation.swapDurationMs / 1000, ease: "power2.out" }, 0);
      tl.to(a, { x: posA.x, y: posA.y, duration: presentation.swapDurationMs / 1000, ease: "power2.out" });
      tl.to(b, { x: posB.x, y: posB.y, duration: presentation.swapDurationMs / 1000, ease: "power2.out" }, "<");
    });
  }

  async playSwap(swap, presentation) {
    const a = this.boardView.getTileSprite(swap.ids[0]);
    const b = this.boardView.getTileSprite(swap.ids[1]);
    if (!a || !b) return;
    const posA = this.boardView.getCellCenter(swap.from.row, swap.from.col);
    const posB = this.boardView.getCellCenter(swap.to.row, swap.to.col);
    await timelinePromise((tl) => {
      tl.to(a, { x: posB.x, y: posB.y, duration: presentation.swapDurationMs / 1000, ease: "power2.out" }, 0);
      tl.to(b, { x: posA.x, y: posA.y, duration: presentation.swapDurationMs / 1000, ease: "power2.out" }, 0);
    });
  }

  async playClear(step, presentation, snapshot) {
    const sprites = step.removed.map((item) => this.boardView.getTileSprite(item.id)).filter(Boolean);
    if (sprites.length > 0) {
      this.playClearSound?.(step.removed ?? [], snapshot);
    }
    const burstTweens = sprites.map((sprite) => this.playClearBurst(sprite, presentation));
    await Promise.all(
      sprites.map((sprite) =>
        timelinePromise((tl) => {
          tl.to(sprite.scale, {
            x: 1.18,
            y: 1.18,
            duration: presentation.matchPopDurationMs / 1000,
            ease: "power2.out",
          });
          tl.to(
            sprite,
            {
              alpha: 0,
              duration: presentation.matchFadeDurationMs / 1000,
              ease: "power2.in",
            },
            `-=${Math.min(0.08, presentation.matchFadeDurationMs / 1000 * 0.35)}`,
          );
        }).then(() => {
          this.boardView.removeTile(sprite.__tileMeta?.id);
        }),
      ),
    );
    await Promise.all(burstTweens);
    await delay(presentation.cascadeDelayMs * 0.35);
  }

  async playDrop(step, presentation) {
    const tweens = [];
    for (const move of step.drops) {
      const sprite = this.boardView.getTileSprite(move.id);
      if (!sprite) continue;
      const target = this.boardView.getCellCenter(move.toRow, move.toCol);
      tweens.push(
        tweenPromise(sprite, {
          x: target.x,
          y: target.y,
          duration: presentation.dropDurationMs / 1000,
          ease: "power3.out",
        }),
      );
    }
    for (const spawn of step.spawns) {
      const sprite = this.boardView.addSpawnedTile({ id: spawn.id, kind: spawn.kind }, spawn.toRow, spawn.toCol, spawn.fromRow);
      const target = this.boardView.getCellCenter(spawn.toRow, spawn.toCol);
      sprite.alpha = 0.01;
      sprite.scale.set(0.92);
      tweens.push(
        timelinePromise((tl) => {
          tl.to(sprite, { alpha: 1, duration: 0.12, ease: "power1.out" }, 0);
          tl.to(
            sprite.scale,
            {
              x: 1,
              y: 1,
              duration: presentation.dropDurationMs / 1000,
              ease: "power2.out",
            },
            0,
          );
          tl.to(
            sprite,
            {
              x: target.x,
              y: target.y,
              duration: presentation.dropDurationMs / 1000,
              ease: "power3.out",
            },
            0,
          );
        }),
      );
    }
    await Promise.all(tweens);
    await delay(presentation.cascadeDelayMs);
  }

  async playReshuffle(step) {
    const bounds = this.boardView.layout;
    if (!bounds) {
      this.boardView.replaceBoard(step.board);
      return;
    }

    const centerX = bounds.boardX + bounds.boardSize * 0.5;
    const centerY = bounds.boardY + bounds.boardSize * 0.5;
    const sprites = Array.from(this.boardView.tileSprites.values());

    const flash = new PIXI.Graphics();
    flash.roundRect(bounds.boardX, bounds.boardY, bounds.boardSize, bounds.boardSize, bounds.boardRadius).fill({
      color: this.toColorNumber("oklch(0.95 0.03 260)", 0xffffff),
      alpha: 0,
    });
    this.container.addChild(flash);

    const preTweens = sprites.map((sprite, index) => {
      const dx = sprite.x - centerX;
      const dy = sprite.y - centerY;
      const radius = Math.max(bounds.cellSize * 0.32, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      const spinDirection = index % 2 === 0 ? 1 : -1;
      const nextAngle = angle + spinDirection * randomRange(0.9, 1.5);
      const nextRadius = Math.max(bounds.cellSize * 0.2, radius * randomRange(0.42, 0.62));
      const targetX = centerX + Math.cos(nextAngle) * nextRadius;
      const targetY = centerY + Math.sin(nextAngle) * nextRadius;

      return timelinePromise((tl) => {
        tl.to(sprite, {
          x: targetX,
          y: targetY,
          rotation: sprite.rotation + spinDirection * randomRange(0.7, 1.15),
          alpha: 0.26,
          duration: 0.18,
          ease: "power2.inOut",
        }, 0);
        tl.to(sprite.scale, {
          x: 0.72,
          y: 0.72,
          duration: 0.18,
          ease: "power2.inOut",
        }, 0);
      });
    });

    const flashIn = timelinePromise((tl) => {
      tl.to(flash, { alpha: 0.22, duration: 0.1, ease: "power1.out" }, 0);
      tl.to(flash, { alpha: 0, duration: 0.18, ease: "power1.in" }, 0.1);
    });

    await Promise.all([...preTweens, flashIn]);
    this.boardView.replaceBoard(step.board);

    const nextSprites = Array.from(this.boardView.tileSprites.values());
    for (const sprite of nextSprites) {
      sprite.alpha = 0;
      sprite.scale.set(0.72);
      sprite.rotation = randomRange(-0.3, 0.3);
    }

    await Promise.all(
      nextSprites.map((sprite) =>
        timelinePromise((tl) => {
          tl.to(sprite, {
            alpha: 1,
            rotation: 0,
            duration: 0.24,
            ease: "power2.out",
          }, 0);
          tl.to(sprite.scale, {
            x: 1,
            y: 1,
            duration: 0.24,
            ease: "back.out(1.5)",
          }, 0);
        }),
      ),
    );
    flash.destroy();
  }

  playCascadeBadge(cascadeCount) {
    const badgeInfo = resolveCascadeBadge(cascadeCount);
    const badgePosition = getRandomCascadeBadgePosition(this.boardView.layout);
    const badge = new PIXI.Container();
    badge.position.set(badgePosition.x, badgePosition.y);
    this.container.addChild(badge);

    const label = new PIXI.Text({
      text: badgeInfo.text,
      style: new PIXI.TextStyle({
        fill: badgeInfo.textColor,
        fontSize: badgeInfo.fontSize,
        fontWeight: "900",
        align: "center",
        letterSpacing: 1.2,
        stroke: { color: 0xffffff, width: 4, join: "round" },
      }),
    });
    label.anchor.set(0.5);
    badge.addChild(label);
    timelinePromise((tl) => {
      tl.fromTo(badge.scale, { x: 0.76, y: 0.76 }, { x: 1, y: 1, duration: 0.22, ease: "back.out(1.8)" }, 0);
      tl.fromTo(
        badge,
        { alpha: 0, y: badgePosition.y + 12 },
        { alpha: 1, y: badgePosition.y, duration: 0.18, ease: "power2.out" },
        0,
      );
      tl.to(badge, { alpha: 0, y: badgePosition.y - 18, duration: 0.34, ease: "power1.in" }, 0.42);
    }).then(() => badge.destroy({ children: true }));
  }

  playClearBurst(sprite, presentation) {
    const burst = new PIXI.Container();
    burst.position.set(sprite.x, sprite.y);
    this.container.addChild(burst);

    const glowColor = sprite.__tileMeta?.glowColor ?? 0xffffff;
    const cellSize = this.boardView.layout?.cellSize ?? 64;
    const particleCount = clamp(Math.round(cellSize / 8), 8, 12);
    const shardCount = clamp(Math.round(cellSize / 18), 3, 5);
    const duration = Math.max(0.24, presentation.matchFadeDurationMs / 1000 + 0.14);

    if (this.particleSystem) {
      this.particleSystem.spawnExplosion(sprite.x, sprite.y, numberToHex(glowColor), {
        count: clamp(Math.round(cellSize * 0.24), 12, 22),
        speedMin: 2.8,
        speedMax: 8.6,
        sizeMin: 2.2,
        sizeMax: 5.8,
        lifeMin: 0.46,
        lifeMax: 0.95,
      });
      this.particleSystem.spawnExplosion(sprite.x, sprite.y, {
        start: "#ffffff",
        mid: numberToHex(glowColor),
        end: darkenHex(numberToHex(glowColor), 0.52),
      }, {
        count: clamp(Math.round(cellSize * 0.14), 8, 14),
        speedMin: 1.8,
        speedMax: 5.4,
        sizeMin: 1.6,
        sizeMax: 3.8,
        lifeMin: 0.34,
        lifeMax: 0.72,
      });
    }

    const shockwave = new PIXI.Graphics();
    shockwave.circle(0, 0, cellSize * 0.16).stroke({
      color: glowColor,
      alpha: 0.95,
      width: Math.max(2, cellSize * 0.06),
    });
    shockwave.alpha = 0.9;
    shockwave.blendMode = PIXI.BLEND_MODES?.ADD ?? "add";
    burst.addChild(shockwave);

    const flash = new PIXI.Graphics();
    flash.circle(0, 0, cellSize * 0.26).fill({ color: 0xffffff, alpha: 0.34 });
    flash.circle(0, 0, cellSize * 0.18).fill({ color: glowColor, alpha: 0.45 });
    flash.blendMode = PIXI.BLEND_MODES?.ADD ?? "add";
    burst.addChild(flash);

    const sparkRays = new PIXI.Graphics();
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8 + randomRange(-0.12, 0.12);
      const inner = cellSize * 0.08;
      const outer = randomRange(cellSize * 0.24, cellSize * 0.4);
      sparkRays.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      sparkRays.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
    sparkRays.stroke({
      color: 0xffffff,
      alpha: 0.9,
      width: Math.max(2, cellSize * 0.035),
      cap: "round",
    });
    sparkRays.blendMode = PIXI.BLEND_MODES?.ADD ?? "add";
    burst.addChild(sparkRays);

    const tweens = [
      timelinePromise((tl) => {
        tl.to(shockwave.scale, {
          x: 2.8,
          y: 2.8,
          duration,
          ease: "power2.out",
        }, 0);
        tl.to(shockwave, {
          alpha: 0,
          duration,
          ease: "power1.out",
        }, 0);
        tl.to(flash.scale, {
          x: 2.1,
          y: 2.1,
          duration: duration * 0.72,
          ease: "power2.out",
        }, 0);
        tl.to(flash, {
          alpha: 0,
          duration: duration * 0.58,
          ease: "power1.out",
        }, 0);
        tl.to(sparkRays.scale, {
          x: 1.35,
          y: 1.35,
          duration: duration * 0.6,
          ease: "power2.out",
        }, 0);
        tl.to(sparkRays, {
          alpha: 0,
          duration: duration * 0.5,
          ease: "power1.out",
        }, 0);
      }),
    ];

    for (let index = 0; index < particleCount; index += 1) {
      const particle = new PIXI.Graphics();
      const size = randomRange(cellSize * 0.05, cellSize * 0.11);
      const angle = (Math.PI * 2 * index) / particleCount + randomRange(-0.24, 0.24);
      const distance = randomRange(cellSize * 0.26, cellSize * 0.7);
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      particle.circle(0, 0, size).fill({ color: glowColor, alpha: 1 });
      particle.circle(0, 0, size * 0.45).fill({ color: 0xffffff, alpha: 0.9 });
      particle.alpha = 0.98;
      particle.blendMode = PIXI.BLEND_MODES?.ADD ?? "add";
      burst.addChild(particle);

      tweens.push(
        timelinePromise((tl) => {
          tl.to(particle, {
            x: dx,
            y: dy,
            alpha: 0,
            duration: randomRange(duration * 0.82, duration * 1.08),
            ease: "power3.out",
          }, 0);
          tl.to(particle.scale, {
            x: randomRange(0.08, 0.28),
            y: randomRange(0.08, 0.28),
            duration: duration,
            ease: "power1.out",
          }, 0);
        }),
      );
    }

    for (let index = 0; index < shardCount; index += 1) {
      const shard = new PIXI.Graphics();
      const width = randomRange(cellSize * 0.06, cellSize * 0.12);
      const height = randomRange(cellSize * 0.16, cellSize * 0.26);
      const angle = (Math.PI * 2 * index) / shardCount + randomRange(-0.28, 0.28);
      const distance = randomRange(cellSize * 0.22, cellSize * 0.62);
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      shard.roundRect(-width * 0.5, -height * 0.5, width, height, width * 0.4).fill({
        color: glowColor,
        alpha: 0.95,
      });
      shard.roundRect(-width * 0.24, -height * 0.34, width * 0.48, height * 0.68, width * 0.22).fill({
        color: 0xffffff,
        alpha: 0.7,
      });
      shard.rotation = angle;
      shard.blendMode = PIXI.BLEND_MODES?.ADD ?? "add";
      burst.addChild(shard);

      tweens.push(
        timelinePromise((tl) => {
          tl.to(shard, {
            x: dx,
            y: dy,
            rotation: shard.rotation + randomRange(0.7, 1.8),
            alpha: 0,
            duration: randomRange(duration * 0.78, duration * 1.02),
            ease: "power3.out",
          }, 0);
          tl.to(shard.scale, {
            x: randomRange(0.2, 0.45),
            y: randomRange(0.2, 0.45),
            duration: duration,
            ease: "power1.out",
          }, 0);
        }),
      );
    }

    return Promise.all(tweens).then(() => {
      burst.destroy({ children: true });
    });
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    gsap.delayedCall(Math.max(0, ms) / 1000, resolve);
  });
}

function tweenPromise(target, vars) {
  return new Promise((resolve) => {
    gsap.to(target, {
      ...vars,
      onComplete: resolve,
    });
  });
}

function timelinePromise(build) {
  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve });
    build(tl);
  });
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function resolveCascadeBadge(cascadeCount) {
  if (cascadeCount <= 2) {
    return {
      text: `COMBO X ${cascadeCount}`,
      textColor: 0x47d764,
      fontSize: 24,
    };
  }
  if (cascadeCount === 3) {
    return {
      text: `CRAZY COMBO X ${cascadeCount}`,
      textColor: 0xff4d4f,
      fontSize: 24,
    };
  }
  return {
    text: `CRAZY COMBO X ${cascadeCount}`,
    textColor: 0xffb020,
    fontSize: 26,
  };
}

function getRandomCascadeBadgePosition(layout) {
  const boardCenterX = layout.boardX + layout.boardSize * 0.5;
  const boardCenterY = layout.boardY + layout.boardSize * 0.5;
  const x = boardCenterX + randomRange(-layout.boardSize * 0.34, layout.boardSize * 0.34);
  const y = boardCenterY + randomRange(-layout.boardSize * 0.3, layout.boardSize * 0.3);
  return {
    x: clamp(x, layout.boardX + 28, layout.boardX + layout.boardSize - 28),
    y: clamp(y, layout.boardY + 24, layout.boardY + layout.boardSize - 24),
  };
}

function numberToHex(value) {
  return `#${Math.max(0, Math.min(0xffffff, Math.round(Number(value) || 0xffffff))).toString(16).padStart(6, "0")}`;
}

function darkenHex(hex, amount) {
  const raw = String(hex || "#ffffff").replace("#", "");
  const safe = raw.length === 3 ? raw.split("").map((char) => char + char).join("") : raw.padStart(6, "f");
  const num = Number.parseInt(safe, 16);
  const factor = 1 - clamp(amount, 0, 1);
  const r = Math.round(((num >> 16) & 255) * factor);
  const g = Math.round(((num >> 8) & 255) * factor);
  const b = Math.round((num & 255) * factor);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
