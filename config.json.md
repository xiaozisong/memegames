本文档说明默认项目模板中的 src/config.json 文件有什么作用，以及前端如何对这个文件进行解读和可视化呈现，方便用户不依赖 AI 也能直接调整游戏素材、配色和参数。
当前默认文件位置：
/src/config.json

---
1. 这个文件的定位
config.json 是游戏项目的中央配置文件。
它的目标不是承载业务代码，而是统一存放这些“用户可能会修改”的内容：
1. 配色方案
2. 游戏内可调参数
3. 图片素材链接
4. 音频素材链接
5. 其他被代码引用的外部文件链接
这样设计的目的，是让前端可以把这些内容转换成一个可视化编辑界面，让用户直接修改，而不需要再去改 JS 代码或请求 AI。

---
2. 为什么要有这个文件
如果这些内容直接硬编码在 main.js、GameScene.js 或其他脚本里，会有几个问题：
1. 用户很难区分“逻辑代码”和“可调参数”
2. 替换图片、音频、主题色时需要懂代码
3. 前端很难自动生成统一的配置编辑面板
4. AI 每次生成代码时，容易把参数散落到多个文件中
把这些内容集中到 config.json 后，前端就可以把它理解成一个“结构化表单数据源”。

---
3. 当前默认结构
当前默认模板中的 config.json 结构如下：
{"_comment": "Central game configuration. Put all color palettes, tunable gameplay parameters, image URLs, audio URLs, and any other referenced file URLs here. Do not hardcode user-editable constants or asset links in JavaScript files.","theme": {"colors": {}},"gameplay": {"params": {}},"assets": {"images": {},"audio": {}},"externalFiles": {}}

---
4. 字段作用解释
_comment
作用：
- 这是给AI看的说明字段
- 用来解释整个配置文件的用途
- 不建议业务逻辑依赖这个字段

---
theme.colors
作用：
- 存放整个游戏使用的颜色配置
- 例如主色、背景色、按钮色、文字色、危险色、成功色、描边色等
建议写法示例：
{"theme": {"colors": {"primary": "#4f46e5","background": "#0f172a","panel": "#111827","text": "#f8fafc","accent": "#22d3ee","danger": "#ef4444"}}}

---
gameplay.params
作用：
- 存放所有可调节的玩法参数
- 包括角色速度、敌人速度、生成间隔、时间限制、血量、分数倍率等
建议写法示例：
{"gameplay": {"params": {"playerSpeed": 5,"enemySpeed": 2,"spawnInterval": 1200,"gameDuration": 60,"maxLives": 3}}}

---
assets.images
作用：
- 存放所有图片资源链接
- 例如角色图、背景图、按钮图标、道具图、封面图等
建议写法示例：
{"assets": {"images": {"player": "https://example.com/player.png","enemy": "https://example.com/enemy.png","background": "https://example.com/bg.png"}}}
前端建议解读方式：
- 展示成“图片资源分组”
- 每个字段显示：
  - key 名称
  - 链接输入框
  - 缩略图预览（如果可加载）
- 允许用户直接替换 URL

---
assets.audio
作用：
- 存放所有音频资源链接
- 例如 BGM、点击音效、击中音效、胜利音效、失败音效等
建议写法示例：
{"assets": {"audio": {"bgm": "https://example.com/bgm.mp3","click": "https://example.com/click.wav","hit": "https://example.com/hit.wav"}}}

---
externalFiles
作用：
- 存放除图片和音频外，其他仍然需要被代码引用的文件链接
- 例如：
  - 关卡配置文件
  - 外部 JSON 数据
  - 字体文件
  - 特殊资源清单
建议写法示例：
{"externalFiles": {"levelData": "https://example.com/levels.json","fontFile": "https://example.com/font.woff2"}}

---
