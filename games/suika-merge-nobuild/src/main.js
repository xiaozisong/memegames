import { createKernel } from "./core/kernelFactory.js";
import { mountSuikaRenderer } from "./renderers/suika/mountSuikaRenderer.js";
function localizeTitle() {
    const lang = (window.navigator.language || "").toLowerCase();
    if (lang.startsWith("zh-cn")) {
        document.title = "小游戏：合成大西瓜";
        return;
    }
    if (lang.startsWith("zh-tw") || lang.startsWith("zh-hk")) {
        document.title = "小遊戲：合成大西瓜";
        return;
    }
    if (lang.startsWith("ja")) {
        document.title = "ミニゲーム：合成スイカ";
        return;
    }
    if (lang.startsWith("ko")) {
        document.title = "작은 놀이：큰 수박 합성";
        return;
    }
    document.title = "Little game: Synthetic watermelon";
}
function createLoadingView() {
    const loading = document.createElement("div");
    loading.className = "suika-loading";
    loading.innerHTML = `
    <div class="suika-loading-panel">
      <div class="suika-loading-title">Suika Merge</div>
      <div class="suika-loading-track"><div class="suika-loading-fill"></div></div>
      <div class="suika-loading-text">loading...0%</div>
    </div>
  `;
    document.body.appendChild(loading);
    const fill = loading.querySelector(".suika-loading-fill");
    const text = loading.querySelector(".suika-loading-text");
    const update = (ratio) => {
        const percent = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
        if (fill)
            fill.style.width = `${percent}%`;
        if (text)
            text.textContent = `loading...${percent}%`;
    };
    const done = () => {
        update(1);
        loading.classList.add("hidden");
        window.setTimeout(() => loading.remove(), 260);
    };
    return { update, done };
}
async function bootstrap() {
    localizeTitle();
    const loading = createLoadingView();
    const root = document.querySelector("#app");
    if (!root)
        throw new Error("Missing #app container.");
    const kernel = createKernel();
    loading.update(0.06);
    await mountSuikaRenderer(root, kernel, {
        onAssetProgress: (ratio) => loading.update(0.1 + ratio * 0.85),
    });
    loading.done();
}
void bootstrap().catch((error) => {
    const loadingText = document.querySelector(".suika-loading-text");
    if (loadingText)
        loadingText.textContent = "loading failed, please refresh";
    console.error(error);
});
