import { createGameFrame } from "../components/GameFrame";
import { findGameBySlug } from "../data/games";

export function renderGameDetailPage(slug: string): HTMLElement {
  const page = document.createElement("section");
  page.className = "page";

  const game = findGameBySlug(slug);
  if (!game) {
    const title = document.createElement("h1");
    title.textContent = "未找到该游戏";

    const desc = document.createElement("p");
    desc.textContent = "请返回首页重新选择。";

    const back = document.createElement("a");
    back.href = "#/";
    back.textContent = "返回首页";

    page.append(title, desc, back);
    return page;
  }

  const back = document.createElement("a");
  back.href = "#/";
  back.className = "back-link";
  back.textContent = "← 返回首页";

  const title = document.createElement("h1");
  title.textContent = game.title;

  const desc = document.createElement("p");
  desc.className = "page-subtitle";
  desc.textContent = game.description;

  page.append(back, title, desc, createGameFrame({ slug: game.slug, title: game.title }));
  return page;
}
