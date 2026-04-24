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
export declare function createGame<TGame extends GameLifecycle, TOptions = unknown>(container: HTMLElement | string, GameCtor: GameClass<TGame, TOptions>, options?: TOptions): GameInstance<TGame>;
export { setConfig, getConfig } from "./config/useConfig";
export { spawnParticles, updateParticles, renderParticles } from "./systems/ParticleSystem";
