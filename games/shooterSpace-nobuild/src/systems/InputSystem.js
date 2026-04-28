export class InputSystem {
  constructor(target, state) {
    this.target = target;
    this.state = state;
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundPointerDown = this.onPointerDown.bind(this);
    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerUp = this.onPointerUp.bind(this);

    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    target.addEventListener("pointerdown", this.boundPointerDown);
    target.addEventListener("pointermove", this.boundPointerMove);
    window.addEventListener("pointerup", this.boundPointerUp);
    window.addEventListener("pointercancel", this.boundPointerUp);
  }

  onKeyDown(event) {
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      this.state.input.moveLeft = true;
    }

    if (event.code === "ArrowRight" || event.code === "KeyD") {
      this.state.input.moveRight = true;
    }

    if (
      this.state.gameOver &&
      (event.code === "Enter" || event.code === "Space" || event.code === "KeyR")
    ) {
      event.preventDefault();
      this.state.requestRestart();
    }
  }

  onKeyUp(event) {
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      this.state.input.moveLeft = false;
    }

    if (event.code === "ArrowRight" || event.code === "KeyD") {
      this.state.input.moveRight = false;
    }
  }

  onPointerDown(event) {
    this.target.setPointerCapture?.(event.pointerId);
    this.updatePointer(event);

    if (this.state.gameOver) {
      this.state.requestRestart();
    }
  }

  onPointerMove(event) {
    this.updatePointer(event);
  }

  onPointerUp() {
    this.state.input.pointerActive = false;
  }

  updatePointer(event) {
    const rect = this.target.getBoundingClientRect();
    this.state.input.pointerActive = true;
    this.state.input.pointerX = event.clientX - rect.left;
  }

  destroy() {
    window.removeEventListener("keydown", this.boundKeyDown);
    window.removeEventListener("keyup", this.boundKeyUp);
    this.target.removeEventListener("pointerdown", this.boundPointerDown);
    this.target.removeEventListener("pointermove", this.boundPointerMove);
    window.removeEventListener("pointerup", this.boundPointerUp);
    window.removeEventListener("pointercancel", this.boundPointerUp);
  }

  dispose() {
    this.destroy();
  }
}
