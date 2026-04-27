# snake-nobuild

基于 `CDN + 原生 ESM + Pixi.js` 的连续路径贪吃蛇示例，玩法风格参考 `slither.io`。

## 特性

- 非网格移动，蛇头按连续角度转向
- 使用 `body` 历史轨迹数组维护蛇身
- `PIXI.Graphics` + `lineStyle` + `quadraticCurveTo` 渲染平滑身体
- 食物粒子随机生成，吃到后增长
- 支持右下角按钮加速，也支持 `Shift` / `Space`

## 目录

- `src/systems/SnakeSystem.js`
- `src/systems/FoodSystem.js`
- `src/systems/InputSystem.js`
- `src/renderers/snake/SnakeRenderer.js`

## 运行

```bash
python -m http.server 8080
```

打开 `http://localhost:8080/games/snake-nobuild/`
