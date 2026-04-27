---
name: zombie-tower-defense-nobuild-game-builder
description: Build or refactor no-build zombie tower defense games on zombie-tower-defense-nobuild. Use when changing flat config keys, enemy or base resources, tower purchase or upgrade UX, waves, HUD, overlay, audio, renderer feedback, or tower-defense kernel rules while preserving the kernel/renderer boundary and avoiding unverified claims.
---

# Zombie Tower Defense No-Build

## 1. 模型执行摘要

- 当前真正运行入口：`index.html -> src/main.js`
- 当前真正运行 kernel：`src/kernels/towerDefenseKernel.js`
- 当前真正运行 renderer：`src/renderers/mountTowerDefenseRenderer.js`
- 当前真正运行配置：`src/config.json` + `src/config.js`
- 默认先改：`src/config.json`
- 配置不够时：
  - 规则、数值、波次、敌人攻击占位改 `src/kernels/*.js`
  - 视觉、交互、媒体、音频、HUD、overlay 改 `src/renderers/*.js`
- 默认不要改：
  - `src/core/contracts.js`
  - `src/core/kernelFactory.js`
  - `src/kernels/placeholderKernel.js`
  - `src/main.js`

执行顺序：

1. 先判断需求属于配置、规则、还是表现。
2. 能只改 `src/config.json` 就不要先改代码。
3. 规则只进 kernel；Pixi、DOM、图片、音频、pointer 事件只进 renderer。
4. 改完先检查运行链是否仍然成立，再补充说明。

## 2. 强约束

- 不要把敌人生成、金币、波次推进、伤害结算写进 renderer。
- 不要把 Pixi / DOM / 图片 / 音频 / pointer 事件写进 kernel。
- 不要在没验证文件内容前声称“已支持”“当前就是这样”“已有该字段”。
- 不要虚构配置项、快照字段、敌人类型、音频字段、overlay 字段；必须先读真实文件。
- 不要为了小改动扩散到 `core` 层。
- 不要把历史实现或别的模板行为套到当前模板。

默认禁止修改清单：

- `src/core/contracts.js`
- `src/core/kernelFactory.js`
- `src/main.js`
- `src/kernels/placeholderKernel.js`

只有以下情况才允许改：

- `src/core/contracts.js`：共享 overlay 结构必须扩字段
- `src/core/kernelFactory.js`：玩法注册链需要变化
- `src/main.js`：挂载入口或启动链本身需要变化

## 3. 反幻觉规则

- 只引用已读到的文件和字段。
- 只描述当前仓库真实存在的能力，不要按理想塔防模板回答。
- 如果用户问“为什么”，先给真实文件路径，再给原因。
- 如果某能力是新增的，就明确说“需要新增”，不要说成“已经支持但没配好”。
- 新增配置项时，保持 `src/config.json` 的平铺叶子结构：`{ value, type, label }`。
- 回答“支持几种怪 / 几层 UI / 几个基地”时，按当前代码真实能力回答。

## 4. 一句话数据流

`config.json -> config.js -> kernel state/snapshot -> renderer -> 用户输入 -> kernel.dispatch() -> 新 snapshot`

## 5. 改动优先级

1. `src/config.json`
2. `src/config.js`
3. `src/kernels/towerDefenseKernel.js`
4. `src/kernels/EnemySystem.js`
5. `src/kernels/TowerSystem.js`
6. `src/kernels/BaseSystem.js`
7. `src/kernels/BulletSystem.js`
8. `src/renderers/mountTowerDefenseRenderer.js`
9. `src/renderers/RendererFactory.js`
10. `src/core/kernelFactory.js`

判断规则：

- 改文案、颜色、图片资源、音频链接、字号、尺寸、波次基础参数：先改 `src/config.json`
- 平铺配置需要重新聚合：改 `src/config.js`
- 改波次推进、敌人生成、金币、胜负、攻击占位、敌人停靠逻辑：改 `src/kernels/towerDefenseKernel.js` 或 `EnemySystem.js`
- 改炮台购买/升级/伤害/攻速：改 `src/kernels/TowerSystem.js`
- 改主基地/副基地经济、回血、升级：改 `src/kernels/BaseSystem.js`
- 改 HUD、tooltip、overlay、图片显示、音频解锁、点击交互：改 `src/renderers/mountTowerDefenseRenderer.js`
- 改资源创建、sprite/shape 切换、等比缩放：改 `src/renderers/RendererFactory.js`

## 6. 需求到文件映射速查

