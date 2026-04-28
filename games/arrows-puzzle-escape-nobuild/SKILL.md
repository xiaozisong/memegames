---
name: arrows-puzzle-escape-builder
description: Build or refactor the SVG worm unblock puzzle in arrows-puzzle-escape-nobuild. Use when changing flat config keys, random worm generation, blocking rules, Bezier worm rendering, overlay UI, SVG/DOM layout, background media, BGM, unblock sound, or level progression while preserving the kernel/systems/renderer split and grounding every claim in the actual files.
---

# Arrows Puzzle Escape

## 1. 模型执行摘要

- 当前真实运行入口：`index.html -> src/main.js`
- 当前真实 kernel 创建入口：`src/core/kernelFactory.js`
- 当前真实运行 kernel：`src/kernels/arrowsPuzzleKernel.js`
- 当前真实运行 renderer：`src/renderers/SvgGameRenderer.js`
- 当前真实运行配置：`src/config.json` + `src/config.js`
- 当前真实关卡来源：`src/systems/LevelGeneratorSystem.js`
- 当前真实交互目标：worm head
- 默认先改：`src/config.json`

执行顺序：

1. 先判断需求属于配置、规则、生成、还是表现层。
2. 能只改 `src/config.json` 就不要先改代码。
3. 关卡生成、遮挡判定、移除规则进 kernel/systems。
4. SVG 结构、样式、动画、音频播放、HUD 和 overlay 只进 renderer。
5. 改完先确认新配置或新逻辑是否真的进入 snapshot 再对外说明。

## 2. 强约束

- 不要把遮挡判定、可点击判断、关卡生成写进 renderer。
- 不要把 DOM、CSS、SVG、Audio、按钮交互写进 kernel 或 systems。
- 不要把历史 README、旧对话或早期箭头玩法当成当前真相；以代码为准。
- 不要虚构 `config.json` key、snapshot 字段、worm 字段；必须先读文件。
- 不要为了 UI 小改动扩散到 `src/core/contracts.js` 或 `src/main.js`。
- 不要默认恢复静态关卡；当前主路径是运行时随机生成。

默认不要改：

- `src/core/contracts.js`
- `src/main.js`

只有在以下情况才允许改：

- `src/core/kernelFactory.js`：新增玩法 kernel 或切换创建逻辑
- `src/main.js`：启动链、挂载链本身需要变化
- `src/core/contracts.js`：共享约定必须扩字段且无法在当前 snapshot 内兼容

## 3. 反幻觉规则

- 只引用已读到的文件、类名、配置项和状态字段。
- 只描述当前仓库真实存在的能力，不要套用其他模板的术语。
- 如果某能力“应该支持”但当前未实现，要明确说“需要新增”。
- 回答“为什么”时，先给真实代码路径，再解释原因。
- 新增配置项时，保持 `src/config.json` 的平铺叶子结构：`{ value, type, label }`。
- 如果 README 和真实代码冲突，以代码为准。

## 4. 一句话数据流

`config.json -> config.js -> arrowsPuzzleKernel -> GameFlow/LevelGenerator 等 systems -> snapshot -> SvgGameRenderer/SvgPathRenderer/SvgUIRenderer -> 用户点击 worm head -> kernel.dispatch() -> 新 snapshot`

## 5. 当前玩法真相

- 当前不是传统箭头寻路关卡，而是“层叠解锁虫虫”玩法。
- 玩家只能点击 worm 的头部触发交互。
- 若 worm 的任意身体段被更上层 worm 覆盖，则该 worm 视为 blocked。
- blocked 点击会触发头部摇摆反馈，不会移除。
- 可移除 worm 会播放退场动画，并在完成后真正标记为 removed。
- 关卡默认由 `LevelGeneratorSystem` 动态生成，不依赖静态 `level_worms` / `level_cells`。
- worm 路径视觉采用平滑 Bezier 管状路径，而不是折线主体。

## 6. 改动优先级

1. `src/config.json`
2. `src/config.js`
3. `src/systems/LevelGeneratorSystem.js`
4. `src/kernels/arrowsPuzzleKernel.js`
5. `src/systems/GameFlowSystem.js`
6. `src/systems/BlockSystem.js` / `src/systems/OccupancySystem.js` / `src/systems/LayerSystem.js`
7. `src/renderers/SvgGameRenderer.js`
8. `src/renderers/SvgPathRenderer.js`
9. `src/renderers/SvgUIRenderer.js`
10. `src/renderers/worms/createWormSvg.js`
11. `src/utils/geometry.js`
12. `src/core/kernelFactory.js`

