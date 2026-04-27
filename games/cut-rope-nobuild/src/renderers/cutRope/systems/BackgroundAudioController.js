export class BackgroundAudioController {
  constructor() {
    this.audio = null;
    this.currentUrl = "";
    this.userActivated = false;
    this.lastShouldPlay = false;
  }

  sync(snapshot) {
    const config = pickBgmConfig(snapshot);
    const shouldPlay = Boolean(config.url) && Boolean(snapshot?.state?.started);
    this.lastShouldPlay = shouldPlay;

    if (!config.url) {
      this.stop();
      return;
    }

    if (!this.audio || this.currentUrl !== config.url) {
      this.replaceAudio(config.url);
    }

    if (!this.audio) return;

    this.audio.loop = config.loop;
    this.audio.volume = config.volume;

    if (shouldPlay && this.userActivated) {
      void this.audio.play().catch(() => {});
      return;
    }

    if (!shouldPlay) {
      this.audio.pause();
    }
  }

  unlock() {
    this.userActivated = true;
    if (this.audio && this.lastShouldPlay) {
      void this.audio.play().catch(() => {});
    }
  }

  stop() {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.audio = null;
    this.currentUrl = "";
  }

  destroy() {
    this.stop();
  }

  replaceAudio(url) {
    this.stop();
    this.audio = new Audio(url);
    this.audio.preload = "auto";
    this.currentUrl = url;
  }
}

function pickBgmConfig(snapshot) {
  const levelAudio = snapshot?.state?.level?.audio ?? {};
  const presentationAudio = snapshot?.presentation?.audio ?? {};
  const url = normalizeAssetUrl(levelAudio.bgmUrl) || normalizeAssetUrl(presentationAudio.bgmUrl);
  const volumeSource = normalizeAssetUrl(levelAudio.bgmUrl) ? levelAudio.bgmVolume : presentationAudio.bgmVolume;
  const loopSource = normalizeAssetUrl(levelAudio.bgmUrl) ? levelAudio.bgmLoop : presentationAudio.bgmLoop;

  return {
    url,
    volume: clampNumber(volumeSource, 0, 1, 0.5),
    loop: typeof loopSource === "boolean" ? loopSource : true,
  };
}

function normalizeAssetUrl(value) {
  return String(value ?? "").trim();
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}
