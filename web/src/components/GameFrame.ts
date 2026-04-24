interface GameFrameOptions {
  slug: string;
  title: string;
}

export function createGameFrame(options: GameFrameOptions): HTMLElement {
  const wrap = document.createElement("section");
  wrap.className = "game-frame";

  const toolbar = document.createElement("div");
  toolbar.className = "game-frame-toolbar";

  const loading = document.createElement("span");
  loading.className = "game-frame-loading";
  loading.textContent = "加载中...";

  const refreshBtn = document.createElement("button");
  refreshBtn.type = "button";
  refreshBtn.textContent = "刷新";

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.textContent = "新窗口打开";

  toolbar.append(loading, refreshBtn, openBtn);

  const frameWrap = document.createElement("div");
  frameWrap.className = "game-frame-viewport";

  const iframe = document.createElement("iframe");
  iframe.className = "game-frame-iframe";
  iframe.title = options.title;
  iframe.src = `/play/${options.slug}/index.html`;
  iframe.loading = "eager";
  iframe.allowFullscreen = true;

  const setLoading = (value: boolean): void => {
    loading.textContent = value ? "加载中..." : "已加载";
  };

  iframe.addEventListener("load", () => setLoading(false));

  refreshBtn.addEventListener("click", () => {
    setLoading(true);
    iframe.src = `${iframe.src.split("?")[0]}?t=${Date.now()}`;
  });

  openBtn.addEventListener("click", () => {
    window.open(iframe.src.split("?")[0], "_blank", "noopener,noreferrer");
  });

  frameWrap.appendChild(iframe);
  wrap.append(toolbar, frameWrap);
  return wrap;
}