判断规则：

- 改标题、按钮文案、背景图、BGM、unblock 音效、颜色、尺寸、关卡参数：先改 `src/config.json`
- 改平铺 key 到运行时 section 的映射：改 `src/config.js`
- 改关卡数量、虫子数量增长、分布、弯曲复杂度：改 `src/systems/LevelGeneratorSystem.js`
- 改点击后的规则流转、关卡推进、snapshot：改 `src/kernels/arrowsPuzzleKernel.js`
- 改“blocked 还是 remove”的判定和移除 run：改 `src/systems/GameFlowSystem.js`
- 改层级排序、占用构建、阻挡规则：改对应 `LayerSystem` / `OccupancySystem` / `BlockSystem`
- 改全局背景、音频播放、board area 布局、overlay 容器：改 `src/renderers/SvgGameRenderer.js`
- 改 worm 绘制、移除动画、blocked 摇头效果：改 `src/renderers/SvgPathRenderer.js`
- 改 overlay / HUD DOM：改 `src/renderers/SvgUIRenderer.js`
- 改 worm 具体 SVG 结构：改 `src/renderers/worms/createWormSvg.js`
- 改 Bezier 路径几何：改 `src/utils/geometry.js`

## 7. 需求到文件映射速查

- 改游戏名 / 副标题 / 关卡文案 -> `src/config.json`
- 改背景图 / 背景定位 / 背景平铺 -> `src/config.json`
- 改 BGM / BGM 音量 / unblock 音效 -> `src/config.json`
- 改第一关虫子数 / 每关增量 / 路径点数 -> `src/config.json`
- 改平铺 key 解析 -> `src/config.js`
- 改“下一关 / 重开 / 开始”流程 -> `src/kernels/arrowsPuzzleKernel.js`
- 改 blocked 判定 -> `src/systems/BlockSystem.js`
- 改 occupancy 构建 -> `src/systems/OccupancySystem.js`
- 改 top-most 排序 -> `src/systems/LayerSystem.js`
- 改移除 run / idle message -> `src/systems/GameFlowSystem.js`
- 改随机虫子分布 / 四象限覆盖 / 重叠策略 -> `src/systems/LevelGeneratorSystem.js`
- 改 worm clone / displayPath 组装 -> `src/systems/WormSystem.js`
- 改 SVG board 尺寸 / 音频播放 / overlay 面板样式 -> `src/renderers/SvgGameRenderer.js`
- 改 worm 颜色、大小、路径渲染、移除动画 -> `src/renderers/SvgPathRenderer.js`
- 改 blocked 头部摇摆反馈 -> `src/renderers/SvgPathRenderer.js`
- 改 HUD / overlay DOM 文案承载 -> `src/renderers/SvgUIRenderer.js`
- 改 worm 管状结构、头部节点、发光层 -> `src/renderers/worms/createWormSvg.js`
- 改平滑曲线算法 -> `src/utils/geometry.js`

## 8. 目录职责

### 根目录

- `SKILL.md`
  - 当前文件；给模型的执行规约
- `README.md`
  - 历史说明，可参考目录结构，但玩法描述可能过时
- `index.html`
  - 页面壳和运行入口

### `src/`

- `src/main.js`
  - 启动应用；装配 kernel 和 SVG renderer
- `src/config.json`
  - 单一配置源；默认优先改这里
- `src/config.js`
  - 配置读取、平铺 key 到 section 的映射

### `src/core/`

- `src/core/kernelFactory.js`
  - 根据 `game.id` 创建 kernel
- `src/core/contracts.js`
  - 共享约定；默认不要为 UI 小改动修改

### `src/kernels/`

- `src/kernels/arrowsPuzzleKernel.js`
  - 当前真正使用的规则总控；负责加载关卡、触发 worm、完成 run、推进关卡、产出 snapshot
- `src/kernels/placeholderKernel.js`
  - 非主路径兜底

### `src/systems/`

- `GridSystem.js`
  - 棋盘尺寸、格子生成、边界判断
- `WormSystem.js`
  - worm 数据创建、读取、克隆
- `LayerSystem.js`
  - worm 层级排序
- `OccupancySystem.js`
  - 占用信息构建
