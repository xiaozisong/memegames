# cut-rope-nobuild

基于 `Pixi.js + 原生 ESM + CDN` 的无构建 Cut the Rope 风格小游戏模板。

## 运行方式

```bash
python -m http.server 8080
```

然后打开 [http://localhost:8080](http://localhost:8080)。

## 目录结构

- `index.html`
  - 页面入口与 CDN import map
- `src/main.js`
  - 启动链，装配 kernel 和 renderer
- `src/config.json`
  - 单一配置源，包含玩法参数、主题、资源链接和关卡数据
- `src/config.js`
  - 配置读取与关卡构建
- `src/kernels/cutRopeKernel.js`
  - 玩法规则层，处理 tick、切绳、胜负与关卡重置
- `src/kernels/systems/*.js`
  - 轻量物理、关卡运行时、碰撞判定
- `src/renderers/cutRope/*`
  - Pixi 场景、HUD、Overlay 与交互渲染

## 当前能力

- 点击绳索切断，支持 hover 高亮反馈
- 糖果在悬挂时轻微摆动，切断后受重力和惯性影响
- 绳索、星星、糖果、目标全部使用 Pixi 矢量绘制
- 支持通过 `config.json` 配置背景 / 糖果 / 星星 / 怪物资源链接；有资源时优先使用贴图，否则回退默认矢量绘制
- 支持通过 `config.json` 配置背景音乐链接、音量和循环播放；在首次用户交互后自动开始播放
- 支持 Restart、胜利 / 失败提示、示例多关卡
