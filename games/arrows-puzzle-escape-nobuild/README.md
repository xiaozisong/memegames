# Arrows - Puzzle Escape

SVG + DOM no-build H5 puzzle game built on the same `core + kernels + renderers + systems + config` split used by the existing templates.

## Structure

```text
games/arrows-puzzle-escape-nobuild/
├─ index.html
├─ README.md
└─ src/
   ├─ main.js
   ├─ config.js
   ├─ config.json
   ├─ core/
   │  ├─ contracts.js
   │  └─ kernelFactory.js
   ├─ kernels/
   │  ├─ arrowsPuzzleKernel.js
   │  └─ placeholderKernel.js
   ├─ systems/
   │  ├─ ArrowSystem.js
   │  └─ GridSystem.js
   │  ├─ MovementSystem.js
   │  ├─ InputSystem.js
   │  └─ GameStateSystem.js
   ├─ utils/
   │  ├─ directions.js
   │  ├─ geometry.js
   │  └─ animation.js
   └─ renderers/
      ├─ SvgGameRenderer.js
      ├─ SvgGridRenderer.js
      ├─ SvgCellRenderer.js
      ├─ SvgPathRenderer.js
      └─ SvgUIRenderer.js
```

## Level 1

- Grid size: `6 x 8`
- Arrows: `6`
- Goal: `1`
- Walls: `3`
- Unique solution start: `(x 0, y 5)` in zero-based coordinates
- Correct path: `(0,5) -> (1,4) -> (2,3) -> (3,2) -> (4,1) -> (5,0)`

Other arrows either:

- hit a wall
- run out of bounds
- or fail diagonal corner blocking

## Notes

- Kernel owns state, resolution, and run planning.
- Renderer owns SVG creation, DOM `ui-layer`, animation, shake, and overlay UI.
- Levels are fully data-driven from `src/config.json`.
- The board supports 8-direction arrows and diagonal corner blocking.
