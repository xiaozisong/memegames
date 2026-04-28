export class WaveSystem {
  constructor(config) {
    this.config = config;
  }

  onRoundStart(state) {
    state.wave.level = 1;
    state.wave.nextIncreaseAt = this.config.wave.intervalSeconds;
  }

  update(_delta, state) {
    if (state.gameOver) {
      return;
    }

    if (state.elapsed >= state.wave.nextIncreaseAt) {
      state.wave.level += 1;
      state.wave.nextIncreaseAt += this.config.wave.intervalSeconds;
      state.emitEvent("waveIncreased", {
        waveLevel: state.wave.level
      });
    }
  }
}
