import { Bullet } from "./Bullet.js";

const DEFAULT_ATTACK_MODES = [
  { label: "A", base: "dual", modifiers: ["trail"], fireInterval: 0.16, modeDuration: 3 },
  { label: "B", base: "spread", modifiers: ["wave", "trail"], fireInterval: 0.19, modeDuration: 3 },
  { label: "C", base: "laser", modifiers: ["trail"], fireInterval: 0.24, modeDuration: 3, widthGrowth: 8 }
];

function fallbackAttackModeLabel(index) {
  return String.fromCharCode(65 + index);
}

function normalizeAttackModes(modes) {
  const source = Array.isArray(modes) && modes.length > 0 ? modes : DEFAULT_ATTACK_MODES;
  return source.map((mode, index) => ({
    label: mode?.label ?? fallbackAttackModeLabel(index),
    base: mode?.base ?? "single",
    modifiers: Array.isArray(mode?.modifiers) ? mode.modifiers.filter(Boolean) : [],
    fireInterval:
      mode?.fireInterval ??
      (mode?.base === "laser" ? 0.24 : mode?.base === "spread" ? 0.18 : 0.16),
    modeDuration: mode?.modeDuration ?? 3,
    count: mode?.count,
    spreadAngle: mode?.spreadAngle,
    bulletSpeed: mode?.bulletSpeed,
    rotateSpeed: mode?.rotateSpeed,
    waveAmplitude: mode?.waveAmplitude,
    waveFrequency: mode?.waveFrequency,
    trackingStrength: mode?.trackingStrength,
    trailLength: mode?.trailLength,
    widthGrowth: mode?.widthGrowth
  }));
}

function appendBeforeUpdateHook(bullet, hook) {
  bullet.beforeUpdateHooks.push(hook);
}

function appendAfterUpdateHook(bullet, hook) {
  bullet.afterUpdateHooks.push(hook);
}

function findNearestTarget(bullet, state) {
  const targets = [...state.bosses, ...state.enemies].filter((target) => !target.isDestroyed);
  if (targets.length === 0) {
    return null;
  }

  let nearestTarget = targets[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const target of targets) {
    const dx = target.x - bullet.x;
    const dy = target.y - bullet.y;
    const distance = dx * dx + dy * dy;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestTarget = target;
    }
  }

  return nearestTarget;
}

const ATTACK_MODIFIERS = {
  tracking(bullet, emitContext) {
    appendBeforeUpdateHook(bullet, (_bullet, delta, state) => {
      const target = findNearestTarget(bullet, state);
      if (!target) {
        return;
      }

      const dx = target.x - bullet.x;
      const dy = target.y - bullet.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const desiredVX = (dx / distance) * bullet.speed;
      const desiredVY = (dy / distance) * bullet.speed;
      const steer = Math.min(1, delta * (emitContext.mode.trackingStrength ?? 2.6));

      bullet.vx += (desiredVX - bullet.vx) * steer;
      bullet.vy += (desiredVY - bullet.vy) * steer;
    });
  },
  rotate(bullet, emitContext) {
    const rotateDirection = bullet.spawnIndex % 2 === 0 ? -1 : 1;
    const rotateAmplitude = emitContext.mode.rotateAmplitude ?? 18;
    const rotateFrequency = emitContext.mode.rotateSpeed ?? 7.2;

    appendAfterUpdateHook(bullet, () => {
      const nextOffset =
        Math.sin(bullet.age * rotateFrequency + bullet.seed) * rotateAmplitude * rotateDirection;
      bullet.x += nextOffset - (bullet.rotateOffset ?? 0);
      bullet.rotateOffset = nextOffset;
    });
  },
  wave(bullet, emitContext) {
    appendAfterUpdateHook(bullet, () => {
      const nextOffset =
        Math.sin(bullet.age * (emitContext.mode.waveFrequency ?? 10) + bullet.seed) *
        (emitContext.mode.waveAmplitude ?? 18);
      bullet.x += nextOffset - bullet.waveOffset;
      bullet.waveOffset = nextOffset;
    });
  },
  trail(bullet, emitContext) {
    bullet.trailLength =
      emitContext.mode.trailLength ?? (bullet.renderStyle === "laser" ? 12 : 8);

    appendAfterUpdateHook(bullet, () => {
      bullet.trail.unshift({ x: bullet.x, y: bullet.y });
      bullet.trail.length = Math.min(bullet.trail.length, bullet.trailLength);
    });
  }
};

