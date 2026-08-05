---
title: Dual-platform web haptics for discrete match controls (n-back)
date: 2026-07-28
category: design-patterns
module: haptics
problem_type: design_pattern
component: frontend_stimulus
symptoms:
  - "Match taps on iPhone felt unconfirmed without Taptic feedback"
  - "navigator.vibrate is silent on iOS Safari / Home Screen PWAs"
  - "Haptics appeared to work only on the first match button (Position), not Audio/Color/Image"
root_cause: invalid_html_nesting
resolution_type: code_fix
severity: medium
tags:
  - ios-safari
  - haptics
  - pwa
  - webkit
  - switch-input
  - browser-haptic
  - data-haptic
  - platform-split
---

# Dual-platform web haptics for discrete match controls (n-back)

## Problem

On phone, n-back match claims (Position / Color / Image / Audio) need a clear “I registered your tap” signal. Visual state alone was easy to miss under time pressure. `navigator.vibrate` does not produce feedback on iOS Safari or Home Screen web apps, so a vibrate-only path left iPhone users without confirmation.

We needed the same portable dual-platform model used in Eucalculia and QueensMaster, adapted to **discrete button taps** (not paint-drag), with a Settings toggle and persistence.

## How we implemented it

### Architecture

| Module | Role |
|--------|------|
| `src/haptics/haptics.ts` | Platform detect (`isIOS`, `hasSwitchInputSupport`), `fireKind`, `fireIosSwitchHapticSync`, capture / iOS bridges, Android `playHaptic` |
| `src/haptics/hapticOverlay.ts` | Mount/reset invisible `<input type="checkbox" switch>` on a **`.haptic-host` sibling wrapper** |
| `src/haptics/hapticTargets.ts` | Tag reachable `button`s with `data-haptic`, mount overlays when enabled |
| `src/haptics/useHaptics.ts` | Install bridges once; re-augment after commit + `MutationObserver` (React wipes injected nodes) |
| `src/model/uiPreferences.ts` | Persist `hapticFeedbackEnabled` (schema v2; default **on** for this product) |
| Settings | “Haptic feedback” toggle + iOS System Haptics hint |

Dependency: `browser-haptic` for Android success / warning / light patterns.

### Platform split (non-negotiable)

| Platform | Mechanism |
|----------|-----------|
| **iOS 17.4+** Safari / Home Screen | Real pointer interaction with `<input switch>` (Taptic). Needs **Settings → Sounds & Haptics → System Haptics**. |
| **Android / vibrate-capable** | Capture-phase bridge on `[data-haptic]` → `browser-haptic` / `navigator.vibrate` |

Do **not** gate haptics on `prefers-reduced-motion` (visual motion ≠ haptic preference). Always keep visual confirmation (pressed / success / error classes).

### Wiring sequence

1. App mount: `useHaptics({ rootRef, enabled, uiRevision })` installs capture + iOS bridges.
2. After render / DOM mutation: `augmentHapticTargets(root, { enabled })`.
3. Match / Start / Exit controls sit in a `.haptic-host` wrapper; the button keeps `data-haptic="light"` (or inferred kind).
4. iOS: invisible full-bleed switch is appended to the **host**, not inside the `<button>`. `change` resets `checked` and forwards `button.click()` so the claim still registers.
5. Android: `pointerdown` / `click` capture on `[data-haptic]` calls `fireKind` (debounced ~400ms per element).
6. Skip overlays on `data-haptic-skip` (e.g. settings backdrop / close).
7. Only augment **reachable** controls (`aria-hidden="true"` ancestors and closed dialogs are skipped).

### Product defaults in this app

The portable kit often ships haptics **opt-in, default off**. Here, match confirmation mattered enough that we:

- Default `hapticFeedbackEnabled: true`
- Migrated schema v1 → v2 to turn haptics on for existing installs that still had the old default-off flag

Users can still disable in Settings.

## What we learned

1. **Web haptics are two systems, not one API.** Designing for `vibrate` first guarantees a silent iPhone.
2. **Trusted gesture vs programmatic cue.** iOS Taptic from switches needs a real (or gesture-scoped) interaction. `playHaptic('success')` after a trial ends is correctly an **Android-only** no-op on iOS — document that; don’t promise completion buzzes on iPhone web.
3. **Stay synchronous in the gesture.** `fireIosSwitchHapticSync` must not be deferred with `setTimeout`; iOS 18.4+ drops Taptic outside an active user activation.
4. **React and injected overlays fight.** Class updates on match buttons wipe non-React children. A `MutationObserver` + `uiRevision` re-augment is required, or overlays disappear after the first press.
5. **Physical device QA is mandatory.** Simulator / jsdom cannot prove Taptic. System Haptics off on the device looks exactly like “our code is broken.”
6. **Invalid nesting is a multi-control killer.** See pitfalls below — this was the “only Position vibrates” bug.
7. **Visual feedback remains primary.** Haptics reinforce; they must not be the only success signal (especially on iOS where programmatic cues are weak).

