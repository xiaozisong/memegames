/**
 * Generic particle system for elimination games.
 * Pure Canvas2D implementation (no third-party dependencies).
 */
export class ParticleSystem {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    if (!this.ctx) {
      throw new Error("ParticleSystem requires a 2D canvas context.");
    }

    this.maxParticles = options.maxParticles ?? 200;
    this.gravity = options.gravity ?? 12; // ~0.2 per frame at 60fps
    this.shadowBlur = options.shadowBlur ?? 10;
    this.pool = [];
    this.particles = [];
  }

  /**
   * Resize backing store with device pixel ratio.
   */
  resize(width, height, dpr = window.devicePixelRatio || 1) {
    const nextW = Math.max(1, Math.floor(width * dpr));
    const nextH = Math.max(1, Math.floor(height * dpr));
    if (this.canvas.width !== nextW) this.canvas.width = nextW;
    if (this.canvas.height !== nextH) this.canvas.height = nextH;
    this.canvas.style.width = `${Math.max(1, Math.floor(width))}px`;
    this.canvas.style.height = `${Math.max(1, Math.floor(height))}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /**
   * Spawn 20~40 particles with 360deg random direction.
   */
  spawnExplosion(x, y, color = "#7df7ff") {
    const ramp = normalizeColorRamp(color);
    const count = this.randomInt(20, 40);
    for (let i = 0; i < count; i += 1) {
      if (this.particles.length >= this.maxParticles) {
        // Drop oldest particle to keep stable frame time.
        this.recycleParticle(this.particles.shift());
      }
      const angle = Math.random() * Math.PI * 2;
      const speed = this.randomFloat(2, 6);
      const particle = this.obtainParticle();
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.maxLife = this.randomFloat(0.45, 0.9);
      particle.life = particle.maxLife;
      particle.baseSize = this.randomFloat(1.8, 3.6);
      particle.size = particle.baseSize;
      particle.colorStart = ramp.start;
      particle.colorMid = ramp.mid;
      particle.colorEnd = ramp.end;
      particle.color = ramp.start;
      particle.alpha = 1;
      particle.decay = this.randomFloat(0.85, 1.2);
      this.particles.push(particle);
    }
  }

  /**
   * Update lifecycle.
   * dt is in seconds.
   */
  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vy += this.gravity * dt;
      p.life -= dt * p.decay;
      if (p.life <= 0) {
        this.recycleParticle(this.particles.splice(i, 1)[0]);
        continue;
      }

      p.alpha = p.life / p.maxLife;
      p.size = p.baseSize * (1 + (1 - p.alpha));
      p.color = evaluateColorRamp(p.colorStart, p.colorMid, p.colorEnd, 1 - p.alpha);
    }
  }

  /**
   * Draw all particles with glow.
   */
  render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (this.particles.length === 0) return;

    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = this.shadowBlur;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  clear() {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      this.recycleParticle(this.particles[i]);
    }
    this.particles.length = 0;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  destroy() {
    this.clear();
    this.pool.length = 0;
  }

  obtainParticle() {
    return this.pool.pop() ?? this.createParticle();
  }

  recycleParticle(particle) {
    if (!particle) return;
    this.pool.push(particle);
  }

  createParticle() {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      size: 0,
      baseSize: 0,
      color: "#ffffff",
      colorStart: "#ffffff",
      colorMid: "#ffffff",
      colorEnd: "#ffffff",
      alpha: 1,
      decay: 1,
    };
  }

  randomInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  randomFloat(min, max) {
    return min + Math.random() * (max - min);
  }
}

function normalizeColorRamp(input) {
  if (input && typeof input === "object" && "start" in input && "mid" in input && "end" in input) {
    return {
      start: safeHex(input.start, "#7df7ff"),
      mid: safeHex(input.mid, "#ffffff"),
      end: safeHex(input.end, "#1f5e91"),
    };
  }
  const start = safeHex(input, "#7df7ff");
  return {
    start,
    mid: "#ffffff",
    end: darkenHex(start, 0.45),
  };
}

function evaluateColorRamp(start, mid, end, t) {
  const p = clamp01(t);
  if (p <= 0.5) {
    return lerpHex(start, mid, p * 2);
  }
  return lerpHex(mid, end, (p - 0.5) * 2);
}

function lerpHex(a, b, t) {
  const aa = hexToRgb(a);
  const bb = hexToRgb(b);
  const k = clamp01(t);
  const r = Math.round(aa.r + (bb.r - aa.r) * k);
  const g = Math.round(aa.g + (bb.g - aa.g) * k);
  const bl = Math.round(aa.b + (bb.b - aa.b) * k);
  return rgbToHex(r, g, bl);
}

function darkenHex(hex, amount) {
  const rgb = hexToRgb(hex);
  const k = 1 - clamp01(amount);
  return rgbToHex(
    Math.round(rgb.r * k),
    Math.round(rgb.g * k),
    Math.round(rgb.b * k),
  );
}

function safeHex(value, fallback) {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("#")) return fallback;
  const raw = value.slice(1);
  if (!(raw.length === 3 || raw.length === 6)) return fallback;
  return `#${raw}`;
}

function hexToRgb(hex) {
  const safe = safeHex(hex, "#7df7ff").slice(1);
  const raw = safe.length === 3 ? safe.split("").map((c) => c + c).join("") : safe;
  const num = Number.parseInt(raw, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r, g, b) {
  const rr = clamp255(r).toString(16).padStart(2, "0");
  const gg = clamp255(g).toString(16).padStart(2, "0");
  const bb = clamp255(b).toString(16).padStart(2, "0");
  return `#${rr}${gg}${bb}`;
}

function clamp255(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
