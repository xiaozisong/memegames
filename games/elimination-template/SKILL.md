---
name: elimination-template-game-builder
description: 你是一个非常厉害的顶级游戏开发工程师 请基于现有 elimination-template，通过新增 kernel、配置接线和复用 renderer 模块，快速实现新的消除/匹配类游戏。
---

# Elimination Template 技能说明

## 目标

当你希望基于 `games/elimination-template` **快速且稳定**地做一款新的消除/匹配类游戏时，使用本技能。

当前模板已具备较强落地能力，尤其适合：

- Block Blast（放置 + 清线）类玩法
- Match-3（交换 + 消除 + 连锁）类玩法
- 移动端优先的霓虹 HUD 风格与反馈系统

---

## 模板现有能力

### 1) Core 协议与启动

- `src/core/contracts.ts`
  - `GameKernel`, `KernelAction`, `EliminationSnapshot`
- `src/core/kernelFactory.ts`
  - 根据 `gameplay.mechanics.active` 选择 kernel
- `src/main.ts`
  - 启动游戏并挂载 renderer

### 2) 可复用系统（纯逻辑）

- `src/systems/LineClearSystem.ts`
  - 纯逻辑清线检测与计算
- `src/systems/physics/*`
  - 物理插件层（默认可关闭）
  - `contracts.ts`：插件抽象接口
  - `matterPhysicsAdapter.ts`：Matter.js 适配器（默认）
  - `simplePhysicsAdapter.ts`：内置 simple 2D 兜底适配器
  - `physicsPlugin.ts`：kernel 编排入口

### 3) 现有 kernels

- `src/kernels/blockBlastKernel.ts`
  - 方块放置 + 清线
- `src/kernels/match3Kernel.ts`
  - 交换 + 匹配 + 消除 + 下落 + 连锁
- `src/kernels/placeholderKernel.ts`
  - 未实现玩法的占位兜底

### 4) 现有 renderers

- `src/renderers/pixiTemplateRenderer.ts`
  - 通用霓虹模板渲染（偏 block-blast）
- `src/renderers/memeMatch3/*`
  - `GridBoard.ts`
  - `Block.ts`
  - `HUD.ts`
  - `AnimationController.ts`
  - `mountMemeMatchRenderer.ts`

### 5) 样式层

- `src/styles/ui-layer.css`
- `src/styles/meme-match.css`

### 6) 配置中心

- `src/config.json`
  - `gameplay.*`：规则与进度
  - `presentation.*`：UI 模板 / 文案 / 动画配置
  - `theme.*`：颜色与效果参数
  - `assets.*`：背景图 / 音乐 / 头像映射等扩展资源

### 7) 运行模式（build / no-build）

- 工程化模式（默认）：`games/elimination-template`
  - TypeScript + Vite
  - 适合持续开发、版本化发布、多人协作
- 无构建模式：`games/elimination-template-nobuild`
  - CDN + 原生 JS + `index.html -> main.js`
  - 适合算法侧快速验证和轻量调试

> 注意：无构建模式通常仍建议用静态服务器运行（`http://localhost`），不要直接 `file://` 双击打开。

---

## 架构规则（必须遵守）

1. 非必要不要改 `core` 契约。
2. 玩法逻辑放在 `kernel`（或可复用 `systems`）。
3. `renderer` 只负责 UI、交互、动画与反馈展示。
4. 优先配置驱动，减少硬编码数字/文案/颜色。
5. 先复用已有 renderer 模块，再决定是否新增渲染路径。

---

## 从 0 到 1：新游戏实现流程

### 第 1 步：定义玩法循环

明确：

- 输入模型（点击交换 / 拖拽放置 / 路径连线）
- 棋盘模型（行列、元素类型）
- 结算循环（匹配消除 / 清线 / 合并）
- 胜负条件（步数、分数、收集目标）

### 第 2 步：新增 kernel

创建 `src/kernels/<yourKernel>.ts`，实现 `GameKernel`。

至少实现：

- `dispatch(action)`
- `getSnapshot()`
- `subscribe(listener)`

kernel 内应完成：

- 从 `getSetting(...)` 读取参数
- 响应 action 更新状态
- 处理棋盘规则
- 更新分数、目标进度、步数
- 输出状态消息与 overlay 状态

### 第 3 步：注册 kernel

修改 `src/core/kernelFactory.ts`：

- 将 `gameplay.mechanics.active` 映射到你的新 kernel

### 第 4 步：补充配置

修改 `src/config.json`：

