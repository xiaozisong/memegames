import { EliminationSnapshot } from "../../core/contracts";

export class HUD {
  readonly root: HTMLDivElement;
  private levelValue: HTMLDivElement;
  private movesValue: HTMLDivElement;
  private goalValue: HTMLDivElement;
  private combo: HTMLDivElement;
  private overlay: HTMLDivElement;
  private overlayTitle: HTMLHeadingElement;
  private overlayBody: HTMLParagraphElement;
  private overlayButton: HTMLButtonElement;

  constructor(parent: HTMLElement, onOverlayAction: () => void) {
    this.root = document.createElement("div");
    this.root.className = "mm3-hud";
    this.root.innerHTML = `
      <div class="mm3-hud-card">
        <div class="mm3-hud-label">LEVEL</div>
        <div class="mm3-hud-value" data-k="level">1</div>
      </div>
      <div class="mm3-hud-card">
        <div class="mm3-hud-label">MOVES</div>
        <div class="mm3-hud-value" data-k="moves">15</div>
      </div>
      <div class="mm3-hud-card">
        <div class="mm3-hud-label">GOAL</div>
        <div class="mm3-hud-value" data-k="goal">0/12</div>
      </div>
      <div class="mm3-combo" data-k="combo"></div>
      <div class="mm3-overlay" data-k="overlay">
        <div class="mm3-overlay-card">
          <h3 data-k="overlay-title"></h3>
          <p data-k="overlay-body"></p>
          <button data-k="overlay-btn" type="button">Start</button>
        </div>
      </div>
    `;
    parent.appendChild(this.root);

    this.levelValue = this.root.querySelector('[data-k="level"]') as HTMLDivElement;
    this.movesValue = this.root.querySelector('[data-k="moves"]') as HTMLDivElement;
    this.goalValue = this.root.querySelector('[data-k="goal"]') as HTMLDivElement;
    this.combo = this.root.querySelector('[data-k="combo"]') as HTMLDivElement;
    this.overlay = this.root.querySelector('[data-k="overlay"]') as HTMLDivElement;
    this.overlayTitle = this.root.querySelector('[data-k="overlay-title"]') as HTMLHeadingElement;
    this.overlayBody = this.root.querySelector('[data-k="overlay-body"]') as HTMLParagraphElement;
    this.overlayButton = this.root.querySelector('[data-k="overlay-btn"]') as HTMLButtonElement;
    this.overlayButton.addEventListener("click", onOverlayAction);
  }

  render(snapshot: EliminationSnapshot): void {
    const goal = snapshot.gemTargets[0];
    const collected = snapshot.state.gemProgress[goal?.id ?? ""] ?? 0;
    this.levelValue.textContent = "1";
    this.movesValue.textContent = String(
      Math.max(0, snapshot.moveLimit - snapshot.state.movesUsed),
    );
    this.goalValue.textContent = `${collected}/${goal?.required ?? 0}`;
    this.overlay.classList.toggle("show", snapshot.state.overlay.visible);
    this.overlayTitle.textContent = snapshot.state.overlay.title;
    this.overlayBody.textContent = snapshot.state.overlay.body;
    this.overlayButton.textContent = snapshot.state.overlay.buttonText;
  }

  showCombo(label: string): void {
    if (!label) return;
    this.combo.textContent = label;
    this.combo.classList.remove("show");
    void this.combo.offsetWidth;
    this.combo.classList.add("show");
  }
}
