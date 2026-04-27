export interface GameItem {
  slug: string;
  title: string;
  description: string;
  cover: string;
}

export const games: GameItem[] = [
  {
    slug: "cut-rope-nobuild",
    title: "Cut Rope No Build",
    description: "轻量绳索约束 + 重力玩法，点击切断绳索，让糖果落入目标并收集星星。",
    cover: "🍬"
  },
  {
    slug: "snake-nobuild",
    title: "Snake No Build",
    description: "参考 slither.io 的连续路径贪吃蛇，使用 Pixi.Graphics 渲染平滑蛇身与粒子食物。",
    cover: "🐍"
  },
  {
    slug: "game-2048",
    title: "2048",
    description: "经典数字合并玩法，滑动方向键合成 2048。",
    cover: "🔢"
  },
  {
    slug: "block-blast",
    title: "Block Blast",
    description: "固定棋盘放置三选方块，整行整列消除，并完成分数与宝石目标。",
    cover: "🧩"
  },
  {
    slug: "suika-merge",
    title: "Suika Merge",
    description: "点击顶部投放水果，利用物理碰撞合成更大水果，避免越过警戒线。",
    cover: "🍉"
  },
  {
    slug: "elimination-template",
    title: "Elimination Template",
    description: "可插拔机制模板：统一 UI 外壳 + Kernel 接口（示例 blockblast）。",
    cover: "🧱"
  },
  // {
  //   slug: "three-game-template",
  //   title: "Three Game Template",
  //   description: "Three.js 游戏模板，使用 Three.js 实现的游戏。",
  //   cover: "🎮"
  // },
];

export function findGameBySlug(slug: string): GameItem | undefined {
  return games.find((game) => game.slug === slug);
}
