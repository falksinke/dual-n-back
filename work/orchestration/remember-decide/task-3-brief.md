# U3 integration brief
Implement only src/App.tsx, src/components/TrainerHome/index.tsx, docs/working-memory-trainer.md, new src/App.rememberDecide.test.tsx, docs/remember-decide.md. Context work/context/remember-decide.md. U2 report task-2-report.md supplies shell contract. Add explicit mode routing, no fallback to Swapping. Preserve existing modes/store/settings and unrelated edits. No Git mutations or agents or runtime verification. Add named tests unrun; inspect App.swapping.test.tsx patterns. Consult React/animation skills already named in U2 before the relevant edits. Read /Users/falksinke/.codex/skills/writing/SKILL.md for English usage documentation; keep docs concise and factual, no research or extra writing workflow. Write task-3-report.md, return short status. You are not alone in checkout.

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

### U3. Trainer integration and usage documentation

- **Goal:** Make the new exercise reachable as a peer mode with independent lifecycle and scores.
- **Requirements:** R1, R13 and the entry/exit portion of R10–R12.
- **Dependencies:** U2. Small integration responsibility; owner restricted to the files below.
- **Files:** Modify `src/App.tsx`, `src/components/TrainerHome/index.tsx`, and `docs/working-memory-trainer.md`; create `src/App.rememberDecide.test.tsx` and `docs/remember-decide.md`.
- **Approach:** Add one mode value and one home entry. Replace the App's current two-way practice branch with explicit mode selection so the new value cannot fall through to Swapping. Follow `src/App.swapping.test.tsx` for isolated navigation checks. No changes to existing game stores, routes, manifests, or deployment configuration.
- **Test scenarios:**
  1. Home opens Remember & Decide; Exit returns home; the other entries still select their respective games.
  2. N-back keyboard controls are absent on home and in the new mode, and restored only when N-back is selected.
  3. Leaving and reopening the new mode resets its transient state; N-back history is unchanged.
- **Done when / verification:** Navigation, accessible entry text, usage documentation, and scoped assertions are present and statically inspected.

### Sequencing and Ownership

Work U1 → U2 → U3. Do not parallelize dependent implementation. Use independent review for the completed timing/state work and integration, with bounded correction rounds. Preserve unrelated working-tree changes; record implementation progress outside this plan.

---

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

