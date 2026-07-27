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

- **Audio pack** — `letters` (default) or `piano` (first-party generated C-scale WAV tones)
- **Interference** — BW-style near-miss chance (default **⅛**, steps of 1/8 through 1)
- **Variable N** — per-trial lag sampled from Beta(level/2, 1); current N shown in session status while playing
- **ISI** — inter-stimulus interval between onsets; each trial samples uniformly in the range (default **0.5–3.0 s**). Stimulus flash duration is fixed (~1 s) and separate from ISI.

### Assets

- Letter sounds: `public/assets/sounds/letters/`
- Piano tones: `public/assets/sounds/piano/` — procedurally generated sine tones (MIT project; not Brain Workshop GPL assets)
- SVG glyphs: `public/assets/images/` — first-party simple shapes for the image channel

### Stack

React 19, Vite 6, TypeScript, Zustand, Howler, Sass.

### Deploy notes

Set Vite `base` to your GitHub Pages subpath (for example `/dual-n-back/`) before publishing.
