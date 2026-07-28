## Dual N Back

React + Vite implementation of a Brain Workshop–aligned n-back trainer with Dual, Triple, and Quad modes.

Production: [nback.sinke.me](https://nback.sinke.me) (Vercel project `nback` only — do not attach other `*.sinke.me` hosts or path apps here).

### Commands

- `pnpm install` — install dependencies
- `pnpm dev` — start dev server on port 3000
- `pnpm test` — run unit/characterization tests
- `pnpm build` — production build (includes service worker precache)
- `pnpm serve` — preview the production build (use for offline / SW smoke)

### Modes

| Mode | Modalities |
|------|------------|
| **Dual** | Position + audio |
| **Triple** | Position + color + audio |
| **Quad** | Position + color + image + audio |

### Controls

- **Space** — start / cancel session (also **Start** / **Continue** on screen)
- **Esc** / top-left **✕** — cancel session while playing (or countdown / Adaptive continue)
- **A** — position match (on-screen Position button during a session)
- **F** — color match (Triple / Quad)
- **J** — image match (Quad only)
- **L** — audio match
- Keys are case-insensitive; touch targets mirror the active modalities.
- **Settings** — mode, audio pack, level, trials, ISI range, interference chance, variable N, center cell, haptics
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

### Progressive Web App (iPhone + installable)

Installable offline trainer. **No Web Push.** Support floor: iOS Safari / Home Screen **14+** (haptics need **17.4+** with System Haptics on).

#### Install

- **iOS Safari:** after a visit or completed block, use Share → **Add to Home Screen**. An instructional nudge appears when engaged and not already standalone.
- **Chromium (desktop/Android):** when installable, a deferred **Install** nudge can call the browser install prompt (`beforeinstallprompt`). Dismiss snoozes ~7 days. Standalone / Home Screen launches never show the nudge.

#### Offline

After one online visit with a successful service-worker install, a full Free-play or Adaptive block is playable offline: app shell, letter + piano sounds, poly images, and self-hosted IBM Plex (not Google Fonts CDN). Waiting service-worker updates apply only when idle (no game, countdown, or Adaptive Continue interstitial).

Smoke: `pnpm build && pnpm serve` → load once online → DevTools offline (or airplane mode) → start a block with audio.

#### Haptics (opt-in, default off)

Settings → **Haptic feedback**.

| Platform | Mechanism |
|----------|-----------|
| iOS 17.4+ Safari / Home Screen | Invisible `<input switch>` overlays on tappable controls (Taptic). Needs **Settings → Sounds & Haptics → System Haptics**. |
| Android / vibrate-capable | `browser-haptic` / `navigator.vibrate` via capture bridge on `data-haptic` targets |

Programmatic success pulses are Android-only; iOS only Taptics inside a real control gesture. Haptics are **not** gated on `prefers-reduced-motion`.

#### Manual QA matrix

| Surface | Check |
|---------|--------|
| Safari tab | Safe areas, Start/match taps, settings scroll |
| Home Screen standalone | Same + status bar / home indicator insets |
| Offline after one visit | Full block with audio |
| Idle SW update | Mid-session deploy does not reload; idle applies update |
| Install nudge | Hidden when standalone; shows when engaged on iOS or with BIP |
| Haptics on | Physical iPhone 17.4+ + System Haptics; Android vibrate |

### Stack

React 19, Vite 6, TypeScript, Zustand, Howler, Sass, `vite-plugin-pwa` (injectManifest).

### Deploy notes

Set Vite `base` to your GitHub Pages subpath (for example `/dual-n-back/`) before publishing. Manifest `start_url` / `scope` and the service worker assume site root (`/`) unless you adjust those to match.
