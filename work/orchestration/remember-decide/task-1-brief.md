# U1 brief
Implement U1 only in src/model/rememberDecide, six named files. Read context packet work/context/remember-decide.md. You are not alone; preserve unrelated edits, no Git mutations, no agents, no runtime checks. Inspect existing model/swapping generator/scoring/tests for conventions. Define exported immutable config, round, item, decision response and score contracts suitable for U2. Implement named tests without running them. Report detailed changed paths, API contracts, static evidence and concerns in task-1-report.md; return DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED plus short summary.

## Goal Capsule

- **Objective:** Let players practise remembering a growing sequence while repeatedly switching attention to an unrelated decision.
- **Means:** A spatial complex-span exercise named **Remember & Decide**, following the Product Contract below.
- **Authority:** The user's accepted exercise choice governs the product. This plan supplies proposed defaults and implementation boundaries. Explicit user corrections take precedence.
- **Execution profile:** Planning only for this delivery. A later implementation follows U1–U3 and the Verification Contract; this document does not authorize deployment.
- **Stop condition:** The exercise works from the shared trainer home through an independently scored result, with interruption and information-hiding rules satisfied. No additional games or shared scoring framework.
- **Target:** The React `nback` repository containing `src/components/TrainerHome`, currently on `codex/working-memory-trainer` at `2198769`. The separate elevator checkout is not an implementation target.

---

## Product Contract

### Summary

Add Remember & Decide as a fourth exercise on the Working Memory Trainer home. Alternate a highlighted location with a vertical-symmetry judgement, then ask the player to reproduce the locations in order. Report memory and judgement accuracy separately.

### Problem Frame

N-back, elevator tracking, Swapping, and spatial sequences already involve retention, updating, manipulation, or ordered recall. The agreed addition makes the player repeatedly maintain stored information while attention is occupied by a separate task. The existing spatial mode's maths challenge follows the entire sequence; it does not interleave a decision between every remembered location.

### Key Decisions

- **Choose spatial complex span.** (session-settled: user-approved — chosen over object–location binding: it adds a more distinct task structure to the current suite.) Governs R1, R2.
- **Both tasks matter; loads remain separate.** (session-settled: user-approved — chosen over recall-only success and a single combined difficulty: timeouts or a fixed-answer strategy must not earn a progression recommendation.) Governs R3, R7, R8.

### Requirements

**Entry and task sequence**

- R1. The home offers **Remember & Decide**, subtitled **Spatial complex span**, alongside the current modes. Exit returns home without changing their settings or progress.
- R2. A round follows `location → symmetry judgement` once per remembered item, including the final item, then enters ordered recall. The setup explains this and shows an unscored, labelled example.
- R3. Setup independently controls sequence length, symmetry difficulty, and judgement deadline. Their concrete v1 values are proposed in A1–A3 below; settings are frozen throughout a round.
- R4. Show one highlighted cell on a fixed memory grid for the configured exposure, then a blank transition before the symmetry figure. During judgement, no remembered location is present in the view or accessibility tree.
- R5. Present a square-cell pattern and ask **Is this vertically symmetrical?** Provide **Yes** and **No** buttons. Accept one response per item; a timeout records a processing error and continues. Do not reveal correctness until the result.

**Recall, scoring, and progression**

- R6. Recall uses the same empty location grid. Each selected cell appends one location to a visible numbered answer strip; repeated locations remain valid. Offer **Undo**, **Clear**, and **Submit**, with Submit enabled only at the requested length. Do not reveal correctness or auto-submit during entry.
- R7. Results show correctly recalled positions, exact-sequence success, judgement accuracy, and timeout count. A memory error never changes the judgement score; a judgement error never changes the memory score.
- R8. Recommend a longer sequence only when the full recalled sequence is correct and the judgement criterion in A4 is met. Apply the increase only when the player selects **Try next length**; change no other setting. Manual setup remains available, and is not constrained by this recommendation.
- R9. Results offer **New round**, **Settings**, and **Exit**, plus the conditional action in R8. A result-only review shows submitted versus correct locations and each symmetry figure with its correct answer, player answer, and timeout status.

**Interruption and interaction**

- R10. A persistent native **Pause** button is available during location presentation, both blank transitions, judgement, and recall; Tab reaches it and Enter/Space activates it. Pause or page hiding in any of those phases discards the attempt without a result. Hide all task material and show **Round interrupted** with **Restart round**, **Settings**, and **Exit**. Restart generates a fresh round at the same settings; no answers or scores carry over. Setup must disclose this restart policy.
- R11. Exit and unmount cancel pending timers. Responses and callbacks from an earlier round, item, or phase cannot affect the current round, and held keys cannot answer multiple items.
- R12. All actions support keyboard and touch. Use visible focus, row/column labels for location cells, and shape/fill contrast that does not depend on colour alone. Never announce symmetry truth or prior locations during a scored round.
- R13. Results and settings are local to this mode's current visit. Do not write to N-back storage, daily progress, sync, or a combined trainer score. Reload returns to trainer home.

### Acceptance Examples

