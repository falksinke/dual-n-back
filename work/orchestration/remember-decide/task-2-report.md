# U2 timed UI implementation report

Status: DONE

## Changed paths

- `src/components/RememberDecide/controller.ts`
- `src/components/RememberDecide/projection.ts`
- `src/components/RememberDecide/useRememberDecide.ts`
- `src/components/RememberDecide/index.tsx`
- `src/components/RememberDecide/Setup.tsx`
- `src/components/RememberDecide/Location.tsx`
- `src/components/RememberDecide/SymmetryDecision.tsx`
- `src/components/RememberDecide/Recall.tsx`
- `src/components/RememberDecide/Result.tsx`
- `src/components/RememberDecide/RememberDecide.scss`
- `src/components/RememberDecide/controller.test.ts`
- `src/components/RememberDecide/useRememberDecide.test.tsx`
- `src/components/RememberDecide/Views.test.tsx`
- `src/components/RememberDecide/index.test.tsx`
- `work/orchestration/remember-decide/task-2-report.md`

No existing source file was edited. The unrelated untracked `src/hooks/useMountEffect.ts` is imported but unchanged.

## Exported shell contract

- Default export `RememberDecide({ onExit })` from `src/components/RememberDecide/index.tsx`.
- The mode is fully local: setup, generated round, phase timing, decisions, recall, scores, result review, and recommendations remain inside the component/hook. It does not import or write the N-back store, persistence, progress sync, or combined scoring.
- U3 only needs to render `<RememberDecide onExit={...} />` inside the existing `practice-shell` route.

## Implemented behavior

- Setup independently controls sequence length, symmetry difference count, and judgement deadline; includes a labelled, unscored worked example and the interruption policy.
- The state machine alternates mounted `location -> blank -> decision -> blank` phases for every item, including the last decision, before recall.
- Each timed view starts its controller-owned monotonic deadline only after mount. One hook timer is guarded by a unique owner token plus round generation, phase, item index, and deadline.
- Early timer delivery re-arms the actual remaining time. User decisions compare their actual monotonic event time with the stored deadline, so input at or after the deadline records a timeout even when the timeout callback has not run.
- View callbacks bind the generation and item that rendered them. Old decision, phase-mount, recall, setup, result, pause, and exit handlers cannot act on a later round or item. A queued old timeout cannot clear a newer timer.
- Pause and page hiding discard the attempt and remove all task material. Restart generates a fresh round with the same settings. Exit and unmount clear the active timer. A lifecycle guard makes retained callbacks inert after disposal without changing controller generation during Strict Mode replay.
- Projections expose only the current location, only the current symmetry pattern, or only entered recall locations before the result. Truth, target locations, decisions, and the full round stay in controller authority until result projection.
- Recall accepts repeated cells and supports Undo, Clear, complete-only Submit, native buttons, two-dimensional arrow navigation, and numbered wrapping answers.
- Results show position score, exact-sequence status, independent judgement score, timeout count, submitted/correct locations, and per-pattern truth/player answer/timeout review. The one-truth-class message is derived from the completed round and shown regardless of the score's primary recommendation reason.
- Timed screens use a common intro height and identically sized square stage. Local responsive rules preserve 44px recall targets and wrapping actions/answers within the existing 320px practice-shell width. Only transform/opacity button feedback is animated, with reduced-motion removal.

## Static evidence

- Read the complete U2 brief, U1 report, context packet, U1 domain contract, and the existing Swapping/SpatialPractice controller, projection, hook, focus, keyboard, timer-cancellation, and style patterns.
- Applied the required React no-useEffect, animation-design, and LiftKit spacing guidance. Production U2 code contains no direct `useEffect`, persistence, store, progress-sync, or extra random-generation path.
- Inspected all 14 component files after implementation, including phase identity flow, timer cleanup/ownership, result truth-class messaging, projection boundaries, focus behavior, ARIA roles, and narrow-layout selectors.
- `git diff --no-index --check` produced no whitespace errors for the owned files after three trailing-blank corrections. Exit code 1 is expected for new-file diffs; no diagnostic output remained.
- Git status confirms the implementation is confined to the new `src/components/RememberDecide/` directory plus this owned report.

## Test coverage implemented

- Controller: full three-item alternation, before/at/after deadline behavior, accepted-answer immutability, stale item/round actions, interruption from every active phase, repeat recall, Undo/Clear, and complete-only Submit.
- Hook: Strict Mode single-runner cleanup, stale rendered answer and recall callbacks, page-hide interruption, early timer re-arm, queued-old-timeout ownership, unmount timer cleanup, and inert retained callbacks after unmount.
- Views: decision information hiding, native recall controls and arrow focus, repeated answers/editing, independent result data, all-one-truth messaging under another score reason, and local narrow-layout CSS contracts.
- Assembled shell: location/decision alternation through all three items, ordered recall and independent result scores, progression action, Pause removal of task material, and held-key suppression.

## Verification

Tests not run — deferred to the user under the non-Goal-Mode policy. No build, typecheck, lint, browser, dev server, or rendered acceptance check was run. Evidence is source inspection, static self-review, scope inspection, and whitespace inspection only.

## Concerns

- Timing behavior, Strict Mode execution, keyboard/touch behavior, focus movement, and 320px rendered geometry have implemented tests but remain runtime-unverified under the task's explicit policy.
- U3 routing/home integration is owned by the root and is not included in U2.