## Pitfalls (do not repeat)

### 1. Nesting `<input switch>` inside `<button>`

**What we did wrong:** First implementation appended the invisible switch as a child of each match `<button>`.

**What happened:** Only the **first** control (Position) produced reliable Taptic. Audio / Color / Image felt dead for haptics even though clicks worked.

**Why:** Interactive content inside `<button>` is invalid HTML. WebKit’s handling of nested controls is unreliable across siblings; in practice only the first nested switch was wired for feedback.

**Fix:** Wrap each control:

```html
<div class="match-claim-wrap haptic-host">
  <button type="button" data-haptic="light">…</button>
  <!-- switch mounted here as sibling overlay, not inside the button -->
</div>
```

`mountIosHapticSwitch` resolves `.haptic-host`, never nests into the button, and forwards `change` → `button.click()`.

### 2. `navigator.vibrate`-only / global vibrate polyfills

Silent on iOS. Polyfills that re-parent the document into a giant `<label>` (e.g. patterns like `ios-vibrator-pro-max`) break **all** taps. Never ship them.

### 3. Assuming programmatic switch `.click()` always Taptics

WebKit has tightened this: haptics require user activation and increasingly require **trusted** events. A temporary label+switch clicked from inside a `pointerdown` handler can still work on some OS versions as a fallback (`fireIosSwitchHapticSync`), but the durable primary path for discrete controls is **the user’s finger on a real switch overlay**. Prefer overlays on `.haptic-host`; treat sync helpers as backup, not the sole strategy.

### 4. Click-only bridges under pointer capture

If you ever add drag gestures, `click` may be suppressed mid-gesture. Prefer `pointerdown` / `pointerup` capture. N-back match taps are discrete, but the bridge already uses `pointerdown` for the Android / sync path.

### 5. Gating on `prefers-reduced-motion`

Wrong coupling. Motion-sensitive users and haptic preference are separate. Use an explicit Settings flag (and optional future “reduced effects” product mode if you want both muted together).

### 6. Forgetting device prerequisites

iOS needs:

- Safari / Home Screen **17.4+** (`'switch' in HTMLInputElement.prototype`)
- **System Haptics** enabled in iOS Settings

Without those, overlays and bridges no-op. Surface that in Settings copy.

### 7. Overlay steals the tap without forwarding

If the switch sits above the button and captures the pointer, `onClick` on the button never runs unless `change` forwards `button.click()` (or you use `pointer-events: none` on the switch and a sync haptic path). We forward from `change`.

### 8. Paint-drag density expectations

This trainer does not need per-cell drag ticks. QueensMaster learned that continuous iOS web haptics are constrained by WebKit `switchHeldDelay` (~200ms) and trusted pointer streams — see `queensmaster` solution `ios-safari-paint-drag-haptics-switch-hold`. Do not promise keyboard-like haptic density on iPhone web.

## Checklist for the next app

```text
Haptics Progress:
- [ ] Explicit setting + persistence (decide default on vs off with product)
- [ ] Platform detect: iOS + switch support vs vibrate
- [ ] `.haptic-host` wrappers — never nest switch inside <button>
- [ ] Augment buttons with data-haptic (+ iOS sibling overlays)
- [ ] Capture bridge (pointerdown) for Android; debounce per element
- [ ] Re-augment after React DOM / uiRevision / MutationObserver
- [ ] Reachability + data-haptic-skip
- [ ] Programmatic completion cues Android-only; document iOS limit
- [ ] No global vibrate polyfills; no reduced-motion gate
- [ ] Physical iPhone QA with System Haptics on; multi-button smoke (not just the first control)
```

## Key files in this repo

- `src/haptics/haptics.ts`
- `src/haptics/hapticOverlay.ts`
- `src/haptics/hapticTargets.ts`
- `src/haptics/useHaptics.ts`
- `src/haptics/Haptics.scss`
- `src/components/utils/ActionButton.tsx` (`.haptic-host` wrap)
- `src/model/uiPreferences.ts`
- Portable skill: `iphone-pwa/haptics.md`
