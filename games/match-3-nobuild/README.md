# match-3-nobuild

`match-3-nobuild` 是一个基于 `CDN + 原生 ESM + 纯 JavaScript` 的无构建 Match-3 模板骨架。

当前项目刻意**不包含具体 Match-3 玩法逻辑**，只保留以下可复用架构：

- `index.html -> src/main.js` 启动链
- `config.json + config.js` 配置层
- `kernelFactory.js + kernel` 规则层入口
- `renderer` 表现层入口
- 文档骨架

## 当前状态

- 可直接本地运行
- 可看到占位 HUD、棋盘与 overlay
- 可继续接入交换、消除、下落、补珠、目标等 Match-3 逻辑

## 目录重点

- `src/main.js`
  - 启动入口
- `src/config.json`
  - 单一配置源
- `src/config.js`
  - 配置读取层
- `src/kernels/match3Kernel.js`
  - 当前 Match-3 占位 kernel
- `src/renderers/match3/mountMatch3Renderer.js`
  - 当前 Match-3 占位 renderer

## 本地运行

```bash
python -m http.server 8080
```

打开：

- `http://localhost:8080`

也可以：

```bash
npx serve .
```

不要使用 `file://` 直接打开。
