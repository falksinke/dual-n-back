# Adaptive and Cyclic training

Beside Free-play (manual knobs), the app offers two ladder-driven paths:

| Path | `playMode` | Progression | Persistence |
|------|------------|-------------|-------------|
| **Adaptive** | `adaptive` | Overall **Match %** ≥ 80% promotes; 3 fails demote | `nback-adaptive-ladder` (schema **v2**, `levelIndex`) |
| **Cyclic** | `cyclic` | Lure-sensitive **d′** gates on a dual-track curriculum | `nback-cyclic-ladder` (schema **v4**, track/stage) |

Neither path claims improved general intelligence, far transfer, or IQ gains.

Mode (Dual / Tri / Quad) is always trainee-chosen; each path stores a **per-mode** ladder.

---

## Adaptive (Match% ladder)

Classic discrete ladder: for each `n` from 2–9, a 10-step recipe, then `n+1` restarts at step 0.

| Step | Condition |
|------|-----------|
| 0 | Fixed ISI **2.5 s**, no interference, fixed N |
| 1 | Same pace, interference **on** (⅛) |
| 2–4 | ISI **2.0 / 1.5 / 1.0 s**, interference on |
| 5 | ISI **1.0 s ±10%**, interference on |
| 6–8 | ISI **2.0 / 1.5 / 1.0 s**, interference + **variable N** |
| 9 | ISI **1.0 s ±10%**, interference + variable N |

### Progression

Source: `src/model/adaptiveLevels.ts`.

| Rule | Value |
|------|--------|
| Promote | Match % ≥ **80%** → advance **one** step; fail streak resets |
| Hold | Match % &lt; 80% → stay; fail streak +1 |
| Demote | **3** consecutive fails → drop **one** step; fail streak resets |

No strategy instruction or slot pointer. Interference uses `interferenceChance` (not lure stages).

---

## Cyclic (curriculum)

Teaches **cyclic one-slot updating** (compare → replace → next), verifies with lures, then automates under speed/jitter. Variable N stays off until fixed mastery, then a flexible-lag track unlocks.

### Why this shape

| Phase | Role |
|-------|------|
| **Teach (walkthrough → decide → ramp)** | Reveal-first acquisition: stored slot contents visible for active modalities; learner-paced COMPARE → REPLACE → NEXT; soft-warned **I've got it** opt-out into a speed ramp. |
| **Verify (fixed assessed stages)** | Clean fixed-N, then near / both lures, with SDT gates. |
| **Automate (fast → jitter → mastery)** | Tighten ISI and add jitter. Variable N off. |
| **Flexible lag (after fixed mastery)** | Variable N at the same N, then N↑ and fixed track restarts. |

### Session loop

1. Choose **Cyclic** and a mode.
2. On a new N, read the short strategy blurb → in-session walkthrough with reveals → decide-with-reveal → optional opt-out → speed ramp.
3. Assessed blocks use lure-stage generation and SDT metrics.
4. Interstitial → continue at the updated stage.

### Fixed track stages (variable N off)

`teach_walkthrough` → `teach_decide` → `teach_ramp` → `fixed_clean` → `fixed_lure_near` → `fixed_lure_both` → `fixed_fast` → `fixed_jitter` → `fixed_mastery`

Legacy persisted stages migrate: `instruction` → `teach_walkthrough`, `guided` → `teach_decide`, `fade` → `teach_ramp`.

### Flexible track (variable N on)

`flex_base` → `flex_fast` → `flex_jitter` → `flex_mastery` → N↑ + fixed restart

### Progression

Source: `src/model/adaptiveController.ts` + `src/model/adaptiveCurriculum.ts`.

Assessed blocks promote/hold/demote with clean/lure d′ (and related) gates. **3** consecutive fails demote one stage. Match % may appear on results but is not the Cyclic promote gate.

---

## Persistence and cloud

- Adaptive: `nback-adaptive-ladder` v2 (`levelIndex`, `failStreak`).
- Cyclic: `nback-cyclic-ladder` v3 (curriculum state).
- If an old v3 curriculum blob is still under the Adaptive key, it migrates into the Cyclic key on load.
- Cloud progress documents include **both** ladders plus settings / UI prefs when a player code is set.

## Related code

| Module | Role |
|--------|------|
| `src/model/adaptiveLevels.ts` | Match% recipe + promote/demote |
| `src/model/adaptiveCurriculum.ts` | Cyclic stages / settings |
| `src/model/adaptiveController.ts` | Cyclic SDT gates |
| `src/store/adaptiveSession.ts` | Block config + end for both paths |
| `src/model/ladderPersistence.ts` | Dual local ladder storage |
| `src/components/StrategyInstruction/` | Cyclic teach screen |
| `src/components/SlotPointerHud/` | Cyclic active-slot scaffold |

For Free-play knobs and cloud sync details, see the README.
