/** Absolute bounds for ISI settings (ms) — inter-stimulus interval, onset → next onset. */
export const ISI_ABSOLUTE_MIN_MS = 500;
export const ISI_ABSOLUTE_MAX_MS = 5000;
export const ISI_STEP_MS = 100;

/** Adaptive tier 0 keeps a wide onset range; free-play first-run uses FREE_PLAY_* below. */
export const DEFAULT_ISI_MIN_MS = 500;
export const DEFAULT_ISI_MAX_MS = 5000;

/** First-user free-play ISI range (onset → next onset). */
export const FREE_PLAY_DEFAULT_ISI_MIN_MS = 1000;
export const FREE_PLAY_DEFAULT_ISI_MAX_MS = 1500;

/** Fixed how long the board square stays lit (not the ISI). */
export const STIMULUS_DURATION_MS = 1000;

/** Off-frame before re-lighting the same cell when ISI < stimulus duration. */
export const STIMULUS_RETRIGGER_GAP_MS = 80;

/**
 * Cap on how long match buttons keep success/error color after scoring.
 * Actual clear is min(this, time until next onset) so feedback cannot outlive
 * the trial gap and drift like a fixed-duration queue.
 */
export const BUTTON_FEEDBACK_MS = 500;

/**
 * When onset-to-onset equals the response window (fixed / single ISI), prefer to
 * carve this many ms out of the answer window for visible button feedback so the
 * next onset does not wipe colors in the same turn. Onset spacing stays exactly ISI.
 * Skipped when that would leave less than {@link MIN_CLAIM_MS_FOR_FEEDBACK_RESERVE}
 * of claim time (e.g. fixed 1.0s ISI stays fully responsive) — in that case the
 * same duration is still used as an overlap flash carried into the next onset.
 */
export const BUTTON_FEEDBACK_RESERVE_MS = 200;

/**
 * Minimum claim window that must remain after carving {@link BUTTON_FEEDBACK_RESERVE_MS}.
 * Fixed 1.0s ISI (common Adaptive / high-speed) must not shrink to 800ms.
 */
export const MIN_CLAIM_MS_FOR_FEEDBACK_RESERVE = 1000;

/**
 * Extra claim time after the ISI scoring window (extends onset gap).
 * Configurable in settings; applied every trial.
 */
export const ANSWER_GRACE_MIN_MS = 0;
export const ANSWER_GRACE_MAX_MS = 500;
export const ANSWER_GRACE_STEP_MS = 50;
export const ANSWER_GRACE_DEFAULT_MS = 250;

/** @deprecated Use ANSWER_GRACE_DEFAULT_MS — kept for older test comments. */
export const SHORT_ISI_ANSWER_GRACE_MS = ANSWER_GRACE_DEFAULT_MS;

export const clampAnswerGraceMs = (ms: number): number => {
    if (!Number.isFinite(ms)) return ANSWER_GRACE_DEFAULT_MS;
    const stepped = Math.round(ms / ANSWER_GRACE_STEP_MS) * ANSWER_GRACE_STEP_MS;
    return Math.min(ANSWER_GRACE_MAX_MS, Math.max(ANSWER_GRACE_MIN_MS, stepped));
};

export const clampIsiMs = (ms: number): number => {
    const stepped = Math.round(ms / ISI_STEP_MS) * ISI_STEP_MS;
    return Math.min(ISI_ABSOLUTE_MAX_MS, Math.max(ISI_ABSOLUTE_MIN_MS, stepped));
};

export const msToSecondsLabel = (ms: number): string => {
    const seconds = ms / 1000;
    return Number.isInteger(seconds) ? `${seconds}` : seconds.toFixed(1);
};
