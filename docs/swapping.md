# Midnight Shunting (Swapping)

Open **Midnight Shunting** from the Working Memory Trainer home screen. The internal mode is still `swapping` and the integration is still `Swapping({ onExit })`. This is the existing Swapping exercise in a standalone, illustrated night-time railway yard.

## A round at Northline

At the **dispatch desk**, choose the content, arrangement, starting pattern, operation tier and operation count. Start, Chain, Transform and Combine are the original presets, not calibrated ability levels. All settings remain independently editable. Invalid combinations remain visible and explain why **Start round** is disabled; selecting spoken letters does not silently discard a grid configuration.

During **cargo inspection**, memorise the actual marks on the crates. **Ready** removes those marks and closes identical covers. Numbers, letters and shapes are the task, not the crate materials, stationmaster or cat. Crates of the same mark are interchangeable.

During **radio dispatch**, perform each instruction in your head, then choose **Done**, or **Reconstruct** on the last card. The covered board shows fixed position labels and highlights only the affected coordinates. It never displays a transformed arrangement. There is no response timer or automatic advancement.

At **unloading**, select a bay, then choose a mark from the cargo palette. A visible Selected label and pressed state identify the active bay. You can replace its mark with an available one or use **Clear selected** to return it to the palette. The count beside each mark is the remaining quantity. Submission is available only when all bays are filled.

The **completed manifest** shows the submitted and correct arrangements separately, the original exact/partial score, and non-colour-only position checks. **Show step-by-step solution** opens the initial arrangement and one state after every individual operation, including both ordered steps of compound instructions. **New round** keeps the settings; **Change setup** returns to the desk. After an exact answer, an unmarked scenic train departs while both controls remain immediately available. The task boards stay fixed for review.

## Content and configuration

Visual content is unchanged: numbers 0–9, letters C H K L Q R S T, the existing eight shape SVGs, or mixed content. Spoken letters use the existing voice clips and are available for sequences only.

Sequences support **3–12 items**. Grids support **2 × 2**, **2 × 3** and **3 × 3**. Unique and Repeated patterns retain their existing validation, including identity-pool and distinct-permutation limits. For example, twelve unique numbers remain invalid; use mixed content or a repeated pattern rather than expecting the theme to add new numbers.

**Basic** exchanges two positions. **Group** also permits reversals, cyclic span shifts and compatible grid transformations. **Compound** presents up to two operations on a card, in their specified order: the second operates on the state produced by the first. The count remains **1–8 individual operations**, with a minimum of two for Compound. The domain still rejects unsupported operations, invisible changes and repeated observable states.

## Position semantics and small screens

Positions refer to fixed coordinates, never persistent wagon identities. A sequence is always one left-to-right row. It does not wrap into a second row at a narrow breakpoint. Swipe, use native horizontal scrolling or use the two 44px track-scroll buttons to see additional positions; scrolling does not change the order or selection. The scroll region is keyboard focusable.

A grid is an orthographic, top-down loading yard with flat crate/cover artwork, explicit row/column directions and stable R1C1-style labels. Rows run down the screen and columns run to the right. Screen-reader position names expand to “row 1, column 1.” Mirroring does not move the coordinate labels. Clockwise rotation is the existing quarter-turn operation for square grids; it is not offered for 2 × 3.

## Keyboard and touch

Every reconstruction control is a native button. Tab reaches the controls. Arrows move focus through the slots or the available palette in the original reading order; Enter or Space activates the focused control. Moving focus alone does not select a new bay. Delete or Backspace clears the selected bay. After a placement, focus moves to the next empty bay, or to Submit when the board is full. Held Enter/Space activations remain suppressed. Click and touch use the same callbacks; no dragging is required.

Controls have minimum 44px hit targets and visible keyboard focus. Layout spacing uses the existing `--space-xs`, `--space-sm`, `--space-md`, `--space-lg` and `--space-xl` tokens. The outer header, explanatory text and review log follow the app's light/dark variables. The railway deliberately remains ink-blue at night, with warm paper controls and high-contrast cargo marks in either theme.

## Spoken letters and recovery

Use **Play voice sample** at the desk. During an audio round, letters are never rendered in writing; the board contains only generic covers and position labels. Progress reports the current position, not its identity. Each clip plays completely through the existing player. **Ready** and **Replay** remain disabled until the whole pass finishes.

An audio failure shows the original error, **Retry** and **Back to setup**, without scoring an error or falling back to visible letters. An interrupted audio pass restarts on **Resume**. A completed pass remains completed across pause. Audio sample/playback, retries, replay, watchdogs, gaps, cancellation and cleanup remain owned by the original `useSwapping.ts` and `audio.ts`. No ambience, music or new sound assets were added.

## Pause, exit and information boundaries

**Pause** removes every board, instruction, palette, placement and result from the rendered DOM and accessibility tree. It returns a separate static station scene with only Resume and Exit controls. Returning to an answer restores the existing placements and active slot. The original page-visibility pause remains in place. Exit or reload discards the current round; exiting and unmounting cancel owned audio work.

The existing `projection.ts` is unchanged. It remains the boundary between private round data and all views. During manipulation, views receive only configuration and the current card. During reconstruction, they receive only player slots and the allowed palette. True arrangements and traces are available only in the result projection.

`Board` now additionally has a discriminated `concealed: true` prop branch that cannot receive tokens or placement feedback. Covered markup is constructed without a cargo mark, token image, copy ID, tooltip or hidden answer-bearing node. All covers are identical within the current geometry. Highlights are attached to position labels, not moving contents.

`RailwayScene.tsx` and `RailwayArt.tsx` receive only public presentation inputs. Scenic train length is constant and unrelated to task length. Original SVG details are deterministic, without a random seed or dependency on the answer. Only a completed result can trigger a departure or corrective reaction. Finite CSS animations never gate controls or dispatch actions; `prefers-reduced-motion: reduce` disables them. No direct React `useEffect` calls or second game-state engine were added.

## Integration and verification

Primary presentation files are in `src/components/Swapping/`. All domain code in `src/model/swapping/`, controller, projection, hook and audio player remain unchanged. No shared score, persistence, authentication, analytics, peer-mode, App, theme, dependency or deployment changes are required. The only TrainerHome change is the visible Swapping entry.

The railway presentation relies on the existing `src/hooks/useMountEffect.ts`, shape images and spoken-letter audio files. It adds no dependencies or binary assets.

Presentation tests retain the original behavior and information-hiding assertions, with additional coverage for identical covers, twelve fixed positions, grid coordinates, duplicate artwork, result-only departures and the complete setup menu. These tests, all other runtime tests, builds, typechecks, linters and browser acceptance checks **were not run** during the integration. Static inspection only was performed.

## Manual checks

- Complete a normal visual sequence from cargo inspection through the result.
- Complete a grid round and confirm that row, column, mirror and rotation instructions keep fixed coordinates.
- Use a repeated pattern and confirm that identical marks remain interchangeable in reconstruction and scoring.
- Start a spoken-letter round, replay it, pause and resume it, and exercise Retry and Back to setup after an audio failure.
- Pause during manipulation and reconstruction, then confirm that no task material remains visible and the round resumes in place.
- Reconstruct with keyboard only, including arrows, replacement, Delete or Backspace, and submission.
- At 320px width, inspect a twelve-item sequence using swipe, scrolling and both track controls without position wrapping.
- Enable reduced motion and confirm that covers, cargo, characters and the departure scene remain static while every control stays available.
