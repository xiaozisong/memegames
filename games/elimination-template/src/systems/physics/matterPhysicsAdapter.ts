import * as Matter from "matter-js";
import {
  PhysicsAdapter,
  PhysicsBodyCreateInput,
  PhysicsBodySnapshot,
  PhysicsEvent,
  PhysicsWorldConfig,
} from "./contracts";

type BodyMeta = {
  ttlMs: number;
  tag: string;
  radius: number;
};

const WALL_LABEL = "physics_wall";

export class MatterPhysicsAdapter implements PhysicsAdapter {
  private engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } });
  private world = this.engine.world;
  private bodyById = new Map<string, Matter.Body>();
  private metaById = new Map<string, BodyMeta>();
  private walls: Matter.Body[] = [];
  private nextId = 0;
  private pendingEvents: PhysicsEvent[] = [];

  constructor() {
    Matter.Events.on(this.engine, "collisionStart", (event) => {
      for (const pair of event.pairs) {
        this.handleCollisionPair(pair.bodyA, pair.bodyB);
      }
    });
  }

  init(config: PhysicsWorldConfig): void {
    this.clear();
    this.engine.gravity.y = config.gravityY;
    this.createBounds(config.bounds.minX, config.bounds.maxX, config.bounds.minY, config.bounds.maxY);
  }

  createBody(input: PhysicsBodyCreateInput): string {
    const id = `matter-${this.nextId++}`;
    const body = Matter.Bodies.circle(input.x, input.y, input.radius, {
      restitution: input.restitution,
      frictionAir: input.damping * 0.01,
      friction: 0.001,
      label: id,
    });
    Matter.Body.setVelocity(body, { x: input.vx, y: input.vy });
    Matter.Body.setMass(body, Math.max(0.01, input.mass));
    Matter.Composite.add(this.world, body);
    this.bodyById.set(id, body);
    this.metaById.set(id, { ttlMs: input.ttlMs, tag: input.tag, radius: input.radius });
    return id;
  }

  step(deltaMs: number): PhysicsEvent[] {
    Matter.Engine.update(this.engine, deltaMs);
    for (const [id, meta] of this.metaById.entries()) {
      meta.ttlMs -= deltaMs;
      if (meta.ttlMs > 0) continue;
      this.removeBody(id);
      this.pendingEvents.push({ type: "body_expired", bodyId: id, tag: meta.tag });
    }
    const events = [...this.pendingEvents];
    this.pendingEvents.length = 0;
    return events;
  }

  getBodies(): PhysicsBodySnapshot[] {
    const output: PhysicsBodySnapshot[] = [];
    for (const [id, body] of this.bodyById.entries()) {
      const meta = this.metaById.get(id);
      if (!meta) continue;
      output.push({
        id,
        x: body.position.x,
        y: body.position.y,
        vx: body.velocity.x,
        vy: body.velocity.y,
        radius: meta.radius,
        ttlMs: meta.ttlMs,
        tag: meta.tag,
      });
    }
    return output;
  }

  removeBody(id: string): void {
    const body = this.bodyById.get(id);
    if (!body) return;
    Matter.Composite.remove(this.world, body);
    this.bodyById.delete(id);
    this.metaById.delete(id);
  }

  clear(): void {
    for (const body of this.bodyById.values()) {
      Matter.Composite.remove(this.world, body);
    }
    for (const wall of this.walls) {
      Matter.Composite.remove(this.world, wall);
    }
    this.walls = [];
    this.bodyById.clear();
    this.metaById.clear();
    this.pendingEvents.length = 0;
    this.nextId = 0;
  }

  destroy(): void {
    this.clear();
    Matter.Engine.clear(this.engine);
  }

  private createBounds(minX: number, maxX: number, minY: number, maxY: number): void {
    const thickness = 0.02;
    const width = maxX - minX;
    const height = maxY - minY;
    const cx = minX + width * 0.5;
    const cy = minY + height * 0.5;
    this.walls = [
      Matter.Bodies.rectangle(cx, minY - thickness * 0.5, width + thickness * 2, thickness, {
        isStatic: true,
        restitution: 1,
        label: WALL_LABEL,
      }),
      Matter.Bodies.rectangle(cx, maxY + thickness * 0.5, width + thickness * 2, thickness, {
        isStatic: true,
        restitution: 1,
        label: WALL_LABEL,
      }),
      Matter.Bodies.rectangle(minX - thickness * 0.5, cy, thickness, height + thickness * 2, {
        isStatic: true,
        restitution: 1,
        label: WALL_LABEL,
      }),
      Matter.Bodies.rectangle(maxX + thickness * 0.5, cy, thickness, height + thickness * 2, {
        isStatic: true,
        restitution: 1,
        label: WALL_LABEL,
      }),
    ];
    Matter.Composite.add(this.world, this.walls);
  }

  private handleCollisionPair(bodyA: Matter.Body, bodyB: Matter.Body): void {
    const aIsWall = bodyA.label === WALL_LABEL;
    const bIsWall = bodyB.label === WALL_LABEL;
    if (!aIsWall && !bIsWall) return;
    const dynamic = aIsWall ? bodyB : bodyA;
    const bodyId = dynamic.label;
    const meta = this.metaById.get(bodyId);
    if (!meta) return;
    const energy =
      0.5 * dynamic.mass * (dynamic.velocity.x ** 2 + dynamic.velocity.y ** 2);
    this.pendingEvents.push({
      type: "body_bounced",
      bodyId,
      energy,
      tag: meta.tag,
    });
  }
}
