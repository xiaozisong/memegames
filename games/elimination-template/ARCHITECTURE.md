# Elimination Template 架构说明

## 1. 模板定位

`elimination-template` 是一个面向二维网格消除/匹配玩法的可复用模板，目标是：

- 玩法逻辑稳定沉淀在 `kernel/systems`
- 表现层复用 `Pixi + ui-layer` 组合
- 新游戏优先通过 `config + kernel` 完成，而不是重写 renderer

一句话：**以稳定骨架支撑快速产出同类新玩法**。

---

## 2. 分层职责（必须严格遵守）

### `src/core/`（契约层）

- `contracts.ts`：定义 `GameKernel`、`KernelAction`、`EliminationSnapshot` 等协议
- `kernelFactory.ts`：根据配置创建具体 kernel

约束：

- 不写具体玩法规则
- 不写 UI 细节
- 保持向后兼容优先

### `src/systems/`（可复用原子逻辑层）

- 示例：`LineClearSystem.ts`
- 示例：`physics/*`（`contracts.ts`、`matterPhysicsAdapter.ts`、`physicsPlugin.ts`）

约束：

- 纯逻辑、无副作用（或副作用最小）
- 不依赖 Pixi/DOM
- 可被多个 kernel 复用
- 物理层通过适配器接口接入，kernel 不直接绑定具体物理引擎

### `src/kernels/`（玩法编排层）

- 示例：`blockBlastKernel.ts`、`match3Kernel.ts`、`placeholderKernel.ts`

职责：

- 接收 `dispatch(action)`
- 调用 `systems` 完成规则计算
- 维护状态并产出 snapshot
- 承担计分、胜负、目标推进

约束：

- 不操作 DOM/Canvas
- 不直接写样式

### `src/renderers/`（表现与交互层）

- 主路径：`pixiTemplateRenderer.ts`
- 辅助：`uiModel.ts`（状态映射与反馈检测）

职责：

- 订阅 snapshot 并渲染棋盘/HUD/反馈
- 处理输入（点击、拖拽）并转成 action
- 控制动效、toast、overlay

约束：

- 不做规则判定
- 不做计分算法
- 不改胜负逻辑

### `src/styles/`（视觉样式层）

- 主文件：`ui-layer.css`

职责：

- UI 主题 token
- HUD/overlay/toast 样式
- 交互动效 class
- 设备适配（safe-area、断点、横竖屏策略）

### `src/config.json`（配置层）

核心配置域：

- `gameplay.*`：玩法参数（棋盘、目标、权重、步数）
- `presentation.uiTemplate`：布局/区域/自适应规则
- `presentation.uiMechanicMapping`：机制 -> UI 反馈映射
- `presentation.feedbackMessages`：反馈文案
- `presentation.textTemplates`：状态文案模板
- `theme.*`：颜色与效果参数

---

## 3. 运行链路（单向数据流）

1. `main.ts` 启动应用
2. `kernelFactory` 创建目标 kernel
3. renderer 订阅 kernel snapshot
4. 用户操作触发 `dispatch(action)`
5. kernel 计算新状态并产出新 snapshot
6. renderer 根据 snapshot + config 刷新 UI/动效

设计原则：**输入(action) -> 逻辑(kernel) -> 状态(snapshot) -> 表现(renderer)**。

### 运行形态补充

- **Build 形态（默认）**：`elimination-template`
  - TS + Vite 构建产物后部署
- **No-Build 形态（辅助）**：`elimination-template-nobuild`
  - CDN + JS，`index.html` 直接加载 `main.js`

两者架构职责应保持一致（`core/kernel/renderer/config`），差异仅在工程化能力与运行方式。

---

## 4. 架构不变量（Invariants）

以下规则在所有新模式中都应保持成立：

1. `kernel` 是玩法真相源（single source of truth）
2. renderer 只消费 snapshot，不持有业务主状态
3. `systems` 复用优先于 kernel 内重复逻辑
4. `config` 驱动优先于硬编码常量
5. 新玩法默认复用主 renderer 路径，避免并行渲染分叉
6. 物理能力通过 `systems/physics` 插件层接入，不在 renderer 做物理解算

---

## 5. 何时只改 kernel，何时还要改 renderer

### 仅改 `kernel + config` 即可