- `BlockSystem.js`
  - 被遮挡 worm 收集规则
- `GameStateSystem.js`
  - UI 状态、overlay、effects 状态
- `GameFlowSystem.js`
  - blocked/remove 判定、removal run、solve 判断
- `LevelGeneratorSystem.js`
  - 动态关卡与随机 worm 生成
- `InputSystem.js`
  - pointer 事件到 kernel action 的映射
- `ArrowSystem.js` / `MovementSystem.js`
  - 当前主玩法未直接使用，除非明确要恢复旧箭头原型，否则不要优先修改

### `src/renderers/`

- `SvgGameRenderer.js`
  - 当前真正运行 renderer；负责全局布局、背景、BGM、音效、串联各子 renderer
- `SvgGridRenderer.js`
  - SVG 根容器、layer、defs、棋盘壳
- `SvgCellRenderer.js`
  - 格子相关视觉
- `SvgPathRenderer.js`
  - worm 主体渲染、blocked 摇头、移除动画、粒子效果
- `SvgUIRenderer.js`
  - HUD 与 overlay DOM
- `worms/createWormSvg.js`
  - 单只 worm 的 SVG 结构工厂

### `src/utils/`

- `geometry.js`
  - 路径几何、cell center、Bezier path
- `animation.js`
  - 动画工具
- `directions.js`
  - 方向常量

## 9. 配置约定

### 9.1 结构

- `src/config.json` 使用平铺 key
- 叶子统一结构：`{ value, type, label }`
- `_` 开头 key 视为只读说明或元信息

### 9.2 路径映射

当前 `getSetting()` 支持把路径映射到平铺 key：

- `game.id -> game_id`
- `board.cellSize -> board_cell_size`
- `theme.backgroundImage -> theme_background_image`
- `ui.startButton -> ui_start_button`
- `audio.unblockSound -> audio_unblock_sound`
- `level.baseWormCount -> level_base_worm_count`

### 9.3 当前关键配置族

- `game_*`：基础游戏身份、起始关卡、总关卡
- `board_*`：棋盘尺寸、格子尺寸、动画节奏
- `theme_*`：背景、面板、文字、路径、worm 相关视觉颜色
- `ui_*`：HUD、overlay、状态文案
- `audio_*`：BGM、音量、循环、unblock 音效
- `level_*`：动态关卡生成参数

### 9.4 当前默认策略

- 不要新增静态 `level_worms` / `level_cells` 作为主路径
- 新参数优先服务动态关卡生成器
- 新音频字段进入 `audio_*`
- 新视觉字段进入 `theme_*`
- 新 UI 文案字段进入 `ui_*`

## 10. 当前系统边界

- kernel 负责：
  - load level
  - dispatch action
  - build snapshot
  - 关卡推进与完成
- systems 负责：
  - 生成
  - 排序
  - 占用
  - 阻挡
  - run 规划
- renderer 负责：
  - SVG / DOM 创建
  - 动画
  - 背景
  - BGM / 音效播放
  - HUD / overlay

不要混写。

## 11. 修改策略

### 11.1 配置优先

如果需求只是：

- 改背景图
- 改按钮文案
- 改 BGM 或 unblock 音效地址
- 改音量
- 改第一关虫子数量
- 改关卡增长参数
- 改路径长度参数

先只改 `src/config.json`。

### 11.2 只在必要时扩字段

新增配置项前先确认：

1. 现有字段是否已经可表达
2. `getSetting()` 映射是否已经覆盖
3. 是否真的需要 kernel 或 renderer 新增读取逻辑

### 11.3 规则与表现分离

- “这只 worm 是否 blocked”“能否移除”“下一关怎么进”是规则
- “头怎么摇”“虫身怎么发亮”“背景怎么铺”“音效怎么播”是表现

不要混写。

## 12. 最小验证清单

每次实质改动后至少检查：

1. 新增配置项是否被真实读取
2. 动态关卡生成是否仍能创建出 worm
3. blocked 与 remove 两条交互路径是否仍成立
4. renderer 改动是否只处理 SVG / DOM / 样式 / 音频 / 动画
5. kernel / systems 是否没引入 DOM 或 CSS
6. `ReadLints` 是否无新问题

## 13. 默认输出风格

- 简洁
- 低噪音
- 低假设
- 明确边界
- 明确“已实现”和“需要新增”的区别

如果无法确认，就直接说“需要先读文件确认”，不要脑补。
