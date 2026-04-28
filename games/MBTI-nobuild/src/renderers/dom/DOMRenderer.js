import { getSetting } from "../../config.js";
import { PreparationView } from "./components/PreparationView.js";
import { QuestionCard } from "./components/QuestionCard.js";
import { ResultView } from "./components/ResultView.js";
import { createDesignTokens } from "./domui/designTokens.js";
import { ensureDomRendererStyles } from "./domui/theme.js";

const LOADING_DELAY_MS = 1400;
const QUESTION_TRANSITION_MS = 220;
const RESULT_BACKGROUND_GRADIENT = "linear-gradient(180deg, #eef9f1 0%, #dff1e5 52%, #f8fcf7 100%)";
const DEFAULT_PAGE_GRADIENT = "linear-gradient(180deg, var(--mbti-color-sky-top) 0%, var(--mbti-color-sky-bottom) 100%)";
const HTML2CANVAS_MODULE_URL = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm";

let html2canvasModulePromise = null;

async function loadHtml2Canvas() {
  if (!html2canvasModulePromise) {
    html2canvasModulePromise = import(HTML2CANVAS_MODULE_URL);
  }

  const module = await html2canvasModulePromise;
  return module.default ?? module;
}

export class DOMRenderer {
  constructor(root, kernel) {
    this.root = root;
    this.kernel = kernel;
    this.unsubscribe = null;
    this.loadingTimer = null;
    this.phase = "loading";
    this.latestSnapshot = null;
    this.bgmAudio = null;
    this.isQuestionTransitioning = false;
    this.isShowingResult = false;
    this.tokens = createDesignTokens();
    this.backgroundImage = getSetting("presentation.backgroundImage", "");
    this.readyBackgroundImage = getSetting("presentation.readyBackgroundImage", "");
    this.resultCardBackgroundImage = getSetting("presentation.resultCardBackgroundImage", "");
    this.readyButtonBottomPx = this.getClampedNumber(getSetting("presentation.readyButtonBottomPx", 36), 0, 200, 36);
    this.readyButtonBobDistancePx = this.getClampedNumber(getSetting("presentation.readyButtonBobDistancePx", 14), 0, 80, 14);
    this.readyButtonBobDurationMs = this.getClampedNumber(getSetting("presentation.readyButtonBobDurationMs", 1200), 300, 5000, 1200);
    this.bgmUrl = getSetting("asset_audio_bgm", "");
    this.bgmVolume = this.getClampedNumber(getSetting("asset_audio_bgm_volume", 0.42), 0, 1, 0.42);

    this.labels = {
      title: getSetting("ui.text.title", "MIND MIRROR"),
      subtitle: getSetting("ui.text.subtitle", ""),
      progressLabel: getSetting("ui.text.progressLabel", "测试进度"),
      questionLabel: getSetting("ui.text.questionLabel", "第 {current} / {total} 题"),
      restartLabel: getSetting("ui.text.restartLabel", "重新测试"),
      resultPrefix: getSetting("ui.text.resultPrefix", "你的测试结果"),
      dimensionLabel: getSetting("ui.text.dimensionLabel", "维度偏好"),
      answeredLabel: getSetting("ui.text.answeredLabel", "已完成 {count} 次选择"),
      readyButtonLabel: getSetting("ui.text.readyButtonLabel", "开始测试"),
      resultReportHeader: getSetting("ui.text.resultReportHeader", "— 灵魂底色测试报告 —"),
      resultFooterHint: getSetting("ui.text.resultFooterHint", "保存图片后，分享你的测试卡片"),
      saveImageLabel: getSetting("ui.text.saveImageLabel", "保存图片"),
      saveImagePendingLabel: getSetting("ui.text.saveImagePendingLabel", "生成图片中..."),
    };
  }

  async mount() {
    ensureDomRendererStyles(this.tokens);
    this.createView();
    this.syncPhaseLayout();
    this.applyPresentationVariables();
    this.createBackgroundAudio();
    this.applyPageBackgroundForPhase();
    this.root.replaceChildren(this.app);
    this.unsubscribe = this.kernel.subscribe((snapshot) => {
      this.latestSnapshot = snapshot;
      if (this.phase === "quiz") {
        this.render(snapshot);
      }
    });
    this.startPreparationFlow();
  }

