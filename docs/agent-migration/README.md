# OpenGame -> games-lib Migration Pack

This folder contains a practical migration pack to reuse ideas from `D:\OpenGame\agent-test` in `games-lib` without importing Phaser-specific code.

## What to migrate

- Process docs and protocols (`docs/`)
- Prompt workflow design (`prompts/`)
- Debug loop strategy (`debug-skill/`)
- Template evolution strategy (`template-skill/`)

## What NOT to migrate directly

- `templates/core` source code
- `templates/modules/*` source code

Those are Phaser-first and conflict with `games-lib`'s Pixi + Vite + pnpm workspace model.

## Recommended implementation order

1. Migrate docs and prompts first (low risk, immediate value)
2. Add debug adapter for `games-lib` (medium effort, high value)
3. Add template-skill adapter for Pixi kernel architecture (higher effort)

Read these files in order:

1. `migration-checklist.md`
2. `debug-skill-adapter-spec.md`
3. `../../prompts/games-lib-default.md`
