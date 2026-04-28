import { getSetting } from "../config.js";
import { GridSystem } from "../systems/GridSystem.js";
import { GameStateSystem } from "../systems/GameStateSystem.js";
import { WormSystem } from "../systems/WormSystem.js";
import { LayerSystem } from "../systems/LayerSystem.js";
import { OccupancySystem } from "../systems/OccupancySystem.js";
import { BlockSystem } from "../systems/BlockSystem.js";
import { GameFlowSystem } from "../systems/GameFlowSystem.js";
import { LevelGeneratorSystem } from "../systems/LevelGeneratorSystem.js";

export class ArrowsPuzzleKernel {
  constructor() {
    this.id = "arrows-puzzle";
    this.listeners = [];
    this.effectTick = 0;

    this.gridSystem = new GridSystem();
    this.wormSystem = new WormSystem(this.gridSystem);
    this.levelGeneratorSystem = new LevelGeneratorSystem(this.gridSystem);
    this.layerSystem = new LayerSystem();
    this.occupancySystem = new OccupancySystem();
    this.blockSystem = new BlockSystem(this.occupancySystem);
    this.uiConfig = getSetting("ui", {});
    this.gameStateSystem = new GameStateSystem(this.uiConfig);

    this.gameConfig = getSetting("game", {});
    this.boardConfig = getSetting("board", {});
    this.theme = getSetting("theme", {});
    this.audioConfig = getSetting("audio", {});
    this.baseLevelConfig = getSetting("level", {});
    this.totalLevels = Math.max(1, Number(this.gameConfig.totalLevels || this.baseLevelConfig.totalLevels || 10));
    this.currentLevel = Math.min(this.totalLevels, Math.max(1, Number(this.gameConfig.level || 1)));
    this.gameFlowSystem = new GameFlowSystem(this.layerSystem, this.occupancySystem, this.blockSystem, this.uiConfig);
    this.loadLevel(this.currentLevel);

    this.state = this.gameStateSystem.createInitialState(this.levelInfo);
    this.syncDerivedState();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
  }

  dispatch(action) {
    if (!action || typeof action !== "object") return;

    if (action.type === "start_or_restart") {
      if (this.state.overlay?.kind === "success") {
        const nextLevel = this.currentLevel >= this.totalLevels ? 1 : this.currentLevel + 1;
        this.loadLevel(nextLevel);
      } else if (this.state.overlay?.kind !== "start" || this.state.attempts > 0) {
        this.loadLevel(this.currentLevel);
      }
      this.state = this.gameStateSystem.resetState(this.levelInfo, ++this.effectTick);
      this.gameStateSystem.beginPlay(this.state);
      this.syncDerivedState();
      this.notify();
      return;
    }

    if (action.type === "restart") {
      this.loadLevel(this.currentLevel);
      this.state = this.gameStateSystem.resetState(this.levelInfo, ++this.effectTick);
      this.gameStateSystem.beginPlay(this.state);
      this.syncDerivedState();
      this.notify();
      return;
    }

    if (action.type === "trigger_worm") {
      this.triggerWorm(action.wormId, action.position);
      return;
    }

    if (action.type === "complete_run") {
      this.completeRun(action.runId);
    }
  }

  triggerWorm(wormId, position) {
    if (!this.gameStateSystem.canTrigger(this.state)) return;
    const targetWorm = this.resolveWormTarget(wormId, position);
    if (!targetWorm || targetWorm.removed) return;

    const derivedData = this.gameFlowSystem.buildDerivedData(this.board, this.worms);
    this.gameStateSystem.applyDerivedState(this.state, derivedData);
    const clickResult = this.gameFlowSystem.resolveClick(targetWorm, derivedData);
    if (clickResult.type === "blocked") {
      this.gameStateSystem.applyBlockedAttempt(this.state, targetWorm.id, ++this.effectTick);
      this.notify();
      return;
    }
    if (clickResult.type !== "remove") return;

    const run = this.gameFlowSystem.createRemovalRun(targetWorm, this.board);
    this.gameStateSystem.applyRunStart(this.state, run, ++this.effectTick);
    this.notify();
  }

  completeRun(runId) {
    const run = this.state.effects?.run;
    if (!run || run.id !== runId || this.state.status !== "running") return;
    this.worms = this.gameFlowSystem.removeWorm(this.worms, run.wormId);
    const derivedData = this.gameFlowSystem.buildDerivedData(this.board, this.worms);
    this.state.removedWormIds = new Set(this.worms.filter((worm) => worm.removed).map((worm) => worm.id));
    this.gameStateSystem.applyDerivedState(this.state, derivedData);
    this.gameStateSystem.applyRunResult(
      this.state,
      run,
      ++this.effectTick,
      this.levelInfo,
      this.gameFlowSystem.isSolved(derivedData),
    );
    this.notify();
  }

