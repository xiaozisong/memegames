export class LeaderboardSystem {
  build(state) {
    return [state.playerSnake, ...state.npcs]
      .map((snake) => ({
        id: snake.id,
        name: snake.name,
        isPlayer: snake.isPlayer,
        alive: snake.alive,
        length: Math.round(snake.currentLength),
      }))
      .sort((a, b) => b.length - a.length)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));
  }
}
