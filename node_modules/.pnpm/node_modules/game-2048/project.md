# 2048 Game Project

## Overview

This is a Pixi-based 2048 mini game template for the monorepo game platform.

## Core Gameplay

- Swipe on mobile or use arrow keys / WASD on desktop to move tiles.
- Merge tiles with the same value to increase score.
- Reach 2048 to unlock the win message and continue challenging higher scores.

## Technical Notes

- Entry file: `/index.html`
- Runtime boot: `/src/main.ts`
- Runtime orchestration: `/src/GameRuntime.ts`
- Core contracts + kernel factory: `/src/core/`
- 2048 rules kernel: `/src/kernels/game2048Kernel.ts`
- Pixi renderer + input mapping: `/src/renderers/game2048/`
- Best score is persisted with `localStorage`.
