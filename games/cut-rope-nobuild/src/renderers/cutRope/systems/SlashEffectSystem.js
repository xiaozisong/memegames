import * as PIXI from "pixi.js";

export class SlashEffectSystem {
  constructor(parent, toColorNumber) {
    this.toColorNumber = toColorNumber;
    this.container = new PIXI.Container();
    this.container.eventMode = "none";
    parent.addChild(this.container);

    this.trailGraphics = new PIXI.Graphics();
    this.sparkGraphics = new PIXI.Graphics();
    this.container.addChild(this.trailGraphics, this.sparkGraphics);

    this.trails = [];
    this.sparks = [];
    this.colors = {
      core: 0xffffff,
      glow: 0x7ce8ff,
      accent: 0xd8f6ff,
    };
  }

  syncTheme(snapshot) {
    const colors = snapshot?.colors ?? {};
    this.colors.core = this.toColorNumber(colors.textPrimary, 0xffffff);
    this.colors.glow = this.toColorNumber(colors.accent ?? colors.ropeHover, 0x7ce8ff);
    this.colors.accent = this.toColorNumber(colors.cardBorder ?? colors.ropeHover, 0xd8f6ff);
  }

  addTrail(start, end, options = {}) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 8) return;

    this.trails.push({
      start: { x: start.x, y: start.y },
      end: { x: end.x, y: end.y },
      ttl: options.hit ? 0.24 : 0.18,
      life: options.hit ? 0.24 : 0.18,
      width: options.hit ? 14 : 10,
      glowWidth: options.hit ? 26 : 20,
      hit: Boolean(options.hit),
    });

    if (options.hit) {
      const midpoint = {
        x: (start.x + end.x) * 0.5,
        y: (start.y + end.y) * 0.5,
      };
      this.addImpact(midpoint, Math.min(18, 8 + (options.hitCount ?? 1) * 3));
    }
  }

  addImpact(point, particleCount = 12) {
    for (let index = 0; index < particleCount; index += 1) {
      const angle = (Math.PI * 2 * index) / particleCount + Math.random() * 0.4;
      const speed = 70 + Math.random() * 160;
      this.sparks.push({
        x: point.x,
        y: point.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        ttl: 0.22 + Math.random() * 0.08,
        life: 0.22 + Math.random() * 0.08,
        radius: 2 + Math.random() * 4,
      });
    }
  }

  update(dt) {
    const safeDt = Math.max(0.001, Math.min(0.05, Number(dt || 0.016)));

    this.trails = this.trails
      .map((trail) => ({ ...trail, life: trail.life - safeDt }))
      .filter((trail) => trail.life > 0);

    this.sparks = this.sparks
      .map((spark) => ({
        ...spark,
        life: spark.life - safeDt,
        x: spark.x + spark.vx * safeDt,
        y: spark.y + spark.vy * safeDt,
        vy: spark.vy + 520 * safeDt,
        vx: spark.vx * Math.exp(-3.6 * safeDt),
      }))
      .filter((spark) => spark.life > 0);

    this.render();
  }

  render() {
    this.trailGraphics.clear();
    this.sparkGraphics.clear();

    for (const trail of this.trails) {
      const alpha = clamp(trail.life / trail.ttl, 0, 1);
      this.trailGraphics.moveTo(trail.start.x, trail.start.y);
      this.trailGraphics.lineTo(trail.end.x, trail.end.y);
      this.trailGraphics.stroke({
        color: this.colors.glow,
        width: trail.glowWidth * (0.7 + alpha * 0.3),
        alpha: alpha * (trail.hit ? 0.22 : 0.16),
        cap: "round",
        join: "round",
      });

      this.trailGraphics.moveTo(trail.start.x, trail.start.y);
      this.trailGraphics.lineTo(trail.end.x, trail.end.y);
      this.trailGraphics.stroke({
        color: this.colors.accent,
        width: trail.width * (0.75 + alpha * 0.25),
        alpha: alpha * (trail.hit ? 0.62 : 0.46),
        cap: "round",
        join: "round",
      });

      this.trailGraphics.moveTo(trail.start.x, trail.start.y);
      this.trailGraphics.lineTo(trail.end.x, trail.end.y);
      this.trailGraphics.stroke({
        color: this.colors.core,
        width: Math.max(2, trail.width * 0.24),
        alpha: alpha * 0.95,
        cap: "round",
        join: "round",
      });
    }

    for (const spark of this.sparks) {
      const alpha = clamp(spark.life / spark.ttl, 0, 1);
      this.sparkGraphics.circle(spark.x, spark.y, spark.radius * (0.65 + alpha * 0.35)).fill({
        color: this.colors.glow,
        alpha: alpha * 0.26,
      });
      this.sparkGraphics.circle(spark.x, spark.y, Math.max(1, spark.radius * 0.42)).fill({
        color: this.colors.core,
        alpha: alpha * 0.94,
      });
    }
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}
