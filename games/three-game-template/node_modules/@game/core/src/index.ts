export interface GameLifecycle {
  init(): void | Promise<void>;
  update(deltaTime: number): void;
  destroy(): void;
}

export interface GameClass<TGame extends GameLifecycle, TOptions = unknown> {
  new (container: HTMLElement, options?: TOptions): TGame;
}

export interface GameInstance<TGame extends GameLifecycle> {
  game: TGame;
  start(): Promise<void>;
  stop(): void;
  resize(): void;
  destroy(): void;
}

export function createGame<TGame extends GameLifecycle, TOptions = unknown>(
  container: HTMLElement | string,
  GameCtor: GameClass<TGame, TOptions>,
  options?: TOptions
): GameInstance<TGame> {
  const target =
    typeof container === "string"
      ? document.querySelector<HTMLElement>(container)
      : container;

  if (!target) {
    throw new Error("createGame: container not found.");
  }

  const game = new GameCtor(target, options);
  let isRunning = false;
  let lastTime = 0;
  let rafId = 0;

  const onResize = (): void => {
    const parent = target.parentElement;
    const width = parent?.clientWidth ?? window.innerWidth;
    const height = parent?.clientHeight ?? window.innerHeight;
    target.style.width = `${width}px`;
    target.style.height = `${height}px`;
  };

  const tick = (time: number): void => {
    if (!isRunning) return;
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    game.update(dt);
    rafId = window.requestAnimationFrame(tick);
  };

  const start = async (): Promise<void> => {
    if (isRunning) return;
    onResize();
    window.addEventListener("resize", onResize);
    await game.init();
    isRunning = true;
    lastTime = performance.now();
    rafId = window.requestAnimationFrame(tick);
  };

  const stop = (): void => {
    if (!isRunning) return;
    isRunning = false;
    window.cancelAnimationFrame(rafId);
    window.removeEventListener("resize", onResize);
  };

  const destroy = (): void => {
    stop();
    game.destroy();
  };

  return {
    game,
    start,
    stop,
    resize: onResize,
    destroy
  };
}

export { setConfig, getConfig } from "./config/useConfig";
export {
  spawnParticles,
  updateParticles,
  renderParticles
} from "./systems/ParticleSystem";
