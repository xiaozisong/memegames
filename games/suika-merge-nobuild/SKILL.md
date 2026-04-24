---
name: suika-merge-nobuild-game-builder
description: 基于 suika-merge-nobuild（CDN + JS + 无构建）快速创建或改造同类合成游戏模板。用于说明项目分层职责、配置驱动改法、文件修改影响与无构建运行流程。
---

# Suika Merge No-Build 模板技能

## 适用场景

当你要做以下任务时使用本技能：

- 基于现有模板快速做一个“同类/相似”合成游戏（水果、球球、宠物、元素等）
- 先调参数验证玩法，再决定是否做工程化重构
- 在不引入构建工具的前提下快速交付可运行版本
- 排查“改了代码但效果不对”时，确认该改 kernel 还是 renderer

模板运行特征：

- 纯 JavaScript（无 TypeScript）
- 浏览器 ESM + CDN（`pixi.js` / `matter-js`）
- `index.html -> src/main.js` 直接运行
- 静态服务器即可启动，不依赖打包产物

---

## 一图理解架构

`输入 -> renderer -> action -> kernel -> snapshot -> renderer`

- `renderer` 负责视觉与交互，把点击/拖动转换成 action
- `kernel` 负责规则与状态推进，输出 snapshot
- `config.json` 负责参数，不把玩法数值硬编码在逻辑里

---

## 目录与主要职责

### 启动与装配

- `index.html`
  - 定义 import map（CDN 依赖）并挂载 `#app`
- `src/main.js`
  - 启动入口，创建 loading UI，调用 renderer 挂载
- `src/core/kernelFactory.js`
  - 根据 `gameplay.mode` 创建 kernel（当前是 `SuikaKernel`）

### 规则层（必须纯规则）

- `src/kernels/suikaKernel.js`
  - 处理 action：`start_or_restart` / `spawn_fruit` / `tick` / `resize_world`
  - 管理物理世界、碰撞合并、得分、失败判定、Boss 概率
  - 输出统一 snapshot 给 renderer
  - 约束：不操作 DOM / Pixi 节点

### 渲染与交互层（必须纯表现）

- `src/renderers/suika/mountSuikaRenderer.js`
  - 挂载 Pixi、加载资源、订阅 snapshot、处理 pointer 输入
- `src/renderers/suika/FruitContainer.js`
  - 水果实例渲染与合并特效
- `src/renderers/suika/DropIndicator.js`
  - 顶部投放预览与警戒线
- `src/renderers/suika/HUD.js`
  - 分数和开始/重开遮罩
- `src/renderers/suika/audioFx.js`
  - 音频播放与兜底音效

### 配置层（优先改这里）

- `src/config.json`
  - 单一配置源（全平铺），所有可调参数都通过 `{ value, type, label }` 描述
- `src/config.js`
  - `getSetting(key, fallback)`：直接读取平铺 key（例如 `gameplay_world_width`）
  - `buildAssetMap/buildFruitTypes/buildMergeRules/buildSpawnWeights/getSpawnXRange`：提供聚合配置能力
  - `isConfigKeyEditable(key)`：`_key` 不可编辑，非 `_` key 可编辑

### 样式层

- `src/styles/suika.css`
  - 外壳布局、UI、overlay、响应式尺寸、safe-area

---

## 架构规则（必须遵守）

1. `kernel` 只负责规则与状态推进（合成、得分、失败、边界、尺寸、概率）。
2. `renderer` 只负责渲染、交互与反馈（视觉、音效、输入映射、UI）。
3. 参数优先走 `config.json`，避免把玩法常量写死在逻辑中。
4. 不在 renderer 中写玩法判定（合并规则、得分规则、失败规则）。
5. 不在 kernel 中操作 DOM、Pixi、Audio、CSS。

---

## 用模板创作相似游戏（推荐流程）

### 第 1 步：复制模板作为新项目

- 复制 `games/suika-merge-nobuild/` 到新目录（例如 `games/my-merge-nobuild/`）
- 保留目录结构，先不改代码，只改配置和资源验证可运行

### 第 2 步：先改 `config.json` 再改逻辑

- 先替换资源与数值，确认“只调参能不能达到目标”
- 若调参无法达到目标，再改 `suikaKernel.js`（玩法）或 renderer（表现）

### 第 3 步：校验输入与投放一致性

- `mountSuikaRenderer.js` 的输入映射必须与 kernel 的 `spawnXMin/spawnXMax` 一致
- 预览位置、实际落点、碰撞边界要保持统一

### 第 4 步：静态服务启动验证（无构建）

在 `games/suika-merge-nobuild` 目录执行：

