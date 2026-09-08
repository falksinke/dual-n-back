# U2 — Firefly Post

Status: DONE

## Changed files

- `src/components/SpatialPractice/index.tsx`
- `src/components/SpatialPractice/PracticeSettings.tsx`
- `src/components/SpatialPractice/SpatialPractice.scss`
- `src/components/SpatialPractice/MathChallenge.tsx`
- `src/components/SpatialPractice/MathChallenge.scss`
- `src/components/SpatialPractice/FireflyVillage.tsx`
- `src/components/SpatialPractice/FireflyVillage.scss`
- `src/components/SpatialPractice/VillageArt.tsx`
- `docs/firefly-post.md`

## Mechanical behavior preserved

- Existing sequence generation, history-based interference, neutral sounds, 1000 ms initial pace, 70/30 cue split, 10% speed progression, 300 ms floor, 1000 ms success pause, retry replay, same/new-sequence behavior, visibility pause, reset, exit and stale-callback cancellation remain owned by `SpatialPractice`.
- The new village receives only the current visible cue/ordinal, completed-tap feedback, wrong tapped location and phase. It does not receive the hidden sequence, history or expected next answer.
- Existing `sequence.ts`, `sounds.ts`, shared interference code and `useMountEffect` were retained unchanged.

## Integration and focused fixes

- Integrated the supplied Firefly Post village, original inline SVG art, dispatch layout and postage-dialog presentation.
- Replaced the misleading “Back to N-Back” exit label with “All exercises”.
- Added neutral-scene focus transfer between phases, native window buttons, grid arrow/Home/End navigation, clear position labels and dialog description/error wiring.
- Kept all nine targets in a fixed row-major 3×3 map with explicit equal columns and rows, square cells and 44 px minimum targets.
- Scoped cosmetic animation to the village feedback/character art and included reduced-motion and forced-colors handling. Gameplay timers remain JavaScript-owned and unchanged.
- No additional concrete integration defect was found during the focused pass.

## Static evidence

- Read the task brief, context packet, original Firefly Post handoff, current SpatialPractice controller and supplied changed files.
- Compared every integrated owned source file byte-for-byte with the supplied overlay after application; all matched. The documentation was then updated to describe the integrated app state.
- Inspected imports/exports, phase projection, disabled-state behavior, focus/keyboard paths, hidden-route boundary, equal-grid rules, theme token availability, reduced-motion rules and the scoped Git diff.
- `git diff --check -- src/components/SpatialPractice docs/firefly-post.md work/orchestration/illustrated-memory-games/task-2-report.md` returned clean before this report was added.

## Verification and concerns

Tests, builds, typechecks, linters, browser checks and runtime UI checks were not run, per the non-Goal-mode task policy. Remaining uncertainty is limited to rendered layout, animation/audio timing, modal focus and device/browser behavior in the complete app. The untracked shared prerequisites `src/hooks/useMountEffect.ts` and `src/model/interference.ts` remain outside this worker’s ownership; the root should account for them when preparing a clean checkout or release without staging unrelated work solely for this task.
