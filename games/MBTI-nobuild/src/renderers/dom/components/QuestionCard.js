import { OptionItem } from "./OptionItem.js";

export class QuestionCard {
  constructor() {
    this.element = document.createElement("section");
    this.element.className = "mbti-question-card";

    this.title = document.createElement("h2");
    this.title.className = "mbti-question-title";

    this.options = document.createElement("div");
    this.options.className = "mbti-options";

    this.element.appendChild(this.title);
    this.element.appendChild(this.options);
  }

  render(question, { onSelect }) {
    this.element.replaceChildren();
    this.title.textContent = question.prompt;

    this.options.replaceChildren();
    question.options.forEach((option, optionIndex) => {
      const optionItem = new OptionItem({
        option,
        optionIndex,
        onSelect,
      });
      this.options.appendChild(optionItem.element);
    });

    this.element.append(this.title, this.options);
  }
}