const ATTACK_PATTERNS = {
  dual(emitContext) {
    const baseSpeed = emitContext.mode.bulletSpeed ?? emitContext.bulletConfig.speed;

    if (emitContext.level <= 1) {
      return [-12, 12].map((offsetX) => ({
        offsetX,
        offsetY: 0,
        vx: 0,
        vy: -baseSpeed,
        width: emitContext.bulletConfig.width,
        height: emitContext.bulletConfig.height,
        color: emitContext.primaryColor,
        damage: 1
      }));
    }

    if (emitContext.level === 2) {
      return [
        {
          offsetX: -14,
          offsetY: 2,
          vx: 0,
          vy: -baseSpeed,
          width: emitContext.bulletConfig.width,
          height: emitContext.bulletConfig.height,
          color: emitContext.secondaryColor,
          damage: 1
        },
        {
          offsetX: 0,
          offsetY: -2,
          vx: 0,
          vy: -baseSpeed * 1.04,
          width: emitContext.bulletConfig.width + 2,
          height: emitContext.bulletConfig.height + 2,
          color: emitContext.primaryColor,
          damage: 2
        },
        {
          offsetX: 14,
          offsetY: 2,
          vx: 0,
          vy: -baseSpeed,
          width: emitContext.bulletConfig.width,
          height: emitContext.bulletConfig.height,
          color: emitContext.secondaryColor,
          damage: 1
        }
      ];
    }

    return [
      {
        offsetX: -22,
        offsetY: 6,
        vx: -emitContext.bulletConfig.spreadVelocityX * 0.26,
        vy: -baseSpeed * 0.95,
        width: emitContext.bulletConfig.width,
        height: emitContext.bulletConfig.height,
        color: emitContext.secondaryColor,
        damage: 1
      },
      {
        offsetX: -8,
        offsetY: 0,
        vx: 0,
        vy: -baseSpeed,
        width: emitContext.bulletConfig.width,
        height: emitContext.bulletConfig.height,
        color: emitContext.primaryColor,
        damage: 1
      },
      {
        offsetX: 8,
        offsetY: 0,
        vx: 0,
        vy: -baseSpeed,
        width: emitContext.bulletConfig.width,
        height: emitContext.bulletConfig.height,
        color: emitContext.primaryColor,
        damage: 1
      },
      {
        offsetX: 22,
        offsetY: 6,
        vx: emitContext.bulletConfig.spreadVelocityX * 0.26,
        vy: -baseSpeed * 0.95,
        width: emitContext.bulletConfig.width,
        height: emitContext.bulletConfig.height,
        color: emitContext.secondaryColor,
        damage: 1
      }
    ];
  },
  single(emitContext) {
    const baseSpeed = emitContext.mode.bulletSpeed ?? emitContext.bulletConfig.speed;

    if (emitContext.level <= 1) {
      return [
        {
          offsetX: 0,
          offsetY: 0,
          vx: 0,
          vy: -baseSpeed,
          width: emitContext.bulletConfig.width,
          height: emitContext.bulletConfig.height,
          color: emitContext.primaryColor,
          damage: 1
        }
      ];
    }

    if (emitContext.level === 2) {
      return [-12, 12].map((offsetX) => ({
        offsetX,
        offsetY: 0,
        vx: 0,
        vy: -baseSpeed,
        width: emitContext.bulletConfig.width,
        height: emitContext.bulletConfig.height,
        color: emitContext.primaryColor,
        damage: 1
      }));
    }

    return [
      {
        offsetX: -16,
        offsetY: 4,
        vx: -emitContext.bulletConfig.spreadVelocityX * 0.45,
        vy: -baseSpeed * 0.96,
        width: emitContext.bulletConfig.width,
        height: emitContext.bulletConfig.height,
        color: emitContext.secondaryColor,
        damage: 1
      },
      {
        offsetX: 0,
        offsetY: 0,
        vx: 0,
        vy: -baseSpeed,
        width: emitContext.bulletConfig.width + 2,
        height: emitContext.bulletConfig.height + 2,
        color: emitContext.primaryColor,
        damage: 2
      },
      {
        offsetX: 16,
        offsetY: 4,
        vx: emitContext.bulletConfig.spreadVelocityX * 0.45,
        vy: -baseSpeed * 0.96,
        width: emitContext.bulletConfig.width,
        height: emitContext.bulletConfig.height,
        color: emitContext.secondaryColor,
        damage: 1
      }
    ];
  },
  spread(emitContext) {
    const baseCount = Math.max(3, emitContext.mode.count ?? 3);
    const count = baseCount + Math.max(0, emitContext.level - 1);
    const centerIndex = (count - 1) / 2;
    const speed = emitContext.mode.bulletSpeed ?? emitContext.bulletConfig.speed * 0.92;
    const spreadAngle = emitContext.mode.spreadAngle ?? 0.16;

    return Array.from({ length: count }, (_, index) => {
      const slot = index - centerIndex;
      const angle = slot * spreadAngle;
      return {
        offsetX: slot * 12,
        offsetY: -Math.abs(slot) * 2,
        vx: Math.sin(angle) * speed,
        vy: -Math.cos(angle) * speed,
        width: emitContext.bulletConfig.width,
        height: emitContext.bulletConfig.height,
        color: slot === 0 ? emitContext.primaryColor : emitContext.secondaryColor,
        damage: slot === 0 ? 2 : 1
      };
    });
  },
  laser(emitContext) {
    const beamOffsets =
      emitContext.level <= 1 ? [0] : emitContext.level === 2 ? [-10, 10] : [-18, 0, 18];
    const speed = emitContext.mode.bulletSpeed ?? emitContext.bulletConfig.speed * 1.18;

    return beamOffsets.map((offsetX, index) => ({
      offsetX,
      offsetY: -4,
      vx: 0,
      vy: -speed,
      width: emitContext.bulletConfig.width + 6 + (emitContext.level >= 3 && index === 1 ? 2 : 0),
      height: emitContext.bulletConfig.height * 2.2,
      color: index === 1 || beamOffsets.length === 1 ? emitContext.primaryColor : emitContext.secondaryColor,
      damage: emitContext.level >= 3 && (index === 1 || beamOffsets.length === 1) ? 3 : 2,
      renderStyle: "laser",
      glowBlur: 22,
      maxAge: 1.2,
      widthGrowth: emitContext.mode.widthGrowth ?? 8
    }));
  }
};

