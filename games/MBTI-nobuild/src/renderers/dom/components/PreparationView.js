export class PreparationView {
  constructor({ onContinue }) {
    this.onContinue = onContinue;

    this.element = document.createElement("section");
    this.element.className = "mbti-preparation";

    this.spinner = document.createElement("div");
    this.spinner.className = "mbti-loading-spinner";
    this.spinner.setAttribute("aria-hidden", "true");

    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.className = "mbti-preparation-button";
    this.button.addEventListener("click", () => {
      if (this.element.dataset.mode === "ready") {
        this.onContinue?.();
      }
    });
    this.button.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      this.onContinue?.();
    });

    this.element.append(this.spinner, this.button);
  }

  renderLoading() {
    this.element.dataset.mode = "loading";
    this.spinner.style.display = "block";
    this.button.style.display = "none";
  }

  renderReady({ buttonLabel }) {
    this.element.dataset.mode = "ready";
    this.spinner.style.display = "none";
    this.button.textContent = buttonLabel;
    this.button.style.display = "inline-flex";
  }

  focusButton() {
    this.button.focus();
  }
}
