export class SimulationSystem {
  constructor(config, renderer) {
    this.config = config;
    this.renderer = renderer;
  }

  update(delta, state) {
    state.elapsed += delta;
    state.backgroundScroll =
      (state.backgroundScroll + this.config.background.scrollSpeed * delta) % this.config.world.height;

    if (state.input.pointerActive) {
      state.input.pointerWorldX = this.renderer.screenToWorldX(state.input.pointerX, state);
    }

    if (state.gameOver || !state.player) {
      return;
    }

    state.player.update(delta, state);

    for (const bullet of state.bullets) {
      bullet.update(delta, state.bounds, state);
    }

    for (const enemy of state.enemies) {
      enemy.update(delta, state.bounds);
    }

    for (const boss of state.bosses) {
      boss.update(delta, state.bounds, this.config.world.padding);
    }

    for (const powerUp of state.powerUps) {
      powerUp.update(delta, state.bounds);
    }

    for (const particle of state.particles) {
      particle.update(delta);
    }
  }
}
