import {
  PhysicsAdapter,
  PhysicsBodyCreateInput,
  PhysicsBodySnapshot,
  PhysicsEvent,
  PhysicsWorldConfig,
} from "./contracts";

type PhysicsBodyInternal = PhysicsBodySnapshot & {
  mass: number;
  restitution: number;
  damping: number;
};

export class SimplePhysicsAdapter implements PhysicsAdapter {
  private config: PhysicsWorldConfig = {
    gravityY: 0,
    bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
  };

  private nextId = 0;
  private bodies = new Map<string, PhysicsBodyInternal>();

  init(config: PhysicsWorldConfig): void {
    this.config = config;
    this.bodies.clear();
    this.nextId = 0;
  }

  createBody(input: PhysicsBodyCreateInput): string {
    const id = `p-${this.nextId++}`;
    this.bodies.set(id, {
      id,
      x: input.x,
      y: input.y,
      vx: input.vx,
      vy: input.vy,
      radius: input.radius,
      ttlMs: input.ttlMs,
      tag: input.tag,
      mass: input.mass,
      restitution: input.restitution,
      damping: input.damping,
    });
    return id;
  }

  step(deltaMs: number): PhysicsEvent[] {
    const events: PhysicsEvent[] = [];
    const dt = deltaMs / 1000;
    const gravityY = this.config.gravityY;
    const { minX, maxX, minY, maxY } = this.config.bounds;

    for (const body of this.bodies.values()) {
      body.vy += gravityY * dt;

      const dampingFactor = Math.max(0, 1 - body.damping * dt);
      body.vx *= dampingFactor;
      body.vy *= dampingFactor;

      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.ttlMs -= deltaMs;

      let bounced = false;
      if (body.x - body.radius < minX) {
        body.x = minX + body.radius;
        body.vx = Math.abs(body.vx) * body.restitution;
        bounced = true;
      } else if (body.x + body.radius > maxX) {
        body.x = maxX - body.radius;
        body.vx = -Math.abs(body.vx) * body.restitution;
        bounced = true;
      }

      if (body.y - body.radius < minY) {
        body.y = minY + body.radius;
        body.vy = Math.abs(body.vy) * body.restitution;
        bounced = true;
      } else if (body.y + body.radius > maxY) {
        body.y = maxY - body.radius;
        body.vy = -Math.abs(body.vy) * body.restitution;
        bounced = true;
      }

      if (bounced) {
        const energy =
          0.5 * body.mass * (body.vx * body.vx + body.vy * body.vy);
        events.push({
          type: "body_bounced",
          bodyId: body.id,
          energy,
          tag: body.tag,
        });
      }
    }

    for (const [id, body] of this.bodies.entries()) {
      if (body.ttlMs > 0) continue;
      this.bodies.delete(id);
      events.push({ type: "body_expired", bodyId: id, tag: body.tag });
    }

    return events;
  }

  getBodies(): PhysicsBodySnapshot[] {
    return Array.from(this.bodies.values()).map((body) => ({
      id: body.id,
      x: body.x,
      y: body.y,
      vx: body.vx,
      vy: body.vy,
      radius: body.radius,
      ttlMs: body.ttlMs,
      tag: body.tag,
    }));
  }

  removeBody(id: string): void {
    this.bodies.delete(id);
  }

  clear(): void {
    this.bodies.clear();
  }

  destroy(): void {
    this.clear();
  }
}