- AE1. **Successful alternation.** With length 3, locations R1C2, R3C4, R2C1, and truth labels Yes, No, Yes, the player sees a separate symmetry judgement after each location. Recalling those locations in order and answering all three judgements correctly yields memory 3/3, exact success, decisions 3/3, and the next-length action. Covers R2, R4–R8.
- AE2. **Ignoring decisions does not pass.** At length 5, exact recall with three correct judgements and two timeouts yields memory 5/5, decisions 3/5, two timeouts, and no next-length recommendation. Covers R5, R7, R8.
- AE3. **Position-specific recall.** For target A, B, A and response A, A, B, memory is 1/3, not a set-membership score. The answer strip permits repeated A. Covers R6, R7.
- AE4. **Interrupted attempt.** Hiding the page after two judgements clears the attempt and shows the interruption screen on return. Restart produces a new round with zero responses. A late timeout from the old round has no effect. Covers R10, R11.
- AE5. **Deadline race.** A judgement arriving at or after its deadline counts as a timeout even if the scheduled timeout callback has not run yet. An on-time response accepted first cannot subsequently be overwritten by that callback. Covers R5, R11.
- AE6. **Independent progression.** At length 5, exact recall and four correct judgements, including a correct Yes and a correct No, qualify. Selecting Try next length starts length 6 with unchanged judgement difficulty/deadline. At maximum length, show completion feedback without a disabled or impossible increase action. Covers R7–R9.

- AE7. **Fixed-answer protection.** With five judgements containing four symmetric figures and one asymmetric figure, always answering Yes yields 4/5 but no increase recommendation. A perfectly answered all-symmetric round also receives normal scores without an increase recommendation. Covers R7, R8 and A4.

### Scope Boundaries

This plan adds one visual training exercise. It does not add verbal/audio variants, adaptive psychometric calibration, durable history, cross-mode totals, a training schedule, or elevator integration. It makes no clinical assessment, IQ, normative working-memory-capacity, or broad cognitive-transfer claims.

---

## Planning Contract

### Assumptions and Proposed Defaults

These are planning choices, not previously user-approved values. They provide a concrete starting point; changing them before implementation does not require redesigning the architecture.

- A1. **Memory presentation:** 4×4 grid; sequence length 2–8, default 3; one cell visible for 1,000 ms, then blank for 250 ms. Sample locations independently except for immediately repeating the previous location. Nonconsecutive repeats are allowed. Exposure and grid size are fixed in v1.
- A2. **Symmetry patterns:** 6×6 grid with a vertical axis between columns 3 and 4. Every figure has exactly 18 filled cells. The judgement setting is **More differences**, **Some differences**, or **Fewer differences**, default More differences; asymmetric figures have respectively 6, 4, or 2 mismatched mirrored cell-pairs. Symmetric figures always have zero. Setup explains that this controls how closely a non-symmetric figure resembles its mirror. These are geometric controls, not calibrated difficulty levels.
- A3. **Judgement timing:** deadline choices 3, 5, or 8 seconds, default 5. The timer starts only after the current figure is mounted. After an accepted answer or timeout, show a neutral blank transition for 250 ms, then the next location or recall. No correctness feedback occurs in that gap.
- A4. **Recommendation:** exact recall, at least 80% correct judgements in the completed round, and at least one correctly answered symmetric figure and one correctly answered asymmetric figure in that round. Compare integer counts against `ceil(0.8 × length)`, including timeouts in the denominator. Thus length 3 requires 3/3, length 5 requires 4/5. This is a training rule, not a validated threshold. One qualifying round enables an optional one-item increase up to 8; no automatic increase or demotion. A round containing only one truth class still receives its normal scores but cannot qualify: show “Try another round to answer both pattern types.” Do not force class balance to avoid that outcome. This gate rejects always-Yes/always-No play; it does not claim to detect every guessing strategy.
- A5. **Access:** support keyboard and touch for the visual task. Provide the current pattern as an accessible row-by-row filled/empty description, without naming the correct answer. A screen-reader equivalent with separately calibrated pacing is deferred; do not claim equivalence with the visual task.
- A6. **Focus and announcements:** keep Pause and Exit in a persistent header during active phases. Preserve focus there if the player has moved to those controls. Otherwise, focus a neutral phase heading for location, blank transitions, and judgement; the judgement heading describes the current figure and precedes Yes/No in tab order. Focus the first recall cell on recall entry, the interruption heading after interruption, the result heading after submission, and the setup heading when returning to settings. A polite, atomic status region reports phase/item number, timeout, interruption, and result availability; it does not queue remembered coordinates, pattern truth, or a ticking countdown. Current coordinates/pattern details remain available only in their active phase's accessible description. Discard obsolete status content on transitions. Restart uses the same start focus rule.
- A7. **Narrow layout:** use one column, fully visible square grids, and recall cells at least 44×44 CSS pixels. The non-interactive 6×6 pattern may use smaller cells. Answer-strip entries and action groups wrap in order; the page scrolls vertically when needed, never horizontally. Keep the active grid's bounding area stable across location/decision transitions. Use existing spacing tokens for all gaps and padding.

