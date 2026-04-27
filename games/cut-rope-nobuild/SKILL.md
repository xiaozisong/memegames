---
name: cut-rope-nobuild-game-builder
description: Build or refactor no-build Cut the Rope style games on cut-rope-nobuild. Use when changing flat config keys, level ropes and stars, candy physics, Pixi scene rendering, DOM HUD/modal, swipe cutting, asset URLs, background music, or renderer feedback while preserving the kernel/renderer boundary and avoiding unverified claims.
---

# Cut Rope No-Build

## 1. 模型执行摘要

- 当前真正运行入口：`index.html -> src/main.js`
- 当前真正运行 kernel：`src/kernels/cutRopeKernel.js`
- 当前真正运行 renderer：`src/renderers/cutRope/mountCutRopeRenderer.js`
- 当前真正运行配置：`src/config.json` + `src/config.js`
- 默认先改：`src/config.json`
- 配置不够时：
  - 规则、胜负、关卡推进改 `src/kernels/cutRopeKernel.js`
  - 轻量物理、关卡运行时、碰撞改 `src/kernels/systems/*.js`
  - 场景绘制、切绳反馈、媒体、音频、布局改 `src/renderers/cutRope/**`
- 默认不要改：
  - `src/core/contracts.js`
  - `src/core/kernelFactory.js`
  - `src/kernels/placeholderKernel.js`
  - `src/main.js`

执行顺序：

1. 先判断需求属于配置、规则、物理，还是表现。
2. 能只改 `src/config.json` 就不要先改代码。
3. 规则和物理只进 kernel / systems；媒体、UI、音频、输入、动画只进 renderer。
4. 改完先确认真实运行链仍然成立，再对用户说明。

## 2. 强约束

- 不要把切绳判定、重力、约束、胜负、关卡推进写进 renderer。
- 不要把 Pixi / DOM / 图片 / 音频 / pointer 事件写进 kernel。
- 不要在没读文件前声称“当前已支持”“当前就是这样”。
- 不要虚构配置项、快照字段、资源字段、音频字段；必须先读真实文件。
- 不要为了小改动扩散到 `core` 层。
- 不要把历史 UI 文件或未运行的同名组件当成主实现。

默认禁止修改清单：

- `src/core/contracts.js`
- `src/core/kernelFactory.js`
- `src/main.js`
- `src/kernels/placeholderKernel.js`

只有在以下情况才允许改：

- `src/core/kernelFactory.js`：新增新的玩法 kernel 并需要注册
- `src/core/contracts.js`：共享 overlay 结构必须扩字段
- `src/main.js`：启动链或挂载链本身需要变化

## 3. 反幻觉规则

- 只引用已读到的真实文件和字段。
- 只描述当前仓库实际存在的能力，不要套用别的模板能力。
- 如果某需求“应该支持”但当前未实现，要明确说“需要新增”。
- 如果用户问“为什么”，先给真实代码路径，再给原因，不要先猜。
- 如果要新增配置项，保持 `src/config.json` 的平铺叶子结构：`{ value, type, label }`。
- 如果要回答“当前支持哪些资源/音频/目标形状”，按真实代码回答，不要按理想设计回答。

## 4. 一句话数据流

`config.json -> config.js -> kernel state/snapshot -> renderer -> 用户输入 -> kernel.dispatch() -> 新 snapshot`

## 5. 改动优先级

1. `src/config.json`
2. `src/config.js`
3. `src/kernels/cutRopeKernel.js`
4. `src/kernels/systems/levelSystem.js`
5. `src/kernels/systems/physicsSystem.js`
6. `src/kernels/systems/collisionSystem.js`
7. `src/renderers/cutRope/mountCutRopeRenderer.js`
8. `src/renderers/cutRope/components/SceneView.js`
9. `src/renderers/cutRope/domui/*.js`
10. `src/renderers/cutRope/systems/*.js`
11. `src/core/kernelFactory.js`

判断规则：

