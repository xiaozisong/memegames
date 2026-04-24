# 2048 架构说明

`game-2048` 参照 `suika-merge-nobuild` 拆分为三层：`core / kernels / renderers`。

## 目录分层

- `src/core/contracts.ts`：action / snapshot / kernel 契约定义
- `src/core/kernelFactory.ts`：kernel 创建入口（按 mode 切换）
- `src/kernels/game2048Kernel.ts`：2048 规则层（移动、合并、得分、胜负、弹层状态）
- `src/renderers/game2048/mountGame2048Renderer.ts`：Pixi 渲染层（布局、绘制、动画、输入转 action）
- `src/GameRuntime.ts`：运行时装配层（组装 kernel + renderer）

## 运行链路

1. `main.ts` 启动 `GameRuntime`
2. `GameRuntime` 创建 kernel（`createKernel`）
3. `mountGame2048Renderer` 订阅 snapshot 并挂载 Pixi 视图
4. 键盘/滑动输入在 renderer 内转为 `KernelAction`
5. kernel 更新规则状态后推送 snapshot
6. renderer 基于 snapshot 刷新画面与反馈动画

## 设计约束

- kernel 不依赖 Pixi，不直接操作 DOM/Canvas
- renderer 不写玩法规则，只负责展示与交互映射
- `GameRuntime` 不承载玩法和渲染细节，只做装配
