---
name: game-2048-nobuild-builder
description: 基于 game-2048-nobuild（CDN + JS + 无构建）快速创建或改造同类 2048 滑动合并游戏模板。用于说明分层职责、平铺配置改法、文件修改影响与无构建运行流程。
---

# 2048 No-Build 模板技能

## 适用场景

- 快速做一个 2048 同类游戏（数字合并、字母合并、主题换皮）
- 在不引入构建工具的前提下进行参数调优和交互验证
- 通过配置驱动（而非硬编码）完成主题、文案、节奏调整

模板运行特征：

- 纯 JavaScript（无 TypeScript）
- 浏览器 ESM + CDN（`pixi.js`）
- `index.html -> src/main.js` 直接运行

---

## 一图理解架构

`输入 -> renderer -> action -> kernel -> snapshot -> renderer`

- `kernel`：玩法规则（移动/合并/分数/胜负）
- `renderer`：渲染与输入映射（键盘 + 触控）
- `config`：平铺配置中心（`config.json` + `config.js`）

---

## 目录与主要职责

### 启动与装配

- `index.html`：import map + 根节点
- `src/main.js`：入口启动并挂载 renderer
- `src/core/kernelFactory.js`：按 `gameplay_mode`（兼容 `gameplay.mode`）选择 kernel

### 规则层（纯规则）

- `src/kernels/game2048Kernel.js`
  - action：`start_or_restart` / `dismiss_overlay` / `show_swipe_hint` / `move`
  - 负责棋盘状态、合并规则、得分、胜负判定
  - 输出 snapshot
  - 不操作 DOM / Pixi

### 渲染交互层（纯表现）

- `src/renderers/game2048/mountGame2048Renderer.js`
  - 订阅 snapshot，渲染棋盘、分数、弹窗、动画
  - 键盘/滑动输入映射为 action
  - 合并时播放 `asset_audio_merge`（基于分数增长检测）
  - 状态文案为空时，回退展示 `ui_text_status_ready`（页面常驻提示）
  - 不写玩法判定

### 配置层（优先改）

- `src/config.json`
  - 全平铺配置：`{ value, type, label }`
  - `_` 前缀 key 只读
- `src/config.js`
  - `getSetting(pathOrKey, fallback)` 兼容旧路径和新平铺 key
  - `isConfigKeyEditable(key)` 判断可编辑性

---

## 架构规则（必须遵守）

1. 不在 renderer 写合并/得分/胜负规则。
2. 不在 kernel 写 UI 绘制和输入事件绑定。
3. 可调参数优先写进 `config.json`，避免硬编码。
4. `_key` 一律视为只读元信息，不允许编辑器修改。

---

## config.json 改法（新版）

### 结构规范

- 平铺 key，如 `gameplay_swipe_threshold`、`theme_tile_128`
- 值结构统一：`{ value, type, label }`
- `type` 使用：`bool/int/float/color/string/image/audio/vedio`

### 常改区

- 玩法手感：`gameplay_*`
  - `gameplay_swipe_threshold`
  - `gameplay_slide_duration`
  - `gameplay_tile_pulse_*`
  - `gameplay_board_*`
- 主题配色：`theme_*`
  - 背景/面板/文字：`theme_background`、`theme_board`、`theme_text_dark` 等
  - 方块颜色：`theme_tile_2` ... `theme_tile_2048`
  - 弹窗/按钮：`theme_modal_*`、`theme_controls_*`
- 文案：`ui_text_*`
  - 标题、状态提示、按钮文字、弹窗文案
- 音频：`asset_audio_*`
  - `asset_audio_merge`：合并音效 URL（可公网访问）

---

## 改哪个文件会有什么效果

- 改 `src/config.json`：
  - 直接影响配色、文案、阈值、动画时长、布局偏移
- 改 `src/config.js`：
  - 影响配置读取规则和兼容性
- 改 `src/kernels/game2048Kernel.js`：
  - 影响玩法逻辑（谨慎）
- 改 `src/renderers/game2048/mountGame2048Renderer.js`：
  - 影响 UI、动画、输入表现（谨慎）

---

## 无构建运行

在 `games/game-2048-nobuild` 目录执行：

```bash
python -m http.server 8080
```

访问 `http://localhost:8080`。

不要用 `file://` 直接打开页面。

---

## 最小验证清单

1. 启动后出现开始弹窗并可进入游戏
2. 键盘方向键和手势滑动都能触发移动
3. 合并得分、最高分存储正常
4. 达成 2048 与失败状态文案正确
5. 合并时可播放 `asset_audio_merge` 对应音效
6. `ui_text_status_ready` 在状态为空时仍常驻显示
7. 改 `config.json` 后视觉/参数能立即生效
