import { getSetting, listSettings } from "../config.js";

const AXES = {
  EI: ["E", "I"],
  SN: ["N", "S"],
  TF: ["F", "T"],
  JP: ["P", "J"],
};

export class MbtiKernel {
  constructor() {
    this.listeners = [];
    this.questions = this.loadFlatQuestions();
    this.resultMap = this.loadResultMap();
    this.state = this.createInitialState();
  }

  createInitialState() {
    return {
      currentIndex: 0,
      answers: [],
      axisScores: this.createEmptyAxisScores(),
      completed: false,
      result: null,
    };
  }

  createEmptyAxisScores() {
    return Object.keys(AXES).reduce((scores, axis) => {
      scores[axis] = 0;
      return scores;
    }, {});
  }

  loadFlatQuestions() {
    const entries = listSettings("gameplay_question_");
    const questionIndexes = new Set();

    for (const [key] of entries) {
      const match = key.match(/^gameplay_question_(\d+)_/);
      if (match) {
        questionIndexes.add(Number(match[1]));
      }
    }

    const questions = [...questionIndexes]
      .sort((left, right) => left - right)
      .map((questionIndex) => this.buildQuestionFromFlatSettings(questionIndex))
      .filter(Boolean);

    if (questions.length === 0) {
      throw new Error("MBTI quiz requires flat gameplay_question_* settings in config.");
    }

    return questions;
  }

  buildQuestionFromFlatSettings(questionIndex) {
    const id = String(getSetting(`gameplay_question_${questionIndex}_id`, `question-${questionIndex}`));
    const tag = String(getSetting(`gameplay_question_${questionIndex}_tag`, "性格维度"));
    const prompt = String(getSetting(`gameplay_question_${questionIndex}_prompt`, ""));

    const optionKeys = listSettings(`gameplay_question_${questionIndex}_option_`)
      .map(([key]) => key)
      .filter((key) => /_label$/.test(key));

    const optionLetters = [...new Set(optionKeys.map((key) => {
      const match = key.match(/_option_([a-z])_label$/);
      return match ? match[1] : null;
    }).filter(Boolean))].sort();

    const options = optionLetters.map((letter, optionIndex) => ({
      id: String(getSetting(
        `gameplay_question_${questionIndex}_option_${letter}_id`,
        `${id}-option-${optionIndex + 1}`,
      )),
      label: String(getSetting(`gameplay_question_${questionIndex}_option_${letter}_label`, "")),
      note: String(getSetting(`gameplay_question_${questionIndex}_option_${letter}_note`, "")),
      scores: this.normalizeScores({
        EI: this.getNumberSetting(`gameplay_question_${questionIndex}_option_${letter}_score_ei`, 0),
        SN: this.getNumberSetting(`gameplay_question_${questionIndex}_option_${letter}_score_sn`, 0),
        TF: this.getNumberSetting(`gameplay_question_${questionIndex}_option_${letter}_score_tf`, 0),
        JP: this.getNumberSetting(`gameplay_question_${questionIndex}_option_${letter}_score_jp`, 0),
      }),
    })).filter((option) => option.label);

    if (!prompt || options.length < 2) {
      return null;
    }

    return {
      id,
      tag,
      prompt,
      options,
    };
  }

  normalizeScores(rawScores) {
    const safeScores = {};
    for (const axis of Object.keys(AXES)) {
      const value = rawScores?.[axis];
      safeScores[axis] = Number.isFinite(value) ? value : 0;
    }
    return safeScores;
  }

  getNumberSetting(path, fallback) {
    const value = getSetting(path, fallback);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  }

