type Block = {
  graphics: any;
  y: number;
};

export class StackGame {
  private readonly container: HTMLElement;
  private app: any;
  private readonly world = new PIXI.Container();
  private readonly blocks: Block[] = [];
  private activeBlock: Block | null = null;
  private blockWidth = 80;
  private blockHeight = 28;
  private fallSpeed = 220;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async init(): Promise<void> {
    this.app = new PIXI.Application();
    await this.app.init({
      background: "#0f1221",
      antialias: true,
      resizeTo: this.container
    });

    this.container.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world);
    this.spawnBlock();
  }

  update(deltaTime: number): void {
    if (!this.app || !this.activeBlock) return;

    this.resizeWorld();
    this.activeBlock.y += this.fallSpeed * deltaTime;
    this.activeBlock.graphics.y = this.activeBlock.y;

    const landingY = this.getLandingY();
    if (this.activeBlock.y >= landingY) {
      this.activeBlock.y = landingY;
      this.activeBlock.graphics.y = landingY;
      this.blocks.push(this.activeBlock);
      this.activeBlock = null;

      if (landingY <= this.blockHeight) {
        this.resetStack();
      } else {
        this.spawnBlock();
      }
    }
  }

  destroy(): void {
    this.app?.destroy(true, { children: true });
    this.blocks.length = 0;
    this.activeBlock = null;
  }

  private spawnBlock(): void {
    const block = new PIXI.Graphics();
    block.roundRect(0, 0, this.blockWidth, this.blockHeight, 8).fill(0x4dc3ff);
    block.x = (this.container.clientWidth - this.blockWidth) * 0.5;
    block.y = -this.blockHeight;
    this.world.addChild(block);

    this.activeBlock = { graphics: block, y: -this.blockHeight };
  }

  private getLandingY(): number {
    const stackedHeight = this.blocks.length * this.blockHeight;
    return this.container.clientHeight - this.blockHeight - stackedHeight;
  }

  private resetStack(): void {
    for (const block of this.blocks) {
      this.world.removeChild(block.graphics);
      block.graphics.destroy();
    }
    if (this.activeBlock) {
      this.world.removeChild(this.activeBlock.graphics);
      this.activeBlock.graphics.destroy();
      this.activeBlock = null;
    }
    this.blocks.length = 0;
    this.spawnBlock();
  }

  private resizeWorld(): void {
    const width = this.container.clientWidth;
    const blockX = (width - this.blockWidth) * 0.5;

    if (this.activeBlock) {
      this.activeBlock.graphics.x = blockX;
    }
    for (const block of this.blocks) {
      block.graphics.x = blockX;
    }
  }
}
