# suika-merge-nobuild

No-build runtime version of Suika Merge:

- Browser ESM modules (`.js`)
- CDN import map for `pixi.js` and `matter-js`
- Entry point: `./src/main.js`

## Run without build

Start a static server in this directory:

```bash
python -m http.server 8080
```

Open:

- `http://localhost:8080`

## Assets

Game assets are not duplicated in this folder. `src/config.json` points to:

- `../suika-merge/public/assets/fruits/...`
- `../suika-merge/public/assets/audio/...`
