export class AudioFx {
    constructor(options = {}) {
        this.context = null;
        this.unlocked = false;
        this.dropToggle = false;
        this.clips = new Map();
        const entries = Object.entries(options.audioAssets ?? {}).filter(([, url]) => typeof url === "string" && url.length > 0);
        for (const [key, url] of entries) {
            const audio = new Audio(url);
            audio.preload = "auto";
            this.clips.set(key, audio);
        }
    }
    unlock() {
        if (this.unlocked)
            return;
        this.unlocked = true;
        this.getContext();
        this.playBgm();
    }
    playBgm() {
        if (!this.unlocked)
            return;
        if (!this.bgm) {
            const bgm = this.clips.get("bgm");
            if (!bgm)
                return;
            this.bgm = bgm;
            this.bgm.loop = true;
            this.bgm.volume = 0.35;
        }
        void this.bgm.play();
    }
    stopBgm() {
        if (!this.bgm)
            return;
        this.bgm.pause();
        this.bgm.currentTime = 0;
    }
    playStartOrRestart(isRestart) {
        const key = isRestart ? "restart" : "start";
        if (this.playClip(key))
            return;
        this.playTone(isRestart ? 392 : 349, 0.09, "triangle", 0.12);
        this.playTone(isRestart ? 523.25 : 466.16, 0.09, "triangle", 0.08, 0.06);
    }
    playGameOver() {
        if (this.playClip("gameover"))
            return;
        this.playTone(220, 0.14, "sawtooth", 0.13);
        this.playTone(164.81, 0.2, "sine", 0.09, 0.05);
    }
    playDrop() {
        this.dropToggle = !this.dropToggle;
        const key = this.dropToggle ? "drop1" : "drop2";
        if (this.playClip(key))
            return;
        this.playTone(key === "drop1" ? 392 : 330, 0.045, "triangle", 0.08);
    }
    playMerge(targetType) {
        if (targetType.toLowerCase() === "fruitboss" || targetType === "watermelo") {
            if (this.playClip("success"))
                return;
            this.playChord([523.25, 659.25, 783.99], 0.22, 0.14);
            return;
        }
        if (this.playClip("merge"))
            return;
        this.playTone(466.16, 0.08, "sine", 0.11);
        this.playTone(622.25, 0.08, "sine", 0.08, 0.05);
    }
    playBlast() {
        if (this.playClip("blast"))
            return;
        const ctx = this.getContext();
        if (!ctx)
            return;
        const now = ctx.currentTime;
        const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) {
            const t = i / data.length;
            data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.35;
        }
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        source.buffer = buffer;
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        source.connect(gain).connect(ctx.destination);
        source.start(now);
    }
    playClip(key) {
        if (!this.unlocked)
            return false;
        const clip = this.clips.get(key);
        if (!clip)
            return false;
        if (clip.error || clip.networkState === HTMLMediaElement.NETWORK_NO_SOURCE || clip.readyState < 2) {
            return false;
        }
        clip.currentTime = 0;
        void clip.play();
        return true;
    }
    playChord(freqs, duration, volume) {
        freqs.forEach((freq, index) => {
            this.playTone(freq, duration, "triangle", volume, index * 0.02);
        });
    }
    playTone(frequency, duration, waveform, volume, delay = 0) {
        const ctx = this.getContext();
        if (!ctx)
            return;
        const now = ctx.currentTime + delay;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = waveform;
        oscillator.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(now);
        oscillator.stop(now + duration + 0.02);
    }
    getContext() {
        if (typeof window === "undefined")
            return null;
        if (!this.context) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx)
                return null;
            this.context = new Ctx();
        }
        if (this.context.state === "suspended")
            void this.context.resume();
        return this.context;
    }
}
