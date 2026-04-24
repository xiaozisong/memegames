import * as PIXI from "pixi.js";

export class OverlayView {
  constructor(container, toColorNumber) {
    this.container = new PIXI.Container();
    container.addChild(this.container);
    this.toColorNumber = toColorNumber;
    this.buttonBounds = null;
    this.buttonPressed = false;
    this.currentSnapshot = null;
    this.currentLayout = null;
    this.generatedTextures = [];
  }

  render(snapshot, layout) {
    this.currentSnapshot = snapshot;
    this.currentLayout = layout;
    clearContainer(this.container);
    this.disposeGeneratedTextures();
    this.buttonBounds = null;
    if (!snapshot.state.overlay?.visible) return;

    const shade = new PIXI.Graphics();
    shade.rect(0, 0, layout.width, layout.height).fill({ color: 0x060712, alpha: 0.72 });
    this.container.addChild(shade);

    const cardW = Math.min(layout.width - 48, 380);
    const titleTop = 24;
    const titleBodyGap = 24;
    const bodyButtonGap = 26;
    const bottomPadding = 24;
    const btnW = 176;
    const btnH = 54;

    const title = new PIXI.Text({
      text: snapshot.state.overlay.title,
      style: new PIXI.TextStyle({
        fill: this.toColorNumber(snapshot.colors.textPrimary, 0xffffff),
        fontSize: 28,
        fontWeight: "800",
        align: "center",
      }),
    });
    title.anchor.set(0.5, 0);

    const body = new PIXI.Text({
      text: snapshot.state.overlay.body,
      style: new PIXI.TextStyle({
        fill: this.toColorNumber(snapshot.colors.textSecondary, 0xded7ff),
        fontSize: 15,
        align: "center",
        wordWrap: true,
        breakWords: true,
        wordWrapWidth: cardW - 44,
        lineHeight: 22,
      }),
    });
    body.anchor.set(0.5, 0);

    const measuredTitleHeight = Math.ceil(title.height);
    const measuredBodyHeight = Math.ceil(body.height);
    const contentHeight =
      titleTop + measuredTitleHeight + titleBodyGap + measuredBodyHeight + bodyButtonGap + btnH + bottomPadding;
    const cardH = Math.max(236, contentHeight);
    const x = (layout.width - cardW) * 0.5;
    const y = (layout.height - cardH) * 0.5;

    const glow = new PIXI.Graphics();
    glow.roundRect(x - 6, y - 6, cardW + 12, cardH + 12, 28).fill({
      color: this.toColorNumber(snapshot.colors.primary, 0x8f6fff),
      alpha: 0.08,
    });
    this.container.addChild(glow);

    const card = new PIXI.Graphics();
    card.roundRect(x, y, cardW, cardH, 24).fill({
      color: this.toColorNumber(snapshot.colors.uiCard ?? snapshot.colors.panelBg, 0x17142f),
      alpha: 0.96,
    });
    card.roundRect(x, y, cardW, cardH, 24).stroke({
      color: this.toColorNumber(snapshot.colors.primary, 0x8f6fff),
      alpha: 0.34,
      width: 2,
    });
    this.container.addChild(card);

    title.x = layout.width * 0.5;
    title.y = y + titleTop;
    this.container.addChild(title);

    body.x = layout.width * 0.5;
    body.y = title.y + measuredTitleHeight + titleBodyGap;
    this.container.addChild(body);

    const btnX = layout.width * 0.5 - btnW * 0.5;
    const btnY = body.y + measuredBodyHeight + bodyButtonGap;
    const button = this.createButton(snapshot, btnX, btnY, btnW, btnH);
    this.container.addChild(button);
    this.buttonBounds = new PIXI.Rectangle(btnX, btnY, btnW, btnH);

    const btnText = new PIXI.Text({
      text: snapshot.state.overlay.buttonText,
      style: new PIXI.TextStyle({
        fill: this.toColorNumber(snapshot.colors.buttonText, 0xffffff),
        fontSize: 18,
        fontWeight: "900",
        stroke: { color: 0xffffff, width: 0.6, join: "round" },
      }),
    });
    btnText.anchor.set(0.5);
    btnText.x = layout.width * 0.5;
    btnText.y = btnY + btnH * 0.5 + (this.buttonPressed ? 2 : 0);
    this.container.addChild(btnText);
  }

  hitButton(point) {
    return Boolean(this.buttonBounds && this.buttonBounds.contains(point.x, point.y));
  }

  setButtonPressed(pressed) {
    const nextPressed = Boolean(pressed);
    if (this.buttonPressed === nextPressed) return;
    this.buttonPressed = nextPressed;
    if (this.currentSnapshot && this.currentLayout && this.currentSnapshot.state.overlay?.visible) {
      this.render(this.currentSnapshot, this.currentLayout);
    }
  }

