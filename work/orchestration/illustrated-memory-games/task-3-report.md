# U3 — The Moth Keeper

Status: DONE

## Changed files

- `docs/remember-decide.md`
- `src/components/RememberDecide/Greenhouse.tsx`
- `src/components/RememberDecide/Interrupted.tsx`
- `src/components/RememberDecide/Location.tsx`
- `src/components/RememberDecide/MothSpecimen.tsx`
- `src/components/RememberDecide/PatternGrid.tsx`
- `src/components/RememberDecide/Recall.tsx`
- `src/components/RememberDecide/RememberDecide.scss`
- `src/components/RememberDecide/Result.tsx`
- `src/components/RememberDecide/Setup.tsx`
- `src/components/RememberDecide/SymmetryDecision.tsx`
- `src/components/RememberDecide/TimedBlank.tsx`
- `src/components/RememberDecide/Views.test.tsx`
- `src/components/RememberDecide/index.test.tsx`
- `src/components/RememberDecide/index.tsx`
- `src/components/RememberDecide/projection.test.ts`
- `src/components/RememberDecide/art/GardenArtwork.tsx`
- `src/components/RememberDecide/art/GreenhouseArtwork.tsx`
- `src/components/RememberDecide/art/KeeperArtwork.tsx`
- `src/components/RememberDecide/art/MothArtwork.tsx`
- This report.

## Mechanical behavior preserved

- Integrated the supplied night-greenhouse, fixed moth frame, keeper, pot, firefly, and lantern presentation without changing the model, controller, projection, timing hook, public `RememberDecide({ onExit })` interface, or internal `remember-decide` ID.
- Location exposure still mounts the controller-owned timer immediately; both neutral blanks and the decision phase preserve their mounted-phase callbacks; recall remains editable and submits only at the configured length.
- Active views consume only their existing projected data. Static greenhouse and keeper artwork receive no task data; the recall garden receives only player selections; true locations and symmetry answers appear only after scoring.
- The Boolean stimulus remains a row-major 6×6 grid rendered by one shared `PatternGrid`; the fixed frame stays behind the opaque rectangular panel and accepts no truth or answer prop.
- Existing keyboard focus, arrow navigation, held-key suppression, interruption actions, live status, native controls, and reduced-motion handling remain represented in source.

## Focused static evidence

- Compared every integrated file byte-for-byte with the supplied moth overlay after application; no mismatches remained.
- Inspected all new relative imports and confirmed their owned targets exist. The pre-existing `src/hooks/useMountEffect.ts` prerequisite exists and was not modified.
- Inspected phase wiring and data props in `index.tsx`, `Location.tsx`, `SymmetryDecision.tsx`, `TimedBlank.tsx`, `Recall.tsx`, and `Result.tsx`; no hidden route or truth data is passed into active artwork.
- Confirmed no direct `useEffect`, additional JavaScript timer, dependency, audio path, store, or shared helper was added.
- Confirmed the sole decorative animation is scoped to the untimed welcome scene and disabled by `prefers-reduced-motion`; no transition or animation targets the memory cue or marking grid.
- Confirmed layout gaps and padding use the existing `--space-*` tokens, the stage and task grids remain square, recall cells retain `--touch-min`, and component styles remain locally prefixed.
- `git diff --check` reported no whitespace errors for tracked owned changes.
- Protected authority files `controller.ts`, `projection.ts`, `useRememberDecide.ts`, `controller.test.ts`, and `useRememberDecide.test.tsx` have no diff.

## Fixes

- No concrete post-overlay integration defect was found, so the supplied artwork and behavior were left intact.

## Verification and concerns

Tests, builds, typechecks, linters, dev servers, browser checks, and deployment were not run, as required by the non-Goal-mode task brief. The included test changes are unexecuted. Browser-visible composition, 320 px overflow/touch geometry, theme appearance, timing observation, keyboard/screen-reader behavior, and reduced-motion behavior still require user/runtime acceptance.