```bash
python -m http.server 8080
```

打开：

`http://localhost:8080`

不要直接 `file://` 双击运行，模块和资源加载可能失败。

---

## 改哪个文件会产生什么效果

### A. 只改数值和资源（最快）

- 改 `src/config.json`
  - 效果：重力、世界尺寸、投放速度、水果半径/得分、资源皮肤、音频映射立即变化
  - 适用：换主题、调难度、调手感、做 A/B 参数实验

### B. 改规则行为（玩法变化）

- 改 `src/kernels/suikaKernel.js`
  - 效果：合成逻辑、得分逻辑、失败判定、Boss 产出、回合节奏变化
  - 适用：从“同类模板”演化到“机制有差异”的游戏

### C. 改视觉与交互（体验变化）

- 改 `src/renderers/suika/mountSuikaRenderer.js`
  - 效果：输入方式、镜头/缩放、预览反馈、warning 展示、渲染组织变化
- 改 `src/renderers/suika/FruitContainer.js`
  - 效果：水果表现、合并特效、入场动画变化
- 改 `src/renderers/suika/DropIndicator.js`
  - 效果：瞄准提示、警戒线样式与节奏变化
- 改 `src/renderers/suika/HUD.js`
  - 效果：HUD 排版、文案、按钮与覆盖层结构变化
- 改 `src/renderers/suika/audioFx.js`
  - 效果：音效策略、BGM、降级音调逻辑变化
- 改 `src/styles/suika.css`
  - 效果：UI 视觉、容器尺寸、移动端适配、safe-area 表现变化

---

## `config.json` 负责什么，怎么改

配置读取规则：

- 采用全平铺键名：`domain_subDomain_field`
- 每个配置项统一结构：`{ "value": ..., "type": "...", "label": "..." }`
- `type` 约定：`bool`、`int`、`float`、`color`、`string`、`image`、`audio`、`vedio`
- `_` 开头 key 为只读（例如 `_meta_name`、`_comment`），前端配置面板应禁用编辑
- 代码层统一读取平铺 key：`getSetting("gameplay_world_width")`

### 1) 玩法参数（`gameplay_*`）

- 基础节奏：`gameplay_gravity`、`gameplay_spawn_cooldown_ms`
- 世界尺寸：`gameplay_world_width`、`gameplay_world_height`、`gameplay_world_wall_thickness`、`gameplay_world_ground_height`
- 投放范围：`gameplay_spawn_x_min`、`gameplay_spawn_x_max`、`gameplay_spawn_y`
- 失败与预警：`gameplay_game_over_line`、`gameplay_warning_show_distance`、`gameplay_warning_start_delay_ms`、`gameplay_warning_hold_ms`、`gameplay_warning_ui_hold_ms`
- Boss：`gameplay_boss_type`、`gameplay_boss_max_per_round`、`gameplay_boss_merge_chance`
- 产出权重：`gameplay_spawn_weight_fruit1`、`gameplay_spawn_weight_fruit2`、`gameplay_spawn_weight_fruit3`
- 等级定义：`gameplay_fruit{N}_radius/color/score`（如 `gameplay_fruit3_radius`）
- 合并规则：`gameplay_merge_to_fruit{N}`（如 `gameplay_merge_to_fruit4`）

### 2) 物理手感（`physics_*`）

- `physics_enabled`：物理开关
- `physics_engine`：引擎标识（当前 `matterjs`）
- `physics_step_fixed_delta_ms`：固定物理步长
- `physics_material_restitution` / `physics_material_friction` / `physics_material_friction_static` / `physics_material_friction_air` / `physics_material_spawn_spin`

### 3) 资源映射（平铺 key）

- 图片：`asset_fruits_*`（如 `asset_fruits_bg`、`asset_fruits_fruit1`、`asset_fruits_warning`）
- 音频：`asset_audio_*`（如 `asset_audio_drop1`、`asset_audio_merge`）
- 视频扩展：`asset_video_intro`（`type: vedio`，保留拼写以兼容既有约定）
- 线上环境推荐使用可公网访问的 HTTPS URL（CDN/对象存储）；本地联调可临时使用相对路径，发布前统一替换

### 4) 表现语义（`presentation_*` / `theme_*`）

- `presentation_ui_template` / `presentation_effect_merge` / `presentation_effect_drop`
- `theme_style` / `theme_background` / `theme_fruit_colors`
- 如不使用，可保留默认值，不影响主流程

---

## 常见需求与改法速查

### 设备适配（已内置）

当前模板已经做了多设备适配，覆盖手机/平板/桌面。适配点分三层：

