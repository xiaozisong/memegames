import { createKernel } from "./core/kernelFactory";
import { GameKernel } from "./core/contracts";
import { mountGame2048Renderer } from "./renderers/game2048/mountGame2048Renderer";

type RendererHandle = {
  update: (deltaTime: number) => void;
  destroy: () => void;
};

export class Game2048 {
  private readonly container: HTMLElement;
  private kernel?: GameKernel;
  private renderer?: RendererHandle;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async init(): Promise<void> {
    this.kernel = createKernel();
    this.renderer = await mountGame2048Renderer(this.container, this.kernel);
  }

  update(deltaTime: number): void {
    this.renderer?.update(deltaTime);
  }

  destroy(): void {
    this.renderer?.destroy();
  }
}
