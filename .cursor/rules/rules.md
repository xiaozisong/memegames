# 游戏开发规则（Pixi + pnpm monorepo）

## 1. 项目结构（强制）

所有小游戏必须遵循以下结构：

repo/
games/ <game-name>/
src/
index.html
vite.config.ts
package.json

packages/
game-core/


---

## 2. 游戏类型要求

每个游戏必须：

* 是一个独立的 Vite 项目
* 使用 PixiJS 作为渲染引擎
* 入口文件为：src/main.ts
* 能通过 `pnpm dev` 单独运行

---

## 3. 依赖管理规则（非常重要）

必须使用 workspace 依赖：

示例：

"dependencies": {
"pixi.js": "workspace:*",
"@game/core": "workspace:*"
}

禁止：

* 在每个游戏中重复安装 pixi.js
* 使用不同版本的 pixi.js

---

## 4. 打包规则（强制）

每个游戏必须可以独立 build：

输出必须包含：

* index.html
* JS bundle

必须将 pixi.js 外部化（使用 CDN）

vite.config.ts 必须包含：

external: ['pixi.js']

---

## 5. 游戏架构要求

每个游戏必须包含：

* Game 类（核心逻辑）
* Pixi Application 初始化
* update 循环

禁止：

* 使用 React 渲染游戏内容
* 使用 DOM 实现游戏逻辑

---

## 6. 共享能力（必须复用）

所有游戏必须复用：

packages/game-core

例如：

* createGame()
* ticker 管理
* resize 适配

---

## 7. 代码规范

* 使用 TypeScript
* 禁止使用全局变量
* 模块化拆分逻辑

---

## 8. 性能要求

* 复用纹理资源
* 尽量使用 Sprite 而不是 Graphics
* 避免重复创建对象

---

## 9. 文件命名规范

* main.ts：入口
* Game.ts：主逻辑
* assets/：资源目录

---

## 10. 禁止事项（必须遵守）

禁止：

* 在 games 中创建完整 React 应用
* 每个游戏打包一份 PixiJS
* 混用多个渲染引擎


核心规则（最重要）

# AI Game Generation Rules

## 1. 技术选型优先级

优先使用：

1. Canvas + simple_physics
2. Canvas + tap_rhythm
3. DOM UI（如果是交互类）
4. Three.js（仅在需要3D时）
5. Pixi.js
6. Phaser
7. 复杂物理引擎（Cannon / Matter）


## 2. 根据游戏类型选择 skill

### 如果是：
- 点击 / 节奏 → tap_rhythm_system
- 抛物线 / 飞行 → simple_physics
- 跑酷 / 无限 → procedural_generation + camera_follow
- UI交互 → modern_ui + ui_animation
- 3D → threejs_core

必须组合使用 game_state_machine

## 3. UI必须满足现代设计

所有游戏必须包含：

- border-radius >= 12px
- 阴影（soft shadow）
- 渐变（gradient）
- 动画（transition / transform）

优先使用：

- glassmorphism（毛玻璃）
- 卡片式布局
- 中央提示（Tap to Start）
- 进度条 / 能量条

## 4. 性能优先

默认：

- 单文件 HTML（可运行）
- 不引入大型库
- 使用 Canvas 或 DOM

避免：

- 不必要的 WebGL
- 复杂依赖

## 5. AI生成约束

代码必须：

- 可读
- 可扩展
- 不依赖外部状态
- 所有参数可配置

例如：

speed, gravity, colors → 必须可调

## 6. 视觉优化策略

如果游戏简单：

→ 必须添加：
- 粒子效果
- UI动画

如果游戏中等：

→ 可添加：
- shader后处理（pixelate / CRT）

目标：

让游戏“看起来高级”

You are working on a modular game engine.

STRICT RULES:

1. NEVER rewrite the entire template
2. NEVER mix UI and logic
3. NEVER introduce new architecture patterns

4. Only modify:
- one system at a time

5. Game logic must:
- be pure
- be reusable

6. UI must:
- be template-driven
- not generated randomly

7. Always:
- explain changes
- keep structure stable