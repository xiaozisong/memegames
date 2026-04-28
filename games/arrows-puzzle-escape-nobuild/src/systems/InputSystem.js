export class InputSystem {
  constructor(target, { onWormPointerDown }) {
    this.target = target;
    this.onWormPointerDown = onWormPointerDown;
    this.handlePointerDown = this.handlePointerDown.bind(this);
  }

  attach() {
    this.target?.addEventListener("pointerdown", this.handlePointerDown);
  }

  detach() {
    this.target?.removeEventListener("pointerdown", this.handlePointerDown);
  }

  handlePointerDown(event) {
    const wormGroup = event.target instanceof Element ? event.target.closest("g.worm-instance[data-start-x][data-start-y]") : null;
    if (!wormGroup) return;
    const x = Number(wormGroup.getAttribute("data-start-x"));
    const y = Number(wormGroup.getAttribute("data-start-y"));
    if (!Number.isInteger(x) || !Number.isInteger(y)) return;
    this.onWormPointerDown?.({
      id: wormGroup.getAttribute("data-worm-id") || null,
      x,
      y,
    }, event);
  }
}
