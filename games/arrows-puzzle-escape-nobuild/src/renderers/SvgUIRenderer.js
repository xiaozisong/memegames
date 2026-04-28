export class SvgUIRenderer {
  constructor(root, { onRestart, onOverlayAction }) {
    this.root = root;
    this.onRestart = onRestart;
    this.onOverlayAction = onOverlayAction;
    this.build();
  }

  build() {
    this.root.innerHTML = "";
    this.root.id = "ui-layer";

    this.hud = document.createElement("div");
    this.hud.className = "svg-ui-hud";

    this.titleCard = document.createElement("section");
    this.titleCard.className = "svg-ui-card svg-ui-title-card svg-ui-hud-compact";
    this.title = document.createElement("div");
    this.title.className = "svg-ui-title";
    this.subtitle = document.createElement("div");
    this.subtitle.className = "svg-ui-subtitle";
    this.titleCard.append(this.title, this.subtitle);
    this.hud.append(this.titleCard);

    this.overlay = document.createElement("div");
    this.overlay.className = "svg-ui-overlay";
    this.overlayPanel = document.createElement("section");
    this.overlayPanel.className = "svg-ui-overlay-panel";
    this.overlayKicker = document.createElement("div");
    this.overlayKicker.className = "svg-ui-overlay-kicker";
    this.overlayTitle = document.createElement("div");
    this.overlayTitle.className = "svg-ui-overlay-title";
    this.overlayBody = document.createElement("div");
    this.overlayBody.className = "svg-ui-overlay-body";
    this.overlayButton = document.createElement("button");
    this.overlayButton.className = "svg-pill-button";
    this.overlayButton.addEventListener("click", () => this.onOverlayAction?.());
    this.overlayPanel.append(this.overlayKicker, this.overlayTitle, this.overlayBody, this.overlayButton);
    this.overlay.appendChild(this.overlayPanel);

    this.root.append(this.hud, this.overlay);
  }

  render(snapshot) {
    const titleBase = snapshot.ui.title || snapshot.game.title || "释放虫虫";
    const levelLabel = snapshot.ui.levelLabel || "关卡";
    const levelValue = snapshot.game.level || 1;
    this.title.textContent = `${titleBase} - ${levelLabel}${levelValue}`;
    this.subtitle.textContent = snapshot.game.subtitle || "点击最上层的虫虫头拽出来";

    const overlay = snapshot.state.overlay;
    this.overlay.classList.toggle("is-visible", Boolean(overlay?.visible));
    this.overlayKicker.textContent = "";
    this.overlayTitle.textContent = overlay?.title || "";
    this.overlayBody.textContent = overlay?.body || "";
    this.overlayButton.textContent = overlay?.buttonText || "继续";

    this.applyTheme(snapshot.theme);
  }

  applyTheme(theme = {}) {
    this.root.style.setProperty("--svg-bg", theme.background || "#07111f");
    this.root.style.setProperty("--svg-panel", theme.panel || "rgba(10,22,40,0.82)");
    this.root.style.setProperty("--svg-panel-border", theme.panelBorder || "#254c72");
    this.root.style.setProperty("--svg-text", theme.text || "#f8fafc");
    this.root.style.setProperty("--svg-muted", theme.mutedText || "#9db3c8");
    this.root.style.setProperty("--svg-primary", theme.primary || "#35d6ff");
    this.root.style.setProperty("--svg-button-text", theme.background || "#07111f");
  }
}
