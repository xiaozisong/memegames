# MBTI No Build

一个基于 `core + kernels + renderers + config.json` 的原生 DOM 心理测试模板。

## 特点

- `kernel` 负责题目流程、答题记录、维度计分与结果计算
- `renderer` 只负责 DOM 结构、样式和点击交互绑定
- `config.json` 提供题库和 `resultMap`，可以直接替换为新的测试内容
- 使用无构建方案，直接通过 `index.html` 运行

## 目录

- `src/core/`：kernel 创建入口
- `src/kernels/`：MBTI-like 测试状态与计算
- `src/renderers/dom/`：DOMRenderer 与 UI 组件
- `src/config.json`：题目、结果映射、文案与主题
