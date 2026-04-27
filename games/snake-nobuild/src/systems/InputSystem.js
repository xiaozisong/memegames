export class InputSystem {
  constructor() {
    this.canvas = null;
    this.pointerInside = false;
    this.mousePosition = null;
    this.joystickPointerId = null;
    this.joystickVector = { x: 0, y: -1, strength: 0 };
    this.boostPointerIds = new Set();
    this.keyboardBoost = false;
    this.boostButtonBounds = { x: 0, y: 0, radius: 0 };
    this.joystickBounds = { x: 0, y: 0, radius: 0 };

    this.onPointerDown = null;
    this.onPointerMove = null;
    this.onPointerUp = null;
    this.onPointerLeave = null;
    this.onKeyDown = null;
    this.onKeyUp = null;
  }

  attach(canvas) {
    this.detach();
    this.canvas = canvas;
    this.canvas.style.touchAction = "none";

    this.onPointerDown = (event) => {
      const point = this.toLocalPoint(event);
      if (!point) return;
      if (this.isInsideBoostButton(point.x, point.y)) {
        this.boostPointerIds.add(event.pointerId);
      } else if (this.isInsideJoystickArea(point.x, point.y) || event.pointerType !== "mouse") {
        this.joystickPointerId = event.pointerId;
        this.updateJoystick(point.x, point.y);
      } else {
        this.pointerInside = true;
        this.mousePosition = point;
      }
    };

    this.onPointerMove = (event) => {
      const point = this.toLocalPoint(event);
      if (!point) return;
      if (event.pointerId === this.joystickPointerId) {
        this.updateJoystick(point.x, point.y);
      } else if (event.pointerType === "mouse") {
        this.pointerInside = true;
        this.mousePosition = point;
      }
    };

    this.onPointerUp = (event) => {
      this.boostPointerIds.delete(event.pointerId);
      if (event.pointerId === this.joystickPointerId) {
        this.joystickPointerId = null;
        this.joystickVector = { x: 0, y: 0, strength: 0 };
      }
    };

    this.onPointerLeave = (event) => {
      if (event.pointerType === "mouse") {
        this.pointerInside = false;
      }
    };

    this.onKeyDown = (event) => {
      if (event.key === " " || event.key === "Shift") {
        this.keyboardBoost = true;
      }
    };

    this.onKeyUp = (event) => {
      if (event.key === " " || event.key === "Shift") {
        this.keyboardBoost = false;
      }
    };

    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.canvas.addEventListener("pointerleave", this.onPointerLeave);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  detach() {
    if (!this.canvas) return;
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("pointerleave", this.onPointerLeave);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas = null;
    this.mousePosition = null;
    this.pointerInside = false;
    this.joystickPointerId = null;
    this.joystickVector = { x: 0, y: 0, strength: 0 };
    this.boostPointerIds.clear();
    this.keyboardBoost = false;
  }

  setBoostButtonBounds(bounds) {
    this.boostButtonBounds = { ...bounds };
  }

  setJoystickBounds(bounds) {
    this.joystickBounds = { ...bounds };
  }

  getState(viewport, currentAngle) {
    const aimVector = this.resolveAimVector(viewport, currentAngle);

    return {
      aimVector,
      boosting: this.keyboardBoost || this.boostPointerIds.size > 0,
      joystick: {
        base: { x: this.joystickBounds.x, y: this.joystickBounds.y },
        knob: {
          x: this.joystickBounds.x + this.joystickVector.x * this.joystickBounds.radius * 0.52,
          y: this.joystickBounds.y + this.joystickVector.y * this.joystickBounds.radius * 0.52,
        },
        radius: this.joystickBounds.radius,
        active: this.joystickPointerId !== null,
      },
    };
  }

  isInsideBoostButton(x, y) {
    const dx = x - this.boostButtonBounds.x;
    const dy = y - this.boostButtonBounds.y;
    return Math.hypot(dx, dy) <= this.boostButtonBounds.radius;
  }

  isInsideJoystickArea(x, y) {
    const dx = x - this.joystickBounds.x;
    const dy = y - this.joystickBounds.y;
    return Math.hypot(dx, dy) <= this.joystickBounds.radius * 1.6;
  }

  updateJoystick(x, y) {
    const dx = x - this.joystickBounds.x;
    const dy = y - this.joystickBounds.y;
    const radius = Math.max(1, this.joystickBounds.radius * 0.82);
    const distance = Math.hypot(dx, dy);
    const clamped = Math.min(radius, distance);
    const factor = distance > 0 ? clamped / distance : 0;
    this.joystickVector = {
      x: dx * factor / radius,
      y: dy * factor / radius,
      strength: clamped / radius,
    };
  }

  resolveAimVector(viewport, currentAngle) {
    if (this.joystickPointerId !== null && this.joystickVector.strength > 0.05) {
      return this.joystickVector;
    }

    if (this.pointerInside && this.mousePosition) {
      const centerX = viewport.width * 0.5;
      const centerY = viewport.height * 0.5;
      const dx = this.mousePosition.x - centerX;
      const dy = this.mousePosition.y - centerY;
      const maxDistance = Math.max(80, Math.min(viewport.width, viewport.height) * 0.24);
      const distance = Math.hypot(dx, dy);
      if (distance > 1) {
        return {
          x: dx / distance,
          y: dy / distance,
          strength: Math.min(1, distance / maxDistance),
        };
      }
    }

    return {
      x: Math.cos(currentAngle),
      y: Math.sin(currentAngle),
      strength: 0,
    };
  }

  toLocalPoint(event) {
    if (!this.canvas) return null;
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }
}
