---
name: match-3-nobuild-game-builder
description: Build or refactor no-build Match-3 games on match-3-nobuild. Use when changing flat config keys, level goals, tile media or sound, Pixi HUD, overlay, audio, particles, reshuffle animation, or Match-3 kernel rules while preserving the kernel/renderer boundary and avoiding unverified claims.
---

# Match-3 No-Build

## 1. 模型执行摘要

- 当前真正运行入口：`index.html -> src/main.js`
- 当前真正运行 kernel：`src/kernels/match3Kernel.js`
- 当前真正运行 renderer：`src/renderers/match3/mountMatch3Renderer.js`
- 当前真正运行配置：`src/config.json` + `src/config.js`
- 默认先改：`src/config.json`
- 配置不够时：
  - 规则问题改 `src/kernels/match3Kernel.js`
  - 目标状态改 `src/kernels/systems/goalSystem.js`
  - 视觉/交互/媒体/音频/动画改 `src/renderers/match3/**`
- 默认不要改：
  - `src/core/contracts.js`
  - `src/core/kernelFactory.js`
  - `src/kernels/placeholderKernel.js`
  - `src/main.js`

执行顺序：

1. 先判断需求属于配置、规则、还是表现。
2. 能只改 `src/config.json` 就不要先改代码。
3. 规则只进 kernel / systems；UI、动画、媒体、音频、输入只进 renderer。
4. 改完先检查运行链是否仍然成立，再补充说明。

## 2. 强约束

- 不要把匹配、下落、重排、得分、关卡推进写进 renderer。
- 不要把 Pixi / DOM / 图片 / gif / 音频 / pointer 事件写进 kernel。
- 不要在没验证文件内容前声称“已支持”“已存在”“当前就是这样”。
- 不要虚构配置项、快照字段、音频字段、tile 字段；必须先读真实文件。
- 不要为了小改动扩散到 `core` 层。
- 不要把临时猜测写成最终答案。
- 不要忽略当前真实运行链，尤其不要把历史文件或同名模板当成主实现。

默认禁止修改清单：

- `src/core/contracts.js`
- `src/core/kernelFactory.js`
- `src/main.js`
- `src/kernels/placeholderKernel.js`

只有在以下情况才允许改：

- `src/core/kernelFactory.js`：新增新的玩法 kernel 并需要注册
- `src/core/contracts.js`：共享 overlay / snapshot 结构必须扩字段
- `src/main.js`：启动链、挂载链本身需要变化

## 3. 反幻觉规则

- 只引用已读到的文件和字段。
- 只描述当前仓库实际存在的能力，不要套用别的模板能力。
- 如果某需求“应该支持”但当前未实现，要明确说“需要新增”，不要说成“已经支持但你没配”。
- 如果用户问“为什么”，先给真实代码路径，再给原因，不要先猜。
- 如果要新增配置项，保持 `src/config.json` 的平铺叶子结构：`{ value, type, label }`。
- 如果要回答“支持几种/几个”，按当前代码真实上限回答，不要按理想设计回答。

## 4. 一句话数据流

`config.json -> config.js -> kernel state/snapshot -> renderer -> 用户输入 -> kernel.dispatch() -> 新 snapshot`

## 5. 改动优先级

1. `src/config.json`
2. `src/config.js`
3. `src/kernels/match3Kernel.js`
4. `src/kernels/systems/goalSystem.js`
5. `src/kernels/systems/boardSystem.js`
6. `src/kernels/systems/matchSystem.js`
7. `src/renderers/match3/mountMatch3Renderer.js`
8. `src/renderers/match3/components/*.js`
9. `src/renderers/match3/systems/*.js`
10. `src/core/kernelFactory.js`

判断规则：

- 改文案、颜色、背景、媒体、音量、字号、tile 媒体、tile 音效：先改 `src/config.json`
- 配置是平铺的，但运行时需要聚合成 tile 列表：改 `src/config.js`
- 改关卡推进、目标数量、胜负、步数、匹配、重排：改 `src/kernels/match3Kernel.js`
- 改目标状态结构：改 `src/kernels/systems/goalSystem.js`
- 改棋盘生成/下落/换位纯逻辑：改 `src/kernels/systems/boardSystem.js`
- 改视觉、布局、HUD、Overlay、背景媒体、背景音乐、按钮、输入反馈：改 `src/renderers/match3/mountMatch3Renderer.js` 或 `components/*`
- 改粒子、连击字、重排动画、消除动画、音效触发：改 `src/renderers/match3/systems/AnimationController.js`

## 6. 需求到文件映射速查

