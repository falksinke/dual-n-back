# Remember & Decide final corrections

Status: DONE

## Validation verdicts

- **Result live status — confirmed and fixed.** A6 requires the polite, atomic status region to report result availability. The controller supplies `Results available.`, but `index.tsx` excluded the result phase from rendering the region. The result phase now renders it, and the existing assembled-flow test asserts that status text.
- **Stale-handler narrowing — confirmed and fixed.** The callback-ownership test narrowed a mutable `view` and then referenced it inside an `act` callback. The two decision renders now use separate `const` snapshots, preserving the discriminated-union narrowing across the callbacks.
- **Unused projection helper — confirmed and fixed.** Repository search found `isTimedProjection` only at its declaration. The unused export and its now-unused `TimedPhase` import were removed.
- **README modality entry — rejected for this correction scope.** The standing parent guidance recommends updating README/changelog for modality or UX changes, but the accepted U3 plan expressly restricts documentation ownership to `docs/working-memory-trainer.md` and the new `docs/remember-decide.md`. `README.md` was already dirty, is outside this task's file ownership, and was therefore left untouched. The scoped plan is the more specific implementation contract for this delivery.

## Changed files

- `src/components/RememberDecide/index.tsx`
- `src/components/RememberDecide/index.test.tsx`
- `src/components/RememberDecide/useRememberDecide.test.tsx`
- `src/components/RememberDecide/projection.ts`
- `work/orchestration/remember-decide/final-corrections.md`

## Evidence

Static inspection only. Inspected A6 and U3, searched repository references for `isTimedProjection`, and inspected the bounded diff. Tests, builds, typechecks, linters, and browser checks were not run under the explicit non-Goal-Mode policy.