1. CSS 布局层（容器与安全区）
2. Renderer 视口层（等比缩放与输入映射）
3. Kernel 世界层（动态 world 尺寸与边界重建）

**CSS 层如何做：**

- `src/styles/suika.css`
  - `.suika-root` 使用 `min-height: 100vh` + `min-height: 100dvh` 兼容移动端动态视口
  - `.suika-shell` 使用 `width: min(96vw, 520px)`、`height: min(96dvh, 920px)` 做流式容器
  - `@media (max-width: 520px), (max-height: 760px)` 下缩小容器与描边，避免小屏溢出
  - `.suika-ui` 使用 `env(safe-area-inset-top/bottom)` 处理刘海屏与底部安全区

**Renderer 层如何做：**

- `src/renderers/suika/mountSuikaRenderer.js`
  - `computeViewport()` 使用 contain 缩放（`scale = min(hostW/worldW, hostH/worldH)`），不拉伸不裁剪
  - 通过 `offsetX/offsetY` 把游戏区域居中到不同设备容器
  - `mapClientXToWorldX()` 把屏幕点击坐标映射回 world 坐标，保证手机/桌面输入一致
  - `window.resize` 时触发 `resize_world`，并重新渲染

**Kernel 层如何做：**

- `src/kernels/suikaKernel.js`
  - `resizeWorld(width, height)` 动态更新 world 尺寸
  - 世界变化后按比例重定位水果并进行边界 clamp，防止穿墙/出界
  - `rebuildWorldBounds()` 重建左右墙和地板碰撞体
  - `currentSpawnY/currentWarningLineY/currentSpawnXRange` 随新尺寸按比例更新

**如果你要继续加强设备适配，优先改这些文件：**

- 只改 UI 排版与触控区域：`src/styles/suika.css`
- 改缩放策略（contain/cover/固定比例）：`src/renderers/suika/mountSuikaRenderer.js`
- 改世界自适应逻辑（最小尺寸、边界策略）：`src/kernels/suikaKernel.js`

### 让游戏更难

优先改 `config.json`：

- 提高 `gameplay_gravity`
- 缩小 `gameplay_spawn_x_min ~ gameplay_spawn_x_max` 范围
- 降低 `gameplay_spawn_cooldown_ms`
- 下移 `gameplay_game_over_line`（更早失败）
- 提高大果产出权重或降低小果权重（`gameplay_spawn_weight_*`）

### 让游戏更容易

优先改 `config.json`：

- 降低 `gameplay_gravity`、增大 `gameplay_spawn_cooldown_ms`
- 提高 `gameplay_warning_hold_ms`
- 扩大 `gameplay_spawn_x_min ~ gameplay_spawn_x_max` 和 `gameplay_world_width`
- 增加低级果实权重，降低高级果实早期出现概率

### 换皮但玩法不变

- 改 `asset_fruits_*` 与 `asset_audio_*`
- 改 `styles/suika.css` 的颜色、字体、面板样式
- 不改 kernel 即可完成同玩法换主题

### 增加水果等级

主要改 `config.json`：

- 新增 `gameplay_fruit{N}_radius/color/score`
- 新增 `gameplay_merge_to_fruit{N}` 串联规则
- 新增对应 `asset_fruits_fruit{N}` 贴图 URL

如果需要特殊合成行为（如分裂、连锁），再改 `suikaKernel.js`。

### 改输入方式（拖拽/按住预览/键盘）

- 改 `mountSuikaRenderer.js` 的 pointer 事件与 action 发送逻辑
- 保持 action 仍走 `spawn_fruit(normalizedX)`，避免破坏 kernel 协议

---

## 常见坑位

1. 规则逻辑写到 renderer，导致行为分散。
2. 预览位置与真实 spawn 映射不一致（边界反向偏移）。
3. 修改世界尺寸后未同步边界重建与参数缩放。
4. 资源路径写成 build 相对路径，导致 no-build 404。
5. 用 `file://` 直接运行导致模块导入失败。

---

## 质量门槛

- 规则可复现（同输入下行为稳定）
- 交互与投放一致（所见即所得）
- 新功能可配置（优先提供 `config.json` 入口）
- 静态服务器可直接运行（无构建）
- 资源路径在目标部署目录下有效

---

## 最小验证清单

每次改动后，至少验证：

1. 启动后可进入开始界面并开始游戏
2. 指示器位置、投放落点、实际边界一致
3. 相同类型可稳定合并，分数增长符合预期
4. 触发失败线后进入 Game Over 并可重开
5. 缩放窗口后场景、边界、投放逻辑仍正确
