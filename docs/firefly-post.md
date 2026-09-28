# Firefly Post

Firefly Post is the village-themed interface for the existing **Spatial sequence** exercise. It still mounts as `SpatialPractice({ onExit })` and uses the internal mode ID `spatial`.

Firefly Post is integrated into the current application from the local `firefly-post-source.zip` snapshot, whose `START-HERE.md` identifies `codex/remember-decide` at `b48ef1414757d5558230f64e04e994e9d06c7588`. No default branch, deployment, backend or unrelated game was used as a substitute for that snapshot.

## Village and interaction

Three narrow houses share a permanent row-major 3×3 arrangement. By default all nine positions are delivery windows. The settings dialog can replace the middle window with a balcony, leaving eight delivery targets in the same positions. Clay, sage and plum plaster, uneven rooflines, a small post-office storefront, plants, a sleeping cat and a stationary courier make up the scene. The target windows have dark panes at rest. Only the presented target acquires amber panes, four corner brackets, a firefly and its current delivery-order tag.

The supplied Luggage Lift gameplay screenshot and editable character/world SVGs were used as a **style reference** for geometric silhouettes, warm outlines and restrained shading. The village, courier and props are original inline SVG. No files from the reference archive need to be installed.

The courier stays at street level, outside the decision area. A correct tap inserts a short envelope/check response at that window; a later tap replaces it rather than building a trail. Wrong-address feedback marks only the player's incorrect choice. Success raises the courier's letter and briefly shows small stars beside the courier, not over the windows. The window map never animates, shuffles or changes its layout for a phase transition.

## Flow and preserved mechanics

| Phase | Interface and behavior |
| --- | --- |
| Idle | **Start route** appears in both the village caption and dispatch slip. A button beside the moon opens the route-settings dialog. Length defaults to 5 and ranges from 1–9. The middle window defaults on and can be turned into a balcony. Interference defaults to Off and retains the existing eighth-step fractions through 1. New-sequence-after-success and speed increase default on; maths and Endback default off. |
| Showing | The available targets stay in place; the balcony never lights or receives a delivery. Each item uses the same full stimulus bleep and volume as Single N-Back, with the existing 70% active / 30% blank timing. The initial interval is 1000 ms. Window illumination fades in over 160 ms and out over 60 ms; the outfade finishes within the blank interval, including at the fastest pace. Brackets, firefly and ordinal disappear at the active-to-blank boundary. |
| Maths | The existing modal subtraction gates recall. Two independently random integers from 10–99 are arranged as larger minus smaller. The existing trimmed-digits validation, zero-answer handling, retry, input reselection, one-shot completion guard and Cancel/Escape behavior remain. A wrong maths answer stays in this dialog and is not a spatial error. The confirmation button is called **Check change**. |
| Recall | Every native button tap is graded immediately by the existing owner. The current delivery count is shown, not an answer strip. A wrong tap ends recall immediately. The final correct tap starts success automatically. No route Submit, Undo, answer editing or deferred grading was added. |
| Success | The existing 1000 ms success timeout controls the next presentation. With speed increase enabled, the interval becomes `Math.max(300, Math.round(current * 0.9))`. Standard mode retains the original same/new-sequence choice. The next intended route is selected immediately, before the timeout, exactly as in the supplied controller. No additional celebration delay or blocking overlay exists. |
| Retry | The wrong window has a cross; the status reports the wrong delivery step without revealing the expected destination. **Replay route**, **New sequence** and **Stop / reset** remain available. Replay uses the current route and speed. |
| Paused | Hiding the page during showing, maths, recall or success cancels scheduled work and sounds, clears partial recall and removes target/tap material. Return does not resume automatically. Replay starts the intended route from the beginning at the retained speed. The stable village geography remains visible, but not a remembered route. |

A manually requested **New sequence** resets the interval to 1000 ms. It is distinct from retry Replay and from automatic progression after success. **Stop / reset** clears route, history and recall, resets pace to 1000 ms, and returns to idle while retaining the current settings. Changing the length retains its existing reset behavior. **All exercises** invokes the supplied `onExit` callback after cancellation.

