# elimination-template-nobuild

`elimination-template-nobuild` 是一个基于 **CDN + 原生 ESM + 纯 JavaScript** 的无构建游戏模板，当前内置的是一套可直接运行的 `Block Placement / Line Clear` 示例。

它的定位不是“随便堆代码的试玩目录”，而是：

- 可复制的 no-build 游戏模板
- 适合快速验证玩法、表现和配置
- 保持 `kernel / renderer / config` 分层清晰

## 当前运行特征

- 依赖通过 `index.html` 的 import map 引入
- 当前主依赖：`pixi.js`、`gsap`
- 入口：`index.html -> src/main.js`
- 当前主 kernel：`src/kernels/blockBlastKernel.js`
- 当前主 renderer：`src/renderers/blockPlacement/mountBlockPlacementRenderer.js`

## 目录说明

- `SKILL.md`
  - 模板使用指南，说明改哪个文件能产生什么效果
- `ARCHITECTURE.md`
  - 最小架构边界说明
- `策划案.md`
  - 当前模板玩法、UI、资源与配置清单
- `src/config.json`
  - 配置中心
- `src/config.js`
  - 配置读取与模板辅助方法

## 本地运行

在当前目录使用任意静态服务器：

```bash
python -m http.server 8080
```

然后打开：

- `http://localhost:8080`

也可以使用：

```bash
npx serve .
```

不要直接使用 `file://` 打开，否则模块和媒体资源可能加载失败。

## 适合做什么

- 方块放置 + 清线类游戏
- 网格类消除原型
- 带背景图片 / gif / 视频 / 音频的轻量演示版本

## 不建议直接做什么

- 强工程化发布流程
- 复杂多人协作主线开发
- 强依赖 TypeScript 类型系统的正式生产模板

这类需求建议继续使用 build 版模板，而 no-build 版主要承担快速迭代和演示职责。
