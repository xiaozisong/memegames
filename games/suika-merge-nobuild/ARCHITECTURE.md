# Suika Merge No-Build Architecture (Minimal)

> 操作细节与改动步骤以 `SKILL.md` 为准；本文仅保留架构边界与关键约束。

## 1) 定位

- 无构建运行形态（CDN + ESM）
- 目标：快速验证物理合成玩法、参数和交互
- 核心原则：**规则（kernel）与表现（renderer）分离**

## 2) 分层职责

- `core`：启动装配与 kernel 选择（`kernelFactory.js`）
- `kernels`：纯规则层（物理步进、合并、得分、失败、snapshot 输出）
- `renderers`：纯表现层（渲染、输入映射、UI、音效）
- `config`：全局参数层（`config.json` + `config.js`）

约束：

- kernel 不操作 DOM / Pixi / CSS
- renderer 不写玩法判定（合并/得分/失败规则）

## 3) 数据流

`pointer/ticker -> action -> kernel.dispatch -> snapshot -> renderer.render`

核心 action：

- `start_or_restart`
- `spawn_fruit`
- `tick`
- `resize_world`

## 4) 配置模型（平铺）

- `config.json` 使用平铺 key：`domain_subDomain_field`
- 每项结构：`{ value, type, label }`
- `type`：`bool/int/float/color/string/image/audio/vedio`
- `_` 开头 key 为只读（通过 `isConfigKeyEditable` 判断）

读取方式：

- 基础值：`getSetting("gameplay_world_width", fallback)`
- 聚合值由 `config.js` 提供：
  - `getSpawnXRange()`
  - `buildSpawnWeights()`
  - `buildFruitTypes()`
  - `buildMergeRules()`
  - `buildAssetMap("asset_fruits_")`
  - `buildAssetMap("asset_audio_")`

## 5) 关键机制

- **动态尺寸**：`resize_world` 后重建边界并重定位实体
- **投放一致性**：预览位置与真实 spawn 映射一致
- **资源策略**：`asset_fruits_*` / `asset_audio_*` 推荐线上 HTTPS URL

## 6) 适用范围

适用：快速迭代玩法、调参、演示版。  
不适用：强工程化（复杂构建链路、重 TS 约束）场景。
