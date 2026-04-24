# 2048 No-Build Architecture (Minimal)

> 操作细节与改造步骤以 `SKILL.md` 为准；本文仅保留架构边界与关键约束。

## 1) 定位

- 无构建运行形态（CDN + ESM）
- 目标：快速迭代 2048 类玩法参数、主题和文案
- 核心原则：**kernel 纯规则 / renderer 纯表现**

## 2) 分层职责

- `core`：入口装配与 kernel 选择
- `kernels/game2048Kernel.js`：移动、合并、得分、胜负、snapshot
- `renderers/game2048/mountGame2048Renderer.js`：渲染、动画、输入映射
- `config.json + config.js`：平铺配置与兼容读取

约束：

- kernel 不操作 DOM/Pixi
- renderer 不写合并/胜负规则

## 3) 数据流

`键盘/滑动 -> action -> kernel.dispatch -> snapshot -> renderer.render`

主要 action：

- `start_or_restart`
- `dismiss_overlay`
- `show_swipe_hint`
- `move`

## 4) 配置模型（平铺）

- `config.json` 使用平铺 key（如 `gameplay_swipe_threshold`）
- 统一项结构：`{ value, type, label }`
- `_` 前缀 key 只读
- `config.js` 提供：
  - `getSetting(pathOrKey, fallback)`（兼容旧路径读取）
  - `isConfigKeyEditable(key)`

## 5) 适用范围

适用：2048 类模板快速复用、调参与换皮。  
不适用：重工程化构建链路或重 TS 类型约束场景。