**Escape** stops an active route with the same reset as Stop / reset. It leaves the native maths dialog's Escape handling alone. When the route is idle, Escape closes the settings dialog; the settings button is disabled during a route, so settings cannot interrupt a presentation.

In **Endback mode**, the initial route is fully shown. Each correct route shifts the answer sequence left by one and appends one newly drawn stop. The next presentation lasts the same number of slots: the chosen number (0 to length minus 1) are represented by a numbered `?` status instead of a lit window. Every slot still has the neutral bleep and full timing. **First stops** hides the leading positions; **Random** selects fresh positions from the earlier slots each round. The newest last stop is always visible. The player must deliver all positions, including hidden ones. Replay retains the same route and concealment pattern; New sequence starts again with a fully visible route. The standard same/new toggle is hidden while Endback is active. With interference Off, the appended stop uses a window absent from the previous route when possible, then a window freed by dropping the first stop; if all available windows remain in the route, it repeats one. With interference enabled, it may deliberately repeat one of the retained locations.

The standard generator and history-based interference rules apply to the available windows. With the middle window off, a nine-stop route repeats an available address after all eight have appeared; neither the generator nor interference chooses the balcony. The artwork never inserts or removes a repeated delivery to fit the story.

## State ownership and cleanup

`SpatialPractice/index.tsx` remains the single owner of sequence state, history, recall, phases, speed, sound lifetime and timers. The supplied `runRef` cancellation token, timer set, press-generation guard, visibility listener, math-phase guard and unmount cleanup remain in place. No new timer or animation completion event controls gameplay.

`FireflyVillage` receives only:

- The phase and current visible target/ordinal.
- Whether the middle window is available or shown as a balcony.
- The current completed-tap feedback and, on retry, the already-reported wrong location.
- A callback for the player's chosen button.
- Callbacks for Start route/New sequence and Stop / reset in the village caption.

It does not receive the hidden sequence, expected next destination, history or recall array. Its only ref is an array of native buttons for keyboard focus. `Courier` receives a pose derived from the phase and already-completed feedback, never any location. There are no destination-dependent SVG titles, hidden ARIA hints, data attributes or route-related decorative cues.

The original 180 ms press-feedback lifetime also limits the envelope response. Each accepted tap plays the full response bleep, derived from the presentation bleep at two semitones lower. A key based on the current recall count restarts that response for repeated taps on the same window. It never blocks input or queues a delivery animation. The 160 ms envelope animation and 600–650 ms celebration animations are cosmetic only. Removing their phase/feedback also removes or stops their animation; they cannot restart a presentation.

Ambient breathing is limited to idle. During showing the cat, courier and sky are still. Reduced motion removes cosmetic animations without changing the controller's durations.

## Keyboard, layout and theme

The available response areas are native buttons with static position, row and column labels. They are disabled outside recall. The balcony is noninteractive. Tab/Shift+Tab retain normal navigation; arrow keys move focus within the three rows and columns without wrapping, skipping the balcony when present; Home/End focus the first/last window. Enter and Space use native button activation. Moving focus does not deliver a letter.

On non-idle phase transitions, focus moves to the **neutral village group**, never an expected destination. This removes the previous response's focus ring before presentation or pause. Reset also returns focus to that group. Existing modal mount/unmount synchronization uses `useMountEffect`; no direct React `useEffect` call was introduced.

The village precedes the dispatch slip in document order. At wide sizes the slip sits beside the village; on narrow screens it sits below it. Both stay mounted across phases, so changing a status or control does not reflow the window map. Before a presentation, the controller requests a synchronous nearest scroll of the entire response grid when needed, so starting from dispatch below the scene does not intentionally add a delay or require a flight animation. It does not scroll to an individual answer.

After a wrong address or a pause, **Replay route** and **New sequence** also appear beside the status at the top of the village. These native buttons reuse the dispatch actions, wrap on narrow screens and have 44 px minimum touch targets. The toolbar sits over the sky without moving the window map.

The village's bottom caption bar shows **Start route** while idle and **New sequence** plus **Stop / reset** during a route. They call the same controller actions as the dispatch buttons; the window map stays fixed. The gear button in the sky beside the moon opens a native modal dialog containing all dispatch settings. The dialog uses the village's night palette, traps focus, closes with Escape or its close button, and returns focus to the gear. Settings no longer take space in the dispatch slip.

