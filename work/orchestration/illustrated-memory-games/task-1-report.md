# U1 report: Midnight Shunting

Status: DONE

## Changed files

- `src/components/Swapping/Answer.tsx`
- `src/components/Swapping/AudioEncoding.tsx`
- `src/components/Swapping/Board.test.tsx`
- `src/components/Swapping/Board.tsx`
- `src/components/Swapping/Instruction.tsx`
- `src/components/Swapping/Railway.test.tsx`
- `src/components/Swapping/RailwayArt.tsx`
- `src/components/Swapping/RailwayScene.tsx`
- `src/components/Swapping/Result.tsx`
- `src/components/Swapping/Setup.tsx`
- `src/components/Swapping/Swapping.scss`
- `src/components/Swapping/TrackBed.tsx`
- `src/components/Swapping/Views.test.tsx`
- `src/components/Swapping/index.test.tsx`
- `src/components/Swapping/index.tsx`
- `docs/swapping.md`

## Mechanical behavior preserved

- Kept `Swapping({ onExit })`, the `swapping` mode, configuration and generation semantics, controller transitions, phase projection, reconstruction callbacks, duplicate-token identity, scoring, solution states, audio playback and pause/resume lifecycle.
- Left `src/model/swapping/`, `controller.ts`, `projection.ts`, `useSwapping.ts`, `audio.ts` and their existing focused tests unchanged.
- Sequence positions remain one fixed left-to-right row with native horizontal scrolling; grids retain their fixed row/column geometry.

## Integration fixes

- Added the supplied illustrated railway presentation, deterministic inline SVG art, finite CSS motion and focused presentation tests.
- Replaced hidden-phase empty-token rendering with the discriminated `concealed: true` board branch. Manipulation and spoken-letter encoding cannot pass token or feedback data into the board, and concealed markup creates only identical covers and fixed position labels.
- Added result-only per-position feedback using the model's existing `sameTokenIdentity` rule, so duplicate copies remain interchangeable.
- Replaced archive copy instructions and a broken handoff-document link in `docs/swapping.md` with repository-current prerequisites and an inline manual checklist.

## Static evidence

- Compared every imported Swapping presentation/test file with `/tmp/memory-skins-integration-20260908/midnight`; the imported files match the supplied source before the repository-specific documentation correction.
- Inspected every Swapping `Board` call site: only visual encoding and result views receive token arrays; setup, manipulation and spoken-letter encoding use `concealed`.
- Inspected pause routing: the paused projection contains no round data and `index.tsx` returns before constructing any board, instruction, palette, placement or result UI.
- Inspected keyboard/touch paths, focus targets, fixed coordinate rendering, result-only reveal, reduced-motion override and CSS selector scoping.
- `git diff --check -- src/components/Swapping docs/swapping.md` passed.

Tests not run — deferred to the user under the non-Goal-Mode policy. No build, typecheck, lint, browser check, commit, push or deployment was performed.

## Concerns

None from static inspection. Runtime layout, browser focus behavior, spoken audio and animation appearance remain for the documented manual checks.