  getSnapshot() {
    return {
      game: {
        id: this.gameConfig.id || this.id,
        title: this.gameConfig.title || "Arrows Puzzle Escape",
        subtitle: this.gameConfig.subtitle || "",
        level: this.currentLevel,
        totalLevels: this.totalLevels,
      },
      board: this.gridSystem.cloneBoard(this.board),
      worms: this.wormSystem.cloneWorms(this.worms),
      theme: { ...this.theme },
      audio: { ...this.audioConfig },
      ui: { ...this.uiConfig },
      level: {
        ...this.levelInfo,
        solution: this.levelInfo.solution
          ? {
            ...this.levelInfo.solution,
            start: this.levelInfo.solution.start ? { ...this.levelInfo.solution.start } : null,
            path: Array.isArray(this.levelInfo.solution.path) ? this.levelInfo.solution.path.map((point) => ({ ...point })) : [],
          }
          : null,
      },
      state: {
        status: this.state.status,
        currentPath: this.state.currentPath.map((point) => ({ ...point })),
        visited: Array.from(this.state.visited),
        activeCell: this.state.activeCell ? { ...this.state.activeCell } : null,
        attempts: this.state.attempts,
        removedWormIds: Array.from(this.state.removedWormIds),
        blockedWormIds: Array.from(this.state.blockedWormIds),
        occupancy: this.occupancySystem.serialize(this.state.occupancy, this.board),
        message: this.state.message,
        overlay: this.state.overlay ? { ...this.state.overlay } : null,
        lastRun: this.state.lastRun
          ? {
              ...this.state.lastRun,
              start: this.state.lastRun.start ? { ...this.state.lastRun.start } : null,
              activeCell: this.state.lastRun.activeCell ? { ...this.state.lastRun.activeCell } : null,
              path: this.state.lastRun.path.map((point) => ({ ...point })),
              displayPath: Array.isArray(this.state.lastRun.displayPath)
                ? this.state.lastRun.displayPath.map((point) => ({ ...point }))
                : [],
              visited: [...this.state.lastRun.visited],
              segments: this.state.lastRun.segments.map((segment) => ({
                ...segment,
                from: { ...segment.from },
                to: { ...segment.to },
              })),
            }
          : null,
        effects: {
          tick: this.state.effects.tick,
          blocked: this.state.effects.blocked ? { ...this.state.effects.blocked } : null,
          run: this.state.effects.run
            ? {
              ...this.state.effects.run,
              start: this.state.effects.run.start ? { ...this.state.effects.run.start } : null,
              activeCell: this.state.effects.run.activeCell ? { ...this.state.effects.run.activeCell } : null,
              path: this.state.effects.run.path.map((point) => ({ ...point })),
              displayPath: Array.isArray(this.state.effects.run.displayPath)
                ? this.state.effects.run.displayPath.map((point) => ({ ...point }))
                : [],
              visited: [...this.state.effects.run.visited],
              segments: this.state.effects.run.segments.map((segment) => ({
                ...segment,
                from: { ...segment.from },
                to: { ...segment.to },
              })),
            }
            : null,
        },
      },
    };
  }

  notify() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }

  syncDerivedState() {
    const derivedData = this.gameFlowSystem.buildDerivedData(this.board, this.worms);
    this.state.removedWormIds = new Set(this.worms.filter((worm) => worm.removed).map((worm) => worm.id));
    this.gameStateSystem.applyDerivedState(this.state, derivedData);
    this.state.message = this.gameFlowSystem.createIdleMessage(derivedData);
  }

  resolveWormTarget(wormId, position) {
    if (wormId) {
      const byId = this.wormSystem.getWormById(wormId);
      if (byId) {
        const matched = this.worms.find((worm) => worm.id === byId.id);
        if (matched) return matched;
      }
    }
    if (!position || !Number.isInteger(position.x) || !Number.isInteger(position.y)) return null;
    const fallbackId = this.wormSystem.getWormIdForStart(position);
    return this.worms.find((worm) => worm.id === fallbackId) ?? null;
  }

  loadLevel(levelNumber) {
    this.currentLevel = Math.min(this.totalLevels, Math.max(1, Number(levelNumber || 1)));
    this.levelConfig = this.levelGeneratorSystem.createRuntimeLevel(
      this.baseLevelConfig,
      this.boardConfig,
      this.theme,
      this.currentLevel,
      this.totalLevels,
    );
    this.board = this.gridSystem.createBoard(this.boardConfig, this.levelConfig);
    this.worms = this.wormSystem.createWorms(this.board, this.levelConfig, this.theme);
    this.levelInfo = {
      id: this.levelConfig.id || `level-${this.currentLevel}`,
      name: this.levelConfig.name || `第${this.currentLevel}关`,
      description: this.levelConfig.description || "",
      solution: this.levelConfig.solution || null,
      successTitle: this.levelConfig.successTitle || this.uiConfig.successTitle || "",
      successBody: this.levelConfig.successBody || this.uiConfig.successBody || "",
      successButtonText: this.levelConfig.successButtonText || this.uiConfig.successButton || "",
    };
  }
}
