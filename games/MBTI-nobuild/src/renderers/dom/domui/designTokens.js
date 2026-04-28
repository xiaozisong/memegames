import { getSetting } from "../../../config.js";

export function createDesignTokens() {
  const primary = getSetting("theme.success", "#4ade80");
  const textBase = "#1f2937";
  const textMuted = "#4b5563";
  const questionText = getSetting("theme.questionText", "#2e4f38");

  return {
    colors: {
      primary,
      primaryStrong: "#16a34a",
      primarySoft: "rgba(220, 252, 231, 0.92)",
      text: textBase,
      textMuted,
      textSubtle: "#6b7280",
      questionText,
      whiteGlass: "rgba(255, 255, 255, 0.6)",
      whiteGlassStrong: "rgba(255, 255, 255, 0.82)",
      whiteGlassSoft: "rgba(255, 255, 255, 0.4)",
      borderLight: "rgba(255, 255, 255, 0.42)",
      shadow: "rgba(148, 163, 184, 0.24)",
      shadowSoft: "rgba(148, 163, 184, 0.16)",
      skyTop: "#e0f2fe",
      skyBottom: "#f8fafc",
    },
    radius: {
      sm: "16px",
      md: "20px",
      lg: "28px",
      pill: "999px",
    },
    shadow: {
      md: "0 10px 30px rgba(148, 163, 184, 0.18)",
      lg: "0 18px 45px rgba(148, 163, 184, 0.22)",
    },
    glass: {
      panel: "rgba(255, 255, 255, 0.6)",
      panelStrong: "rgba(255, 255, 255, 0.78)",
      blur: "blur(10px)",
      border: "1px solid rgba(255, 255, 255, 0.45)",
    },
  };
}
