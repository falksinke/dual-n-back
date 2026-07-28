## Dual N Back

React + Vite implementation of a Brain Workshop–aligned n-back trainer with Dual, Triple, and Quad modes.

### Commands

- `pnpm install` — install dependencies
- `pnpm dev` — start dev server on port 3000
- `pnpm test` — run unit/characterization tests
- `pnpm build` — production build

### Modes

| Mode | Modalities |
|------|------------|
| **Dual** | Position + audio |
| **Triple** | Position + color + audio |
| **Quad** | Position + color + image + audio |

### Controls

- **Space** — start / cancel session
- **Esc** — cancel session while playing
- **A** — position match
- **F** — color match (Triple / Quad)
- **J** — image match (Quad only)
- **L** — audio match
- Keys are case-insensitive.
- **Settings** — mode, audio pack, level, trials, ISI range, interference chance, variable N, center cell
- **↑↓←→** — level / trials when idle

### Settings

- **Training path** — **Free-play** (manual level / interference / variable N) or **Adaptive** (ladder-driven)
- **First-run free-play** — level **2**, center cell **off**, ISI **1.0–1.5 s**
- **Audio pack** — `letters` (default) or `piano` (Brain Workshop C-scale samples)
- **Interference** — BW-style near-miss chance (default **⅛**, steps of 1/8 through 1); Free-play only
- **Variable N** — per-trial lag sampled from Beta(level/2, 1); current N shown in session status while playing; Free-play only
- **ISI** — inter-stimulus interval between onsets; each trial samples uniformly in the range (free-play default **1.0–1.5 s**). Stimulus flash duration is fixed (~1 s) and separate from ISI. Adaptive drives ISI from a discrete tier ladder.
- **Cross-modal quotas** — optional Adaptive-only block composition (default off)

### Adaptive training

Adaptive sessions use stratified signal-detection metrics (per-modality d′ clean / lure / all and criterion) to progress **lure difficulty before n**, with rolling three-block evidence, median-plus-floor gating, opening/closing calibration anchors, weak-modality remediation, and optional ISI tightening.

Ladder state (n, lure stage A–E, ISI tier) is persisted in `localStorage` under `nback-adaptive-ladder`.

The system adapts memory load and interference control more precisely; it is **not** a claim of improved general intelligence.

### Assets

- Letter sounds: `public/assets/sounds/letters/`
- Piano samples: `public/assets/sounds/piano/` — from [Brain Workshop](https://github.com/brain-workshop/brainworkshop) (`res/sounds/piano/`, GPL-2; see `NOTICE.md` in that folder)
- SVG glyphs: `public/assets/images/` — first-party simple shapes for the image channel

### Stack

React 19, Vite 6, TypeScript, Zustand, Howler, Sass.

### Deploy notes

Set Vite `base` to your GitHub Pages subpath (for example `/dual-n-back/`) before publishing.
