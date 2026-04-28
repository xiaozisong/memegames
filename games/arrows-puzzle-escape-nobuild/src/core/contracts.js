export function createOverlay(title, body, buttonText) {
  return {
    visible: true,
    title,
    body,
    buttonText,
  };
}

export function createPoint(row, col) {
  return { row, col };
}