  createButton(snapshot, x, y, width, height) {
    const radius = Math.round(height * 0.5);
    const primary = this.toColorNumber(snapshot.colors.buttonBg, 0x8f6fff);
    const borderColor = mixColor(primary, 0xffffff, 0.7);
    const pressedOffset = this.buttonPressed ? 2 : 0;
    const scale = this.buttonPressed ? 0.975 : 1;

    const wrapper = new PIXI.Container();
    wrapper.position.set(x + width * 0.5, y + height * 0.5 + pressedOffset);
    wrapper.scale.set(scale);

    wrapper.addChild(this.createButtonGlow(width, height, radius, primary, this.buttonPressed));

    const face = new PIXI.Container();
    const faceMask = new PIXI.Graphics();
    faceMask.roundRect(-width * 0.5, -height * 0.5, width, height, radius).fill({ color: 0xffffff, alpha: 1 });
    face.mask = faceMask;
    face.addChild(
      this.createGradientSprite(width, height, [
        { offset: 0, color: "oklch(0.82 0.16 318)" },
        { offset: 0.2, color: "oklch(0.76 0.18 312)" },
        { offset: 0.48, color: "oklch(0.67 0.21 302)" },
        { offset: 0.74, color: "oklch(0.56 0.19 292)" },
        { offset: 1, color: "oklch(0.45 0.14 282)" },
      ]),
      this.createGradientSprite(width, height * 0.58, [
        { offset: 0, color: "rgba(255,255,255,0.46)" },
        { offset: 0.24, color: "rgba(255,255,255,0.18)" },
        { offset: 0.55, color: "rgba(255,255,255,0.05)" },
        { offset: 1, color: "rgba(255,255,255,0)" },
      ], { y: -height * 0.21 }),
      this.createGradientSprite(width * 0.92, height * 0.34, [
        { offset: 0, color: "rgba(255,255,255,0.38)" },
        { offset: 0.38, color: "rgba(255,255,255,0.16)" },
        { offset: 0.72, color: "rgba(255,255,255,0.05)" },
        { offset: 1, color: "rgba(255,255,255,0)" },
      ], { y: -height * 0.18 }),
      this.createGradientSprite(width, height * 0.46, [
        { offset: 0, color: "rgba(15,9,32,0)" },
        { offset: 0.42, color: "rgba(15,9,32,0.06)" },
        { offset: 0.76, color: "rgba(10,6,24,0.2)" },
        { offset: 1, color: "rgba(5,3,14,0.34)" },
      ], { y: height * 0.27 }),
      this.createGradientSprite(width, height * 0.18, [
        { offset: 0, color: "rgba(255,255,255,0.18)" },
        { offset: 0.3, color: "rgba(255,255,255,0.08)" },
        { offset: 0.7, color: "rgba(255,255,255,0.02)" },
        { offset: 1, color: "rgba(255,255,255,0)" },
      ], { y: -height * 0.34 }),
    );
    wrapper.addChild(faceMask, face);

    const innerStroke = new PIXI.Graphics();
    innerStroke.roundRect(-width * 0.5 + 2, -height * 0.5 + 2, width - 4, height - 4, radius - 2).stroke({
      color: 0xffffff,
      alpha: this.buttonPressed ? 0.16 : 0.24,
      width: 1.5,
    });
    wrapper.addChild(innerStroke);

    const outerStroke = new PIXI.Graphics();
    outerStroke.roundRect(-width * 0.5, -height * 0.5, width, height, radius).stroke({
      color: borderColor,
      alpha: 0.55,
      width: 2,
    });
    wrapper.addChild(outerStroke);

    return wrapper;
  }

  createButtonGlow(width, height, radius, primary, pressed) {
    const glow = new PIXI.Container();
    const alphas = pressed ? [0.06, 0.1, 0.16] : [0.08, 0.14, 0.22];
    const spreads = [14, 8, 3];
    for (let index = 0; index < spreads.length; index += 1) {
      const spread = spreads[index];
      const layer = new PIXI.Graphics();
      layer.roundRect(
        -width * 0.5 - spread,
        -height * 0.5 - spread * 0.55,
        width + spread * 2,
        height + spread * 1.1,
        radius + spread,
      ).fill({
        color: primary,
        alpha: alphas[index],
      });
      glow.addChild(layer);
    }

    const shadow = new PIXI.Graphics();
    shadow.roundRect(-width * 0.5, -height * 0.5 + 6, width, height, radius).fill({
      color: 0x05060b,
      alpha: pressed ? 0.16 : 0.28,
    });
    glow.addChild(shadow);
    return glow;
  }

  createGradientSprite(width, height, stops, options = {}) {
    const texture = this.createLinearGradientTexture(width, height, stops);
    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.x = options.x ?? 0;
    sprite.y = options.y ?? 0;
    return sprite;
  }

  createLinearGradientTexture(width, height, stops) {
    const safeWidth = Math.max(2, Math.round(width));
    const safeHeight = Math.max(2, Math.round(height));
    const canvas = document.createElement("canvas");
    canvas.width = safeWidth;
    canvas.height = safeHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      const texture = PIXI.Texture.WHITE;
      return texture;
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, safeHeight);
    for (const stop of stops) {
      gradient.addColorStop(stop.offset, stop.color);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, safeWidth, safeHeight);
    const texture = PIXI.Texture.from(canvas);
    this.generatedTextures.push(texture);
    return texture;
  }

  disposeGeneratedTextures() {
    for (const texture of this.generatedTextures) {
      if (texture === PIXI.Texture.WHITE) continue;
      texture.destroy(true);
    }
    this.generatedTextures = [];
  }
}

function clearContainer(container) {
  const removed = container.removeChildren();
  for (const child of removed) child.destroy({ children: true });
}

function mixColor(from, to, amount) {
  const t = Math.max(0, Math.min(1, Number(amount)));
  const fr = (from >> 16) & 255;
  const fg = (from >> 8) & 255;
  const fb = from & 255;
  const tr = (to >> 16) & 255;
  const tg = (to >> 8) & 255;
  const tb = to & 255;
  const r = Math.round(fr + (tr - fr) * t);
  const g = Math.round(fg + (tg - fg) * t);
  const b = Math.round(fb + (tb - fb) * t);
  return (r << 16) | (g << 8) | b;
}
