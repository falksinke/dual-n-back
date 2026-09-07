# U1 implementation report

Status: DONE

## Changed paths

- `src/model/rememberDecide/types.ts`
- `src/model/rememberDecide/generator.ts`
- `src/model/rememberDecide/scoring.ts`
- `src/model/rememberDecide/index.ts`
- `src/model/rememberDecide/generator.test.ts`
- `src/model/rememberDecide/scoring.test.ts`

## Exported contract

- `RememberDecideConfig`: immutable `sequenceLength` (2–8), `symmetryDifficulty` (`more | some | fewer`), and `judgementDeadlineMs` (`3000 | 5000 | 8000`).
- `validateConfig(config)`: typed result with configuration error codes; rejects out-of-range, fractional, and nonfinite lengths as well as unsupported difficulty/deadline values.
- `generateRound(config, random?)`: typed result containing an immutable config snapshot and ordered items. Each item exposes its zero-based index, 4×4 location, 36-entry row-major pattern, and truth derived with `isVerticallySymmetric`.
- `createSymmetryPattern`, `isVerticallySymmetric`, and `countMismatchedMirrorPairs`: pure pattern helpers. Patterns always contain 18 filled cells; asymmetric `more`, `some`, and `fewer` patterns contain 6, 4, and 2 mismatched mirror pairs.
- `DecisionResponse`: item index, `yes | no | null`, and timeout flag. The controller remains responsible for accepting only the first response and adjudicating event timestamps against its deadline.
- `scoreRound(round, recalled, decisions)`: reports position-specific recall, exact-sequence success, judgement score, timeout count, required ceiling-80% count, correct answers split by truth class, normalized per-item decision review, and progression recommendation.
- `recommendation`: `canIncrease`, `nextLength`, and reason (`increase`, `maximum-length`, `recall-inexact`, `judgement-threshold`, or `both-truth-classes-required`). At length 8, qualifying performance reports maximum completion with no impossible next length.

U2 handoff: the all-one-truth-class message required by A4 should be derived from the round/score truth-class counts even when another recommendation reason has priority. Display “Try another round to answer both pattern types.” whenever the completed round contains only one truth class. Truth and full round data must remain in controller authority until results.

## Static evidence

- Inspected existing `src/model/swapping` pure generator, result-union, barrel-export, scoring, and Vitest conventions before implementation.
- Inspected all six owned files after writing for contract consistency and requirement coverage.
- Added focused tests for configuration boundaries, invalid/nonfinite inputs, exact pattern counts, deterministic constant random sources, location constraints/repeats, positional recall, timeout denominator, ceiling threshold, truth-class gate, fixed-answer play, and maximum length.
- No files outside the assigned domain directory were edited. This report is the only assigned orchestration artifact changed.

## Verification

Tests not run — deferred to the user under the non-Goal-Mode policy. No build, typecheck, lint, browser, dev server, or runtime command was run. Evidence is source inspection and static self-review only.

## Concerns

- Deadline race behavior belongs to U2's controller because it owns monotonic event time and pending timer identity; U1 supplies the response contract and scoring semantics only.
- Scoring normalizes a missing response as a timeout for result review. U2 should still create explicit timeout responses when deadlines expire.
