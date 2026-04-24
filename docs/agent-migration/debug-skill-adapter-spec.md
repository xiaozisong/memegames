# debug-skill Adapter Spec for games-lib

## Target

Reuse `D:\OpenGame\agent-test\debug-skill` in `games-lib` with minimal code churn.

## Current mismatch summary

- Uses `npm run build/test/dev`
- Assumes Phaser-oriented project structure
- Expects files not present in `games-lib`
- Some seed fixes are instruction-only and cannot be auto-applied

## Adapter changes

## 1) Runner Adapter

Add project command resolver:

- Build:
  - `pnpm --filter <gameName> build`
- Dev:
  - `pnpm --filter <gameName> dev`
- Test (optional):
  - if script exists: `pnpm --filter <gameName> test`
  - else: skip with warning, not failure

Inputs required for debug run:

- `projectPath` (absolute)
- `workspaceRoot` (absolute)
- `packageName` (from target `package.json`)

## 2) Validator Adapter

Replace Phaser checks with rules below:

- `index.html` exists and includes Pixi CDN
- `vite.config.ts` externalizes `pixi.js`
- `src/main.ts` exists and mounts selected renderer/kernel
- `src/config.json` exists and includes:
  - `presentation.ui.*`
  - `gameplay.mechanics.active`
- renderer route resolves:
  - plugin id in config can be mounted
- web preview consistency:
  - if published, `web/play/<slug>/index.html` exists
  - `web/src/data/games.ts` contains same slug

## 3) Diagnosis Signature Pack

Create `games-lib-signatures.json` and prioritize:

- missing renderer id
- config path typo
- color parsing issues in renderer
- play output folder mismatch
- slug mismatch between `games.ts` and play folder
- missing `pixi.js` externalization

## 4) Repairer Constraints

Allow only:

- `edit/config/create/delete` in target game or `web/src/data/games.ts`
- no shell auto-fix that mutates global system state

## 5) Safety Mode

Add mode flag:

- `--readonly` (diagnose only)
- `--apply` (repair + verify)

Default to `--readonly` for first integration.

## 6) Acceptance Criteria

- Runs on `games/block-blast` without Phaser file assumptions
- Produces useful diagnosis for a seeded config error
- Applies at least 3 known fix signatures automatically
- Completes one full `build -> diagnose -> repair -> build` loop successfully
