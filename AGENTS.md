# AGENTS.md

## What this is

Vanilla JS + HTML + CSS Pac-Man clone on `<canvas>`. Learning project for **spec-driven development**.
All code lives in `src/`. There is **no `package.json`, no build step, no tests, no linter, no CI** — don't go looking for commands that don't exist.

## Run / verify

- Open `src/index.html` in a browser. Scripts are classic `<script>` tags (no ES modules), so `file://` works — no dev server required.
- Verification is manual: play the game, or walk the acceptance criteria of the relevant spec.

## Architecture — easy to get wrong

- **Script load order is a hard dependency**: `maze.js` → `game.js` → `render.js` → `main.js` (in `src/index.html`). Files talk through globals explicitly exported on `window` (`window.MAZE`, `window.createGame`, `window.update`, `window.draw`, `window.DIRS`, …). Converting to ES modules or reordering scripts breaks it.
- `maze.js` owns the **pristine** map (`MAZE`, never mutated) plus `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`. `createGame()` in `game.js` copies it into `game.grid`, which is the per-run grid where dots get eaten. `render.js` must draw from `game.grid`, never `MAZE`.
- Tile encoding: `#` = 1 wall · `.` = 2 dot · `-` = 3 pen door · space = 0 empty. Pac-Man is blocked by 1 and 3, ghosts only by 1 (`isWall(grid, x, y, actor)`).
- Maze is 28×31, `TILE = 20` in `render.js`. The canvas `width="560" height="620"` in `src/index.html` is hardcoded to those dimensions — change the maze size or `TILE` and you must update it too.
- Movement is grid-aligned: `PACMAN_SPEED = 1/8` cell/frame, `GHOST_SPEED = 1/10`. Turns and dot-eating only apply when `aligned()` (epsilon `1e-3`) says the actor is on a cell center. Changing speeds breaks that alignment.
- Ghost AI is `kind: 'hunter'` (greedy chase) vs `'random'`, decided in `decideGhost`. Two ghosts spawn; `GHOST_COLORS` lists four slots.

## Spec-driven workflow

- Skills are vendored in `.agents/skills/` (`spec`, `spec-impl`) and pinned by hash in `skills-lock.json` (upstream: `klerith/fernando-skills`). Treat them as read-only unless explicitly asked to update them.
- `/spec <feature>` writes `specs/NN-slug.md` (the `specs/` folder does not exist yet; numbering starts at `01-`) and seeds `specs/.spec-config.yml`. New specs start in `Draft` — **only the human flips the state to `Approved`**.
- `/spec-impl NN-slug` refuses any spec whose state doesn't mean "Approved" (in any language), then creates branch `spec-NN-slug` (auto unless `AutoCreateBranch: false`) and implements the plan one step at a time, pausing for diff review.
- **Never commit automatically** — committing happens only when the user explicitly asks.

## Conventions

- Comments, UI strings, and `README.md` are in **Spanish**; reply to the user in the language of their prompt (rule from the `spec` skill).
- Code style is enforced only by example: 2-space indent, spaces inside parens/brackets (`getElementById( 'game' )`, `if ( cond )`, `for ( const row of grid )`), Spanish `//` comments above functions. No formatter is configured — do not run Prettier/`eslint --fix`, it would rewrite the entire codebase.
