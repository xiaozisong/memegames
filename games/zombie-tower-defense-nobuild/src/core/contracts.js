export function createOverlay(title, body, buttonText, options = {}) {
  return {
    visible: true,
    title,
    body,
    buttonText,
    titleFontSize: options.titleFontSize,
    bodyFontSize: options.bodyFontSize,
    buttonFontSize: options.buttonFontSize,
  };
}
