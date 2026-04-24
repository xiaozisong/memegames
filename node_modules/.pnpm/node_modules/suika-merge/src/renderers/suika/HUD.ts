import { SuikaSnapshot } from "../../core/contracts";

type HUDOptions = {
  onRestart: () => void;
};

export class HUD {
  readonly root = document.createElement("div");
  private scoreValue = document.createElement("div");
  private overlay = document.createElement("div");
  private overlayTitle = document.createElement("h3");
  private overlayBody = document.createElement("p");
  private overlayButton = document.createElement("button");

  constructor(options: HUDOptions) {
    this.root.className = "suika-ui";
    const top = document.createElement("div");
    top.className = "suika-top";

    const score = document.createElement("div");
    score.className = "suika-score";
    this.scoreValue.className = "suika-score-value";
    score.appendChild(this.scoreValue);
    top.append(score);
    this.root.appendChild(top);

    this.overlay.className = "suika-overlay";
    const panel = document.createElement("div");
    panel.className = "suika-overlay-panel";
    this.overlayButton.type = "button";
    this.overlayButton.addEventListener("click", options.onRestart);
    panel.append(this.overlayTitle, this.overlayBody, this.overlayButton);
    this.overlay.appendChild(panel);
    this.root.appendChild(this.overlay);
  }

  render(snapshot: SuikaSnapshot): void {
    this.scoreValue.textContent = String(snapshot.state.score);

    const showOverlay = snapshot.state.overlay.visible;
    this.overlay.classList.toggle("visible", showOverlay);
    if (showOverlay) {
      this.overlayTitle.textContent = snapshot.state.overlay.title;
      this.overlayBody.textContent = snapshot.state.overlay.body;
      this.overlayButton.textContent = snapshot.state.overlay.buttonText;
    }
  }
}
