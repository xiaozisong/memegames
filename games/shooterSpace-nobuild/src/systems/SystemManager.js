export class SystemManager {
  constructor() {
    this.systems = [];
    this.registry = new Map();
  }

  register(name, system) {
    this.systems.push({ name, system });
    this.registry.set(name, system);
    return system;
  }

  getSystem(name) {
    return this.registry.get(name);
  }

  initialize(state) {
    for (const { system } of this.systems) {
      system.initialize?.(state, this);
    }
  }

  onRoundStart(state) {
    for (const { system } of this.systems) {
      system.onRoundStart?.(state, this);
    }
  }

  update(delta, state) {
    state.beginFrame();
    for (const { system } of this.systems) {
      system.update?.(delta, state, this);
    }
  }

  dispose() {
    for (const { system } of this.systems) {
      system.dispose?.();
    }
  }
}
