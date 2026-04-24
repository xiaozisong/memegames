# Block Blast H5 (Template-based)

## Overview

This project is a playable Block Blast H5 game produced from the elimination template architecture.

## Architecture

- Kernel-only gameplay logic in `src/kernels/blockBlastKernel.ts`
- Pure logic line-clear system in `src/systems/LineClearSystem.ts`
- Shared contracts in `src/core/contracts.ts`
- UI shell renderer in `src/renderers/pixiTemplateRenderer.ts`
- Data-driven tuning and skin in `src/config.json`

## Core Files

- Entry file: `/index.html`
- Runtime entry: `/src/main.ts`
- Kernel factory: `/src/core/kernelFactory.ts`
- Block Blast kernel: `/src/kernels/blockBlastKernel.ts`
- Renderer shell: `/src/renderers/pixiTemplateRenderer.ts`
- Config source: `/src/config.json`

## How To Extend

1. Add a new kernel file in `src/kernels/` implementing `GameKernel`.
2. Register the kernel in `src/core/kernelFactory.ts`.
3. Add/adjust mechanic params in `src/config.json`.
4. Keep renderer independent by consuming snapshot only.