The grid explicitly specifies both `repeat(3, minmax(0, 1fr))` columns and rows, has a 1:1 aspect ratio, and does not shrink as a flex child. Buttons fill equal square cells and have 44 px minimum dimensions. SVG and transient markers do not contribute intrinsic row height. Town width also has a viewport-height cap for shorter screens. Very short viewports can still require scrolling to the dispatch controls.

Layout gaps, margins and padding use the supplied `--space-xs`, `--space-sm`, `--space-md`, `--space-lg` and `--space-xl` tokens. Pixel/percentage values inside art describe illustration geometry, stroke widths, sizes or animation offsets.

Surrounding text, forms, dispatch background and borders inherit the app's existing theme variables. The village deliberately remains a night scene in both themes. No assumption about an omitted theme hook's internal data attributes is needed. The existing chooser remains the place to change the app theme.

Current presentation is still a **visual spatial-memory task**: position labels and keyboard operation do not constitute an equivalent nonvisual presentation mode. No new spoken location or mnemonic cues were added.

## Files to integrate

All paths in the ZIP are repository-relative; there is no `source/` prefix.

| Path | Change |
| --- | --- |
| `src/components/SpatialPractice/index.tsx` | Themed composition, current-feedback projection, neutral focus and grid visibility handling; existing controller retained. |
| `src/components/SpatialPractice/PracticeSettings.tsx` | Dispatch copy and interference help; the same settings, values and idle-only lock. |
| `src/components/SpatialPractice/SpatialPractice.scss` | Local responsive game layout, dispatch slip, controls, theme-token styling and focus. |
| `src/components/SpatialPractice/MathChallenge.tsx` | Postage copy, original envelope seal and accessible dialog description; arithmetic and validation retained. |
| `src/components/SpatialPractice/MathChallenge.scss` | Local postage-dialog styling. |
| `src/components/SpatialPractice/FireflyVillage.tsx` | **New:** presentational village, native targets, inline window SVG and keyboard focus navigation. |
| `src/components/SpatialPractice/FireflyVillage.scss` | **New:** facade/grid styling, current-cue treatment, transient feedback and reduced-motion rules. |
| `src/components/SpatialPractice/VillageArt.tsx` | **New:** all original sky, roof, storefront, plant, lamp, cat, courier, envelope and firefly SVG artwork. |
| `src/components/TrainerHome/index.tsx` | Only the `spatial` entry changes: **Firefly Post**, **Spatial sequence**, and its description. |
| `docs/firefly-post.md` | This flow, integration and manual-check documentation. |

These files are now integrated in the application alongside the existing `sequence.ts` and `sounds.ts`.

No new dependency is required. Firefly Post uses the application’s existing React/Howler/Sass environment, `src/audio/unlockAudio.ts`, `src/hooks/useMountEffect.ts`, `src/model/interference.ts`, shared theme/layout tokens, `public/assets/sounds/ui/stimulus-bleep.wav` for presented windows, `public/assets/sounds/ui/response-bleep.wav` for taps and `public/assets/sounds/piano/{a4,c4}.wav` for round feedback. The currently untracked `useMountEffect.ts` and `interference.ts` remain prerequisites for a clean checkout or release and should be accounted for through the normal project process without requiring unrelated work to be staged.

The initial village integration left `App.tsx`, `App.scss`, theme files, shared interference semantics, sequence generation, sound code, package/config files and all other games unchanged. If `TrainerHome/index.tsx` has diverged due to concurrent work on another exercise, merge only its `spatial` entry rather than overwriting other entries with the snapshot version.

No persistence, score/currency system, analytics, account, network feature, new infrastructure or deployment was added.

## Inspection and limitations

Work was limited to local source/art inspection and editing. The controller, math and home diffs were read against the supplied snapshot. The presentation prop boundary, inline SVG markup, equal-row grid rules, cancellation paths, original timing expressions, local imports and output archive paths were statically inspected.

**No tests, builds, typechecks, linters or browser acceptance checks were run.** No game-specific tests were supplied, and none are claimed to have passed. No fresh screenshot of the implemented interface was captured. The reference screenshot is not evidence of this implementation running. Layout, audio timing, modal/focus behavior and device/browser compatibility still need runtime checking in the complete app.