- 改关卡参数、世界尺寸、重力、绳长、目标位置、资源链接、BGM、文案：先改 `src/config.json`
- 配置是平铺的，但运行时需要聚合成关卡、资源、音频：改 `src/config.js`
- 改开始/重开/下一关、分数、胜负、关卡推进：改 `src/kernels/cutRopeKernel.js`
- 改糖果出生点稳定、绳索集合、星星集合：改 `src/kernels/systems/levelSystem.js`
- 改摆动、约束、惯性、旋转：改 `src/kernels/systems/physicsSystem.js`
- 改收星、目标判定、出界失败：改 `src/kernels/systems/collisionSystem.js`
- 改背景媒体、音频解锁、输入、Pixi 挂载：改 `src/renderers/cutRope/mountCutRopeRenderer.js`
- 改糖果/绳子/星星/怪物视觉、切绳回弹、命中检测：改 `src/renderers/cutRope/components/SceneView.js`
- 改 HUD / Modal / 按钮 / 卡片 UI：改 `src/renderers/cutRope/domui/*.js`
- 改切割拖尾、资源加载、背景音乐：改 `src/renderers/cutRope/systems/*.js`

## 6. 需求到文件映射速查

- 改世界宽高、重力、阻尼、摆动力 -> `src/config.json`
- 改关卡糖果、星星、目标、绳索锚点/长度 -> `src/config.json`
- 改背景 / 糖果 / 星星 / 怪物资源链接 -> `src/config.json`
- 改背景音乐链接、音量、循环 -> `src/config.json`
- 改关卡级资源或 BGM 覆盖 -> `src/config.json`
- 把平铺关卡配置聚合成运行时 level -> `src/config.js`
- 改通关/失败文案与关卡推进 -> `src/kernels/cutRopeKernel.js`
- 改糖果生成稳定化逻辑 -> `src/kernels/systems/levelSystem.js`
- 改悬挂摆动、切断后自由落体、绳索约束 -> `src/kernels/systems/physicsSystem.js`
- 改收星判定、接收口判定、出界失败 -> `src/kernels/systems/collisionSystem.js`
- 改场景 contain/cover 布局 -> `src/renderers/cutRope/sceneLayout.js`
- 改绳子曲线、回弹、糖果/星星/目标绘制 -> `src/renderers/cutRope/components/SceneView.js`
- 改切割拖尾和击中特效 -> `src/renderers/cutRope/systems/SlashEffectSystem.js`
- 改资源贴图优先与回退逻辑 -> `src/renderers/cutRope/systems/SceneAssetLibrary.js`
- 改背景音乐播放/解锁 -> `src/renderers/cutRope/systems/BackgroundAudioController.js`
- 改 HUD、Modal、按钮交互与样式 -> `src/renderers/cutRope/domui/*.js`

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
  - 配置读取、平铺 key 聚合、关卡/资源/音频构建

### `src/core/`

- `src/core/kernelFactory.js`
  - 根据玩法标识选择 kernel
- `src/core/contracts.js`
  - 共享最小结构；当前主要是 `createOverlay()`

### `src/kernels/`

- `src/kernels/cutRopeKernel.js`
  - 当前真正运行的规则层
- `src/kernels/placeholderKernel.js`
  - 未实现玩法的占位 kernel

### `src/kernels/systems/`

- `levelSystem.js`
  - 关卡运行时构建、糖果出生点稳定化
- `physicsSystem.js`
  - 轻量绳索约束、摆动、自由落体、旋转
- `collisionSystem.js`
  - 星星收集、目标命中、出界失败

### `src/renderers/cutRope/`

- `mountCutRopeRenderer.js`
  - 当前真正运行 renderer；负责 Pixi 挂载、背景、音频、输入、订阅和布局
- `sceneLayout.js`
  - 计算场景在视口中的缩放和安全区
- `components/SceneView.js`
  - 场景主体；负责糖果、绳子、星星、目标渲染与命中检测
- `domui/HudView.js`
  - 顶部 HUD
- `domui/Modal.js`
  - 开始/胜负弹窗
- `domui/CardContainer.js` / `PrimaryButton.js` / `TitleText.js` / `RewardBlock.js`
  - DOM UI 复用组件
- `systems/SlashEffectSystem.js`
  - 切割拖尾、击中特效
- `systems/SceneAssetLibrary.js`
  - 贴图资源加载与缓存
- `systems/BackgroundAudioController.js`
  - 背景音乐解锁、播放、切换和销毁

## 8. 配置约定

### 8.1 结构

