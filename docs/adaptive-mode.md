# Adaptive mode

Adaptive is a dual-track curriculum beside Free-play. Free-play leaves level, interference, variable N, and ISI under manual control. Adaptive owns those knobs from a per-mode ladder and advances with **lure-sensitive d′ gates**, not Match % alone.

The ladder structures practice so trainees learn **cyclic one-slot updating** at a fixed N, then automate it under lure and speed pressure, then optionally add flexible lag. It is **not** a claim of improved general intelligence, far transfer, or IQ gains.

## Why this shape

| Phase | Role |
|-------|------|
| **Teach (instruction → guided → fade)** | Explicit cyclic strategy: compare → replace → next. A slot pointer scaffolds which of N positions is active; contents stay hidden. |
| **Verify (fixed assessed stages)** | Clean fixed-N play, then near / both lures, with SDT gates (clean d′, lure d′ / false-alarm control). |
| **Automate (fast → jitter → mastery)** | Tighten ISI and add jitter so the cyclic habit holds under pace pressure. Variable N stays **off**. |
| **Flexible lag (after fixed mastery)** | Variable N unlocks as a separate skill family at the same N, then N increases and the fixed track restarts. |

Mode (Dual / Tri / Quad) is chosen by the trainee; each mode has its **own** ladder.

## Session loop

1. Choose **Adaptive** and a mode (Dual / Tri / Quad).
2. On a new N, read the short strategy instruction, then continue into guided practice with the slot pointer.
3. Assessed blocks use lure-stage generation and SDT metrics for promote / hold / demote.
4. An interstitial shows the result and progression action; continue starts the next block at the updated stage.

There is no fixed session length: Adaptive is an open one-block loop with breaks between blocks.

## Tracks and stages

### Fixed cyclic track (variable N off)

| Stage | Intent |
|-------|--------|
| `instruction` | Mandatory cyclic-updating copy; continue → guided |
| `guided` | Slot pointer full; lure stage A (clean) |
| `fade` | Pointer fades; still acquisition |
| `fixed_clean` | Assessed clean fixed-N |
| `fixed_lure_near` | Near lures |
| `fixed_lure_both` | Near + both-stream lures |
| `fixed_fast` | Faster ISI |
| `fixed_jitter` | Variable ISI (± around base) |
| `fixed_mastery` | Last fixed gate; promote unlocks flexible track |

### Flexible lag track (variable N on)

| Stage | Intent |
|-------|--------|
| `flex_base` | Variable N at comfortable pace |
| `flex_fast` | Faster ISI |
| `flex_jitter` | Variable ISI |
| `flex_mastery` | Promote → N↑ and restart fixed track at instruction |

N ranges from **2** through **9**.

## Progression rules

Source of truth: `src/model/adaptiveController.ts` + `src/model/adaptiveCurriculum.ts`.

| Rule | Behavior |
|------|----------|
| Acquisition | Instruction → guided → fade advances without Match-% gates (instruction via UI continue; guided/fade via controller / practice completion) |
| Promote (assessed) | Clean / lure d′ gates met (and related lure FA / sparse-Hold rules) → advance **one** stage |
| Hold | Gates not met → stay; fail streak +1 |
| Demote | **3** consecutive fails → drop **one** stage; fail streak resets |
| Modality collapse | Extra collapse rules can demote when modality streams diverge |

Manual − / + in Settings jumps stages and clears the fail streak. Match % may still appear on results for feedback; it is **not** the Adaptive promote gate.

## Modes

Mode selects which modality streams must be tracked (Dual / Tri / Quad). Adaptive does **not** auto-escalate mode. Ladder position (`track`, `n`, `stage`, streaks) is stored **per mode**.

## Persistence

- Local key: `nback-adaptive-ladder` (**schema v3**), per mode (`CurriculumLadderState`).
- Older Match-% ladder snapshots (v2) reset to the default curriculum when loaded.
- Optional cloud sync when a **player code** is set (ladder + settings + UI prefs via `/api/progress`).

## Related code

| Module | Role |
|--------|------|
| `src/model/adaptiveCurriculum.ts` | Stages, tracks, settings from curriculum |
| `src/model/adaptiveController.ts` | SDT promote / hold / demote |
| `src/store/adaptiveSession.ts` | Block end → progression → interstitial |
| `src/model/variableN.ts` | Lag sampling (flexible track) |
| `src/model/ladderPersistence.ts` | Local ladder snapshot (v3) |
| `src/components/adaptiveDisplay.ts` | HUD / stage summaries |
| `src/components/StrategyInstruction/` | Teach screen |
| `src/components/SlotPointerHud/` | Active-slot scaffold |

For Free-play knobs and cloud sync details, see the README.
