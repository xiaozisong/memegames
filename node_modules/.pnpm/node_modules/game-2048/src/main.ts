import { createGame, setConfig } from "@game/core";
import defaultConfig from "./config.json";
import { Game2048 } from "./GameRuntime";

async function bootstrap(): Promise<void> {
  setConfig(defaultConfig);

  try {
    const response = await fetch("/config.json", { cache: "no-store" });
    if (response.ok) {
      const runtimeConfig = await response.json();
      setConfig(runtimeConfig);
    }
  } catch {
    // Use bundled config fallback.
  }

  const game = createGame("#app", Game2048);
  await game.start();
}

void bootstrap();
