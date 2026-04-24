import { createGameCard } from "../components/GameCard";
import { games } from "../data/games";

export function renderHomePage(): HTMLElement {
  const page = document.createElement("section");
  page.className = "page";

  const title = document.createElement("h1");
  title.textContent = "小游戏 Demo 展示";

  const subtitle = document.createElement("p");
  subtitle.className = "page-subtitle";
  subtitle.textContent = "选择一个小游戏进入详情页并在 iframe 中试玩。";

  const grid = document.createElement("div");
  grid.className = "game-grid";
  for (const game of games) {
    grid.appendChild(createGameCard(game));
  }

  page.append(title, subtitle, grid);
  return page;
}
