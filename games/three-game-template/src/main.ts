import { createGame, setConfig } from "@game/core";
import config from "./config.json";
import { GameLogic } from "./GameLogic";

class ThreeTemplateGame {
  private readonly container: HTMLElement;
  private app: any;
  private background: any;
  private panel: any;
  private orb: any;
  private glow: any;
  private ring: any;
  private shadow: any;
  private sparkleGroup: any;
  private baseY = 0;
  private width = 0;
  private height = 0;
  private hintEl: HTMLDivElement;
  private scoreEl: HTMLDivElement;
  private onClick?: () => void;
  private onKeydown?: (event: KeyboardEvent) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.hintEl = document.createElement("div");
    this.scoreEl = document.createElement("div");
  }

  async init(): Promise<void> {
    setConfig(config);
    this.mountOverlay();

    this.app = new PIXI.Application();
    await this.app.init({
      resizeTo: this.container,
      antialias: true,
      backgroundAlpha: 0
    });
    this.container.appendChild(this.app.canvas);

    this.background = new PIXI.Graphics();
    this.panel = new PIXI.Graphics();
    this.shadow = new PIXI.Graphics();
    this.glow = new PIXI.Graphics();
    this.orb = new PIXI.Graphics();
    this.ring = new PIXI.Graphics();
    this.sparkleGroup = new PIXI.Container();

    this.app.stage.addChild(
      this.background,
      this.panel,
      this.shadow,
      this.glow,
      this.ring,
      this.orb,
      this.sparkleGroup
    );
    this.layoutScene();

    GameLogic.init({
      orb: this.orb,
      glow: this.glow,
      ring: this.ring,
      shadow: this.shadow,
      setBaseY: (value: number) => {
        this.baseY = value;
      },
      setHint: (text: string) => {
        this.hintEl.textContent = text;
      },
      setScore: (score: number) => {
        this.scoreEl.textContent = `Score ${score}`;
      }
    });

    this.onClick = () => {
      GameLogic.onClick();
    };
    this.app.canvas.addEventListener("pointerdown", this.onClick);

    this.onKeydown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "r") {
        GameLogic.reset();
      }
    };
    window.addEventListener("keydown", this.onKeydown);
  }

  update(deltaTime: number): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width !== this.width || height !== this.height) {
      this.layoutScene();
      this.updateOverlayLayout(width);
    }

    GameLogic.update(deltaTime);
    this.animateSparkles(deltaTime);
  }

  destroy(): void {
    if (this.onClick) {
      this.app?.canvas.removeEventListener("pointerdown", this.onClick);
    }
    if (this.onKeydown) {
      window.removeEventListener("keydown", this.onKeydown);
    }
    this.app?.destroy(true);
    this.container.innerHTML = "";
  }

  private mountOverlay(): void {
    this.hintEl.style.position = "absolute";
    this.hintEl.style.left = "16px";
    this.hintEl.style.top = "14px";
    this.hintEl.style.padding = "8px 12px";
    this.hintEl.style.borderRadius = "12px";
    this.hintEl.style.background = "rgba(15,23,42,0.55)";
    this.hintEl.style.color = String(config.theme.colors.text.value);
    this.hintEl.style.font = "600 14px/1.2 sans-serif";
    this.hintEl.style.backdropFilter = "blur(8px)";

    this.scoreEl.style.position = "absolute";
    this.scoreEl.style.right = "16px";
    this.scoreEl.style.top = "14px";
    this.scoreEl.style.padding = "8px 12px";
    this.scoreEl.style.borderRadius = "12px";
    this.scoreEl.style.background = "rgba(15,23,42,0.55)";
    this.scoreEl.style.color = String(config.theme.colors.text.value);
    this.scoreEl.style.font = "700 14px/1.2 sans-serif";
    this.scoreEl.style.backdropFilter = "blur(8px)";
    this.scoreEl.textContent = "Score 0";

    this.container.style.position = "relative";
    this.container.appendChild(this.hintEl);
    this.container.appendChild(this.scoreEl);
    this.updateOverlayLayout(this.container.clientWidth);
  }

  private updateOverlayLayout(width: number): void {
    const compact = width < 560;
    const horizontal = compact ? 10 : 16;
    const topOffset = compact ? 10 : 14;
    const fontSize = compact ? 12 : 14;
    const padding = compact ? "7px 10px" : "8px 12px";

    this.hintEl.style.left = `${horizontal}px`;
    this.hintEl.style.top = `${topOffset}px`;
    this.hintEl.style.maxWidth = compact ? "58%" : "65%";
    this.hintEl.style.font = `600 ${fontSize}px/1.2 sans-serif`;
    this.hintEl.style.padding = padding;

    this.scoreEl.style.right = `${horizontal}px`;
    this.scoreEl.style.top = `${topOffset}px`;
    this.scoreEl.style.font = `700 ${fontSize}px/1.2 sans-serif`;
    this.scoreEl.style.padding = padding;
  }

  private layoutScene(): void {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    const compact = this.width < 560;
    const panelW = Math.min(Number(config.layout.maxPanelWidth.value), this.width - (compact ? 20 : 36));
    const panelH = Math.min(Number(config.layout.maxPanelHeight.value), this.height - (compact ? 24 : 40));
    const panelX = (this.width - panelW) * 0.5;
    const panelY = (this.height - panelH) * 0.5;
    const centerX = this.width * 0.5;
    const centerY = panelY + panelH * 0.56 + Number(config.gameplay.params.centerYOffset.value);
    const orbRadius = compact
      ? Number(config.gameplay.params.orbRadius.value) * 0.78
      : Number(config.gameplay.params.orbRadius.value);

    this.baseY = centerY;
    GameLogic.setBaseY(centerY);

    this.background
      .clear()
      .rect(0, 0, this.width, this.height)
      .fill({ color: Number.parseInt(String(config.theme.colors.background.value).replace("#", ""), 16) });

    this.panel
      .clear()
      .roundRect(panelX, panelY, panelW, panelH, compact ? 20 : 26)
      .fill({ color: Number.parseInt(String(config.theme.colors.primary.value).replace("#", ""), 16), alpha: 0.18 });

    this.shadow
      .clear()
      .ellipse(centerX, centerY + orbRadius * 0.95, orbRadius * 0.9, orbRadius * 0.26)
      .fill({ color: 0x000000, alpha: 0.26 });

    this.glow
      .clear()
      .circle(centerX, centerY, orbRadius * 1.22)
      .fill({ color: Number.parseInt(String(config.theme.colors.accent.value).replace("#", ""), 16), alpha: 0.26 });

    this.orb
      .clear()
      .roundRect(centerX - orbRadius, centerY - orbRadius, orbRadius * 2, orbRadius * 2, orbRadius * 0.28)
      .fill({ color: Number.parseInt(String(config.theme.colors.primary.value).replace("#", ""), 16), alpha: 0.98 });
    this.orb
      .roundRect(centerX - orbRadius, centerY - orbRadius, orbRadius * 2, orbRadius * 1.1, orbRadius * 0.28)
      .fill({ color: 0xffffff, alpha: 0.14 });

    this.ring
      .clear()
      .circle(centerX, centerY, orbRadius * 1.15)
      .stroke({
        width: Math.max(2, orbRadius * 0.06),
        color: Number.parseInt(String(config.theme.colors.accent.value).replace("#", ""), 16),
        alpha: 0.22
      });

    this.createSparkles(centerX, centerY, orbRadius * 1.75);
  }

  private createSparkles(centerX: number, centerY: number, radius: number): void {
    this.sparkleGroup.removeChildren();
    const count = 18;
    for (let i = 0; i < count; i += 1) {
      const dot = new PIXI.Graphics();
      dot.circle(0, 0, 2).fill({ color: 0xffffff, alpha: 0.6 });
      dot.alpha = 0.3 + Math.random() * 0.7;
      dot.position.set(
        centerX + Math.cos((i / count) * Math.PI * 2) * radius,
        centerY + Math.sin((i / count) * Math.PI * 2) * radius
      );
      (dot as any).meta = {
        angle: (i / count) * Math.PI * 2,
        radius,
        speed: 0.35 + Math.random() * 0.75
      };
      this.sparkleGroup.addChild(dot);
    }
  }

  private animateSparkles(deltaTime: number): void {
    if (!this.sparkleGroup) return;
    const dt = Math.max(0.001, deltaTime);
    for (const child of this.sparkleGroup.children) {
      const meta = (child as any).meta;
      if (!meta) continue;
      meta.angle += meta.speed * dt * 0.35;
      child.x = this.width * 0.5 + Math.cos(meta.angle) * meta.radius;
      child.y = this.baseY + Math.sin(meta.angle) * meta.radius * 0.75;
      child.alpha = 0.28 + (Math.sin(meta.angle * 2.8) * 0.5 + 0.5) * 0.55;
    }
  }
}

const game = createGame("#app", ThreeTemplateGame);
void game.start();
