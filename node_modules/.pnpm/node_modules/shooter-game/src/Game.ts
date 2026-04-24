type Bullet = {
  sprite: any;
  vx: number;
  vy: number;
};

export class ShooterGame {
  private readonly container: HTMLElement;
  private app: any;
  private readonly world = new PIXI.Container();
  private player: any;
  private readonly bullets: Bullet[] = [];
  private readonly keys = new Set<string>();
  private playerSpeed = 280;
  private bulletSpeed = 520;
  private onPointerDown?: (event: PointerEvent) => void;
  private onKeyDown?: (event: KeyboardEvent) => void;
  private onKeyUp?: (event: KeyboardEvent) => void;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async init(): Promise<void> {
    this.app = new PIXI.Application();
    await this.app.init({
      background: "#080b16",
      antialias: true,
      resizeTo: this.container
    });

    this.container.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world);

    this.player = new PIXI.Graphics();
    this.player.poly([0, 0, 40, 0, 20, -36]).fill(0x5af78e);
    this.player.x = this.container.clientWidth * 0.5 - 20;
    this.player.y = this.container.clientHeight - 28;
    this.world.addChild(this.player);

    this.bindEvents();
  }

  update(deltaTime: number): void {
    if (!this.player) return;
    this.updatePlayer(deltaTime);
    this.updateBullets(deltaTime);
  }

  destroy(): void {
    if (this.onPointerDown) {
      this.app?.canvas.removeEventListener("pointerdown", this.onPointerDown);
    }
    if (this.onKeyDown) {
      window.removeEventListener("keydown", this.onKeyDown);
    }
    if (this.onKeyUp) {
      window.removeEventListener("keyup", this.onKeyUp);
    }
    for (const bullet of this.bullets) {
      bullet.sprite.destroy();
    }
    this.bullets.length = 0;
    this.app?.destroy(true, { children: true });
  }

  private bindEvents(): void {
    this.onPointerDown = (event: PointerEvent): void => {
      const rect = this.app.canvas.getBoundingClientRect();
      const targetX = event.clientX - rect.left;
      const targetY = event.clientY - rect.top;
      this.shoot(targetX, targetY);
    };
    this.app.canvas.addEventListener("pointerdown", this.onPointerDown);

    this.onKeyDown = (event: KeyboardEvent): void => {
      this.keys.add(event.code);
    };
    this.onKeyUp = (event: KeyboardEvent): void => {
      this.keys.delete(event.code);
    };
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  private updatePlayer(deltaTime: number): void {
    let moveX = 0;
    let moveY = 0;

    if (this.keys.has("ArrowLeft") || this.keys.has("KeyA")) moveX -= 1;
    if (this.keys.has("ArrowRight") || this.keys.has("KeyD")) moveX += 1;
    if (this.keys.has("ArrowUp") || this.keys.has("KeyW")) moveY -= 1;
    if (this.keys.has("ArrowDown") || this.keys.has("KeyS")) moveY += 1;

    this.player.x += moveX * this.playerSpeed * deltaTime;
    this.player.y += moveY * this.playerSpeed * deltaTime;

    const maxX = this.container.clientWidth - 40;
    const minY = 36;
    const maxY = this.container.clientHeight - 6;
    this.player.x = Math.max(0, Math.min(this.player.x, maxX));
    this.player.y = Math.max(minY, Math.min(this.player.y, maxY));
  }

  private shoot(targetX: number, targetY: number): void {
    const bullet = new PIXI.Graphics();
    bullet.circle(0, 0, 5).fill(0xffe066);
    bullet.x = this.player.x + 20;
    bullet.y = this.player.y - 20;

    const dx = targetX - bullet.x;
    const dy = targetY - bullet.y;
    const length = Math.hypot(dx, dy) || 1;

    this.world.addChild(bullet);
    this.bullets.push({
      sprite: bullet,
      vx: (dx / length) * this.bulletSpeed,
      vy: (dy / length) * this.bulletSpeed
    });
  }

  private updateBullets(deltaTime: number): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.bullets[i];
      bullet.sprite.x += bullet.vx * deltaTime;
      bullet.sprite.y += bullet.vy * deltaTime;

      const out =
        bullet.sprite.x < -10 ||
        bullet.sprite.x > width + 10 ||
        bullet.sprite.y < -10 ||
        bullet.sprite.y > height + 10;

      if (out) {
        this.world.removeChild(bullet.sprite);
        bullet.sprite.destroy();
        this.bullets.splice(i, 1);
      }
    }
  }
}
