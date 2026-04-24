type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
};

const particles: Particle[] = [];
const GRAVITY = 220;

export function spawnParticles(x: number, y: number): void {
  const count = 10 + Math.floor(Math.random() * 6);

  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 140;
    const life = 0.45 + Math.random() * 0.35;

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20,
      life,
      maxLife: life,
      radius: 1.5 + Math.random() * 2
    });
  }
}

export function updateParticles(deltaTime = 1 / 60): void {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.vy += GRAVITY * deltaTime;
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
    p.life -= deltaTime;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

export function renderParticles(ctx: CanvasRenderingContext2D): void {
  if (particles.length === 0) return;

  ctx.save();
  ctx.fillStyle = "#fbbf24";

  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
