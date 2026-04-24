# Match / Pair Template Project

## Overview

This template is a reusable scaffold for elimination and pairing games.

## What This Template Solves

- Separate gameplay rules from UI/animation presentation.
- Switch gameplay and renderer plugins from `/src/config.json`.
- Keep colors, tuning values, assets, and objective data in a single config file.

## Included Mechanic Plugins

- `match3` (match + clear flow placeholder)
- `blockblast` (place + line clear flow placeholder)
- `merge2` (2048-style merge flow skeleton)

## Included Renderer Plugins

- `dom` (card-based UI, fastest for iteration)
- `pixi` (canvas renderer with interactive board and piece tray)
- `three` (pseudo-3D presentation preset for the same gameplay flow)

## Core Files

- Entry file: `/index.html`
- Runtime: `/src/main.ts`
- Central config: `/src/config.json`
- Gameplay plugin directory: `/src/mechanics/*.ts`
- Renderer plugin directory: `/src/renderers/*.ts`

## How To Extend

1. Add a new plugin object in `/src/mechanics/` implementing the same plugin interface.
2. Add its parameter section in `/src/config.json` under `gameplay.mechanics.params`.
3. Switch `gameplay.mechanics.active` to your new plugin id.

To change renderer, update `presentation.renderer.active` to `dom`, `pixi`, or `three`.