  loadResultMap() {
    const entries = listSettings("result_");
    const resultTypes = new Set();

    for (const [key] of entries) {
      const match = key.match(/^result_([a-z]{4})_/);
      if (match) {
        resultTypes.add(match[1].toUpperCase());
      }
    }

    const resultMap = {};
    for (const type of resultTypes) {
      const resultKey = type.toLowerCase();
      const traits = listSettings(`result_${resultKey}_trait_`)
        .map(([key, value]) => {
          const match = key.match(/_trait_(\d+)$/);
          return match ? { order: Number(match[1]), value: String(value) } : null;
        })
        .filter(Boolean)
        .sort((left, right) => left.order - right.order)
        .map((item) => item.value)
        .filter(Boolean);

      resultMap[type] = {
        title: String(getSetting(`result_${resultKey}_title`, type)),
        subtitle: String(getSetting(`result_${resultKey}_subtitle`, "")),
        description: String(getSetting(`result_${resultKey}_description`, "")),
        traits,
      };
    }

    if (Object.keys(resultMap).length === 0) {
      throw new Error("MBTI quiz requires flat result_* settings in config.");
    }

    return resultMap;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
  }

  dispatch(action) {
    if (!action || typeof action !== "object") return;

    if (action.type === "select_option") {
      this.selectOption(action.optionId);
      return;
    }

    if (action.type === "restart") {
      this.state = this.createInitialState();
      this.notify();
    }
  }

  selectOption(optionId) {
    if (this.state.completed) return;

    const question = this.questions[this.state.currentIndex];
    const option = question?.options.find((item) => item.id === optionId);
    if (!question || !option) return;

    const nextAnswers = this.state.answers.concat({
      questionId: question.id,
      optionId: option.id,
      label: option.label,
    });

    const nextAxisScores = { ...this.state.axisScores };
    for (const [axis, value] of Object.entries(option.scores)) {
      nextAxisScores[axis] += value;
    }

    const isLastQuestion = this.state.currentIndex >= this.questions.length - 1;
    this.state = {
      currentIndex: isLastQuestion ? this.state.currentIndex : this.state.currentIndex + 1,
      answers: nextAnswers,
      axisScores: nextAxisScores,
      completed: isLastQuestion,
      result: isLastQuestion ? this.buildResult(nextAxisScores, nextAnswers) : null,
    };
    this.notify();
  }

  buildResult(axisScores, answers) {
    const type = Object.entries(AXES)
      .map(([axis, [positiveLetter, negativeLetter]]) => (
        axisScores[axis] >= 0 ? positiveLetter : negativeLetter
      ))
      .join("");

    const configResult = this.resultMap[type] ?? this.createFallbackResult(type);
    return {
      type,
      ...configResult,
      traits: configResult.traits.slice(),
      axisScores: { ...axisScores },
      answers: answers.map((item) => ({ ...item })),
    };
  }

  createFallbackResult(type) {
    return {
      title: `${type} 探索者`,
      subtitle: "这是一个基于当前题库计算出来的组合结果。",
      description: "可以继续在 config.json 的 result_ 类型平铺字段里为这个类型补充更细致的描述和标签。",
      traits: ["数据驱动", "可继续扩展", "支持自定义题库"],
    };
  }

  getSnapshot() {
    const total = this.questions.length;
    const answeredCount = this.state.answers.length;
    const currentQuestion = this.state.completed
      ? null
      : this.questions[this.state.currentIndex];

    return {
      completed: this.state.completed,
      currentQuestion: currentQuestion
        ? {
          id: currentQuestion.id,
          tag: currentQuestion.tag,
          prompt: currentQuestion.prompt,
          options: currentQuestion.options.map((option) => ({
            id: option.id,
            label: option.label,
            note: option.note,
          })),
        }
        : null,
      progress: {
        current: this.state.completed ? total : this.state.currentIndex + 1,
        total,
        answeredCount,
        ratio: total > 0 ? answeredCount / total : 0,
      },
      answers: this.state.answers.map((item) => ({ ...item })),
      axisScores: { ...this.state.axisScores },
      result: this.state.result
        ? {
          ...this.state.result,
          traits: this.state.result.traits.slice(),
          axisScores: { ...this.state.result.axisScores },
          answers: this.state.result.answers.map((item) => ({ ...item })),
        }
        : null,
    };
  }

  notify() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
