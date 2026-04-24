export function createGame(container, GameCtor, options) {
    const target = typeof container === "string"
        ? document.querySelector(container)
        : container;
    if (!target) {
        throw new Error("createGame: container not found.");
    }
    const game = new GameCtor(target, options);
    let isRunning = false;
    let lastTime = 0;
    let rafId = 0;
    const onResize = () => {
        const parent = target.parentElement;
        const width = parent?.clientWidth ?? window.innerWidth;
        const height = parent?.clientHeight ?? window.innerHeight;
        target.style.width = `${width}px`;
        target.style.height = `${height}px`;
    };
    const tick = (time) => {
        if (!isRunning)
            return;
        const dt = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;
        game.update(dt);
        rafId = window.requestAnimationFrame(tick);
    };
    const start = async () => {
        if (isRunning)
            return;
        onResize();
        window.addEventListener("resize", onResize);
        await game.init();
        isRunning = true;
        lastTime = performance.now();
        rafId = window.requestAnimationFrame(tick);
    };
    const stop = () => {
        if (!isRunning)
            return;
        isRunning = false;
        window.cancelAnimationFrame(rafId);
        window.removeEventListener("resize", onResize);
    };
    const destroy = () => {
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
export { spawnParticles, updateParticles, renderParticles } from "./systems/ParticleSystem";
