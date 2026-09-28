/** Free-play Easy: no deliberate lures, and avoid accidental near-miss values. */
export const INTERFERENCE_EASY = 'easy' as const;

/** BW-style interference fractions: 0 (Off), 1/8 … 1. */
export const INTERFERENCE_CHANCE_OPTIONS = [
    0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1,
] as const;

export const INTERFERENCE_OPTIONS = [
    INTERFERENCE_EASY,
    ...INTERFERENCE_CHANCE_OPTIONS,
] as const;

export type InterferenceChanceOption = (typeof INTERFERENCE_CHANCE_OPTIONS)[number];
export type InterferenceSetting = (typeof INTERFERENCE_OPTIONS)[number];

export function isInterferenceEasy(value: unknown): value is typeof INTERFERENCE_EASY {
    return value === INTERFERENCE_EASY;
}

export function isInterferenceChanceOption(value: unknown): value is InterferenceChanceOption {
    return (
        typeof value === 'number' &&
        INTERFERENCE_CHANCE_OPTIONS.some((option) => option === value)
    );
}

/** Numeric lure rate for planners; Easy behaves like Off (0). */
export function interferenceRate(value: InterferenceSetting): number {
    return value === INTERFERENCE_EASY ? 0 : value;
}

/**
 * Offsets relative to effective N used for deliberate near-miss lures
 * (`lag = effectiveN + offset`). Easy avoidance uses the same set.
 */
export function interferenceLureOffsets(sessionLevel: number): number[] {
    return sessionLevel < 3 ? [1, sessionLevel] : [-1, 1, sessionLevel];
}
