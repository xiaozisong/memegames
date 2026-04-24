export class HUD {
    constructor(options) {
        this.root = document.createElement("div");
        this.scoreValue = document.createElement("div");
        this.overlay = document.createElement("div");
        this.overlayTitle = document.createElement("h3");
        this.overlayBody = document.createElement("p");
        this.overlayButton = document.createElement("button");
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
    render(snapshot) {
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
