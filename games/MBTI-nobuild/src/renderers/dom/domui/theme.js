export function ensureDomRendererStyles(tokens, doc = document) {
  if (doc.getElementById("mbti-dom-renderer-styles")) return;

  const style = doc.createElement("style");
  style.id = "mbti-dom-renderer-styles";
  style.textContent = `
    :root {
      color-scheme: light;
      --mbti-color-primary: ${tokens.colors.primary};
      --mbti-color-primary-strong: ${tokens.colors.primaryStrong};
      --mbti-color-primary-soft: ${tokens.colors.primarySoft};
      --mbti-color-text: ${tokens.colors.text};
      --mbti-color-text-muted: ${tokens.colors.textMuted};
      --mbti-color-text-subtle: ${tokens.colors.textSubtle};
      --mbti-color-question-text: ${tokens.colors.questionText};
      --mbti-color-glass: ${tokens.colors.whiteGlass};
      --mbti-color-glass-strong: ${tokens.colors.whiteGlassStrong};
      --mbti-color-glass-soft: ${tokens.colors.whiteGlassSoft};
      --mbti-color-border-light: ${tokens.colors.borderLight};
      --mbti-color-shadow: ${tokens.colors.shadow};
      --mbti-color-shadow-soft: ${tokens.colors.shadowSoft};
      --mbti-color-sky-top: ${tokens.colors.skyTop};
      --mbti-color-sky-bottom: ${tokens.colors.skyBottom};
      --mbti-radius-sm: ${tokens.radius.sm};
      --mbti-radius-md: ${tokens.radius.md};
      --mbti-radius-lg: ${tokens.radius.lg};
      --mbti-radius-pill: ${tokens.radius.pill};
      --mbti-shadow-md: ${tokens.shadow.md};
      --mbti-shadow-lg: ${tokens.shadow.lg};
      --mbti-glass-panel: ${tokens.glass.panel};
      --mbti-glass-panel-strong: ${tokens.glass.panelStrong};
      --mbti-glass-blur: ${tokens.glass.blur};
      --mbti-glass-border: ${tokens.glass.border};
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      min-height: 100%;
    }

    body {
      font-family: Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
      color: var(--mbti-color-text);
      background-color: #eef9ff;
      background-image:
        var(--mbti-page-background, none),
        var(--mbti-page-gradient, linear-gradient(180deg, var(--mbti-color-sky-top) 0%, var(--mbti-color-sky-bottom) 100%));
      background-position: center center;
      background-repeat: no-repeat;
      background-size: cover;
    }

    .mbti-app {
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      align-items: stretch;
      justify-content: stretch;
      position: relative;
      overflow: hidden;
      isolation: isolate;
    }

    .mbti-app::before,
    .mbti-app::after {
      content: "";
      position: absolute;
      border-radius: 999px;
      filter: blur(28px);
      opacity: 0.52;
      z-index: 0;
      pointer-events: none;
    }

    .mbti-app::before {
      width: min(42vw, 360px);
      height: min(24vw, 180px);
      top: 5%;
      left: 2%;
      background: rgba(255, 255, 255, 0.55);
    }

    .mbti-app::after {
      width: min(40vw, 300px);
      height: min(22vw, 160px);
      right: 6%;
      bottom: 12%;
      background: rgba(255, 255, 255, 0.45);
    }

    .mbti-shell {
      position: relative;
      z-index: 1;
      width: 100%;
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
    }

    .mbti-app.is-quiz .mbti-shell,
    .mbti-app.is-result .mbti-shell {
      width: 100%;
      padding:
        max(32px, env(safe-area-inset-top))
        max(16px, env(safe-area-inset-right))
        max(28px, env(safe-area-inset-bottom))
        max(16px, env(safe-area-inset-left));
      gap: 24px;
    }

    .mbti-app.is-preparation .mbti-shell {
      gap: 0;
    }

    .mbti-header {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .mbti-title {
      margin: 0;
      text-align: center;
      font-size: clamp(28px, 5.8vw, 42px);
      line-height: 1.1;
      letter-spacing: -0.03em;
      color: var(--mbti-color-text);
    }

    .mbti-subtitle {
      margin: 0;
      text-align: center;
      align-self: center;
      max-width: 42ch;
      font-size: clamp(14px, 2.4vw, 16px);
      line-height: 1.7;
      color: var(--mbti-color-text-muted);
    }

    .mbti-progress {
      display: flex;
      flex: 0 0 auto;
      width: 100%;
    }

    .mbti-progress-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      font-size: 14px;
      line-height: 1.5;
      width: 100%;
      color: var(--mbti-color-text-muted);
    }

    .mbti-progress-track {
      flex: 0 1 50%;
      width: 50%;
      max-width: 50%;
      min-width: 120px;
      height: 8px;
      overflow: hidden;
      border-radius: var(--mbti-radius-pill);
      background: rgba(255, 255, 255, 0.4);
    }

    .mbti-progress-fill {
      height: 100%;
      width: 0%;
      border-radius: inherit;
      background: linear-gradient(
        90deg,
        var(--mbti-color-primary-soft) 0%,
        var(--mbti-color-primary) 48%,
        var(--mbti-color-primary-strong) 100%
      );
      transition: width 220ms ease;
    }

    .mbti-stage {
      display: flex;
      flex-direction: column;
      gap: 22px;
      width: 100%;
    }

    .mbti-app.is-quiz .mbti-stage,
    .mbti-app.is-result .mbti-stage {
      flex: 1 1 auto;
      justify-content: center;
      padding-top: clamp(28px, 7vh, 68px);
    }

    .mbti-app.is-quiz .mbti-stage {
      max-width: 720px;
      margin: 0 auto;
    }

    .mbti-app.is-result .mbti-stage {
      max-width: none;
      margin: 0;
      padding-top: 0;
    }

    .mbti-app.is-preparation .mbti-stage {
      flex: 1 1 auto;
      min-height: 100vh;
      min-height: 100dvh;
      gap: 0;
    }

    .mbti-preparation {
      width: 100%;
      min-height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      background-color: white;
      background-image: var(--mbti-preparation-background, none);
      background-position: center center;
      background-repeat: no-repeat;
      background-size: cover;
    }

    .mbti-loading-spinner {
      width: 56px;
      height: 56px;
      border-radius: 999px;
      border: 4px solid rgba(255, 255, 255, 0.55);
      border-top-color: #57946a;
      border-right-color: #57946a;
      animation: mbti-loading-spin 0.9s linear infinite;
    }

    .mbti-preparation-button {
      position: absolute;
      left: 50%;
      bottom: var(--mbti-preparation-button-bottom, 36px);
      transform: translateX(-50%);
      min-height: 52px;
      padding: 0 28px;
      border: 0;
      border-radius: 999px;
      background: #57946a;
      color: white;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.01em;
      cursor: pointer;
      box-shadow: 0 14px 28px rgba(87, 148, 106, 0.28);
      animation: mbti-button-bob var(--mbti-preparation-button-bob-duration, 1200ms) ease-in-out infinite;
      transition: filter 180ms ease;
      white-space: nowrap;
    }

    .mbti-preparation-button:hover {
      filter: brightness(1.04);
    }

    .mbti-preparation-button:active {
      filter: brightness(0.98);
    }

    .mbti-question-card {
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    .mbti-question-card {
      opacity: 1;
      transform: translateY(0);
      gap: 34px;
      transition:
        opacity 220ms ease,
        transform 220ms ease;
      will-change: opacity, transform;
    }

    .mbti-question-card.is-exiting {
      opacity: 0;
      transform: translateY(12px);
      pointer-events: none;
    }

    .mbti-question-card.is-entering {
      animation: mbti-question-fade-in 220ms ease;
    }

    .mbti-question-tag,
    .mbti-result-type {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: fit-content;
      min-height: 36px;
      padding: 8px 12px;
      border-radius: var(--mbti-radius-pill);
      background: rgba(255, 255, 255, 0.45);
      color: var(--mbti-color-primary-strong);
      font-size: 12px;
      font-weight: 700;
      box-shadow: 0 8px 22px rgba(255, 255, 255, 0.18);
    }

    .mbti-question-title,
    .mbti-result-title {
      margin: 0;
      text-align: center;
      font-size: clamp(22px, 4.8vw, 32px);
      line-height: 1.45;
      color: var(--mbti-color-question-text);
    }

    .mbti-result-subtitle,
    .mbti-question-description,
    .mbti-result-description {
      margin: 0;
      text-align: center;
      align-self: center;
      max-width: 44ch;
      font-size: 15px;
      line-height: 1.75;
      color: var(--mbti-color-text-muted);
    }

    .mbti-result-page {
      width: 100%;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
    }

    .mbti-result-card {
      position: relative;
      width: min(100%, 380px);
      height: 620px;
      overflow: hidden;
      border: 4px solid rgba(255, 255, 255, 0.9);
      border-radius: 32px;
      background: rgba(255, 255, 255, 0.3);
      box-shadow: 0 24px 60px rgba(92, 133, 105, 0.18);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      isolation: isolate;
    }

    .mbti-result-card-bg {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(180deg, rgba(240, 250, 242, 0.56) 0%, rgba(233, 247, 237, 0.72) 100%),
        var(--mbti-result-card-background, none);
      background-position: center center;
      background-repeat: no-repeat;
      background-size: cover;
      filter: brightness(0.95);
      transform: scale(1.02);
    }

    .mbti-result-card-overlay {
      position: relative;
      z-index: 1;
      height: 100%;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
    }

    .mbti-result-header {
      margin: 0;
      text-align: center;
      font-size: 13px;
      line-height: 1.6;
      letter-spacing: 0.08em;
      color: #4b7b57;
    }

    .mbti-result-title {
      color: #25543a;
      font-size: clamp(30px, 7vw, 36px);
      line-height: 1.24;
      font-weight: 600;
    }

    .mbti-result-subtitle {
      max-width: 24ch;
      font-size: 15px;
      line-height: 1.8;
      color: #567464;
    }

    .mbti-result-tags {
      width: 100%;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
    }

    .mbti-result-tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 34px;
      padding: 7px 14px;
      border-radius: 999px;
      background: linear-gradient(90deg, #5ba071 0%, #7fc294 100%);
      color: white;
      font-size: 13px;
      line-height: 1.4;
      font-weight: 700;
    }

    .mbti-result-description-card {
      width: 100%;
      padding: 16px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.72);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      box-shadow: 0 16px 36px rgba(98, 138, 110, 0.12);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .mbti-result-description {
      max-width: none;
      text-align: left;
      align-self: stretch;
      color: #476256;
      font-size: 15px;
      line-height: 1.85;
    }

    .mbti-result-meta {
      margin: 0;
      font-size: 12px;
      line-height: 1.6;
      color: #6c8677;
    }

    .mbti-result-footer {
      width: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
    }

    .mbti-result-footer-hint {
      margin: 0;
      flex: 1 1 auto;
      font-size: 12px;
      line-height: 1.7;
      color: #728a7e;
    }

    .mbti-result-qr-placeholder {
      display: none;
      flex: 0 0 auto;
      width: 64px;
      height: 64px;
      border-radius: 12px;
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(233, 245, 236, 0.92));
      box-shadow: inset 0 0 0 1px rgba(202, 226, 211, 0.9);
      position: relative;
    }

    .mbti-result-qr-placeholder::before,
    .mbti-result-qr-placeholder::after {
      content: "";
      position: absolute;
      background: rgba(88, 127, 100, 0.75);
      border-radius: 4px;
    }

    .mbti-result-qr-placeholder::before {
      inset: 14px 14px auto auto;
      width: 16px;
      height: 16px;
      box-shadow:
        -22px 0 0 rgba(88, 127, 100, 0.75),
        0 22px 0 rgba(88, 127, 100, 0.75),
        -22px 22px 0 rgba(88, 127, 100, 0.75);
    }

    .mbti-result-qr-placeholder::after {
      left: 20px;
      top: 20px;
      width: 24px;
      height: 24px;
      opacity: 0.24;
    }

    .mbti-result-page-actions {
      width: min(100%, 380px);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .mbti-options {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .mbti-option {
      width: 100%;
      min-height: 72px;
      padding: 16px 18px;
      border-radius: var(--mbti-radius-sm);
      border: var(--mbti-glass-border);
      background: var(--mbti-glass-panel);
      color: var(--mbti-color-text);
      box-shadow: var(--mbti-shadow-md);
      backdrop-filter: var(--mbti-glass-blur);
      -webkit-backdrop-filter: var(--mbti-glass-blur);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      cursor: pointer;
      transition:
        transform 200ms ease,
        box-shadow 200ms ease,
        border-color 200ms ease,
        background-color 200ms ease;
    }

    .mbti-option:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.65);
      background: rgba(255, 255, 255, 0.9);
      box-shadow: var(--mbti-shadow-lg);
    }

    .mbti-option:active {
      transform: translateY(0);
    }

    .mbti-option-copy {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
      min-width: 0;
      text-align: left;
    }

    .mbti-option-label {
      font-size: 16px;
      line-height: 1.7;
      font-weight: 700;
      color: var(--mbti-color-text);
    }

    .mbti-option-note {
      font-size: 14px;
      line-height: 1.6;
      color: var(--mbti-color-text-muted);
    }

    .mbti-option-badge {
      flex: 0 0 auto;
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: #dcfce7;
      color: #16a34a;
      font-size: 14px;
      font-weight: 700;
    }

    .mbti-result-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .mbti-result-panel {
      padding: 18px;
      border-radius: var(--mbti-radius-md);
      background: var(--mbti-glass-panel);
      border: var(--mbti-glass-border);
      backdrop-filter: var(--mbti-glass-blur);
      -webkit-backdrop-filter: var(--mbti-glass-blur);
      box-shadow: var(--mbti-shadow-md);
    }

    .mbti-result-panel-title {
      margin: 0 0 12px;
      font-size: 14px;
      line-height: 1.5;
      color: var(--mbti-color-text-muted);
      font-weight: 700;
    }

    .mbti-traits {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      color: var(--mbti-color-text);
      font-size: 15px;
      line-height: 1.6;
    }

    .mbti-axis-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .mbti-axis-pill {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      padding: 10px 14px;
      border-radius: var(--mbti-radius-pill);
      background: rgba(220, 252, 231, 0.9);
      border: 1px solid rgba(134, 239, 172, 0.95);
      color: var(--mbti-color-primary-strong);
      font-size: 14px;
      font-weight: 700;
    }

    .mbti-result-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .mbti-result-caption {
      margin: 0;
      font-size: 14px;
      line-height: 1.6;
      color: var(--mbti-color-text-muted);
    }

    .mbti-button {
      min-height: 48px;
      padding: 12px 18px;
      border: 0;
      border-radius: var(--mbti-radius-pill);
      background: rgba(255, 255, 255, 0.82);
      color: var(--mbti-color-primary-strong);
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.01em;
      cursor: pointer;
      box-shadow: var(--mbti-shadow-md);
      backdrop-filter: var(--mbti-glass-blur);
      -webkit-backdrop-filter: var(--mbti-glass-blur);
      transition: transform 200ms ease, box-shadow 200ms ease, background-color 200ms ease, opacity 200ms ease;
    }

    .mbti-button:hover {
      transform: translateY(-2px);
      background: rgba(255, 255, 255, 0.95);
      box-shadow: var(--mbti-shadow-lg);
    }

    .mbti-button:active {
      transform: translateY(0);
    }

    .mbti-button:disabled {
      cursor: wait;
      opacity: 0.78;
    }

    .mbti-button-primary {
      background: #57946a;
      color: white;
      box-shadow: 0 16px 32px rgba(87, 148, 106, 0.22);
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }

    .mbti-button-primary:hover {
      background: #5f9f73;
    }

    @media (max-width: 768px) {
      .mbti-result-page-actions {
        width: min(100%, 380px);
      }
    }

    @media (max-width: 480px) {
      .mbti-shell {
        width: 100%;
      }

      .mbti-app.is-quiz .mbti-shell,
      .mbti-app.is-result .mbti-shell {
        gap: 20px;
        padding-top: max(24px, env(safe-area-inset-top));
      }

      .mbti-app.is-quiz .mbti-stage,
      .mbti-app.is-result .mbti-stage {
        padding-top: clamp(20px, 5vh, 40px);
      }

      .mbti-app.is-result .mbti-stage {
        padding-top: 0;
      }

      .mbti-progress-row {
        gap: 12px;
      }

      .mbti-progress-track {
        min-width: 92px;
      }

      .mbti-question-card {
        gap: 28px;
      }

      .mbti-result-card {
        width: min(100%, 380px);
        height: 580px;
      }

      .mbti-result-card-overlay {
        height: 100%;
        padding: 20px;
      }

      .mbti-result-footer {
        align-items: center;
      }

      .mbti-option {
        align-items: flex-start;
      }

      .mbti-button {
        width: 100%;
      }

      .mbti-preparation-button {
        width: auto;
        max-width: none;
        left: max(16px, env(safe-area-inset-left));
        right: max(16px, env(safe-area-inset-right));
        bottom: var(--mbti-preparation-button-bottom, 28px);
        transform: none;
      }
    }

    @keyframes mbti-loading-spin {
      from {
        transform: rotate(0deg);
      }

      to {
        transform: rotate(360deg);
      }
    }

    @keyframes mbti-button-bob {
      0%, 100% {
        bottom: var(--mbti-preparation-button-bottom, 36px);
      }

      50% {
        bottom: calc(var(--mbti-preparation-button-bottom, 36px) + var(--mbti-preparation-button-bob-distance, 14px));
      }
    }

    @keyframes mbti-question-fade-in {
      from {
        opacity: 0;
        transform: translateY(12px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

  `;

  doc.head.appendChild(style);
}