### Key Technical Decisions

- KTD1. **Dedicated local state machine.** Follow the Swapping controller/projection split and SpatialPractice timer cancellation pattern. Pure generation/scoring belongs in `src/model/rememberDecide`, phase state/UI in `src/components/RememberDecide`, and the R1/R13 entry seam in U3's existing integration files. Do not expand the N-back store or refactor the existing games into a framework.
- KTD2. **Generate the round before presentation.** A pure domain module owns configuration validation, locations, pattern construction, and scoring. Inject randomness for deterministic tests. Sample each judgement's true/false class independently with equal probability; do not enforce per-round balance that lets players infer the final answer from prior items.
- KTD3. **Construct truth, then verify it.** For a symmetric figure, choose 9 of the 18 mirrored pairs and fill both cells. For an asymmetric figure, start from that construction and relocate one filled cell to one empty cell across distinct pairs, once, twice, or three times for Fewer differences, Some differences, or More differences. Use disjoint source/destination pairs so counts in A2 are exact. Derive truth from the resulting cells with a vertical-mirror predicate, not from a filename or requested class. No downloaded figures or new assets are required.
- KTD4. **One authority for timer decisions.** The controller receives round generation, item index, phase identity, and monotonic event time. The hook owns timer scheduling and a synchronous state ref. Both clicks and timeout callbacks settle the same pending judgement against its stored deadline, per AE5. Cancel/invalidate on every transition, interruption, and exit.
- KTD5. **Narrow render projections.** Location views receive only the current location; decision views receive only the current figure; recall receives only entered answers. Keep the full round and truth in the controller, never hidden DOM, CSS-obscured nodes, or pre-result accessible labels. Result views alone receive review data.
- KTD6. **Local styling and native controls.** Use existing theme variables and LiftKit spacing tokens. Keep the memory and pattern grids square and screen-stable; no moving/rotating figures, celebratory animation, or sound dependency. Consult the existing animation-design and React effect rules before implementation. Use mount-only synchronization for timer/listener setup and cleanup, not direct new `useEffect` calls.

### U1. Round generation and separate scoring

- **Goal:** Produce unambiguous rounds and deterministic score outcomes.
- **Requirements:** R3, R5, R7, R8; AE2, AE3, AE5–AE7; A1–A4; KTD2, KTD3.
- **Dependencies:** None. Small, low-risk domain responsibility; owner restricted to the new domain directory.
- **Files:** Create `src/model/rememberDecide/types.ts`, `generator.ts`, `scoring.ts`, `index.ts`, `generator.test.ts`, and `scoring.test.ts`.
- **Approach:** Define immutable round/config/result data, including per-item decision truth and responses. Keep generation independent of React and timing effects. Follow `src/model/swapping` for pure validation and injected randomness.
- **Test scenarios:**
  1. Minimum/maximum length and all deadline/difficulty options validate; invalid and nonfinite values fail without starting a round.
  2. Symmetric and asymmetric construction has 18 filled cells and exactly the required mismatch count for every asymmetry setting.
  3. Deterministic random streams generate both truth classes; constant streams terminate without rejection loops.
  4. Locations remain in bounds, permit nonconsecutive repeats, and exclude immediate repeats.
  5. Covers AE2, AE3, AE6, AE7: exact versus positional recall, timeout denominators, 80% rounding, required correct answers from both truth classes, all-one-class rounds, fixed-answer play, and the maximum-length boundary.
- **Done when / verification:** Domain contracts cover these cases, and the implementation is statically inspected. Execute focused tests only under the Verification Contract.

## Verification Contract

**During planning:** source/document inspection only. No tests, typechecks, builds, linters, dev servers, or browser checks.

**Outside Goal Mode:** implement the named tests but do not execute them unless the user asks. Inspect owned diffs and immediate call sites, collect the required independent review, and report unexecuted checks explicitly. Missing runtime evidence does not by itself keep implementation open.

**In Goal Mode or with explicit testing authorization:** run the focused Vitest files under `src/model/rememberDecide`, `src/components/RememberDecide`, and `src/App.rememberDecide.test.tsx` using the existing `pnpm test` script. Use fake timers for phase/deadline cases. Perform one affected-flow browser check for visual layout and keyboard/touch access, including a narrow viewport and interruption. Do not run the full repository suite or add new validation infrastructure. A targeted build/typecheck needs a concrete integration reason.

Required evidence distinguishes source inspection, executed tests, and rendered acceptance. Existing tests in other modes are reused only when an actual change or failure points to them.

---

## Definition of Done

- U1–U3 meet their scoped done criteria and all Product Requirements have an implementation owner.
- Players can complete the alternating exercise and see independent memory/judgement results; interruptions produce no result.
- No unresolved correctness or scope findings remain after proportionate independent review.
- Only authorized verification has run, and the handoff names any unrun tests or unresolved visual/timing acceptance.
- No unrelated edits, abandoned prototypes, new persistence, or deployment changes enter the feature commits.

---