- `gameplay.mechanics.active`
- `gameplay.mechanics.params.<yourMode>`
- `gameplay` 的目标/步数/棋盘参数
- `presentation` 文案与动画策略
- `theme` 色板与视觉强度
- 如需物理：补充 `physics.*` 参数（默认先关闭，按玩法开启）

### 第 5 步：选择 renderer 策略

三选一：

- 交互接近 block-blast：复用 `pixiTemplateRenderer`
- 交互接近 swap/match：复用 `memeMatch3` 模块
- 差异较大：新增 `src/renderers/<yourMode>/...`

renderer 应负责：

- 视觉结构（棋盘、HUD、卡片、弹层）
- 手势交互（点击/拖拽/交换）
- 动画调度
- 反馈展示（toast/combo/effects）

renderer 不应负责：

- 规则判定
- 计分策略
- 胜负判定

### 第 6 步：在 `main.ts` 接线

根据 `gameplay.mechanics.active`：

- 实例化对应 kernel
- 挂载对应 renderer

### 第 7 步：本地验证

在模板目录执行：

```bash
npm run build
```

无构建模板验证（示例）：

```bash
# 在 games/elimination-template-nobuild 目录
python -m http.server 8080
# 打开 http://localhost:8080
```

### 第 8 步：发布到目标目录（参数化）

在仓库根目录执行：

```bash
pnpm --filter elimination-template exec vite build --base ./ --outDir <TARGET_OUT_DIR> --emptyOutDir
```

推荐把 `<TARGET_OUT_DIR>` 当作“部署目标参数”，不要写死到 `web/play`。

常见示例：

```bash
# Web 展示目录
pnpm --filter elimination-template exec vite build --base ./ --outDir ../../web/play/elimination-template --emptyOutDir

# 算法侧目录（示例，按你项目实际路径替换）
pnpm --filter elimination-template exec vite build --base ./ --outDir ../../algo/playground/elimination-template --emptyOutDir
```

PowerShell 可用变量减少重复修改：

```powershell
$outDir = "../../web/play/elimination-template"
pnpm --filter elimination-template exec vite build --base ./ --outDir $outDir --emptyOutDir
```

算法侧建议把目录参数和游戏标识一起维护，例如：

```powershell
$game = "elimination-template"
$target = "../../algo/playground/$game"
pnpm --filter $game exec vite build --base ./ --outDir $target --emptyOutDir
```

---

## 配置核对清单（实战）

每新增一个玩法模式，至少确认：

- 棋盘尺寸
- 步数/计时限制
- 目标定义
- 元素池（tile/avatar）
- 随机/刷新规则
- 动画参数（swap/clear/drop）
- HUD 文案模板
- 反馈提示文案
- 主题颜色与发光对比
- 资源映射（可选）

---

## 当前 Action 模型说明

当前 `KernelAction` 包含：

- `start_or_restart`
- `set_relax_hint`
- `select_piece`
- `place_at`

对于交换类玩法，可复用 `place_at` 作为“格子选择/交换意图桥接”（当前 match3 即如此实现）。

---

## 常见坑位

1. 把规则逻辑写进 renderer。
2. renderer 中硬编码模式文案，不走 `config.json`。
3. 为了小差异去改 `core` 契约。
4. 新 kernel 写好了但忘记在 `kernelFactory` 注册。
5. 只构建游戏目录，忘了同步 `web/play`。
6. 颜色太多，破坏统一视觉体系。
7. 在 renderer 里直接做物理解算，绕开 `systems/physics` 插件层。
8. 把无构建模式当作 `file://` 双击运行，导致模块/CORS限制问题。

---

## 新模式质量门槛

一个模式可视为“可交付”需满足：

- kernel 逻辑稳定且可复现
- renderer 在移动端交互顺滑
- 反馈闭环完整（合法/非法/消除/combo/结算）
- 关键参数和文案可配置
- 构建通过且已更新 `web/play`

---

## 推荐的最小文件集（每个新模式）

- `src/kernels/<yourKernel>.ts`
- `src/renderers/<yourMode>/mount<YourMode>Renderer.ts`
- `src/renderers/<yourMode>/GridBoard.ts`（如有自定义棋盘交互）
- `src/renderers/<yourMode>/HUD.ts`（如有自定义顶部信息区）
- `src/styles/<yourMode>.css`
- `src/config.json` 中对应 gameplay/presentation/theme 项
- `src/core/kernelFactory.ts` 中 kernel 映射
- `src/main.ts` 中渲染入口切换

这样可以将改动尽量局部化，避免模板架构漂移。