- `src/config.json` 使用平铺 key
- 叶子统一结构：`{ value, type, label }`
- `_` 开头 key 视为只读说明项

### 8.2 命名

- 命名格式：`domain_subdomain_field`
- 示例：
  - `gameplay_world_width`
  - `gameplay_level_1_rope_1_length`
  - `presentation_candy_asset_url`
  - `presentation_bgm_volume`

### 8.3 关卡配置规则

当前关卡采用带序号平铺 key：

- `gameplay_level_<n>_name`
- `gameplay_level_<n>_candy_x`
- `gameplay_level_<n>_candy_y`
- `gameplay_level_<n>_target_shape`
- `gameplay_level_<n>_target_x/y/radius/width/height`
- `gameplay_level_<n>_rope_<m>_anchor_x`
- `gameplay_level_<n>_rope_<m>_anchor_y`
- `gameplay_level_<n>_rope_<m>_length`
- `gameplay_level_<n>_star_<k>_x`
- `gameplay_level_<n>_star_<k>_y`

### 8.4 资源配置规则

当前支持以下全局资源字段：

- `presentation_background_asset_url`
- `presentation_candy_asset_url`
- `presentation_star_asset_url`
- `presentation_target_asset_url`

当前也支持按关卡覆盖：

- `gameplay_level_<n>_background_asset_url`
- `gameplay_level_<n>_candy_asset_url`
- `gameplay_level_<n>_star_asset_url`
- `gameplay_level_<n>_target_asset_url`

资源优先级：

1. 关卡级资源
2. 全局 presentation 资源
3. 代码默认矢量绘制

### 8.5 背景音乐配置规则

当前支持以下全局字段：

- `presentation_bgm_asset_url`
- `presentation_bgm_volume`
- `presentation_bgm_loop`

当前也支持按关卡覆盖：

- `gameplay_level_<n>_bgm_asset_url`
- `gameplay_level_<n>_bgm_volume`
- `gameplay_level_<n>_bgm_loop`

音频优先级：

1. 关卡级 BGM
2. 全局 presentation BGM
3. 不播放

## 9. 修改策略

### 9.1 配置优先

如果需求只是：

- 改关卡摆位
- 改重力、阻尼、绳宽
- 换背景图、糖果图、星星图、怪物图
- 换 BGM
- 改按钮文案

先只改 `src/config.json`。

### 9.2 只在必要时扩字段

新增配置项前先确认：

1. 现有字段是否已经可表达
2. `snapshot.presentation` 或 `snapshot.state.level` 是否已经有该信息
3. 是否真的需要改 `src/config.js` 聚合

### 9.3 规则与表现分离

- “绳子能不能切”“何时胜利”“何时失败”“通关后去哪一关”是规则
- “绳子是否弹跳”“拖尾多长”“HUD 长什么样”“音乐何时解锁”是表现

不要混写。

## 10. 当前真实实现备注

- 当前主场景用 Pixi 渲染，但 HUD / Modal 走 `domui/*`，不是纯 Pixi UI。
- `src/renderers/cutRope/components/HudView.js`、`OverlayView.js` 及 `components/ui/*` 不是当前主挂载链的核心实现，回答时不要误认。
- 当前场景布局是“背景 cover，游戏世界 contain 到安全区内”。
- 当前绳子已支持点击/滑动切断、hover 高亮、弹性曲线和切断回弹。

## 11. 回答用户时的强约束

- 先给结论，再给真实文件路径。
- 如果原因来自代码，必须点出具体文件。
- 不要把“建议”说成“已经实现”。
- 不要给用户不存在的配置键名。
- 如果改动只影响 `cut-rope-nobuild`，不要泛化成整个仓库都这样。

## 12. 最小验证清单

每次实质改动后至少检查：

1. 改动文件是否仍符合当前运行链
2. 新增配置项是否被真实读取
3. kernel 改动是否没引入 Pixi / DOM / Audio 控制
4. renderer 改动是否没写玩法判定
5. `ReadLints` 是否无新问题

## 13. 默认输出风格

- 简洁
- 低噪音
- 低假设
- 明确边界
- 明确“当前已实现”和“需要新增”的区别

如果无法确认，就直接说“需要先读文件确认”，不要脑补。
