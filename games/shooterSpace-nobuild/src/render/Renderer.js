function createStarLayer(count, width, height, options) {
  const stars = [];
  for (let index = 0; index < count; index += 1) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: options.radiusMin + Math.random() * (options.radiusMax - options.radiusMin),
      alpha: options.alphaMin + Math.random() * (options.alphaMax - options.alphaMin)
    });
  }
  return stars;
}

export class Renderer {
  constructor(root, config) {
    this.root = root;
    this.config = config;
    this.imageCache = new Map();
    this.theme = {
      primary: config.player.theme?.primary ?? "#38bdf8",
      secondary: config.player.theme?.secondary ?? "#1d4ed8",
      wing: config.player.theme?.wing ?? "#dbeafe",
      core: config.player.theme?.core ?? "rgba(255,255,255,0.88)",
      glow: config.player.theme?.glow ?? "rgba(56, 189, 248, 0.35)",
      hud: config.player.theme?.hud ?? "rgba(125, 211, 252, 0.4)",
      hudText: config.player.theme?.hudText ?? "#93c5fd",
      bossBar: config.player.theme?.bossBar ?? "#fb7185"
    };
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    this.canvas.style.touchAction = "none";
    this.ctx = this.canvas.getContext("2d");
    this.root.replaceChildren(this.canvas);

    const { width, height } = config.world;
    const nearCount = config.background.starCountNear;
    const farCount = config.background.starCountFar;
    this.nearStars = createStarLayer(nearCount, width, height, {
      radiusMin: 1.2,
      radiusMax: 2.8,
      alphaMin: 0.4,
      alphaMax: 0.95
    });
    this.farStars = createStarLayer(farCount, width, height, {
      radiusMin: 0.5,
      radiusMax: 1.6,
      alphaMin: 0.18,
      alphaMax: 0.65
    });
  }

  resize(state) {
    const rect = this.root.getBoundingClientRect();
    const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
    const canvasWidth = Math.max(1, Math.round(rect.width * devicePixelRatio));
    const canvasHeight = Math.max(1, Math.round(rect.height * devicePixelRatio));

    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;

    const scale = Math.min(
      canvasWidth / this.config.world.width,
      canvasHeight / this.config.world.height
    );

    state.setViewport({
      canvasWidth,
      canvasHeight,
      scale,
      offsetX: (canvasWidth - this.config.world.width * scale) / 2,
      offsetY: (canvasHeight - this.config.world.height * scale) / 2
    });
  }

