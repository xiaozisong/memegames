# File Structure Specification (Pixi.js 2D Games)

This document defines the virtual file system conventions for 2D H5 mini games.  
All game files should be placed directly under the project root without creating an extra wrapper project directory.

---

## Required Files

```
/index.html               # The game's only entry file (strict requirement, cannot be renamed)
/project.md               # The game's project description file
/src/config.json          # Central configuration for assets, colors, and tunable parameters
```

---

## Recommended Base Structure (Default)

```
/index.html
/src/config.json          # Required: all tunable config and asset/file links
/src/main.js              # Main game entry logic (JavaScript by default)
/src/scenes/GameScene.js  # Optional: split scene logic
/src/types.js             # Optional: type definitions
```

Notes:
1. Creating a `/src/` directory is allowed and recommended.
2. Do not create meaningless empty files unless the user explicitly requests them.
3. Prefer the separated structure of `/index.html` plus `/src/` instead of putting all scripts into a single file.
4. Use JavaScript files (`.js`) by default; only create TypeScript files (`.ts`) when the user explicitly requests them.
5. `/src/config.json` is required and must be the single editable source for user-replaceable configuration.
6. All color palettes, gameplay tuning values, adjustable parameters, image URLs, audio URLs, and any other referenced file URLs must be written into `/src/config.json` before being used by the game.
7. Game code must read these values from `/src/config.json` instead of hardcoding them directly in JavaScript.
8. Do not hardcode user-editable constants into `.js` files.

---

## `/src/config.json` Rules

The `/src/config.json` file is the central configuration file for the game.

Important rules:
1. Store all color definitions in `/src/config.json`.
2. Store all gameplay parameters and balancing values in `/src/config.json`.
3. Store all image asset links in `/src/config.json`.
4. Store all audio asset links in `/src/config.json`.
5. Store any referenced external file links in `/src/config.json`.
6. JavaScript code must load, read, and use these values from `/src/config.json`.
7. Do not duplicate the same values as hardcoded constants inside JavaScript files.
8. This structure exists so users can quickly replace assets, color schemes, and parameters without needing AI assistance.

---

## `/user_upload` Directory Rules

The `/user_upload` directory is a special virtual directory used for user-uploaded materials.

Important rules:
1. Files under `/user_upload` do not contain the real uploaded assets. They only store the corresponding asset links.
2. When the AI needs to use a user-uploaded image, audio file, or other material, it must read the file under `/user_upload`, extract the link, and use that link to import or reference the asset.
3. Do not treat `/user_upload/...` as a real local asset path.
4. Do not reference files in `/user_upload` through relative paths in game code, HTML, CSS, or runtime asset loading.
5. The path under `/user_upload` is only a bridge for the AI to recover the real asset URL.

---

## Path and Naming Rules

1. Paths should start with `/` to indicate the project root (for example, `/index.html`).
2. Prefer lowercase English names, kebab-case, or camelCase for files and directories; avoid spaces and Chinese punctuation.
3. Source files should use the `.js` extension by default; only use `.ts` when the user explicitly requests it.
4. Do not create sample files or test junk files unrelated to the current task.
5. Referenced asset URLs and tunable values should be centralized in `/src/config.json`, not scattered across source files.