- 改背景、怪物、炮台、主基地、副基地、胜利图资源 -> `src/config.json`
- 改 BGM、攻击音效、受击音效 -> `src/config.json`
- 改开始 / 胜利 / 失败文案和字号 -> `src/config.json`
- 改金币、炮台价格、升级价格、基础伤害、攻速 -> `src/config.json`
- 改波次数量、每波数量、血量、速度、伤害 -> `src/config.json`
- 把平铺配置聚合成资产 / 音频 / overlay 结构 -> `src/config.js`
- 改主循环、胜负、波次推进 -> `src/kernels/towerDefenseKernel.js`
- 改敌人移动、攻击、副基地占位 -> `src/kernels/EnemySystem.js`
- 改炮台购买、升级、选敌、发射 -> `src/kernels/TowerSystem.js`
- 改主基地金币、主基地升级、副基地回血 -> `src/kernels/BaseSystem.js`
- 改子弹移动和命中 -> `src/kernels/BulletSystem.js`
- 改 HUD、tooltip、overlay、点击反馈、受击特效 -> `src/renderers/mountTowerDefenseRenderer.js`
- 改 sprite/shape 创建、tint、宽高比 -> `src/renderers/RendererFactory.js`

## 7. 目录职责

### 根目录

- `SKILL.md`
  - 当前文件；给模型的执行规约
- `策划案.md`
  - 当前模板的产品与规则说明
- `index.html`
  - 页面壳、import map、运行入口

### `src/`

- `src/main.js`
  - 启动应用；装配 kernel 和 renderer
- `src/config.json`
  - 单一配置源；默认优先改这里
- `src/config.js`
  - 配置读取、平铺 key 聚合、资产/音频/overlay 配置组装

### `src/core/`

- `src/core/kernelFactory.js`
  - 根据玩法标识选择 kernel
- `src/core/contracts.js`
  - 共享 overlay 结构

### `src/kernels/`

- `towerDefenseKernel.js`
  - 当前运行时真正使用的规则层
- `EnemySystem.js`
  - 敌人创建、移动、接敌、攻击
- `TowerSystem.js`
  - 炮台购买、升级、开火
- `BaseSystem.js`
  - 主基地经济、副基地生命与恢复
- `BulletSystem.js`
  - 子弹飞行与命中
- `PathSystem.js`
  - 路径与路径点工具
- `placeholderKernel.js`
  - 未实现玩法的占位 kernel

### `src/renderers/`

- `mountTowerDefenseRenderer.js`
  - 当前真正运行 renderer；负责 Pixi 挂载、HUD、overlay、tooltip、音频、交互、布局
- `RendererFactory.js`
  - shape / sprite 资源创建，等比缩放和资源预加载

## 8. 配置约定

### 8.1 结构

- `src/config.json` 使用平铺 key
- 叶子统一结构：`{ value, type, label }`
- `_` 开头 key 视为只读

### 8.2 命名

- 命名格式：`domain_subdomain_field`
- 示例：
  - `assets_enemy_level1_src`
  - `overlay_intro_title`
  - `enemy_types_level2_hp_multiplier`
  - `tower_upgrade_base_cost`

### 8.3 资源优先级

- 只要资源配置存在 `src`，默认优先走 sprite
- 没有 `src` 时回退到默认 shape
- 背景资源是 DOM/CSS 背景；实体资源是 Pixi sprite
- sprite 显示默认按图片原始宽高比缩放，除非显式提供 `width + height`

### 8.4 overlay 规则

当前 overlay 已支持：

- 标题 / 正文 / 按钮文案配置化
- 标题 / 正文 / 按钮字号配置化
- 正文换行
- 动态高度
- 按钮按压反馈

### 8.5 tooltip 规则

当前 tooltip 已用于：

- 购买炮台确认
- 炮台升级确认
- 主基地升级确认

默认优先用 tooltip，不要把这些交互重新做成占满全屏的 modal。

## 9. 修改策略

### 9.1 配置优先

如果需求只是：

- 调资源链接
- 调数值
- 调颜色
- 调文案
- 调字号
- 调尺寸

先只改 `src/config.json`。

### 9.2 规则与表现分离

- “怪物何时生成、走哪条线、什么时候攻击、如何分散占位”是规则
- “血条画法、tooltip 样式、overlay 大小、音效触发、资源缩放”是表现

不要混写。

## 10. 回答用户时的强约束

- 先给结论，再给真实文件路径。
- 如果原因来自代码，必须点出具体文件。
- 不要把“建议方案”说成“当前已实现”。
- 不要给用户不存在的配置键名。
- 如果某改动只影响这个模板，不要泛化到整个仓库。

## 11. 最小验证清单

每次实质改动后至少检查：

1. 新增配置项是否真实被读取
2. kernel 是否没有混入 Pixi / DOM / 音频元素控制
3. renderer 是否没有写玩法判定
4. 运行链是否仍然是 `main -> kernel -> renderer`
5. `ReadLints` 是否无新问题

## 12. 默认输出风格

- 简洁
- 低噪音
- 低假设
- 明确边界
- 明确“已实现”和“建议方案”的区别

如果无法确认，就先读文件，不要脑补。
