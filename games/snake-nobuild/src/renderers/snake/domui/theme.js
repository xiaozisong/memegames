export const uiTheme = {
  text: "#eafbff",
  mutedText: "#97c7da",
  panel: "rgba(7, 28, 46, 0.82)",
  border: "#1d547a",
  playerHighlight: "#22c55e",
  shadowStrong: "rgba(2, 12, 20, 0.34)",
};

export function ensureUiLayerStyles(doc = document) {
  if (doc.getElementById("snake-ui-styles")) return;

  const style = doc.createElement("style");
  style.id = "snake-ui-styles";
  style.textContent = `
    #ui-layer {
      position: absolute;
      inset: 0;
      z-index: 3;
      pointer-events: none;
      font-family: Arial, sans-serif;
      color: ${uiTheme.text};
    }

    .snake-hud {
      position: absolute;
      top: 16px;
      left: 8px;
      right: 8px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      pointer-events: none;
    }

    .snake-hud-column {
      min-width: 0;
      display: flex;
      flex-direction: row;
      gap: 12px;
    }

    .snake-hud-column.is-right {
      align-items: stretch;
      width: min(196px, 26vw);
    }

    .snake-card {
      background: ${uiTheme.panel};
      border: 1px solid ${uiTheme.border};
      border-radius: 18px;
      box-shadow: 0 12px 28px ${uiTheme.shadowStrong};
      box-sizing: border-box;
      backdrop-filter: blur(10px);
    }

    .snake-score-card {
      min-width: 132px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .snake-score-metric {
      min-width: 104px;
    }

    .snake-score-metric.is-inline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .snake-score-label {
      font-size: 12px;
      font-weight: 700;
      color: ${uiTheme.mutedText};
      margin-bottom: 4px;
    }

    .snake-score-metric.is-inline .snake-score-label {
      margin-bottom: 0;
    }

    .snake-score-value {
      font-size: 22px;
      font-weight: 700;
      color: ${uiTheme.text};
      line-height: 1.1;
    }

    .snake-board-card {
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .snake-board-title {
      margin: 0;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(134, 179, 227, 0.25);
      text-align: center;
      font-size: 17px;
      line-height: 1.1;
      font-weight: 700;
      color: #86b3e3;
    }

    .snake-board-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .snake-board-row {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 6px;
      font-size: 13px;
      line-height: 1.3;
      color: ${uiTheme.text};
    }

    .snake-board-row.is-player {
      color: ${uiTheme.playerHighlight};
      font-weight: 700;
    }

    .snake-board-rank {
      width: 24px;
      flex: 0 0 24px;
      color: ${uiTheme.mutedText};
    }

    .snake-board-row.is-player .snake-board-rank {
      color: ${uiTheme.playerHighlight};
    }

    .snake-board-name {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .snake-board-score {
      flex: 0 0 auto;
      margin-left: auto;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .snake-endscreen {
      position: absolute;
      inset: 0;
      z-index: 5;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(2, 9, 16, 0.36);
      backdrop-filter: blur(16px) saturate(1.04);
      pointer-events: none;
    }

    .snake-endscreen-panel {
      width: min(420px, calc(100vw - 32px));
      padding: 20px 20px 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      pointer-events: auto;
      background: transparent;
      border: 0;
      box-shadow: none;
      backdrop-filter: none;
    }

    .snake-endscreen-kicker {
      font-size: 36px;
      line-height: 1.04;
      font-weight: 800;
      color: #ff9f43;
      text-shadow:
        -2px -2px 0 rgba(255, 255, 255, 0.98),
        2px -2px 0 rgba(255, 255, 255, 0.98),
        -2px 2px 0 rgba(255, 255, 255, 0.98),
        2px 2px 0 rgba(255, 255, 255, 0.98),
        0 6px 18px rgba(255, 159, 67, 0.28);
      text-align: center;
    }

    .snake-endscreen-board-title {
      font-size: 22px;
      line-height: 1.1;
      font-weight: 800;
      color: ${uiTheme.text};
      text-align: center;
      margin-top: 2px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.16);
    }

    .snake-endscreen-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px 16px;
      border-radius: 16px;
      background: rgba(8, 24, 38, 0.46);
      border: 1px solid rgba(134, 179, 227, 0.18);
      box-shadow: 0 12px 28px rgba(2, 12, 20, 0.22);
      backdrop-filter: blur(16px);
    }

    .snake-endscreen-board-rows {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .snake-endscreen-list .snake-board-row {
      font-size: 17px;
      line-height: 1.35;
    }

    .snake-endscreen-list .snake-board-rank {
      width: 28px;
      flex-basis: 28px;
    }

    .snake-endscreen-list .snake-board-score {
      font-weight: 800;
    }

    .snake-endscreen-best {
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      gap: 8px;
      margin: 18px 0;
    }

    .snake-endscreen-best-label {
      font-size: 14px;
      font-weight: 700;
      color: ${uiTheme.mutedText};
    }

    .snake-endscreen-best-value {
      font-size: 24px;
      line-height: 1;
      font-weight: 800;
      color: ${uiTheme.text};
    }

    .snake-endscreen-button {
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 999px;
      width: 50%;
      min-width: 140px;
      align-self: center;
      padding: 15px 18px;
      font-size: 15px;
      font-weight: 800;
      color: #08131d;
      background: rgba(255, 255, 255, 0.98);
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.9),
        0 0 18px rgba(255, 255, 255, 0.34),
        0 0 32px rgba(134, 179, 227, 0.2),
        0 12px 24px rgba(8, 41, 62, 0.18);
      cursor: pointer;
      transition: transform 120ms ease, box-shadow 120ms ease, filter 120ms ease;
    }

    .snake-endscreen-button:hover {
      filter: brightness(1.05);
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.96),
        0 0 22px rgba(255, 255, 255, 0.42),
        0 0 40px rgba(134, 179, 227, 0.24),
        0 14px 28px rgba(8, 41, 62, 0.2);
    }

    .snake-endscreen-button:active {
      transform: translateY(1px) scale(0.985);
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.82),
        0 0 12px rgba(255, 255, 255, 0.24),
        0 0 22px rgba(134, 179, 227, 0.16),
        0 6px 14px rgba(8, 41, 62, 0.28);
      filter: brightness(0.96);
    }

    @media (max-width: 720px) {
      .snake-hud {
        flex-direction: row;
      }

      .snake-hud-column.is-right {
        width: min(160px, calc(100vw - 32px));
      }

      .snake-score-card {
        min-width: 132px;
      }

      .snake-endscreen-panel {
        padding: 18px 16px 16px;
      }
    }
  `;
  doc.head.appendChild(style);
}
