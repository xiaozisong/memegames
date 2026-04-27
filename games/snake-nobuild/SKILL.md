---
name: snake-nobuild-game-builder
description: Build or refactor no-build slither-style snake games on snake-nobuild. Use when changing flat config keys, round timers, snake growth, NPC behavior, food density, Pixi camera, skins, audio, HUD, endscreen UI, or renderer-only visual effects while preserving the kernel/renderer boundary and avoiding unverified claims.
---

# Snake No-Build

## 1. 模型执行摘要

- 当前真正运行入口：`index.html -> src/main.js`
- 当前真正运行 kernel：`src/kernels/snakeKernel.js`
- 当前真正运行 renderer：`src/renderers/snake/mountSnakeRenderer.js` -> `src/renderers/snake/SnakeRenderer.js`
- 当前真正运行配置：`src/config.json` + `src/config.js`
- 默认先改：`src/config.json`
- 配置不够时：
  - 规则、回合、得分、死亡、重生、时长限制改 `src/kernels/snakeKernel.js`
  - 蛇移动、增长、碰撞辅助改 `src/systems/SnakeSystem.js`
  - 食物生成与消耗改 `src/systems/FoodSystem.js`
  - NPC 生成、重生、AI、皮肤池分配改 `src/systems/NpcSystem.js`
  - 视觉、镜头、皮肤、音频、背景、HUD、结束页改 `src/renderers/snake/**`
- 默认不要改：
  - `src/core/contracts.js`
  - `src/core/kernelFactory.js`
  - `src/main.js`

执行顺序：

1. 先判断需求属于配置、规则、还是表现。
2. 能只改 `src/config.json` 就不要先改代码。
3. 规则只进 kernel / systems；Pixi、DOM、图片、音频、按钮、毛玻璃、镜头表现只进 renderer。
4. 改完检查运行链和新增配置是否真实生效。

## 2. 强约束

- 不要把 Pixi / DOM / Audio / localStorage 写进 kernel。
- 不要把碰撞、增长、回合结束、重生判定写进 renderer。
- 不要在没读真实文件前声称“已支持”“已有字段”“当前就是这样”。
- 不要虚构配置项、snapshot 字段、皮肤池数量、音频能力。
- 不要把别的模板能力直接套到 `snake-nobuild`。
- 不要为了小改动扩散到 `core` 层。

默认禁止修改清单：

- `src/core/contracts.js`
- `src/core/kernelFactory.js`
- `src/main.js`

只有在以下情况才允许改：

- `src/core/kernelFactory.js`：玩法注册链真的需要变化
- `src/core/contracts.js`：共享 snapshot / contract 必须扩字段
- `src/main.js`：启动挂载链本身要变

## 3. 反幻觉规则

- 只引用已读到的真实文件、真实字段、真实目录。
- 回答“支持吗”时，区分：
  - 当前已实现
  - 当前未实现，需要新增
- 回答“为什么出问题”时，先给真实文件路径，再给原因。
- 新增配置时，保持 `src/config.json` 的平铺叶子结构：`{ value, type, label }`
- 回答数量上限时，按真实代码回答，不按理想设计回答。

## 4. 一句话数据流

`config.json -> config.js -> kernel state/snapshot -> renderer -> 用户输入 -> kernel.dispatch() / kernel.tick() -> 新 snapshot`

## 5. 改动优先级

1. `src/config.json`
2. `src/config.js`
3. `src/kernels/snakeKernel.js`
4. `src/systems/SnakeSystem.js`
5. `src/systems/FoodSystem.js`
6. `src/systems/NpcSystem.js`
7. `src/systems/LeaderboardSystem.js`
8. `src/renderers/snake/SnakeRenderer.js`
9. `src/renderers/snake/domui/*.js`
10. `src/core/kernelFactory.js`

判断规则：

- 改文案、颜色、镜头参数、时长上限、皮肤资源、音量、背景媒体、结束页文案：先改 `src/config.json`
- 配置平铺键需要聚合或兼容路径读取：改 `src/config.js`
- 改单局流程、时间到结束、死亡同局重生、最终 summary：改 `src/kernels/snakeKernel.js`
- 改蛇增长衰减、长度裁剪、碰撞阈值：改 `src/systems/SnakeSystem.js`
- 改食物生成、掉落、消耗：改 `src/systems/FoodSystem.js`
- 改 NPC 数量、AI、重生、皮肤池分配：改 `src/systems/NpcSystem.js`
- 改镜头、背景、皮肤贴图、音频、HUD、结束页、按钮按压反馈：改 `src/renderers/snake/**`

## 6. 需求到文件映射速查

