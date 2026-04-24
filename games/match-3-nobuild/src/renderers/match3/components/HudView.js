import * as PIXI from "pixi.js";

export class HudView {
  constructor(container, toColorNumber) {
    this.container = new PIXI.Container();
    container.addChild(this.container);
    this.toColorNumber = toColorNumber;
  }

  render(snapshot, layout) {
    clearContainer(this.container);
    const presentation = snapshot.presentation ?? {};
    const hudTitleFontSize = clamp(Number(presentation.hudTitleFontSize ?? 40), 18, 72);
    const hudLabelFontSize = clamp(Number(presentation.hudLabelFontSize ?? 12), 10, 28);
    const hudValueFontSize = clamp(Number(presentation.hudValueFontSize ?? 24), 14, 40);
    const hudGoalFontSize = clamp(Number(presentation.hudGoalFontSize ?? 18), 12, 32);

    const cards = [
      { label: "LEVEL", value: String(snapshot.levelIndex), kind: "text" },
      { label: "MOVES", value: String(snapshot.state.movesRemaining), kind: "text" },
      { label: "GOAL", kind: "goal" },
    ];

    const gap = clamp(layout.width * 0.018, 8, 16);
    const cardW = (layout.width - layout.padding * 2 - gap * 2) / 3;
    const cardH = Math.max(72, Number(layout.hudHeight ?? 96));
    const y = layout.hudY ?? layout.padding;
    const titleText = String(snapshot.title || "").trim();

    if (titleText) {
      const title = new PIXI.Text({
        text: titleText,
        style: new PIXI.TextStyle({
          fill: this.toColorNumber(snapshot.colors.textPrimary, 0xffffff),
          fontSize: hudTitleFontSize,
          fontWeight: "900",
          letterSpacing: 2,
          align: "center",
        }),
      });
      title.anchor.set(0.5, 1);
      title.x = layout.width * 0.5;
      title.y = y - clamp(layout.height * 0.012, 8, 14);
      this.container.addChild(title);
    }

    cards.forEach((item, index) => {
      const x = layout.padding + index * (cardW + gap);
      const panel = new PIXI.Graphics();
      panel.roundRect(x, y, cardW, cardH, 18).fill({
        color: 0x000000,
        alpha: 1,
      });
      this.container.addChild(panel);

      const label = new PIXI.Text({
        text: item.label,
        style: new PIXI.TextStyle({
          fill: this.toColorNumber(snapshot.colors.textSecondary, 0xded7ff),
          fontSize: hudLabelFontSize,
          fontWeight: "800",
          align: "center",
        }),
      });
      label.anchor.set(0.5, 0);
      label.x = x + cardW * 0.5;
      label.y = y + 12;
      this.container.addChild(label);

      if (item.kind === "goal") {
        this.renderGoalCard(snapshot, { x, y, cardW, cardH, hudGoalFontSize });
        return;
      }

      const value = new PIXI.Text({
        text: item.value,
        style: new PIXI.TextStyle({
          fill: this.toColorNumber(snapshot.colors.textPrimary, 0xffffff),
          fontSize: hudValueFontSize,
          fontWeight: "900",
          align: "center",
        }),
      });
      value.anchor.set(0.5);
      value.x = x + cardW * 0.5;
      value.y = y + cardH * 0.62;
      this.container.addChild(value);
    });
  }

  renderGoalCard(snapshot, { x, y, cardW, cardH, hudGoalFontSize }) {
    const goalItems = Array.isArray(snapshot.goal?.items) && snapshot.goal.items.length > 0 ? snapshot.goal.items : [snapshot.goal ?? {}];
    const listTop = y + 30;
    const rowHeight = Math.max(18, (cardH - 36) / Math.max(1, goalItems.length));

    goalItems.slice(0, 4).forEach((goal, index) => {
      const rowCenterY = listTop + rowHeight * index + rowHeight * 0.5;
      const iconCenterX = x + cardW * 0.26;
      const progressX = x + cardW * 0.72;
      const iconSize = Math.min(rowHeight * 1.08, cardW * 0.24);
      const progressText = `${goal.progress ?? 0}/${goal.target ?? 0}`;
      const hasGoalAsset = typeof goal.tileAsset === "string" && goal.tileAsset.trim().length > 0;

      if (hasGoalAsset) {
        const glow = new PIXI.Graphics();
        glow.circle(iconCenterX, rowCenterY, iconSize * 0.72).fill({
          color: this.toColorNumber(goal.tileGlow, 0xffffff),
          alpha: 0.2,
        });
        this.container.addChild(glow);

        const badge = new PIXI.Graphics();
        badge.circle(iconCenterX, rowCenterY, iconSize * 0.62).fill({ color: 0x111111, alpha: 1 });
        this.container.addChild(badge);

        const icon = new PIXI.Sprite(PIXI.Texture.from(goal.tileAsset));
        icon.anchor.set(0.5);
        icon.x = iconCenterX;
        icon.y = rowCenterY;
        icon.width = iconSize * 1.34;
        icon.height = iconSize * 1.34;
        icon.roundPixels = true;

        const mask = new PIXI.Graphics();
        mask.circle(iconCenterX, rowCenterY, iconSize * 0.5).fill({ color: 0xffffff, alpha: 1 });
        icon.mask = mask;

        this.container.addChild(icon, mask);

        const rim = new PIXI.Graphics();
        rim.circle(iconCenterX, rowCenterY, iconSize * 0.53).stroke({
          color: 0xffffff,
          alpha: 0.16,
          width: Math.max(1, iconSize * 0.08),
        });
        this.container.addChild(rim);
      } else {
        const fallback = new PIXI.Text({
          text: String(goal.tileName || goal.tileId || "?"),
          style: new PIXI.TextStyle({
            fill: this.toColorNumber(snapshot.colors.textPrimary, 0xffffff),
            fontSize: Math.max(10, hudGoalFontSize - 4),
            fontWeight: "900",
            align: "center",
            wordWrap: true,
            wordWrapWidth: cardW * 0.24,
          }),
        });
        fallback.anchor.set(0.5);
        fallback.x = iconCenterX;
        fallback.y = rowCenterY;
        this.container.addChild(fallback);
      }

      const value = new PIXI.Text({
        text: progressText,
        style: new PIXI.TextStyle({
          fill: this.toColorNumber(snapshot.colors.textPrimary, 0xffffff),
          fontSize: Math.max(12, hudGoalFontSize - (goalItems.length >= 3 ? 4 : 2)),
          fontWeight: "900",
          align: "center",
        }),
      });
      value.anchor.set(0.5);
      value.x = progressX;
      value.y = rowCenterY;
      this.container.addChild(value);
    });
  }
}

function clearContainer(container) {
  const removed = container.removeChildren();
  for (const child of removed) child.destroy({ children: true });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}
