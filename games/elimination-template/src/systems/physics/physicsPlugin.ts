import {
  PhysicsAdapter,
  PhysicsPluginConfig,
  PhysicsStats,
  PhysicsWorldConfig,
} from "./contracts";
import { SimplePhysicsAdapter } from "./simplePhysicsAdapter";
import { MatterPhysicsAdapter } from "./matterPhysicsAdapter";

type PlacementImpactInput = {
  anchorRow: number;
  anchorCol: number;
  pieceCellCount: number;
  clearedLineCount: number;
  rows: number;
  cols: number;
};

const defaultStats: PhysicsStats = {
  enabled: false,
  activeBodyCount: 0,
  recentBounceEnergy: 0,
  recentExpiredCount: 0,
  fixedDeltaMs: 16.6667,
};

export class PhysicsPlugin {
  private readonly adapter: PhysicsAdapter;
  private readonly config: PhysicsPluginConfig;
  private stats: PhysicsStats;

  constructor(config: PhysicsPluginConfig) {
    this.config = config;
    this.adapter =
      config.engine === "matterjs"
        ? new MatterPhysicsAdapter()
        : new SimplePhysicsAdapter();
    this.stats = {
      ...defaultStats,
      enabled: config.enabled,
      fixedDeltaMs: config.fixedDeltaMs,
    };
  }

  resetWorld(rows: number, cols: number): void {
    if (!this.config.enabled) return;
    const bounds = this.resolveBounds(rows, cols);
    const worldConfig: PhysicsWorldConfig = {
      gravityY: this.config.gravityY,
      bounds,
    };
    this.adapter.init(worldConfig);
    this.stats.activeBodyCount = 0;
    this.stats.recentBounceEnergy = 0;
    this.stats.recentExpiredCount = 0;
  }

  onPlacementImpact(input: PlacementImpactInput): void {
    if (!this.config.enabled) return;
    if (this.adapter.getBodies().length >= this.config.maxBodies) return;

    const centerX = (input.anchorCol + 0.5) / Math.max(1, input.cols);
    const centerY = (input.anchorRow + 0.5) / Math.max(1, input.rows);
    const energyScale = Math.max(
      1,
      input.pieceCellCount +
        input.clearedLineCount * this.config.lineClearImpulseMultiplier,
    );

    const impulseX = this.config.placementImpulse.x * energyScale;
    const impulseY = this.config.placementImpulse.y * energyScale;
    const angle = Math.random() * Math.PI * 2;
    const vx = Math.cos(angle) * impulseX;
    const vy = Math.sin(angle) * impulseY;

    this.adapter.createBody({
      x: centerX,
      y: centerY,
      vx,
      vy,
      radius: this.config.placementImpulse.radius,
      mass: this.config.placementImpulse.mass,
      restitution: this.config.placementImpulse.restitution,
      damping: this.config.placementImpulse.damping,
      ttlMs: this.config.placementImpulse.ttlMs,
      tag: "placement_impact",
    });
    this.stats.activeBodyCount = this.adapter.getBodies().length;
  }

  step(deltaMs: number = this.config.fixedDeltaMs): void {
    if (!this.config.enabled) return;
    const events = this.adapter.step(deltaMs);
    let bouncedEnergy = 0;
    let expiredCount = 0;
    for (const event of events) {
      if (event.type === "body_bounced") bouncedEnergy += event.energy;
      if (event.type === "body_expired") expiredCount += 1;
    }
    this.stats.recentBounceEnergy = bouncedEnergy;
    this.stats.recentExpiredCount = expiredCount;
    this.stats.activeBodyCount = this.adapter.getBodies().length;
  }

  getStats(): PhysicsStats {
    return { ...this.stats };
  }

  destroy(): void {
    this.adapter.destroy();
  }

  private resolveBounds(rows: number, cols: number): PhysicsWorldConfig["bounds"] {
    const p = this.config.boundsPadding;
    const aspect = cols > 0 ? rows / cols : 1;
    const minX = 0 + p;
    const maxX = 1 - p;
    const minY = 0 + p;
    const maxY = Math.max(minY + 0.1, 1 - p * aspect);
    return { minX, maxX, minY, maxY };
  }
}
