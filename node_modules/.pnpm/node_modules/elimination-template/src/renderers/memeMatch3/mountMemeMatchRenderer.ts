import * as PIXI from "pixi.js";
import { EliminationSnapshot, GameKernel } from "../../core/contracts";
import { getSetting } from "../../config";
import { AnimationController } from "./AnimationController";
import { GridBoard } from "./GridBoard";
import { HUD } from "./HUD";

type MemeDefinition = {
  id: string;
  label: string;
  color: string;
};

export async function mountMemeMatchRenderer(
  root: HTMLElement,
  kernel: GameKernel,
): Promise<void> {
  root.innerHTML = "";
  root.classList.add("mm3-root");

  const wrapper = document.createElement("div");
  wrapper.className = "mm3-shell";
  root.appendChild(wrapper);

  const canvasLayer = document.createElement("div");
  canvasLayer.className = "mm3-canvas-layer";
  wrapper.appendChild(canvasLayer);

  const uiLayer = document.createElement("div");
  uiLayer.className = "mm3-ui-layer";
  wrapper.appendChild(uiLayer);

  const app = new PIXI.Application();
  await app.init({ resizeTo: canvasLayer, antialias: true, backgroundAlpha: 0 });
  canvasLayer.appendChild(app.canvas);

  const animation = new AnimationController();
  const memes = getSetting<MemeDefinition[]>(
    "gameplay.mechanics.params.match3.memes",
    [],
  );
  const board = new GridBoard(app, memes, animation, (intent) => {
    kernel.dispatch({ type: "place_at", row: intent.from.row, col: intent.from.col });
    kernel.dispatch({ type: "place_at", row: intent.to.row, col: intent.to.col });
  });
  const hud = new HUD(uiLayer, () => {
    kernel.dispatch({ type: "start_or_restart" });
  });

  const comboText = new PIXI.Text({
    text: "",
    style: {
      fill: 0xfff06b,
      fontFamily: "Arial Black, Arial",
      fontSize: 36,
      fontWeight: "900",
      stroke: { color: 0x320d5d, width: 4 },
      dropShadow: {
        alpha: 0.7,
        blur: 8,
        color: 0x000000,
        angle: Math.PI / 4,
        distance: 3,
      },
    },
  });
  comboText.anchor.set(0.5);
  comboText.visible = false;
  app.stage.addChild(comboText);

  const showCombo = async (label: string, x: number, y: number): Promise<void> => {
    comboText.text = label;
    comboText.position.set(x, y);
    comboText.scale.set(0.55);
    comboText.alpha = 0;
    comboText.visible = true;
    await animation.combo(380, (p) => {
      comboText.scale.set(0.55 + p * 0.7);
      comboText.alpha = p < 0.85 ? 1 : (1 - p) / 0.15;
      comboText.y = y - p * 18;
    });
    comboText.visible = false;
  };

  let prevMessage = "";
  let latestSnapshot = kernel.getSnapshot();

  const render = async (snapshot: EliminationSnapshot): Promise<void> => {
    latestSnapshot = snapshot;
    const width = canvasLayer.clientWidth;
    const height = canvasLayer.clientHeight;
    board.resize(width, height, snapshot.rows, snapshot.cols);
    board.renderBoardFrame(snapshot);
    await board.renderSnapshot(snapshot);
    hud.render(snapshot);

    const matched = /COMBO\s*x\d+/i.exec(snapshot.state.message);
    if (matched && matched[0] !== prevMessage) {
      const pos = board.showCombo(matched[0].toUpperCase());
      void showCombo(matched[0].toUpperCase(), pos.x, pos.y);
    }
    prevMessage = snapshot.state.message;
  };

  const unsubscribe = kernel.subscribe((snapshot) => {
    void render(snapshot);
  });

  const onResize = (): void => {
    void render(latestSnapshot);
  };
  window.addEventListener("resize", onResize);

  const teardown = () => {
    unsubscribe();
    window.removeEventListener("resize", onResize);
    app.destroy(true);
    wrapper.remove();
  };
  window.addEventListener("beforeunload", teardown, { once: true });
}
