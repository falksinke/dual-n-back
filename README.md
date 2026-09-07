## N-Back

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
- **Settings** — player code (cloud sync), mode, audio pack, level, trials, ISI range, answer leeway, interference chance, variable N, Jaeggi match quotas, center cell / N in center, haptics
- **↑↓←→** — level / trials when idle

### Settings

- **Training path** — **Free-play** (manual level / interference / variable N), **Adaptive** (Match% ladder), or **Cyclic** (dual-track curriculum)
- **First-run free-play** — level **2**, center cell **off**, ISI **1.0–1.5 s**, Jaeggi match quotas **on**
- **Audio pack** — `letters` (default) or `piano` (Brain Workshop C-scale samples)
- **Interference** — BW-style near-miss chance (default **⅛**, steps of 1/8 through 1); Free-play manual, Adaptive / Cyclic ladder-driven
- **Variable N** — lag schedule sampled with geometric **2×** weights (ceiling twice as likely as the next-lower lag, etc.; at n=2 → ⅓ / ⅔) and random hold stretches; current N shown while playing; Free-play manual, Adaptive / Cyclic ladder-driven. Stimulus order is preplanned: **N schedule → Jaeggi-density targets at each trial’s effective N → interference lures → clean fill**
- **Variable N switch** — typical stretch before lag randomly resamples (**Every trial**, or ~every 2 / 3 / 5 / 10 trials via a geometric draw); applies whenever Variable N is on (including Adaptive / Cyclic ladder steps)
- **N in center** — optional digit in the middle square for the current Variable N lag (default **off**); only available when **Center cell** is off; hides the center crosshair while enabled
- **ISI** — inter-stimulus interval between onsets; each trial samples uniformly in the range (free-play default **1.0–1.5 s**). The range randomizes **stimulus pacing**; **answer scoring / button feedback always uses the minimum ISI**, so every trial has the same time-to-score. Stimulus flash duration is fixed (~1 s) and separate from ISI. Adaptive / Cyclic drive ISI from their ladders.
- **Answer leeway** — extra press time after the scoring window (default **250 ms**, slider **0–500 ms**); extends the trial gap so fast ISIs stay hittable. Applies in Free-play, Adaptive, and Cyclic.
- **Jaeggi match quotas** — optional Free-play fixed match counts (default **on**): scales classic **4 position + 4 audio + 2 simultaneous** from a 20-trial baseline (e.g. 6+6+3 at 30 trials). While Variable N is on, the Variable N planner uses the same target density (plus planned interference); Adaptive fixed-N steps still use Jaeggi when that toggle is on
- **Instant match feedback** — optional; when on, match buttons turn green/red on press instead of waiting until the trial response window closes (default **off**)
- **Cross-modal quotas** — optional Adaptive / Cyclic block composition (default off)

### Adaptive training

**Adaptive** climbs a discrete Match% ladder: start at **n=2**, **2.5 s** fixed ISI, **no interference**; promote at **≥80%** overall Match; demote one step after **3** fails in a row below 80%.

Per-n recipe: interference on → tighten ISI to 1.0 s → variable ISI → reset with variable N → tighten again → raise n and repeat.

### Cyclic training

**Cyclic** teaches **cyclic one-slot updating** on a dual-track curriculum: fixed-N teach → lure-sensitive verify → speed/jitter automate, then a **flexible-lag** track (variable N) after fixed mastery. Assessed blocks use **lure-sensitive d′ gates**, not Match % alone; **3** consecutive fails demote one stage.

Per-n shape (fixed track, variable N off): teach walkthrough → decide-with-reveal → speed ramp → clean → near lures → both lures → fast → jitter → mastery → flexible track → then N↑ and restart.

Design rationale and tables for both paths: [docs/adaptive-mode.md](docs/adaptive-mode.md).

Ladder state is persisted per mode: Adaptive under `nback-adaptive-ladder` (schema **v2**), Cyclic under `nback-cyclic-ladder` (schema **v4**), optionally synced when a **player code** is set. A leftover v3 blob under the Adaptive key migrates into Cyclic on load.

Trial settings and UI preferences are also cached in `localStorage` and included in that cloud document.

These systems structure practice difficulty; they are **not** a claim of improved general intelligence, far transfer, or IQ gains.

### Player code (cloud progress)

Settings → **Player code**: type a passphrase (6–64 characters) and **Apply**.

- If that code already has a save on the server, this device **loads** it (ladder + settings + UI prefs).
- If not, the current local state is **uploaded** as the new save.
- The code is the shared secret — anyone who knows it can read and overwrite that progress.
- Offline play still works; changes queue and sync when the device is online again.

Server: Vercel function `GET|PUT /api/progress` + Upstash Redis. Set these env vars on the Vercel `nback` project (and locally if using `vercel dev`):

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Redis keys are `nback:v1:progress:{sha256(code)}` — plaintext codes are never stored as keys.

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

#### Haptics (on by default; toggle in Settings)

Settings → **Haptic feedback** (default **on** so match taps confirm on phone).

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

Production: [nback.sinke.me](https://nback.sinke.me) (Vercel project `nback` only).

For cloud progress, configure Upstash Redis env vars on that project (see **Player code** above), then `pnpm dlx vercel deploy --prod --yes --scope falk-sinkes-projects`.

Set Vite `base` to your GitHub Pages subpath (for example `/dual-n-back/`) before publishing elsewhere. Manifest `start_url` / `scope` and the service worker assume site root (`/`) unless you adjust those to match. The service worker navigation denylist already excludes `/api/`.

### Spatial sequence practice

Open **Practice** in the top bar for a separate spatial recall exercise. Choose 1–9 positions (default 5), watch them appear in order, then click the squares in the same order. Each correct recall starts a new sequence by default. **Increase speed after correct recall** is on by default (10% shorter interval down to 300 ms per position); turn it off for a fixed pace. Turn off **New sequence after each correct recall** before starting to rehearse the same pattern instead. Each displayed item and accepted tap has a short sound cue; success shows a checkmark and pulse, while failure marks the wrong square and briefly shakes the grid. Reduced-motion preferences disable the movement. A mistake offers a replay at the current speed. **New sequence** starts a fresh pattern at the initial speed; **Back to N-Back** returns to the normal game. Practice does not record N-back results or advance daily session progress.

On the results screen, press **Enter** while a rest-duration button is focused to skip the current rest and start the next round. The saved rest duration stays unchanged.

Practice also offers **Interference** (Off by default, then ⅛ through 1) and **Math problem before recall** (off by default). Interference uses the regular game’s near-miss lags over recently displayed positions; repeated squares still count as items to recall, and the sequence length stays fixed. Off preserves distinct positions within a sequence. With math enabled, solve one two-digit subtraction after presentation before recalling the sequence without another viewing. Wrong math answers keep the same problem open and do not affect spatial scoring or speed. Cancel aborts the round; a spatial replay receives a fresh math problem. Configure these settings before Start, or use Stop / reset to change them.
