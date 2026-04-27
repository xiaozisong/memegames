export const uiTheme = {
  background: "#f3f4f6",
  surface: "#ffffff",
  border: "#e5e7eb",
  text: "#374151",
  mutedText: "#6b7280",
  primary: "#22c55e",
  shadowStrong: "rgba(17, 24, 39, 0.12)",
  shadowSoft: "rgba(17, 24, 39, 0.08)",
  overlay: "rgba(17, 24, 39, 0.14)",
};

export function ensureUiLayerStyles(doc = document) {
  if (doc.getElementById("cut-rope-ui-styles")) return;

  const style = doc.createElement("style");
  style.id = "cut-rope-ui-styles";
  style.textContent = `
    #ui-layer {
      position: absolute;
      inset: 0;
      z-index: 3;
      pointer-events: none;
      font-family: Arial, sans-serif;
      color: ${uiTheme.text};
    }

    .cut-rope-ui-card {
      background: ${uiTheme.surface};
      border: 1px solid ${uiTheme.border};
      border-radius: 24px;
      box-shadow:
        0 8px 28px ${uiTheme.shadowStrong},
        0 2px 12px ${uiTheme.shadowSoft};
    }

    .cut-rope-ui-title {
      margin: 0;
      color: ${uiTheme.text};
      font-size: 28px;
      font-weight: 700;
      line-height: 1.2;
      text-align: center;
    }

    .cut-rope-ui-button {
      border: 0;
      border-radius: 999px;
      background: ${uiTheme.primary};
      color: #ffffff;
      min-height: 48px;
      padding: 0 16px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 24px ${uiTheme.shadowStrong};
      transition: transform 160ms ease, opacity 160ms ease, box-shadow 160ms ease;
      pointer-events: auto;
    }

    .cut-rope-ui-button:hover {
      opacity: 0.96;
    }

    .cut-rope-ui-button.is-pressed,
    .cut-rope-ui-button:active {
      transform: scale(0.95);
      opacity: 0.92;
    }

    .cut-rope-reward {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      box-sizing: border-box;
    }

    .cut-rope-reward-icon {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      font-size: 20px;
      font-weight: 700;
      flex: 0 0 auto;
    }

    .cut-rope-reward-label {
      font-size: 12px;
      font-weight: 700;
      color: ${uiTheme.mutedText};
      line-height: 1.2;
      margin-bottom: 4px;
    }

    .cut-rope-reward-value {
      font-size: 18px;
      font-weight: 700;
      color: ${uiTheme.text};
      line-height: 1.1;
    }

    .cut-rope-hud {
      position: absolute;
      top: 16px;
      left: 16px;
      right: 16px;
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      pointer-events: none;
    }

    .cut-rope-hud-group {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      min-width: 0;
    }

    .cut-rope-hud-group-right {
      align-items: flex-end;
    }

    .cut-rope-hud-pill {
      min-width: 0;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      pointer-events: none;
    }

    .cut-rope-hud-pill-text {
      font-size: 16px;
      font-weight: 700;
      color: ${uiTheme.text};
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cut-rope-hud-restart {
      min-width: 104px;
      pointer-events: auto;
    }

    .cut-rope-modal {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-sizing: border-box;
      pointer-events: none;
      visibility: hidden;
      opacity: 0;
      transition: opacity 240ms ease;
    }

    .cut-rope-modal.is-visible {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    .cut-rope-modal-backdrop {
      position: absolute;
      inset: 0;
      background: ${uiTheme.overlay};
    }

    .cut-rope-modal-card {
      position: relative;
      z-index: 1;
      width: min(420px, 100%);
      padding: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      box-sizing: border-box;
      opacity: 0;
      transform: scale(0.92);
      transition: opacity 240ms ease, transform 240ms ease;
    }

    .cut-rope-modal.is-visible .cut-rope-modal-card {
      opacity: 1;
      transform: scale(1);
    }

    .cut-rope-modal-icon {
      width: 56px;
      height: 56px;
      border-radius: 24px;
      display: grid;
      place-items: center;
      background: ${uiTheme.primary};
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      flex: 0 0 auto;
    }

    .cut-rope-modal-body {
      width: 100%;
      margin: 0;
      color: ${uiTheme.mutedText};
      font-size: 16px;
      line-height: 1.6;
      text-align: center;
      white-space: normal;
      word-break: break-word;
    }

    .cut-rope-modal .cut-rope-reward {
      width: min(220px, 100%);
    }

    .cut-rope-modal .cut-rope-ui-button {
      width: min(220px, 100%);
      pointer-events: none;
    }

    .cut-rope-modal.is-visible .cut-rope-ui-button {
      pointer-events: auto;
    }

    @media (max-width: 720px) {
      .cut-rope-hud {
        align-items: flex-start;
        flex-direction: row;
      }

      .cut-rope-hud-group-right {
        align-items: flex-start;
      }
    }
  `;
  doc.head.appendChild(style);
}