- 改每颗食物增长值 -> `src/config.json`
- 改增长软上限 / 长蛇衰减 -> `src/config.json` + `src/systems/SnakeSystem.js`
- 改每局时间、死亡后重开延迟 -> `src/config.json` + `src/kernels/snakeKernel.js`
- 改 NPC 皮肤池 -> `src/config.json` + `src/systems/NpcSystem.js` + `src/renderers/snake/SnakeRenderer.js`
- 改玩家 / NPC / 食物图片皮肤 -> `src/config.json` + `src/renderers/snake/SnakeRenderer.js`
- 改背景图 / 视频 / BGM / 吃食物音效 / 死亡音效 -> `src/config.json` + `src/renderers/snake/SnakeRenderer.js`
- 改左上 HUD / 右侧排行榜 -> `src/renderers/snake/domui/HudView.js` + `src/renderers/snake/domui/theme.js`
- 改结束页布局与按钮样式 -> `src/renderers/snake/domui/EndscreenView.js` + `src/renderers/snake/domui/theme.js`
- 改镜头缩放、跟随、边界跟随 -> `src/renderers/snake/SnakeRenderer.js`
- 改食物高密度闪烁 / 选择策略 -> `src/renderers/snake/SnakeRenderer.js`

## 7. 目录职责

### 根目录

- `SKILL.md`
  - 当前文件；给模型的执行规约
- `README.md`
  - 对人类的简要说明
- `index.html`
  - 页面壳与运行入口

### `src/`

- `src/main.js`
  - 启动应用；创建 kernel 并挂载 renderer
- `src/config.json`
  - 单一配置源；默认优先改这里
- `src/config.js`
  - 配置读取、平铺 key 兼容映射

### `src/core/`

- `src/core/kernelFactory.js`
  - 创建当前 snake kernel
- `src/core/contracts.js`
  - 共享 contract 定义

### `src/kernels/`

- `src/kernels/snakeKernel.js`
  - 单局状态、tick、食物结算、死亡处理、时间到结束、同局重生、结束页 summary

### `src/systems/`

- `SnakeSystem.js`
  - 建蛇、转向、移动、增长、长度裁剪、碰撞辅助
- `FoodSystem.js`
  - 初始食物、食物消耗、死亡掉落 burst
- `InputSystem.js`
  - 摇杆、加速按钮、键鼠触控输入
- `NpcSystem.js`
  - NPC 创建、AI、重生、皮肤池分配
- `LeaderboardSystem.js`
  - 排行榜快照构建

### `src/renderers/snake/`

- `mountSnakeRenderer.js`
  - renderer 挂载入口
- `SnakeRenderer.js`
  - Pixi 主渲染、背景、食物、蛇、镜头、音频、资源加载、UI 视图调度
- `domui/HudView.js`
  - 常驻 HUD
- `domui/EndscreenView.js`
  - 时间到后的结束页
- `domui/theme.js`
  - UI Layer 样式

## 8. 配置约定

### 8.1 结构

- `src/config.json` 使用平铺 key
- 叶子统一结构：`{ value, type, label }`
- `_` 开头 key 视为只读说明

### 8.2 命名

- 命名格式：`domain_subdomain_field`
- 示例：
  - `gameplay_growth_per_food`
  - `gameplay_round_time_limit_seconds`
  - `asset_snake_body_image`
  - `asset_npc_skin_1_head_image`
  - `ui_text_play_again_label`

### 8.3 皮肤资源规则

当前已实现：

- 玩家蛇头 / 蛇身图片
- NPC 默认蛇头 / 蛇身图片
- NPC 多套皮肤池图片
- 食物图片

优先级：

1. NPC 若命中皮肤池 `skinId`，优先使用池内图片
2. 否则回退到 NPC 默认图片
3. 若无图或加载失败，回退到默认矢量渲染

### 8.4 回合规则

当前真实规则：

- 死亡后在**同一 round** 内延迟重生
- 时间到才真正结束 round
- 时间到后通过结束页按钮开启新 round
- 历史最佳使用本地存储持久化

不要把当前逻辑描述成“死亡直接结束整局”。

## 9. 修改策略

### 9.1 配置优先

如果需求只是：

- 调时间
- 调增长
- 调镜头参数
- 换图片 / 音效 / 背景
- 改文案 / 颜色 / 毛玻璃参数

先只改 `src/config.json`。

### 9.2 只在必要时扩字段

新增配置项前先确认：

1. 现有字段能不能表达
2. 现有 snapshot 是否已带出所需信息
3. 是否真的需要改 `config.js`

### 9.3 规则与表现分离

- “死亡后是否同局重生”“时间到是否结束”“每颗食物实际增长多少”是规则
- “按钮是否发光”“结束页是否毛玻璃”“镜头缩放如何过渡”是表现

不要混写。

## 10. 回答用户时的强约束

- 先给结论，再给真实文件路径。
- 如果解释原因，必须基于已读代码。
- 不要把建议说成已实现。
- 不要给用户不存在的配置键名。
- 如果当前只支持固定数量皮肤池，要明确说当前上限。

## 11. 最小验证清单

每次实质改动后至少检查：

1. 新配置项是否被真实读取
2. kernel 是否没有混入 Pixi / DOM / Audio / localStorage
3. renderer 是否没有写玩法判定
4. 运行链是否仍然是 `main -> kernel -> renderer`
5. `ReadLints` 是否无新问题

## 12. 默认输出风格

- 简洁
- 低噪音
- 明确“已实现”与“建议方案”
- 明确哪些内容来自真实文件

如果无法确认，就直接说“需要先读文件确认”，不要脑补。