  createView() {
    this.app = document.createElement("div");
    this.app.className = "mbti-app";

    this.shell = document.createElement("div");
    this.shell.className = "mbti-shell";

    this.header = document.createElement("header");
    this.header.className = "mbti-header";

    this.title = document.createElement("h1");
    this.title.className = "mbti-title";
    this.title.textContent = this.labels.title;

    this.subtitle = document.createElement("p");
    this.subtitle.className = "mbti-subtitle";
    this.subtitle.textContent = this.labels.subtitle;

    this.progressSection = document.createElement("section");
    this.progressSection.className = "mbti-progress";

    this.progressRow = document.createElement("div");
    this.progressRow.className = "mbti-progress-row";

    this.progressValue = document.createElement("span");

    this.progressTrack = document.createElement("div");
    this.progressTrack.className = "mbti-progress-track";

    this.progressFill = document.createElement("div");
    this.progressFill.className = "mbti-progress-fill";

    this.progressTrack.appendChild(this.progressFill);
    this.progressRow.appendChild(this.progressValue);
    this.progressRow.appendChild(this.progressTrack);
    this.progressSection.appendChild(this.progressRow);

    this.stage = document.createElement("div");
    this.stage.className = "mbti-stage";

    this.preparationView = new PreparationView({
      onContinue: () => this.enterQuiz(),
    });
    this.questionCard = new QuestionCard();
    this.resultView = new ResultView({
      onRestart: () => this.restartFromPreparation(),
      onSave: () => this.handleSaveResultCard(),
    });

    this.shell.appendChild(this.progressSection);
    this.shell.appendChild(this.stage);
    this.app.appendChild(this.shell);
  }

  startPreparationFlow() {
    this.phase = "loading";
    this.isShowingResult = false;
    this.syncPhaseLayout();
    this.applyPageBackgroundForPhase();
    this.renderPreparation();
    this.loadingTimer = window.setTimeout(() => {
      this.phase = "ready";
      this.syncPhaseLayout();
      this.applyPageBackgroundForPhase();
      this.renderPreparation();
      this.preparationView.focusButton();
    }, LOADING_DELAY_MS);
  }

  restartFromPreparation() {
    this.phase = "ready";
    this.isShowingResult = false;
    this.kernel.dispatch({ type: "restart" });
    this.syncPhaseLayout();
    this.applyPageBackgroundForPhase();
    this.renderPreparation();
    this.preparationView.focusButton();
  }

  enterQuiz() {
    if (this.phase !== "ready") return;
    this.phase = "quiz";
    this.isShowingResult = false;
    this.syncPhaseLayout();
    this.applyPageBackgroundForPhase();
    this.ensureBgmPlayback();
    this.toggleChrome(true);
    if (this.latestSnapshot) {
      this.render(this.latestSnapshot);
    }
  }

  renderPreparation() {
    this.toggleChrome(false);
    this.stage.replaceChildren();

    if (this.phase === "loading") {
      this.preparationView.renderLoading();
    } else {
      this.preparationView.renderReady({
        buttonLabel: this.labels.readyButtonLabel,
      });
    }

    this.stage.appendChild(this.preparationView.element);
  }

  render(snapshot) {
    if (snapshot.completed && snapshot.result) {
      this.isShowingResult = true;
      this.syncPhaseLayout();
      this.applyPageBackgroundForPhase();
      this.toggleChrome(false);
      this.isQuestionTransitioning = false;
      this.questionCard.element.classList.remove("is-exiting", "is-entering");
      this.renderResult(snapshot.result, snapshot.answers.length);
      return;
    }

    if (snapshot.currentQuestion) {
      this.isShowingResult = false;
      this.syncPhaseLayout();
      this.applyPageBackgroundForPhase();
      this.toggleChrome(true);
      this.renderQuestion(snapshot.currentQuestion, snapshot.progress);
    }
  }

  renderQuestion(question, progress) {
    this.renderProgress(progress, false);
    this.stage.replaceChildren();
    this.questionCard.render(question, {
      onSelect: (optionId) => {
        this.transitionToNextQuestion(optionId);
      },
    });
    this.questionCard.element.classList.remove("is-exiting");
    if (this.isQuestionTransitioning) {
      this.questionCard.element.classList.remove("is-entering");
      void this.questionCard.element.offsetWidth;
      this.questionCard.element.classList.add("is-entering");
      this.isQuestionTransitioning = false;
    } else {
      this.questionCard.element.classList.remove("is-entering");
    }
    this.stage.appendChild(this.questionCard.element);
  }

  renderResult(result, answerCount) {
    this.stage.replaceChildren();
    this.resultView.render(result, {
        headerLabel: this.labels.resultReportHeader,
        footerHint: this.labels.resultFooterHint,
        restartLabel: this.labels.restartLabel,
        saveImageLabel: this.labels.saveImageLabel,
        answeredLabel: this.format(this.labels.answeredLabel, {
          count: answerCount,
        }),
    });
    this.stage.appendChild(this.resultView.element);
  }

