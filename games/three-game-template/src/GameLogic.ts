import { getConfig } from "@game/core";

type GamePhase = "start" | "play" | "end";

type GameContext = {
  orb: any;
  glow: any;
  ring: any;
  shadow: any;
  setBaseY: (value: number) => void;
  setHint: (text: string) => void;
  setScore: (score: number) => void;
};

export const GameLogic = {
  state: {
    phase: "start" as GamePhase,
    score: 0,
    elapsed: 0,
    pulse: 0,
    baseY: 0
  },

  ctx: null as GameContext | null,

  init(ctx: GameContext): void {
    this.ctx = ctx;
    this.state.phase = "start";
    this.state.score = 0;
    this.state.elapsed = 0;
    this.state.pulse = 0;
    this.state.baseY = 0;
    this.ctx.setHint("点击场景开始");
    this.ctx.setScore(0);
  },

  onClick(): void {
    if (!this.ctx) return;

    if (this.state.phase === "start") {
      this.state.phase = "play";
      this.ctx.setHint("点击可触发脉冲反馈，按 R 重开");
      return;
    }

    if (this.state.phase === "play") {
      this.state.score += 10;
      this.state.pulse = 1;
      this.ctx.setScore(this.state.score);
      return;
    }

    this.reset();
  },

  update(deltaTime: number): void {
    if (!this.ctx || this.state.phase !== "play") return;

    const dt = Math.max(0.001, deltaTime);
    const rotationSpeedX = Number(getConfig("gameplay.params.rotationSpeedX") ?? 0.9);
    const rotationSpeedY = Number(getConfig("gameplay.params.rotationSpeedY") ?? 1.2);
    const bounceAmplitude = Number(getConfig("gameplay.params.bounceAmplitude") ?? 0.2);
    const bounceFrequency = Number(getConfig("gameplay.params.bounceFrequency") ?? 2.8);
    const pulseDecay = Number(getConfig("gameplay.params.pulseDecay") ?? 2.2);
    const baseScale = Number(getConfig("gameplay.params.baseScale") ?? 1);
    const baseGlowAlpha = Number(getConfig("gameplay.params.baseGlowAlpha") ?? 0.26);
    const targetScore = Number(getConfig("gameplay.params.targetScore") ?? 200);

    this.state.elapsed += dt;
    this.state.pulse = Math.max(0, this.state.pulse - pulseDecay * dt);

    const orb = this.ctx.orb;
    const floatOffset = Math.sin(this.state.elapsed * bounceFrequency) * bounceAmplitude * 44;
    orb.rotation += (rotationSpeedX + rotationSpeedY) * dt * 0.3;
    orb.y = this.state.baseY + floatOffset;

    const pulseScale = baseScale + this.state.pulse * 0.2;
    orb.scale.set(pulseScale, pulseScale);

    this.ctx.glow.alpha = Math.min(0.95, baseGlowAlpha + this.state.pulse * 0.65);
    this.ctx.glow.scale.set(0.95 + this.state.pulse * 0.45);
    this.ctx.ring.alpha = Math.max(0.08, 0.28 + this.state.pulse * 0.38);
    this.ctx.ring.scale.set(1 + this.state.pulse * 0.55);
    this.ctx.shadow.scale.set(1 + this.state.pulse * 0.12, 1 + this.state.pulse * 0.06);

    if (this.state.score >= targetScore) {
      this.state.phase = "end";
      this.ctx.setHint("达成目标分数！点击重新开始");
    }
  },

  reset(): void {
    if (!this.ctx) return;
    this.state.phase = "start";
    this.state.score = 0;
    this.state.elapsed = 0;
    this.state.pulse = 0;
    this.ctx.orb.rotation = 0;
    this.ctx.orb.y = this.state.baseY;
    this.ctx.orb.scale.set(1, 1);
    this.ctx.glow.alpha = Number(getConfig("gameplay.params.baseGlowAlpha") ?? 0.26);
    this.ctx.glow.scale.set(1, 1);
    this.ctx.ring.alpha = 0.24;
    this.ctx.ring.scale.set(1, 1);
    this.ctx.shadow.scale.set(1, 1);
    this.ctx.setScore(0);
    this.ctx.setHint("点击场景开始");
  },

  setBaseY(value: number): void {
    this.state.baseY = value;
    if (this.ctx) {
      this.ctx.setBaseY(value);
      if (this.state.phase !== "play") {
        this.ctx.orb.y = value;
      }
    }
  }
};