export class Player {
  constructor(config) {
    this.config = config;
    this.theme = {
      bulletPrimary: config.bullet.primaryColor ?? config.player.theme?.bulletPrimary ?? "#fef08a",
      bulletSecondary:
        config.bullet.secondaryColor ?? config.player.theme?.bulletSecondary ?? "#f59e0b"
    };
    this.width = config.player.width;
    this.height = config.player.height;
    this.speed = config.player.speed;
    this.pointerFollowLerp = config.player.pointerFollowLerp;
    this.autoFireInterval = config.player.autoFireInterval;
    this.attackModes = normalizeAttackModes(config.player.attackModes);
    this.attackModeIndex = 0;
    this.attackModeTimer = 0;
    this.x = config.world.width / 2;
    this.y = config.world.height - 90;
    this.fireCooldown = 0;
    this.maxHealth = Math.max(1, config.player.maxHealth ?? 6);
    this.health = this.maxHealth;
    this.invulnerabilityDuration = Math.max(0, config.player.invulnerabilityDuration ?? 0.42);
    this.invulnerabilityTimer = 0;
  }

  currentAttackMode() {
    return this.attackModes[this.attackModeIndex] ?? DEFAULT_ATTACK_MODES[0];
  }

  update(delta, state) {
    if (state.gameOver) return;

    this.invulnerabilityTimer = Math.max(0, this.invulnerabilityTimer - delta);

    const horizontalInput =
      (state.input.moveRight ? 1 : 0) - (state.input.moveLeft ? 1 : 0);

    if (horizontalInput !== 0) {
      this.x += horizontalInput * this.speed * delta;
    }

    if (state.input.pointerActive) {
      const blend = Math.min(1, delta * this.pointerFollowLerp);
      this.x += (state.input.pointerWorldX - this.x) * blend;
    }

    const halfWidth = this.width / 2;
    const padding = this.config.world.padding;
    this.x = Math.max(halfWidth + padding, Math.min(state.bounds.width - halfWidth - padding, this.x));

    const currentMode = this.currentAttackMode();
    this.attackModeTimer += delta;
    if (this.attackModeTimer >= currentMode.modeDuration) {
      this.attackModeTimer = 0;
      this.attackModeIndex = (this.attackModeIndex + 1) % this.attackModes.length;
    }

    this.fireCooldown -= delta;
    while (this.fireCooldown <= 0) {
      const mode = this.currentAttackMode();
      this.fireCooldown += mode.fireInterval ?? this.autoFireInterval;
      this.fire(state.firepowerLevel, state, mode);
    }
  }

