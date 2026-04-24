# Migration Checklist (Actionable)

## Goal

Bring OpenGame agent workflows into `games-lib` while keeping current architecture:

- `games/*` independent Vite projects
- Pixi renderer
- kernel-style gameplay (`elimination-template`)
- pnpm workspace

## A. Directly Reusable (Do First)

- [ ] Port `agent-test/docs/asset_protocol.md` into a Pixi version:
  - Keep asset naming/consistency checks
  - Remove Phaser-specific `asset-pack.json`/scene-loader assumptions
- [ ] Port `agent-test/docs/debug_protocol.md` into a Pixi version:
  - Keep pre-build checklists
  - Replace Phaser scene checks with kernel/render/config checks
- [ ] Port prompt workflow skeleton from `agent-test/prompts/default.md`:
  - Keep stage pipeline: classify -> scaffold -> design -> assets -> config -> code -> verify
  - Replace OpenGame tools and file conventions with `games-lib` ones

## B. Needs Adapter (Do Second)

- [ ] Adapt `debug-skill` runner:
  - Replace `npm run ...` with `pnpm --filter <game> ...`
  - Support missing `test` script gracefully
- [ ] Adapt `debug-skill` validator rules:
  - Remove Phaser file assumptions (`gameConfig.json`, `LevelManager.ts`, `asset-pack.json`)
  - Add `games-lib` checks:
    - `src/config.json` keys
    - renderer plugin selection and buildability
    - `index.html` pixi CDN/external consistency
    - web preview path consistency (`web/play/<slug>`)
- [ ] Add rules profile by game family:
  - `elimination-template`
  - `three-game-template`
  - future families

## C. Higher Effort (Do Third)

- [ ] Adapt `template-skill` meta-template:
  - Replace Phaser M0 with Pixi + kernel M0 (`games/elimination-template`)
- [ ] Update classifier labels:
  - from physics buckets (platformer/top_down) to `games-lib` mechanic kernels
  - suggested labels: `blockblast`, `match3`, `pairlink`, `merge2`, `hybrid`
- [ ] Update extractor/abstractor rules:
  - focus on kernel contracts + renderer contracts + config schemas
  - avoid scene inheritance assumptions

## D. Validation Gates

- [ ] New prompt can generate one playable game in `games/<slug>`
- [ ] Build command succeeds:
  - `pnpm --filter <slug> build`
- [ ] Web preview output is generated:
  - `web/play/<slug>/index.html`
- [ ] Game card entry added and preview works:
  - `web/src/data/games.ts`

## E. Suggested First Pilot

- Use `elimination-template` as pilot target.
- Add second kernel (`match3`) as migration acceptance test.
- Verify prompt can switch between `blockblast` and `match3` without renderer rewrite.