  renderProgress(progress, completed) {
    this.progressValue.textContent = this.format(this.labels.questionLabel, {
      current: progress.current,
      total: progress.total,
    });
    const ratio = completed ? 1 : progress.ratio;
    this.progressFill.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
  }

  format(template, values) {
    return Object.entries(values).reduce((output, [key, value]) => {
      return output.replaceAll(`{${key}}`, String(value));
    }, template);
  }

  toggleChrome(visible) {
    this.progressSection.style.display = visible ? "" : "none";
  }

  async handleSaveResultCard() {
    const cardElement = this.resultView.getCardElement();
    const resultType = this.latestSnapshot?.result?.type ?? "mbti-result";
    if (!cardElement) return;

    this.resultView.setSaveState(true, this.labels.saveImagePendingLabel);
    try {
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(cardElement, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const downloadLink = document.createElement("a");
      downloadLink.href = canvas.toDataURL("image/png");
      downloadLink.download = `${String(resultType).toLowerCase()}-result-card.png`;
      downloadLink.click();
    } catch (error) {
      console.error("Failed to save result card image.", error);
    } finally {
      this.resultView.setSaveState(false, this.labels.saveImageLabel);
    }
  }

  transitionToNextQuestion(optionId) {
    if (this.isQuestionTransitioning) return;
    this.isQuestionTransitioning = true;
    this.questionCard.element.classList.remove("is-entering");
    this.questionCard.element.classList.add("is-exiting");
    window.setTimeout(() => {
      this.kernel.dispatch({
        type: "select_option",
        optionId,
      });
    }, QUESTION_TRANSITION_MS);
  }

  syncPhaseLayout() {
    if (!this.app) return;
    const isPreparationPhase = this.phase === "loading" || this.phase === "ready";
    const isResultPhase = this.isShowingResult;
    this.app.classList.toggle("is-preparation", isPreparationPhase);
    this.app.classList.toggle("is-quiz", !isPreparationPhase && !isResultPhase);
    this.app.classList.toggle("is-result", isResultPhase);
  }

  applyPresentationVariables() {
    if (!this.app) return;
    const readyBackgroundValue = this.readyBackgroundImage
      ? `url("${String(this.readyBackgroundImage).replace(/"/g, '\\"')}")`
      : "none";
    const resultBackgroundSource = this.resultCardBackgroundImage || this.backgroundImage || this.readyBackgroundImage;
    const resultBackgroundValue = resultBackgroundSource
      ? `url("${String(resultBackgroundSource).replace(/"/g, '\\"')}")`
      : "none";
    this.app.style.setProperty("--mbti-preparation-background", readyBackgroundValue);
    this.app.style.setProperty("--mbti-result-card-background", resultBackgroundValue);
    this.app.style.setProperty("--mbti-preparation-button-bottom", `${this.readyButtonBottomPx}px`);
    this.app.style.setProperty("--mbti-preparation-button-bob-distance", `${this.readyButtonBobDistancePx}px`);
    this.app.style.setProperty("--mbti-preparation-button-bob-duration", `${this.readyButtonBobDurationMs}ms`);
  }

  applyPageBackgroundForPhase() {
    if (this.isShowingResult) {
      document.body.style.setProperty("--mbti-page-background", "none");
      document.body.style.setProperty("--mbti-page-gradient", RESULT_BACKGROUND_GRADIENT);
      document.body.style.backgroundColor = "#eef9f1";
      return;
    }

    const isPreparationPhase = this.phase === "loading" || this.phase === "ready";
    const activeBackgroundImage = isPreparationPhase
      ? this.readyBackgroundImage
      : this.backgroundImage;
    const backgroundValue = activeBackgroundImage
      ? `url("${String(activeBackgroundImage).replace(/"/g, '\\"')}")`
      : "none";
    const backgroundColor = isPreparationPhase && !this.readyBackgroundImage
      ? "#ffffff"
      : "#eef9ff";

    document.body.style.setProperty("--mbti-page-background", backgroundValue);
    document.body.style.setProperty("--mbti-page-gradient", DEFAULT_PAGE_GRADIENT);
    document.body.style.backgroundColor = backgroundColor;
  }

  createBackgroundAudio() {
    if (!this.bgmUrl) return;
    this.bgmAudio = new Audio(this.bgmUrl);
    this.bgmAudio.loop = true;
    this.bgmAudio.preload = "auto";
    this.bgmAudio.volume = this.bgmVolume;
  }

  ensureBgmPlayback() {
    if (!this.bgmAudio) return;
    this.bgmAudio.volume = this.bgmVolume;
    void this.bgmAudio.play().catch(() => {});
  }

  getClampedNumber(value, min, max, fallback) {
    const numericValue = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numericValue)) return fallback;
    return Math.max(min, Math.min(max, numericValue));
  }
}