适用：

- 同类网格输入模型（选块/放置/交换）
- HUD 结构基本一致
- 反馈类型可由现有 class 组合覆盖

### 需要扩展 renderer（谨慎）

适用：

- 输入模型显著变化（路径连线、长按蓄力、双指）
- 棋盘呈现形态变化（非规则网格、分层棋盘）
- 需要新反馈系统（全新动画流水线）

扩展方式：

- 优先在现有 `pixiTemplateRenderer.ts` 增加可配置分支
- 仅当差异巨大时新增 renderer 子模块
- 新增后要更新文档与 Skill，防止重复分叉

---

## 6. 移动端适配基线（必须通过）

模板默认应满足：

- safe-area 不遮挡关键 UI（顶部 HUD、底部提示、overlay）
- 无水平滚动
- 棋盘与托盘在手机上完整可见
- 主要交互目标 >= 44px
- 文字不重叠（ellipsis/换行策略）

建议验收分辨率：

- 360x800（手机）
- 768x1024（平板）
- 1366x768（桌面）

---

## 7. 与 Skill / Rule 的关系

### `SKILL.md`

作用：流程指南（怎么新增玩法、怎么接线、怎么发布）。

不负责：自动修复代码。

### `.cursor/rules/rules.md`

作用：行为约束（防止 UI/逻辑混写、防止大改骨架）。

不负责：自动实施架构升级。

结论：**Skill/Rule 是规范层，模板代码是执行层**。  
要保证质量，必须把规范沉淀回模板实现本身。

---

## 8. 发布目录策略（参数化）

发布目录不应写死为 `web/play`，应由部署目标决定：

- Web 侧：`../../web/play/<slug>`
- 算法侧：`../../algo/playground/<slug>`（示例）

统一原则：

- 构建命令模板使用 `--outDir <TARGET_OUT_DIR>`
- `TARGET_OUT_DIR` 由环境/脚本参数注入
- 同一玩法在不同场景可以产出到不同目录，架构本身不变

---

## 9. 物理插件接入基线（已落地）

当前模板已提供可开关的 physics 插件层（默认关闭）：

- `src/systems/physics/contracts.ts`：物理抽象接口
- `src/systems/physics/matterPhysicsAdapter.ts`：Matter.js 适配器（默认）
- `src/systems/physics/simplePhysicsAdapter.ts`：内置 simple 2D 兜底适配器
- `src/systems/physics/physicsPlugin.ts`：kernel 可调用的编排插件

配置入口在 `config.json` 的 `physics.*`：

- `physics.enabled`
- `physics.step.fixedDeltaMs`
- `physics.world.*`
- `physics.placementImpulse.*`
- `physics.debug.appendStatsToMessage`

接入原则：

- kernel 调用 physics 插件（`onPlacementImpact` / `step`）
- renderer 只消费 snapshot，不直接操作 physics world
- 未来接入第三方引擎时，只替换 adapter，不改 kernel 协议

---

## 10. 新玩法接入标准流程（推荐）

1. 在 `src/kernels/` 新建 `<mode>Kernel.ts`
2. 在 `kernelFactory.ts` 注册模式映射
3. 在 `config.json` 加入 `gameplay/presentation/theme` 参数
4. 若有通用计算，抽到 `src/systems/`
5. renderer 优先复用主路径，仅按配置扩展
6. 运行构建并发布到目标目录（参数化 `outDir`）
7. 完成三档设备验收

---

## 11. 反模式（应避免）

- 在 renderer 写计分、胜负、规则判定
- 在 kernel 写 DOM/Canvas 操作
- 为小差异复制一整份 renderer
- 新增模式只改代码不更新文档/Skill
- 移动端适配只靠临时魔法数，不做可配置收口
- 把发布路径硬编码为 `web/play`，忽略算法侧目录需求

---

## 12. 当前模板适用范围

最适合：

- 网格消除、匹配、拼块放置类玩法
- 可抽象为 snapshot 驱动渲染的 2D 休闲玩法

不适合直接套用：

- 需要复杂物理实时模拟的动作玩法
- 3D 场景主导玩法
- 高度自定义输入设备玩法

对于这类玩法，建议新建同风格但不同交互骨架的模板，而不是强行塞进当前模板。
