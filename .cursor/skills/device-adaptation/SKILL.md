---
name: device-adaptation
description: Improve multi-device game UI and interaction compatibility for mobile, tablet, and desktop. Use when users mention responsive layout, viewport issues, safe area, orientation, overflow, or device adaptation.
---

# Device Adaptation

## Scope

Use this skill for web game device adaptation tasks:
- mobile/tablet/desktop responsive layout
- safe area and notch handling
- orientation and aspect ratio constraints
- touch target size and input behavior consistency

## Workflow

1. Identify target surface:
   - full-screen game page
   - iframe embedded game
   - card/list/detail web pages
2. Inspect current breakpoints and viewport usage.
3. Fix layout with CSS-first changes:
   - fluid sizing (`min()`, `max()`, `clamp()`, `%`, `vw`, `vh`)
   - stable container ratio for game canvas/board
   - overflow prevention and text wrapping
4. Add safe-area support when relevant:
   - `padding-top: env(safe-area-inset-top)`
   - `padding-bottom: env(safe-area-inset-bottom)`
5. Normalize interaction:
   - primary actions >= 44px target size
   - touch and mouse behavior both work
6. Verify on representative widths:
   - 360x800 (phone)
   - 768x1024 (tablet)
   - 1366x768 (desktop)

## Default Implementation Rules

- Prefer adapting existing structure over rewriting UI.
- Keep core game area centered and bounded by aspect ratio.
- Avoid hardcoded pixel widths for major containers.
- Preserve existing visual style while fixing layout behavior.
- For game projects, keep HUD and controls visible without overlap at all sizes.

## Quick Checklist

- [ ] No horizontal scroll on phone width
- [ ] Core game board/canvas remains fully visible
- [ ] Primary controls are tap-friendly
- [ ] Text does not overlap or clip
- [ ] Safe-area devices show no cut-off UI
- [ ] Landscape and portrait both usable (or explicitly constrained)

## Output Style

When this skill is applied:
1. Briefly summarize device issues found.
2. Implement concrete code changes.
3. Report verification at phone/tablet/desktop widths.