  takeDamage(amount = 1) {
    if (this.invulnerabilityTimer > 0 || amount <= 0) {
      return false;
    }

    this.health = Math.max(0, this.health - amount);
    this.invulnerabilityTimer = this.invulnerabilityDuration;
    return this.health <= 0;
  }

  fire(level, state, mode = this.currentAttackMode()) {
    const bulletConfig = this.config.bullet;
    const muzzleY = this.y - this.height * 0.58;
    const emitContext = {
      level,
      mode,
      bulletConfig,
      primaryColor: this.theme.bulletPrimary,
      secondaryColor: this.theme.bulletSecondary,
      bulletSprite: bulletConfig.image ?? "",
      muzzleX: this.x,
      muzzleY
    };

    const pattern = ATTACK_PATTERNS[mode.base] ?? ATTACK_PATTERNS.single;
    const specs = pattern(emitContext);

    specs.forEach((spec, index) => {
      const bullet = new Bullet({
        x: this.x + (spec.offsetX ?? 0),
        y: muzzleY + (spec.offsetY ?? 0),
        vx: spec.vx ?? 0,
        vy: spec.vy ?? -bulletConfig.speed,
        width: spec.width ?? bulletConfig.width,
        height: spec.height ?? bulletConfig.height,
        color: spec.color ?? this.theme.bulletPrimary,
        owner: "player",
        damage: spec.damage ?? 1,
        sprite: emitContext.bulletSprite,
        renderStyle: spec.renderStyle ?? "default",
        glowBlur: spec.glowBlur ?? 14,
        maxAge: spec.maxAge ?? Number.POSITIVE_INFINITY,
        widthGrowth: spec.widthGrowth ?? 0
      });

      bullet.speed = Math.hypot(bullet.vx, bullet.vy) || bulletConfig.speed;
      bullet.spawnIndex = index;

      (mode.modifiers ?? []).forEach((modifierName) => {
        const modifier = ATTACK_MODIFIERS[modifierName];
        if (modifier) {
          modifier(bullet, emitContext);
        }
      });

      state.addBullet(bullet);
    });
  }

  getBounds() {
    return {
      left: this.x - this.width * 0.28,
      right: this.x + this.width * 0.28,
      top: this.y - this.height * 0.32,
      bottom: this.y + this.height * 0.34
    };
  }
}