## Manual checklist — not executed

- [ ] **Ordinary recall:** Start with the defaults. Observe one target and ordinal per pulse with a blank between them. Deliver in order; confirm immediate count changes and automatic success on the last correct tap, without a route Submit action.
- [ ] **Immediate wrong tap:** Tap a wrong window partway through. Confirm recall ends immediately, further taps do nothing, the wrong window alone has a cross, and Replay/New sequence/Stop remain available.
- [ ] **Repeated locations:** Use existing interference and enough rounds/history to obtain a repeated location naturally. Deliver it each time, including adjacent repeats when generated. Check fast consecutive taps restart/replace the feedback and never block input. Do not alter the generator to force a demonstration.
- [ ] **Speed progression:** Complete routes with speed increase on: 1000 → 900 → 810 → 729 ms, then rounded 10% reductions to the 300 ms floor. Confirm the success gap stays 1000 ms. Turn speed increase off from idle and confirm pace remains constant. A manual New sequence must reset to 1000 ms; retry Replay must not.
- [ ] **Same/new toggle:** Disable new-sequence-after-success and confirm the next route repeats the current one. Re-enable it and confirm the original generator is used for the next route. Verify this independently of the speed setting.
- [ ] **Endback:** Start with length 4 and verify the first route is fully visible; after a correct route the next answer drops the first stop and adds one at the end. With one hidden stop, confirm slot 1 shows `?` while slots 2–4 and all four recall taps keep their order. With two hidden stops, confirm slots 1–2 hide. Try Random over several rounds: exactly the selected number of earlier slots hides each round, and the new last stop always remains visible. Set hidden stops to 0 and confirm the sliding route stays fully shown. Replay after an error or page pause must preserve the same hidden positions; New sequence must restart with a fully visible route.
- [ ] **Maths:** Enable postage maths. Try blank/nonnumeric input and a wrong answer, then a correct answer. Confirm only a correct answer unlocks recall; wrong answers do not count as wrong deliveries. Check a zero result when generated, Cancel round and Escape, including focus after dismissal.
- [ ] **Page hiding:** Hide during an active cue, during maths, and partway through recall. Confirm silence, removal of cue/tap material and paused recovery. Also hide immediately after the final correct tap, inside the one-second success window, with each same/new toggle setting: Replay must present the already-intended route at the retained next speed, not resume a partial recall or skip to another generated route.
- [ ] **Reset/exit:** Reset or exit during showing, maths (Cancel), recall, retry, paused and success. Wait beyond old timeout deadlines. Confirm no late presentation/sound restarts. Reset restores 1000 ms and idle settings access; All exercises returns to the chooser.
- [ ] **Keyboard:** Tab/Shift+Tab through controls and targets. During recall use arrows, Home/End, Enter and Space. With the middle window off, confirm arrows skip the balcony and neither Tab nor a click can deliver there. Check dialog focus and Escape.
- [ ] **Middle balcony:** Turn off Middle window in settings. Confirm the center artwork becomes a balcony, ordinary and Endback routes never use it, and a nine-stop route repeats a playable window. Turn it back on and confirm the ninth window returns.
- [ ] **Scene controls and settings:** In idle, use Start route from the village caption. Open the gear beside the moon and change each setting; close with its button and Escape, checking focus returns to the gear. During showing or recall, confirm the gear is disabled and Escape stops/resets the route. In the maths dialog, Escape must still cancel the maths round. Check the caption actions and settings dialog at phone width without overlap or horizontal scrolling.
- [ ] **Narrow screens/theme:** At 320 px width, desktop widths and a short landscape viewport, confirm nine equal square grid positions of at least 44 px, no compressed bottom row and no horizontal overflow. Check that Start/Replay/New sequence from below the village brings the grid into view. Check both app themes, page zoom, cue-tag contrast and phase-to-phase map stability.
- [ ] **Reduced motion:** Enable it before entering and while the game is open. Confirm cosmetic movement stops while pulse durations, 30% blanks, press feedback lifetime, grading and the one-second success interval are unchanged; target/feedback symbols remain visible.