- 改棋盘行列 / 步数 / 分数 / 目标基础参数 -> `src/config.json`
- 改 tile 名称 / media / sound / glow -> `src/config.json`
- 改背景图 / 视频 / 背景音乐 / 消除音效 -> `src/config.json`
- 改 HUD 标题 / 字号 / 面板间距 -> `src/config.json`
- 把平铺 tile 配置聚合成运行时 tileDefs -> `src/config.js`
- 改关卡随等级增长逻辑 -> `src/kernels/match3Kernel.js`
- 改“第几关几个目标” -> `src/kernels/match3Kernel.js`
- 改多目标状态和快照 -> `src/kernels/systems/goalSystem.js`
- 改 GOAL 面板图标、裁切、进度排版 -> `src/renderers/match3/components/HudView.js`
- 改开始弹窗布局和按钮样式 -> `src/renderers/match3/components/OverlayView.js`
- 改 tile 外观 -> `src/renderers/match3/components/TileSprite.js`
- 改背景媒体、音频解锁、pointer 输入 -> `src/renderers/match3/mountMatch3Renderer.js`
- 改爆炸粒子 / 连击提示 / 重排轮转动画 -> `src/renderers/match3/systems/AnimationController.js`
- 改 canvas 粒子层 -> `src/renderers/match3/systems/ParticleSystem.js`

## 7. 目录职责

### 根目录

- `SKILL.md`
  - 当前文件；给模型的执行规约
- `index.html`
  - 页面壳、import map、运行入口

### `src/`

- `src/main.js`
  - 启动应用；装配 kernel 和 renderer
- `src/config.json`
  - 单一配置源；默认优先改这里
- `src/config.js`
  - 配置读取、平铺 key 聚合、tileDefs 组装

### `src/core/`

- `src/core/kernelFactory.js`
  - 根据玩法标识选择 kernel
- `src/core/contracts.js`
  - 共享最小结构；当前主要是 `createOverlay()`

### `src/kernels/`

- `src/kernels/match3Kernel.js`
  - 当前运行时真正使用的规则层
- `src/kernels/placeholderKernel.js`
  - 未实现玩法的占位 kernel

### `src/kernels/systems/`

- `goalSystem.js`
  - 目标状态、快照、完成判定
- `boardSystem.js`
  - 创建棋盘、掉落、换位、重排辅助
- `matchSystem.js`
  - 匹配、可行步判断、移除匹配

### `src/renderers/match3/`

- `mountMatch3Renderer.js`
  - 当前真正运行 renderer；负责 Pixi 挂载、背景媒体、音频、输入、布局
- `components/HudView.js`
  - 顶部 HUD、GOAL 面板
- `components/OverlayView.js`
  - 开始/胜负弹窗
- `components/BoardView.js`
  - 棋盘格和 tile 精灵管理
- `components/TileSprite.js`
  - 单个 tile 的视觉结构
- `systems/AnimationController.js`
  - 交换、消除、连击、重排、爆炸动画
- `systems/ParticleSystem.js`
  - Canvas2D 粒子系统

## 8. 配置约定

### 8.1 结构

- `src/config.json` 使用平铺 key
- 叶子统一结构：`{ value, type, label }`
- `_` 开头 key 视为只读

### 8.2 命名

- 命名格式：`domain_subdomain_field`
- 示例：
  - `gameplay_board_rows`
  - `gameplay_tile_1_media`
  - `presentation_background_music`
  - `theme_button_bg`

### 8.3 tile 配置规则

当前 tile 配置采用带序号平铺 key：

- `gameplay_tile_<n>_id`
- `gameplay_tile_<n>_name`
- `gameplay_tile_<n>_media`
- `gameplay_tile_<n>_sound`
- `gameplay_tile_<n>_asset`
- `theme_tile_glow_<n>`

运行时优先级：

1. `media`：用户上传图片 / gif 优先
2. 如果没配 `media`：回退到代码生成的默认 SVG
3. `sound`：该 tile 自定义消除音效
4. 如果该 tile 没配 `sound`：回退到 `presentation_clear_sound`

### 8.4 目标规则

- 当前目标类型默认是 `collect`
- 当前支持多目标并行
- 目标快照核心字段：
  - `snapshot.goal.items`
  - 每项含 `tileId / tileAsset / target / progress / completed`
- 回答目标相关问题时，优先基于 `goal.items`，不要只看单个主目标字段

## 9. 修改策略

### 9.1 配置优先

如果需求只是：

- 换表情资源
- 换音效
- 换背景
- 换按钮文案
- 换字号
- 换面板位置

先只改 `src/config.json`。

### 9.2 只在必要时扩字段

新增配置项前先确认：

1. 现有字段是否已经可表达
2. 现有运行时快照是否已经有该信息
3. 是否真的需要改 `config.js` 聚合

### 9.3 规则与表现分离

- “消几个”“第几关几个目标”“赢了是否进下一关”是规则
- “GOAL 图标多大”“按钮是否发光”“重排时是否旋转”是表现

不要混写。

## 10. 回答用户时的强约束

- 先给结论，再给真实文件路径。
- 如果原因来自代码，必须点出具体文件。
- 不要把“建议”说成“已经实现”。
- 不要给用户不存在的配置键名。
- 如果改动只影响一个模板，不要泛化成整个仓库都这样。

## 11. 最小验证清单

每次实质改动后至少检查：

1. 改动文件是否仍符合当前运行链
2. 新增配置项是否被真实读取
3. renderer 改动是否只处理视觉/媒体/输入
4. kernel 改动是否没引入 Pixi/DOM
5. `ReadLints` 是否无新问题

## 12. 默认输出风格

- 简洁
- 低噪音
- 低假设
- 明确边界
- 明确“已实现”和“建议方案”的区别

如果无法确认，就直接说“需要先读文件确认”，不要脑补。
