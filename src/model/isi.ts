/** Absolute bounds for ISI settings (ms) — inter-stimulus interval, onset → next onset. */
export const ISI_ABSOLUTE_MIN_MS = 500;
export const ISI_ABSOLUTE_MAX_MS = 3000;
export const ISI_STEP_MS = 100;

export const DEFAULT_ISI_MIN_MS = 500;
export const DEFAULT_ISI_MAX_MS = 3000;

/** Fixed how long the board square stays lit (not the ISI). */
export const STIMULUS_DURATION_MS = 1000;

export const clampIsiMs = (ms: number): number => {
    const stepped = Math.round(ms / ISI_STEP_MS) * ISI_STEP_MS;
    return Math.min(ISI_ABSOLUTE_MAX_MS, Math.max(ISI_ABSOLUTE_MIN_MS, stepped));
};

export const msToSecondsLabel = (ms: number): string => {
    const seconds = ms / 1000;
    return Number.isInteger(seconds) ? `${seconds}` : seconds.toFixed(1);
};
