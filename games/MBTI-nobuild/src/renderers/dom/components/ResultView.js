export class ResultView {
  constructor({ onRestart, onSave }) {
    this.element = document.createElement("section");
    this.element.className = "mbti-result-page";

    this.card = document.createElement("article");
    this.card.id = "result-card";
    this.card.className = "mbti-result-card";

    this.cardBackground = document.createElement("div");
    this.cardBackground.className = "mbti-result-card-bg";

    this.cardOverlay = document.createElement("div");
    this.cardOverlay.className = "mbti-result-card-overlay";

    this.header = document.createElement("p");
    this.header.className = "mbti-result-header";

    this.title = document.createElement("h2");
    this.title.className = "mbti-result-title";

    this.subtitle = document.createElement("p");
    this.subtitle.className = "mbti-result-subtitle";

    this.tags = document.createElement("div");
    this.tags.className = "mbti-result-tags";

    this.descriptionCard = this.createDescriptionCard();

    this.footer = document.createElement("div");
    this.footer.className = "mbti-result-footer";

    this.footerHint = document.createElement("p");
    this.footerHint.className = "mbti-result-footer-hint";

    this.qrPlaceholder = document.createElement("div");
    this.qrPlaceholder.className = "mbti-result-qr-placeholder";
    this.qrPlaceholder.setAttribute("aria-hidden", "true");

    this.footer.append(this.footerHint, this.qrPlaceholder);
    this.cardOverlay.append(
      this.header,
      this.title,
      this.subtitle,
      this.tags,
      this.descriptionCard,
      this.footer,
    );
    this.card.append(this.cardBackground, this.cardOverlay);

    this.actions = document.createElement("div");
    this.actions.className = "mbti-result-page-actions";

    this.saveButton = document.createElement("button");
    this.saveButton.type = "button";
    this.saveButton.className = "mbti-button mbti-button-primary";
    this.saveButton.addEventListener("click", () => {
      onSave?.();
    });

    this.restartButton = document.createElement("button");
    this.restartButton.type = "button";
    this.restartButton.className = "mbti-button";
    this.restartButton.addEventListener("click", () => {
      onRestart?.();
    });

    this.actions.append(this.saveButton, this.restartButton);
    this.element.append(this.card, this.actions);
  }

  render(result, labels) {
    this.element.replaceChildren();
    this.header.textContent = labels.headerLabel;
    this.title.textContent = result.title ?? "";
    this.subtitle.textContent = result.subtitle ?? "";
    this.subtitle.style.display = result.subtitle ? "" : "none";
    this.footerHint.textContent = labels.footerHint;
    this.saveButton.textContent = labels.saveImageLabel;
    this.restartButton.textContent = labels.restartLabel;

    const tagCount = this.renderTags(result.tags ?? result.traits ?? []);
    this.tags.style.display = tagCount > 0 ? "flex" : "none";
    this.renderDescription(result.description ?? "", labels.answeredLabel);

    this.element.append(this.card, this.actions);
  }

  createTag(label) {
    const tag = document.createElement("span");
    tag.className = "mbti-result-tag";
    tag.textContent = `#${label}`;
    return tag;
  }

  createDescriptionCard() {
    const descriptionCard = document.createElement("section");
    descriptionCard.className = "mbti-result-description-card";

    this.description = document.createElement("p");
    this.description.className = "mbti-result-description";

    this.meta = document.createElement("p");
    this.meta.className = "mbti-result-meta";

    descriptionCard.append(this.description, this.meta);
    return descriptionCard;
  }

  renderTags(tags) {
    this.tags.replaceChildren();
    let renderedCount = 0;
    for (const tag of tags.slice(0, 3)) {
      if (!tag) continue;
      this.tags.appendChild(this.createTag(tag));
      renderedCount += 1;
    }
    return renderedCount;
  }

  renderDescription(description, metaText) {
    this.description.textContent = description;
    this.meta.textContent = metaText;
    this.meta.style.display = metaText ? "" : "none";
  }

  setSaveState(isSaving, label) {
    this.saveButton.disabled = isSaving;
    this.saveButton.textContent = label;
  }

  getCardElement() {
    return this.card;
  }
}
