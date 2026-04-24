import type { GameItem } from "../data/games";

export function createGameCard(game: GameItem): HTMLElement {
  const card = document.createElement("article");
  card.className = "game-card";

  const cover = document.createElement("div");
  cover.className = "game-card-cover";
  cover.textContent = game.cover;

  const title = document.createElement("h3");
  title.className = "game-card-title";
  title.textContent = game.title;

  const description = document.createElement("p");
  description.className = "game-card-description";
  description.textContent = game.description;

  const action = document.createElement("button");
  action.className = "game-card-button";
  action.type = "button";
  action.textContent = "进入游戏";
  action.addEventListener("click", () => {
    window.location.hash = `#/game/${game.slug}`;
  });

  card.append(cover, title, description, action);
  return card;
}
