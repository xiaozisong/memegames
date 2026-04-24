type GemFlight = {
  from: DOMRect;
  to: DOMRect;
  color: string;
};

export class AnimationController {
  private host: HTMLElement;

  constructor(host: HTMLElement) {
    this.host = host;
  }

  playSnap(cellElement: HTMLElement): void {
    cellElement.classList.remove("bp-snap");
    void cellElement.offsetWidth;
    cellElement.classList.add("bp-snap");
  }

  playClear(cells: HTMLElement[]): void {
    for (const cell of cells) {
      cell.classList.remove("bp-clearing");
      void cell.offsetWidth;
      cell.classList.add("bp-clearing");
    }
  }

  playCombo(): void {
    this.host.classList.remove("bp-combo");
    void this.host.offsetWidth;
    this.host.classList.add("bp-combo");
    window.setTimeout(() => this.host.classList.remove("bp-combo"), 420);
  }

  playShake(): void {
    this.host.classList.remove("bp-shake");
    void this.host.offsetWidth;
    this.host.classList.add("bp-shake");
    window.setTimeout(() => this.host.classList.remove("bp-shake"), 360);
  }

  playGemFlights(entries: GemFlight[]): void {
    for (const entry of entries) {
      const orb = document.createElement("div");
      orb.className = "bp-gem-fly";
      orb.style.background = entry.color;
      orb.style.left = `${entry.from.left + entry.from.width * 0.5}px`;
      orb.style.top = `${entry.from.top + entry.from.height * 0.5}px`;
      const deltaX = entry.to.left + entry.to.width * 0.5 - (entry.from.left + entry.from.width * 0.5);
      const deltaY = entry.to.top + entry.to.height * 0.5 - (entry.from.top + entry.from.height * 0.5);
      orb.style.setProperty("--dx", `${deltaX}px`);
      orb.style.setProperty("--dy", `${deltaY}px`);
      this.host.appendChild(orb);
      window.setTimeout(() => orb.remove(), 520);
    }
  }
}
