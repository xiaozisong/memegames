import { renderGameDetailPage } from "./pages/GameDetail";
import { renderHomePage } from "./pages/Home";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Missing #app container.");
}

function parseRoute(hash: string): { type: "home" | "detail"; slug?: string } {
  if (!hash || hash === "#" || hash === "#/") {
    return { type: "home" };
  }

  const match = hash.match(/^#\/game\/([^/]+)$/);
  if (match) {
    return { type: "detail", slug: decodeURIComponent(match[1]) };
  }

  return { type: "home" };
}

function render(): void {
  const route = parseRoute(window.location.hash);
  app.innerHTML = "";

  if (route.type === "detail" && route.slug) {
    app.appendChild(renderGameDetailPage(route.slug));
    return;
  }

  app.appendChild(renderHomePage());
}

window.addEventListener("hashchange", render);
render();
