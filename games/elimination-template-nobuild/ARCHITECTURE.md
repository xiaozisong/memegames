# Elimination Template No-Build Architecture (Minimal)

> 具体改法、文件职责与模板使用流程以 `SKILL.md` 为准；本文只保留架构边界、主路径和关键约束。

## 1) 定位

- 无构建运行形态（CDN + ESM）
- 目标：快速验证放置消除/网格消除玩法、参数和表现
- 核心原则：**规则（kernel）与表现（renderer）分离**

## 2) 分层职责

- `core`：启动装配与 kernel 选择（`kernelFactory.js`）
- `kernels`：纯规则层（放置、清线、得分、目标、失败、snapshot 输出）
- `systems`：可复用纯逻辑（如 `lineClearSystem.js`）
- `renderers`：纯表现层（Pixi 渲染、输入映射、背景媒体、UI、动画）
- `config`：全局参数层（`config.json` + `config.js`）

约束：

- kernel 不操作 DOM / Pixi / CSS / 音视频元素
- renderer 不写玩法判定（合法性、得分、胜负）

## 3) 当前主路径

- 主 kernel：`src/kernels/blockBlastKernel.js`
- 主 renderer：`src/renderers/blockPlacement/mountBlockPlacementRenderer.js`
- 主配置：`src/config.json`
- 主配置读取：`src/config.js`

说明：

- `src/kernels/blockPlacementKernel.ts` 是 TS 镜像/参考文件，不是当前 no-build 运行入口
- `src/renderers/pixiTemplateRenderer.js` 是早期留存 renderer，不是当前主渲染路径

## 4) 数据流

`pointer/ticker -> action -> kernel.dispatch -> snapshot -> renderer.render`

核心 action：

- `start_or_restart`
- `pick_piece`
- `drag_move`
- `place_piece`
- `tick`

> 具体 action 以当前 kernel 实现为准；renderer 只能发意图，不能自己裁定规则结果。

## 5) 配置模型（当前为平铺）

- `config.json` 当前使用平铺 key 路径
- 叶子结构统一为 `{ value, type, label }`
- 命名风格：`domain_subdomain_field`
- 通过 `getSetting("a.b.c", fallback)` 兼容读取旧点路径，内部会映射到平铺 key

主要配置域：

- `gameplay_*`：棋盘、形状、目标、计分、初始填充
- `presentation_*`：UI 模板、文案、交互和动画策略
- `theme_*`：颜色、发光、背景媒体、方块配色

## 6) 关键机制

- **单向数据流**：所有展示都来自 snapshot，而不是 renderer 自持业务状态
- **媒体背景**：支持 `image/gif/video/audio`，播放受浏览器交互策略约束
- **设备适配**：基于容器尺寸重新布局 HUD、棋盘、托盘与媒体层

## 7) 适用范围

适用：快速迭代玩法、调参、演示版、算法验证。  
不适用：复杂工程化、多环境构建链路、强 TS 类型约束主流程。
