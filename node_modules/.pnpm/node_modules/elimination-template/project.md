# Elimination Template (Kernel-based)

## What this template provides

- A **single Pixi shell** (HUD, board, tray, overlay).
- A **kernel API** so different mechanics can plug in.
- A working `blockblast` kernel as reference implementation.

## Core extension points

- `src/core/contracts.ts`: shared kernel snapshot/action interfaces
- `src/core/kernelFactory.ts`: mechanic switch by config
- `src/kernels/*`: mechanic-specific logic
- `src/renderers/pixiTemplateRenderer.ts`: shared renderer shell
- `src/config.json`: ruleset + mechanic configuration
- `src/config.json > presentation.uiTemplate`: reusable UI layout/components/effects schema
- `src/config.json > presentation.uiMechanicMapping`: mechanic-to-UI mapping and feedback contract
- `src/config.json > presentation.feedbackMessages`: configurable UX hint/toast copy
- `src/config.json > presentation.textTemplates`: configurable HUD/status text templates
- `src/renderers/uiModel.ts`: UI model helpers for status/feedback derivation

## Add a new mechanic kernel

1. Create `src/kernels/<yourKernel>.ts` implementing `GameKernel`.
2. Register it in `kernelFactory.ts`.
3. Set `gameplay.mechanics.active` in `config.json`.

## Recommended split for production games

- Kernel (mechanics)
- RuleSet (scoring, objectives, spawn)
- Skin (ui/fx/audio)
- Content (levels/assets)
