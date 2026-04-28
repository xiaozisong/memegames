---
name: mbti-nobuild-game-builder
description: Build or refactor no-build MBTI-like quiz games on MBTI-nobuild. Use when changing flat config keys, question copy, result card share page, preparation screen, DOM layout, transitions, background media, html2canvas export, or MBTI scoring while preserving the kernel/renderer boundary and avoiding unverified claims.
---

# MBTI No Build

## 1. 模型执行摘要

- 当前真正运行入口：`index.html -> src/main.js`
- 当前真正运行 kernel：`src/kernels/mbtiKernel.js`
- 当前真正运行 renderer：`src/renderers/dom/DOMRenderer.js`
- 当前真正运行挂载：`src/renderers/dom/mountDOMRenderer.js`
- 当前真正运行配置：`src/config.json` + `src/config.js`
- 默认先改：`src/config.json`
- 配置不够时：
  - 题目流程、计分、结果计算改 `src/kernels/mbtiKernel.js`
  - 配置映射、平铺 key 读取改 `src/config.js`
  - 页面结构、样式、动画、背景、音频、截图分享改 `src/renderers/dom/**`
- 默认不要改：
  - `src/core/contracts.js`
  - `src/core/kernelFactory.js`
  - `src/main.js`

执行顺序：

1. 先判断需求属于配置、规则、还是表现。
2. 能只改 `src/config.json` 就不要先改代码。
3. 题目流转、计分、结果类型归类只进 kernel；DOM、样式、媒体、动画、导出图片只进 renderer。
4. 改完先检查新配置是否被真实读取，再说明结果。

## 2. 强约束

- 不要把题目推进、维度计分、结果推导写进 renderer。
- 不要把 DOM、CSS、图片、音频、按钮状态、html2canvas 写进 kernel。
- 不要在没读文件前声称“已经支持某字段/某页面/某按钮”。
- 不要虚构配置项、snapshot 字段、结果字段；必须先读真实文件。
- 不要为了 UI 小改动扩散到 `core` 层。
- 不要把历史 README 或旧对话内容当成当前真相；以实际代码为准。

默认禁止修改清单：

- `src/core/contracts.js`
- `src/core/kernelFactory.js`
- `src/main.js`

只有在以下情况才允许改：

- `src/core/kernelFactory.js`：新增新的 quiz kernel 并需要注册
- `src/core/contracts.js`：共享快照结构必须扩字段
- `src/main.js`：启动链或挂载链本身需要变化

## 3. 反幻觉规则

- 只引用已读到的文件、字段和 DOM 类名。
- 只描述当前仓库真实存在的能力，不要套用别的模板能力。
- 如果某能力“应该支持”但当前未实现，要明确说“需要新增”，不要说成“已经支持只是没配置”。
- 回答“为什么”时，先给真实代码路径，再给原因。
- 新增配置项时，保持 `src/config.json` 的平铺叶子结构：`{ value, type, label }`。
- 如果 README 和代码冲突，以代码为准。

## 4. 一句话数据流

`config.json -> config.js -> mbtiKernel state/snapshot -> DOMRenderer -> 用户点击 -> kernel.dispatch() -> 新 snapshot`

## 5. 改动优先级

1. `src/config.json`
2. `src/config.js`
3. `src/kernels/mbtiKernel.js`
4. `src/renderers/dom/DOMRenderer.js`
5. `src/renderers/dom/components/*.js`
6. `src/renderers/dom/domui/designTokens.js`
7. `src/renderers/dom/domui/theme.js`
8. `src/core/kernelFactory.js`

判断规则：

- 改题干、选项、标签、结果标题、结果描述、背景图、按钮文案、颜色、偏移量、音量：先改 `src/config.json`
- 改平铺 key 到运行时字段的映射：改 `src/config.js`
- 改题目顺序、答题推进、维度分数、结果类型判定：改 `src/kernels/mbtiKernel.js`
- 改 loading / ready / quiz / result 页面结构、截图导出、背景切换：改 `src/renderers/dom/DOMRenderer.js`
- 改问题卡、准备页、结果卡 DOM：改 `src/renderers/dom/components/*`
- 改视觉 token：改 `src/renderers/dom/domui/designTokens.js`
- 改 CSS、动画、布局、毛玻璃、进度条、结果卡样式：改 `src/renderers/dom/domui/theme.js`

## 6. 需求到文件映射速查

- 改题目文案 / 选项文案 / 结果文案 -> `src/config.json`
- 改开始按钮文案 / 结果页说明文案 / 保存图片文案 -> `src/config.json`
- 改问答背景图 / 准备页背景图 / 结果卡背景图 -> `src/config.json`
- 改背景音乐链接 / 音量 -> `src/config.json`
- 改 `presentation.xxx` 或 `ui.text.xxx` 的路径映射 -> `src/config.js`
- 改 flat `gameplay_question_*` 聚合规则 -> `src/kernels/mbtiKernel.js`
- 改 `result_*` 平铺结果映射 -> `src/kernels/mbtiKernel.js`
- 改准备页 loading / ready 逻辑 -> `src/renderers/dom/DOMRenderer.js` 或 `src/renderers/dom/components/PreparationView.js`
- 改答题页标题 / 选项 / 切题动画 -> `src/renderers/dom/components/QuestionCard.js` / `src/renderers/dom/components/OptionItem.js` / `src/renderers/dom/DOMRenderer.js`
- 改结果分享卡 DOM 结构 -> `src/renderers/dom/components/ResultView.js`
- 改 html2canvas 保存图片逻辑 -> `src/renderers/dom/DOMRenderer.js`
- 改全局样式 / 渐变 / 毛玻璃 / 布局 / 结果卡视觉 -> `src/renderers/dom/domui/theme.js`

