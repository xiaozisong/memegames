export class CleanupSystem {
  update(_delta, state) {
    state.cleanupDestroyed();
  }
}
