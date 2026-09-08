# The Moth Keeper

Open **The Moth Keeper** from the Working Memory Trainer home. This is the greenhouse presentation of Remember & Decide; its internal mode ID remains `remember-decide`.

You tend a miniature greenhouse at night. A firefly lands on a plant pot, then a moth arrives at the inspection lamp. Remember the pot while deciding whether the moth’s **square markings are vertically symmetrical**. After the final inspection, place lanterns on the remembered pots in order.

## Tonight’s round

Setup offers sequence lengths **2–8**, the **More differences / Some differences / Fewer differences** options, and a **3-, 5-, or 8-second judgement deadline**. Defaults remain **3 locations, More differences, 5 seconds**. Settings are fixed throughout the attempt. The notebook includes a labelled, unscored example; its supplied pattern and location are not part of a generated round.

There are exactly sixteen selectable pots in a stable, square **4×4** arrangement. A location can recur later in a sequence, but the generator excludes immediate repeats. Pot artwork is identical at every position and does not change after a landing.

Each item follows this sequence, including the last item:

1. A firefly highlights its pot with a visible insect shape, a border and light for **1,000 ms**.
2. A **250 ms neutral transition** removes all location cues.
3. The moth’s marking panel appears, fully readable, for the chosen judgement window. Select **Yes** or **No**.
4. A second **250 ms neutral transition** follows an answer or timeout. Then the next landing appears, or recall begins after the last inspection.

The controller’s mounted-phase start and monotonic deadline remain authoritative. Answers at or after the deadline count as timeouts, including when the scheduled timer callback has not yet run. Only one answer is accepted per item. Neither the moth nor the keeper reveals whether an inspection was right. The status can report that an answer was recorded or time expired, but not its correctness.

## Inspect the markings, not the illustration

The stimulus remains the supplied **36 Boolean cells in a row-major 6×6 grid**, with exactly **18 filled cells**. The vertical mirror lies between the third and fourth columns. Symmetry is sampled independently for every item; rounds are not balanced between Yes and No.

For non-symmetrical patterns, More / Some / Fewer retain **6 / 4 / 2 mismatched mirror pairs**, respectively. These are geometric difference settings, **not calibrated difficulty levels**.

A fixed, vertically mirrored moth frame surrounds a rectangular specimen panel. It never changes species, pose, colour or movement with the answer. It is behind the entire opaque marking panel, not over the cells; all six columns, including the central two, remain visible. Full-size and compact review specimens use the same `PatternGrid` component and row-major mapping. The original filled/empty theme contrast, cell geometry and inset dots are retained. There are no stimulus entrance fades, wing movements, moving shadows, pulses or decorative timers during inspection.

## Place the lanterns

Recall uses the same pot positions. Each selection appends a visit to the numbered answer strip. Repeats are allowed, including consecutive selections in the answer. A lantern marks a selected pot; a **×N** badge means that the player selected that pot more than once. The strip records **every visit separately and in order**, so the badge is not a replacement for the sequence.

Only the player’s choices are shown during recall. Use **Undo** to remove the last choice or **Clear** to start the answer again. **Submit** is enabled only at the complete requested length. There is no per-tap grading or automatic submission.

## The keeper’s record

Submission reveals four independent results: correctly recalled positions, exact-sequence success, correct symmetry judgements, and timeout count. The submitted lantern garden is accompanied by a complete position-by-position comparison with the correct locations. Every inspection has its original pattern, correct answer, submitted answer and timeout status. Review outcomes have explicit text and symbols, not colour alone.

**Try next length** remains optional and is offered only after exact recall and at least `ceil(0.8 × length)` correct judgements, including one correctly answered symmetrical pattern and one correctly answered asymmetrical pattern. At length three, all three inspections must be correct. A single-truth-class round receives its normal scores but cannot earn the suggestion. Clicking the action increases only sequence length, never beyond eight; it does not change differences or the deadline. Nothing advances automatically.

**New round** generates a new attempt with the current settings. **Settings** returns to the notebook. **Exit** leaves this mode.

## Interruption and access

**Pause** and **Exit** remain available through location exposure, both blank transitions, inspection and recall. Pausing or hiding the page discards the **entire** attempt without a result. There is no Resume. **Round interrupted** offers **Restart round**, **Settings** and **Exit**. Restart generates a new round at the same settings. Exiting or unmounting cancels the current timer; existing generation guards, stale-callback protection, held-key suppression and StrictMode lifecycle handling remain in place.

Native buttons and selects support keyboard and touch. Recall has row/column descriptions, two-dimensional arrow-key navigation, visible focus and targets of at least 44×44 CSS pixels at the supported 320px viewport. Current marking patterns retain their row-by-row filled/empty description; no truth field or hidden solution is added to accessible markup.

Timed phases focus their neutral heading unless focus is on the persistent Pause/Exit controls. Recall otherwise focuses its first pot; setup, interruption and results focus their headings. The polite, atomic status messages report phase/item, timeout and result availability without hidden coordinates, symmetry truth or countdown ticks. The existing fixed visual deadlines are **not** a separately calibrated screen-reader task.

The night illustration stays nocturnal in either app theme; notebook surfaces, text, controls and the stimulus follow the app’s existing theme variables. Layout uses the existing spacing tokens, keeps the stage square, and allows vertical scrolling and wrapped answer entries/controls on narrow screens. Reduced motion removes the setup keeper’s lantern sway. Timed phases and interruption have no decorative animation; task intervals do not depend on motion preferences.

## Implementation boundary

The model, controller, projection and timer hook are unchanged. The shell consumes `game.view`; location sees only its current pot, inspection only its cells, and recall only the player’s selections. Static greenhouse/keeper artwork accepts no round data. Only the submitted `Result` receives the full round, and even its garden illustration uses the submitted locations rather than the true route.

All new artwork is original, editable inline SVG in `src/components/RememberDecide/art/`. There are no new dependencies, downloaded art, audio systems, stores, currencies or unlocks. Nothing changes N-back, Spatial Sequence, Swapping, cloud services or deployment. This exercise stores no history and makes no clinical or broad cognitive-transfer claim.