## 7. 目录职责

### 根目录

- `SKILL.md`
  - 当前文件；给模型的执行规约
- `index.html`
  - 页面壳和运行入口；当前通过 `<script type="module" src="./src/main.js">` 启动

### `src/`

- `src/main.js`
  - 启动应用；装配 kernel 和 DOM renderer
- `src/config.json`
  - 单一配置源；默认优先改这里
- `src/config.js`
  - 配置读取、路径映射、平铺 key 过滤

### `src/core/`

- `src/core/kernelFactory.js`
  - 根据玩法标识创建 kernel
- `src/core/contracts.js`
  - 共享约定；默认不要为 UI 小改动修改

### `src/kernels/`

- `src/kernels/mbtiKernel.js`
  - 当前运行时真正使用的规则层；负责题目聚合、答题状态、分数、结果

### `src/renderers/dom/`

- `DOMRenderer.js`
  - 当前真正运行 renderer；负责 loading / ready / quiz / result 阶段切换、背景、音频、截图导出
- `mountDOMRenderer.js`
  - renderer 挂载入口
- `components/PreparationView.js`
  - 准备页和 loading DOM
- `components/QuestionCard.js`
  - 题目标题和选项列表
- `components/OptionItem.js`
  - 单个选项按钮
- `components/ResultView.js`
  - 结果分享卡与操作按钮
- `domui/designTokens.js`
  - 颜色、阴影、圆角等 token
- `domui/theme.js`
  - 全局 CSS、布局、动画、结果卡样式

## 8. 配置约定

### 8.1 结构

- `src/config.json` 使用平铺 key
- 叶子统一结构：`{ value, type, label }`
- `_` 开头 key 视为只读

### 8.2 路径映射

当前 `getSetting()` 支持把路径映射到平铺 key：

- `gameplay.mode -> gameplay_mode`
- `ui.text.xxx -> ui_text_xxx`
- `presentation.xxx -> presentation_xxx`
- `theme.xxx -> theme_xxx`

所以：

- `getSetting("presentation.readyBackgroundImage")` 会读取 `presentation_ready_background_image`
- `getSetting("ui.text.readyButtonLabel")` 会读取 `ui_text_ready_button_label`

### 8.3 题目配置规则

当前题目采用平铺 key：

- `gameplay_question_<n>_id`
- `gameplay_question_<n>_tag`
- `gameplay_question_<n>_prompt`
- `gameplay_question_<n>_option_<letter>_id`
- `gameplay_question_<n>_option_<letter>_label`
- `gameplay_question_<n>_option_<letter>_note`
- `gameplay_question_<n>_option_<letter>_score_ei`
- `gameplay_question_<n>_option_<letter>_score_sn`
- `gameplay_question_<n>_option_<letter>_score_tf`
- `gameplay_question_<n>_option_<letter>_score_jp`

不要回退成嵌套 `questions` 数组，当前实现是严格平铺读取。

### 8.4 结果配置规则

当前结果采用平铺 key：

- `result_<type>_title`
- `result_<type>_subtitle`
- `result_<type>_description`
- `result_<type>_trait_<n>`

运行时结果卡默认把 `traits` 当成标签来源。

## 9. 当前页面阶段

`DOMRenderer` 当前有四种主要展示阶段：

1. `loading`
2. `ready`
3. `quiz`
4. `result`

判断原则：

- 准备页相关需求：优先看 `PreparationView.js` + `DOMRenderer.js`
- 答题页相关需求：优先看 `QuestionCard.js` + `OptionItem.js` + `theme.js`
- 结果分享卡相关需求：优先看 `ResultView.js` + `DOMRenderer.js` + `theme.js`

## 10. 修改策略

### 10.1 配置优先

如果需求只是：

- 改题目内容
- 改结果文案
- 改按钮文字
- 改背景图
- 改背景音乐
- 改颜色 token

先只改 `src/config.json`。

### 10.2 只在必要时扩字段

新增配置项前先确认：

1. 现有字段是否已经可表达
2. `getSetting()` 映射是否已经覆盖
3. 是否真的需要 renderer 新增读取逻辑

### 10.3 规则与表现分离

- “选完是否进入下一题”“分数怎么算”“属于哪种 MBTI”是规则
- “题卡怎么淡入淡出”“按钮怎么跳动”“结果卡怎么截图”是表现

不要混写。

## 11. 回答用户时的强约束

- 先给结论，再给真实文件路径。
- 如果原因来自代码，必须点出具体文件。
- 不要把“建议方案”说成“已经实现”。
- 不要给用户不存在的配置键名。
- 如果改动只影响 `MBTI-nobuild`，不要泛化成整个仓库都这样。

## 12. 最小验证清单

每次实质改动后至少检查：

1. 新增配置项是否被真实读取
2. renderer 改动是否只处理 DOM / 样式 / 媒体 / 动画 / 导出
3. kernel 改动是否没引入 DOM / CSS / Audio / html2canvas
4. loading / ready / quiz / result 阶段切换是否仍成立
5. `ReadLints` 是否无新问题

## 13. 默认输出风格

- 简洁
- 低噪音
- 低假设
- 明确边界
- 明确“已实现”和“需要新增”的区别

如果无法确认，就直接说“需要先读文件确认”，不要脑补。
