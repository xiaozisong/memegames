import { EliminationSnapshot } from "../../core/contracts";

type HUDOptions = {
  onOverlayAction: () => void;
};

export class HUD {
  readonly root: HTMLDivElement;
  readonly scoreCard: HTMLDivElement;
  readonly ruleCard: HTMLDivElement;
  readonly bestCard: HTMLDivElement;
  readonly gemBadgeRefs: Record<string, HTMLElement> = {};

  private readonly overlay: HTMLDivElement;
  private readonly overlayTitle: HTMLHeadingElement;
  private readonly overlayBody: HTMLParagraphElement;
  private readonly overlayButton: HTMLButtonElement;
  constructor(private options: HUDOptions) {
    this.root = document.createElement("div");
    this.root.className = "bp-hud";

    this.scoreCard = this.createCard("SCORE");
    this.ruleCard = this.createCard("RULE");
    this.bestCard = this.createCard("BEST");
    this.root.append(this.scoreCard, this.ruleCard, this.bestCard);

    this.overlay = document.createElement("div");
    this.overlay.className = "bp-overlay";

    const card = document.createElement("div");
    card.className = "bp-overlay-card";
    this.overlayTitle = document.createElement("h3");
    this.overlayBody = document.createElement("p");
    this.overlayButton = document.createElement("button");
    this.overlayButton.type = "button";
    this.overlayButton.addEventListener("click", () => this.options.onOverlayAction());
    card.append(this.overlayTitle, this.overlayBody, this.overlayButton);
    this.overlay.appendChild(card);
  }

  getOverlayElement(): HTMLDivElement {
    return this.overlay;
  }

  getGemBadge(type: string): HTMLElement | null {
    return this.gemBadgeRefs[type] ?? null;
  }

  render(snapshot: EliminationSnapshot, bestScore: number): void {
    this.scoreCard.innerHTML = `
      <span class="bp-hud-label">SCORE</span>
      <span class="bp-hud-value">${snapshot.state.score}</span>
    `;

    const moveText = `Moves ${snapshot.state.movesUsed}/${snapshot.moveLimit}`;
    this.ruleCard.innerHTML = `
      <span class="bp-hud-label">RULE</span>
      <span class="bp-hud-value bp-hud-rule">${moveText}</span>
      <span class="bp-hud-sub">${snapshot.state.message}</span>
    `;

    const gemLine = snapshot.gemTargets
      .map((target) => {
        const current = snapshot.state.gemProgress[target.id] ?? 0;
        const id = `gem-${target.id}`;
        return `<span id="${id}" class="bp-gem-goal" data-gem-type="${target.id}">${target.id.toUpperCase()} ${current}/${target.required}</span>`;
      })
      .join("");

    this.bestCard.innerHTML = `
      <span class="bp-hud-label">BEST</span>
      <span class="bp-hud-value">${bestScore}</span>
      <div class="bp-gem-goals">${gemLine}</div>
    `;

    this.gemBadgeRefsClear();
    for (const target of snapshot.gemTargets) {
      const id = `gem-${target.id}`;
      const ref = this.bestCard.querySelector<HTMLElement>(`#${id}`);
      if (ref) this.gemBadgeRefs[target.id] = ref;
    }

    const visible = snapshot.state.overlay.visible;
    this.overlay.classList.toggle("is-visible", visible);
    if (visible) {
      this.overlayTitle.textContent = snapshot.state.overlay.title;
      this.overlayBody.textContent = snapshot.state.overlay.body;
      this.overlayButton.textContent = snapshot.state.overlay.buttonText;
    }
  }

  private gemBadgeRefsClear(): void {
    for (const key of Object.keys(this.gemBadgeRefs)) {
      delete this.gemBadgeRefs[key];
    }
  }

  private createCard(label: string): HTMLDivElement {
    const card = document.createElement("div");
    card.className = "bp-card";
    card.setAttribute("data-label", label);
    return card;
  }
}