  screenToWorldX(screenX, state) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / Math.max(1, rect.width);
    const pixelX = screenX * scaleX;
    const worldX = (pixelX - state.viewport.offsetX) / state.viewport.scale;
    return Math.max(0, Math.min(state.bounds.width, worldX));
  }

  render(state) {
    const ctx = this.ctx;
    const viewport = state.viewport;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawOuterBackground(ctx);

    ctx.save();
    ctx.translate(viewport.offsetX, viewport.offsetY);
    ctx.scale(viewport.scale, viewport.scale);

    this.drawGameField(ctx, state);
    this.drawParticles(ctx, state.particles);
    this.drawBullets(ctx, state.bullets);
    this.drawEnemies(ctx, state.enemies);
    this.drawBosses(ctx, state.bosses);
    this.drawPowerUps(ctx, state.powerUps);

    if (state.player) {
      this.drawPlayer(ctx, state.player, state.firepowerLevel);
    }

    ctx.restore();

    this.drawHud(ctx, state);

    if (state.gameOver) {
      this.drawGameOver(ctx, state);
    }
  }

  drawOuterBackground(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, "#020617");
    gradient.addColorStop(1, "#071428");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGameField(ctx, state) {
    const width = this.config.world.width;
    const height = this.config.world.height;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#07111f");
    gradient.addColorStop(0.55, "#081729");
    gradient.addColorStop(1, "#0c2238");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();

    this.drawNebula(ctx, width * 0.2, 120, 180, "rgba(56, 189, 248, 0.18)");
    this.drawNebula(ctx, width * 0.78, 250, 150, "rgba(168, 85, 247, 0.16)");
    this.drawNebula(ctx, width * 0.52, 560, 220, "rgba(59, 130, 246, 0.14)");
    this.drawGrid(ctx, state.backgroundScroll, width, height);
    this.drawStars(ctx, state.backgroundScroll, height);

    ctx.restore();
  }

  drawNebula(ctx, x, y, radius, color) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, color);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawGrid(ctx, scroll, width, height) {
    const spacing = this.config.background.gridSpacing;
    const offset = scroll % spacing;
    ctx.strokeStyle = `${this.theme.primary}14`;
    ctx.lineWidth = 1;

    for (let y = -spacing; y < height + spacing; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y + offset);
      ctx.lineTo(width, y + offset);
      ctx.stroke();
    }

    for (let x = 0; x < width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }

  drawStars(ctx, scroll, height) {
    const farOffset = (scroll * 0.35) % height;
    const nearOffset = (scroll * 0.8) % height;

    for (const star of this.farStars) {
      const y = (star.y + farOffset) % height;
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = "#dbeafe";
      ctx.beginPath();
      ctx.arc(star.x, y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const star of this.nearStars) {
      const y = (star.y + nearOffset) % height;
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(star.x, y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  drawBullets(ctx, bullets) {
    for (const bullet of bullets) {
      if (bullet.trail?.length > 1) {
        this.drawBulletTrail(ctx, bullet);
      }

      ctx.save();
      ctx.translate(bullet.x, bullet.y);
      ctx.rotate(bullet.rotation ?? 0);
      ctx.shadowColor = bullet.color;
      ctx.shadowBlur = bullet.glowBlur ?? 14;

      const bulletImage = this.getCachedImage(bullet.sprite);
      if (bulletImage?.complete && bulletImage.naturalWidth > 0) {
        ctx.drawImage(
          bulletImage,
          -bullet.width / 2,
          -bullet.height / 2,
          bullet.width,
          bullet.height
        );
        ctx.restore();
        continue;
      }

      if (bullet.renderStyle === "laser") {
        this.drawLaserBullet(ctx, bullet);
      } else {
        this.drawDefaultBullet(ctx, bullet);
      }

      ctx.restore();
    }
  }

  getCachedImage(src) {
    if (typeof src !== "string" || !src.trim()) {
      return null;
    }

    if (!this.imageCache.has(src)) {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
      this.imageCache.set(src, image);
    }

    return this.imageCache.get(src);
  }

  drawBulletTrail(ctx, bullet) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = bullet.color;
    ctx.lineCap = "round";

    for (let index = 0; index < bullet.trail.length - 1; index += 1) {
      const point = bullet.trail[index];
      const nextPoint = bullet.trail[index + 1];
      const alpha = (1 - index / bullet.trail.length) * 0.34;

      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(1.5, bullet.width * (0.34 - index * 0.02));
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(nextPoint.x, nextPoint.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawDefaultBullet(ctx, bullet) {
    const glow = ctx.createLinearGradient(0, -bullet.height / 2, 0, bullet.height / 2);
    glow.addColorStop(0, "#ffffff");
    glow.addColorStop(0.45, bullet.color);
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.roundRect(
      -bullet.width / 2,
      -bullet.height / 2,
      bullet.width,
      bullet.height,
      bullet.width / 2
    );
    ctx.fill();
  }

  drawLaserBullet(ctx, bullet) {
    const widthGrowthFactor =
      bullet.maxAge && Number.isFinite(bullet.maxAge)
        ? Math.min(1, bullet.age / Math.max(0.0001, bullet.maxAge))
        : 1;
    const liveWidth = bullet.width + (bullet.widthGrowth ?? 0) * widthGrowthFactor;
    const glow = ctx.createLinearGradient(0, -bullet.height / 2, 0, bullet.height / 2);
    glow.addColorStop(0, "rgba(255,255,255,0.98)");
    glow.addColorStop(0.25, bullet.color);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.roundRect(
      -liveWidth / 2,
      -bullet.height / 2,
      liveWidth,
      bullet.height,
      Math.max(4, liveWidth / 2)
    );
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.roundRect(
      -Math.max(1.5, liveWidth * 0.16),
      -bullet.height / 2,
      Math.max(3, liveWidth * 0.32),
      bullet.height,
      Math.max(2, liveWidth * 0.16)
    );
    ctx.fill();
  }

  drawPlayerTailFlame(ctx, player) {
    const flameConfig = this.config.player.tailFlame ?? {};
    const themeMap = {
      blue: {
        core: "rgba(255,255,255,0.96)",
        mid: "rgba(59,130,246,0.92)",
        glow: "rgba(96,165,250,0.34)"
      },
      red: {
        core: "rgba(255,255,255,0.96)",
        mid: "rgba(239,68,68,0.92)",
        glow: "rgba(248,113,113,0.34)"
      },
      green: {
        core: "rgba(255,255,255,0.96)",
        mid: "rgba(34,197,94,0.9)",
        glow: "rgba(74,222,128,0.34)"
      },
      yellow: {
        core: "rgba(255,255,255,0.96)",
        mid: "rgba(250,204,21,0.94)",
        glow: "rgba(253,224,71,0.34)"
      }
    };
    const theme = themeMap[flameConfig.theme] ?? themeMap.blue;
    const lengthMin = flameConfig.minLength ?? 72;
    const lengthMax = flameConfig.maxLength ?? 98;
    const flameWidth = flameConfig.width ?? 26;
    const t = player.renderTime ?? 0;
    const length =
      (lengthMin + lengthMax) / 2 +
      Math.sin(t * 10.2) * Math.max(5, (lengthMax - lengthMin) * 0.36) +
      Math.cos(t * 14.1) * Math.max(2, (lengthMax - lengthMin) * 0.12);
    const alpha = 0.82 + Math.sin(t * 12.4) * 0.08;
    const topHalfWidth = Math.max(8, flameWidth * 0.46 + Math.sin(t * 8.6) * 1.2);
    const midHalfWidth = Math.max(6, flameWidth * 0.28 + Math.cos(t * 7.1) * 0.9);
    const tipHalfWidth = Math.max(2.2, flameWidth * 0.1 + Math.sin(t * 11.4) * 0.35);
    const startY = player.height * 0.16;
    const endY = startY + length;
    const particles = player.tailFlameParticles ?? (player.tailFlameParticles = []);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha * 0.96;

    const glow = ctx.createRadialGradient(0, startY + length * 0.14, 2, 0, startY + length * 0.32, topHalfWidth * 2.5);
    glow.addColorStop(0, "rgba(255,255,255,0.88)");
    glow.addColorStop(0.34, theme.glow);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, startY + length * 0.3, topHalfWidth * 1.3, length * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();

    const gradient = ctx.createLinearGradient(0, startY, 0, endY);
    gradient.addColorStop(0, theme.core);
    gradient.addColorStop(0.2, theme.mid);
    gradient.addColorStop(0.76, theme.mid.replace(/0\.\d+\)/, "0.18)"));
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-topHalfWidth, startY);
    ctx.quadraticCurveTo(-midHalfWidth, startY + length * 0.42, -tipHalfWidth, endY);
    ctx.lineTo(tipHalfWidth, endY);
    ctx.quadraticCurveTo(midHalfWidth, startY + length * 0.42, topHalfWidth, startY);
    ctx.closePath();
    ctx.fill();

    const coreGradient = ctx.createLinearGradient(0, startY, 0, startY + length * 0.7);
    coreGradient.addColorStop(0, "rgba(255,255,255,1)");
    coreGradient.addColorStop(0.28, theme.core);
    coreGradient.addColorStop(0.66, theme.mid.replace(/0\.\d+\)/, "0.4)"));
    coreGradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalAlpha = Math.min(1, alpha + 0.1);
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.moveTo(-topHalfWidth * 0.42, startY + 1);
    ctx.quadraticCurveTo(-midHalfWidth * 0.4, startY + length * 0.32, -tipHalfWidth * 0.55, startY + length * 0.82);
    ctx.lineTo(tipHalfWidth * 0.55, startY + length * 0.82);
    ctx.quadraticCurveTo(midHalfWidth * 0.4, startY + length * 0.32, topHalfWidth * 0.42, startY + 1);
    ctx.closePath();
    ctx.fill();

    const spawnCount = Math.floor(Math.random() * 3) + 1;
    for (let index = 0; index < spawnCount; index += 1) {
      const particle = {
        x: randomBetween(-topHalfWidth * 0.18, topHalfWidth * 0.18),
        y: startY + length * randomBetween(0.58, 0.92),
        vx: randomBetween(-7, 7),
        vy: randomBetween(44, 90),
        size: randomBetween(0.9, 1.8),
        life: randomBetween(0.14, 0.26),
        alpha: randomBetween(0.32, 0.72)
      };
      particle.maxLife = particle.life;
      particles.push(particle);
    }

    while (particles.length > 20) {
      particles.shift();
    }

    particles.forEach((particle) => {
      particle.x += particle.vx / 60;
      particle.y += particle.vy / 60;
      particle.life -= 1 / 60;
    });

    player.tailFlameParticles = particles.filter((particle) => particle.life > 0 && particle.y < endY + 22);
    player.tailFlameParticles.forEach((particle) => {
      const particleAlpha = particle.alpha * (particle.life / Math.max(0.001, particle.maxLife));
      const spark = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 4.2);
      spark.addColorStop(0, `rgba(255,255,255,${particleAlpha})`);
      spark.addColorStop(0.4, theme.mid.replace(/0\.\d+\)/, `${Math.max(0.1, particleAlpha * 0.9)})`));
      spark.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = spark;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 3.8, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  drawParticles(ctx, particles) {
    for (const particle of particles) {
      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawEnemies(ctx, enemies) {
    for (const enemy of enemies) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.shadowColor = enemy.tint;
      ctx.shadowBlur = 18;

      ctx.fillStyle = "rgba(9, 16, 28, 0.9)";
      ctx.beginPath();
      ctx.moveTo(0, -enemy.height * 0.52);
      ctx.lineTo(-enemy.width * 0.42, enemy.height * 0.1);
      ctx.lineTo(-enemy.width * 0.26, enemy.height * 0.5);
      ctx.lineTo(0, enemy.height * 0.22);
      ctx.lineTo(enemy.width * 0.26, enemy.height * 0.5);
      ctx.lineTo(enemy.width * 0.42, enemy.height * 0.1);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = enemy.tint;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = enemy.tint;
      ctx.fillRect(-enemy.width * 0.1, -enemy.height * 0.08, enemy.width * 0.2, enemy.height * 0.38);

      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(-enemy.width * 0.14, -enemy.height * 0.1, 4, 0, Math.PI * 2);
      ctx.arc(enemy.width * 0.14, -enemy.height * 0.1, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawBosses(ctx, bosses) {
    for (const boss of bosses) {
      ctx.save();
      ctx.translate(boss.x, boss.y);
      ctx.shadowColor = boss.tint;
      ctx.shadowBlur = 28;

      const shell = ctx.createLinearGradient(0, -boss.height / 2, 0, boss.height / 2);
      shell.addColorStop(0, "#1f2937");
      shell.addColorStop(0.55, "#111827");
      shell.addColorStop(1, "#0f172a");
      ctx.fillStyle = shell;

      ctx.beginPath();
      ctx.moveTo(0, -boss.height * 0.54);
      ctx.lineTo(-boss.width * 0.36, -boss.height * 0.08);
      ctx.lineTo(-boss.width * 0.5, boss.height * 0.18);
      ctx.lineTo(-boss.width * 0.24, boss.height * 0.46);
      ctx.lineTo(0, boss.height * 0.28);
      ctx.lineTo(boss.width * 0.24, boss.height * 0.46);
      ctx.lineTo(boss.width * 0.5, boss.height * 0.18);
      ctx.lineTo(boss.width * 0.36, -boss.height * 0.08);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = boss.tint;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = boss.tint;
      ctx.fillRect(-boss.width * 0.28, -boss.height * 0.1, boss.width * 0.56, 18);
      ctx.fillRect(-18, -boss.height * 0.3, 36, boss.height * 0.5);

      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(-boss.width * 0.17, -boss.height * 0.08, 7, 0, Math.PI * 2);
      ctx.arc(boss.width * 0.17, -boss.height * 0.08, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  drawPowerUps(ctx, powerUps) {
    for (const powerUp of powerUps) {
      ctx.save();
      ctx.translate(powerUp.x, powerUp.y);
      ctx.rotate(Math.sin(powerUp.elapsed * 4) * 0.18);
      ctx.shadowColor = powerUp.color;
      ctx.shadowBlur = 18;

      ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
      ctx.beginPath();
      ctx.roundRect(
        -powerUp.width / 2,
        -powerUp.height / 2,
        powerUp.width,
        powerUp.height,
        8
      );
      ctx.fill();

      ctx.strokeStyle = powerUp.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = powerUp.color;
      ctx.fillRect(-3, -8, 6, 16);
      ctx.fillRect(-8, -3, 16, 6);
      ctx.restore();
    }
  }

  drawPlayer(ctx, player, firepowerLevel) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.shadowColor = this.theme.primary;
    ctx.shadowBlur = 22;
    if (player.invulnerabilityTimer > 0) {
      ctx.globalAlpha = Math.sin(player.invulnerabilityTimer * 36) > 0 ? 0.42 : 0.92;
    }
    player.renderTime = (player.renderTime ?? 0) + 1 / 60;

    this.drawPlayerTailFlame(ctx, player);

    const playerImage = this.getCachedImage(this.config.player.image);
    if (playerImage?.complete && playerImage.naturalWidth > 0) {
      const spriteScale = 1.44;
      ctx.drawImage(
        playerImage,
        -(player.width * spriteScale) / 2,
        -(player.height * spriteScale) / 2,
        player.width * spriteScale,
        player.height * spriteScale
      );
      ctx.restore();
      return;
    }

    const hull = ctx.createLinearGradient(0, -player.height / 2, 0, player.height / 2);
    hull.addColorStop(0, this.theme.wing);
    hull.addColorStop(0.5, this.theme.primary);
    hull.addColorStop(1, this.theme.secondary);
    ctx.fillStyle = hull;

    ctx.beginPath();
    ctx.moveTo(0, -player.height * 0.55);
    ctx.lineTo(-player.width * 0.18, -player.height * 0.12);
    ctx.lineTo(-player.width * 0.46, player.height * 0.44);
    ctx.lineTo(-player.width * 0.1, player.height * 0.2);
    ctx.lineTo(0, player.height * 0.45);
    ctx.lineTo(player.width * 0.1, player.height * 0.2);
    ctx.lineTo(player.width * 0.46, player.height * 0.44);
    ctx.lineTo(player.width * 0.18, -player.height * 0.12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.theme.core;
    ctx.beginPath();
    ctx.moveTo(0, -player.height * 0.36);
    ctx.lineTo(-player.width * 0.08, player.height * 0.18);
    ctx.lineTo(0, player.height * 0.08);
    ctx.lineTo(player.width * 0.08, player.height * 0.18);
    ctx.closePath();
    ctx.fill();

    if (firepowerLevel >= 2) {
      ctx.fillStyle = this.theme.secondary;
      ctx.fillRect(-player.width * 0.44, -2, 8, 20);
      ctx.fillRect(player.width * 0.44 - 8, -2, 8, 20);
    }

    if (firepowerLevel >= 3) {
      ctx.fillStyle = this.theme.primary;
      ctx.beginPath();
      ctx.arc(0, player.height * 0.02, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawHud(ctx, state) {
    const { scale, offsetX, offsetY } = state.viewport;
    const panelWidth = 168 * scale;
    const panelHeight = 72 * scale;
    const top = offsetY + 16 * scale;
    const left = offsetX + 16 * scale;
    const right = offsetX + this.config.world.width * scale - panelWidth - 16 * scale;
    const centerX = offsetX + this.config.world.width * scale / 2;

    ctx.save();
    ctx.fillStyle = "rgba(2, 6, 23, 0.7)";
    ctx.strokeStyle = this.theme.hud;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.roundRect(left, top, panelWidth, panelHeight, 18 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(right, top, panelWidth, panelHeight, 18 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.theme.hudText;
    ctx.font = `${12 * scale}px Arial, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(this.config.ui.scoreLabel, left + 14 * scale, top + 10 * scale);
    ctx.fillText(this.config.ui.fireLabel, right + 14 * scale, top + 10 * scale);

    ctx.fillStyle = "#f8fafc";
    ctx.font = `bold ${24 * scale}px Arial, sans-serif`;
    ctx.fillText(String(state.score).padStart(4, "0"), left + 14 * scale, top + 24 * scale);
    ctx.fillText(`Lv.${state.firepowerLevel}`, right + 14 * scale, top + 24 * scale);

    if (state.player) {
      const healthRatio = state.player.health / Math.max(1, state.player.maxHealth);
      const barX = right + 14 * scale;
      const barY = top + 50 * scale;
      const barWidth = panelWidth - 28 * scale;
      const barHeight = 8 * scale;

      ctx.fillStyle = this.theme.hudText;
      ctx.font = `${10 * scale}px Arial, sans-serif`;
      ctx.fillText(
        `${this.config.ui.healthLabel ?? "HP"} ${state.player.health}/${state.player.maxHealth}`,
        barX,
        top + 38 * scale
      );

      ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, barHeight / 2);
      ctx.fill();

      ctx.fillStyle = healthRatio > 0.34 ? this.theme.primary : "#fb7185";
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth * healthRatio, barHeight, barHeight / 2);
      ctx.fill();
    }

    const waveWidth = 124 * scale;
    const waveHeight = 42 * scale;
    const waveX = centerX - waveWidth / 2;
    const waveY = top + 7 * scale;
    ctx.beginPath();
    ctx.roundRect(waveX, waveY, waveWidth, waveHeight, 16 * scale);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = this.theme.hudText;
    ctx.font = `${11 * scale}px Arial, sans-serif`;
    ctx.fillText(this.config.ui.waveLabel, centerX, waveY + 9 * scale);
    ctx.fillStyle = "#f8fafc";
    ctx.font = `bold ${20 * scale}px Arial, sans-serif`;
    ctx.fillText(String(state.wave.level), centerX, waveY + 26 * scale);

    const activeBoss = state.bosses.find((boss) => !boss.isDestroyed);
    if (activeBoss) {
      const bossBarWidth = this.config.world.width * scale - 48 * scale;
      const bossBarHeight = 12 * scale;
      const bossBarX = offsetX + 24 * scale;
      const bossBarY = top + panelHeight + 12 * scale;

      ctx.textAlign = "left";
      ctx.fillStyle = "#fca5a5";
      ctx.font = `${12 * scale}px Arial, sans-serif`;
      ctx.fillText(this.config.ui.bossLabel, bossBarX, bossBarY - 16 * scale);

      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.beginPath();
      ctx.roundRect(bossBarX, bossBarY, bossBarWidth, bossBarHeight, bossBarHeight / 2);
      ctx.fill();

      ctx.fillStyle = this.theme.bossBar;
      ctx.beginPath();
      ctx.roundRect(
        bossBarX,
        bossBarY,
        bossBarWidth * (activeBoss.health / activeBoss.maxHealth),
        bossBarHeight,
        bossBarHeight / 2
      );
      ctx.fill();
    }

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(226, 232, 240, 0.78)";
    ctx.font = `${11 * scale}px Arial, sans-serif`;
    ctx.fillText("A / D / <- -> / 鼠标拖动", offsetX + 18 * scale, offsetY + this.config.world.height * scale - 32 * scale);
    ctx.restore();
  }

  drawGameOver(ctx, state) {
    const { scale, offsetX, offsetY } = state.viewport;
    const width = this.config.world.width * scale;
    const height = this.config.world.height * scale;

    ctx.save();
    ctx.fillStyle = "rgba(2, 6, 23, 0.72)";
    ctx.fillRect(offsetX, offsetY, width, height);

    const cardWidth = Math.min(width - 40 * scale, 320 * scale);
    const cardHeight = 170 * scale;
    const cardX = offsetX + (width - cardWidth) / 2;
    const cardY = offsetY + (height - cardHeight) / 2;

    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.strokeStyle = "rgba(248, 113, 113, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 22 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fca5a5";
    ctx.textAlign = "center";
    ctx.font = `bold ${28 * scale}px Arial, sans-serif`;
    ctx.fillText(this.config.ui.gameOverTitle, offsetX + width / 2, cardY + 48 * scale);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = `${14 * scale}px Arial, sans-serif`;
    ctx.fillText(this.config.ui.gameOverSubtitle, offsetX + width / 2, cardY + 86 * scale);

    ctx.fillStyle = "#fde68a";
    ctx.font = `bold ${18 * scale}px Arial, sans-serif`;
    ctx.fillText(`本次得分 ${state.score}`, offsetX + width / 2, cardY + 122 * scale);

    ctx.fillStyle = this.theme.hudText;
    ctx.font = `${13 * scale}px Arial, sans-serif`;
    ctx.fillText("高火力会在更高分数自动解锁", offsetX + width / 2, cardY + 146 * scale);
    ctx.restore();
  }
}
