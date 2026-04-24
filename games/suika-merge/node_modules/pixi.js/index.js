const pixi = globalThis.PIXI;

if (!pixi) {
  throw new Error(
    "PIXI global not found. Please load PixiJS via CDN before your game entry script."
  );
}

export default pixi;
export const Application = pixi.Application;
export const Container = pixi.Container;
export const Graphics = pixi.Graphics;
export const Rectangle = pixi.Rectangle;
export const Text = pixi.Text;
