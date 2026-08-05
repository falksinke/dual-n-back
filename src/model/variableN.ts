/** Typical stretch length before lag may resample (1 = every trial). */
export const VARIABLE_N_HOLD_OPTIONS = [1, 2, 3, 5, 10] as const;
export type VariableNHoldTrials = (typeof VARIABLE_N_HOLD_OPTIONS)[number];

export function clampVariableNHoldTrials(value: number): VariableNHoldTrials {
    const stepped = Math.max(1, Math.floor(value));
    const match = VARIABLE_N_HOLD_OPTIONS.find((option) => option === stepped);
    if (match != null) return match;
    let best: VariableNHoldTrials = 1;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const option of VARIABLE_N_HOLD_OPTIONS) {
        const dist = Math.abs(option - stepped);
        if (dist < bestDist) {
            best = option;
            bestDist = dist;
        }
    }
    return best;
}

/**
 * Random stretch length with expected value `meanHold` (geometric, min 1).
 * hold=1 always returns 1 — switch every trial.
 */
export function sampleHoldLength(meanHold: number, random: () => number): number {
    const mean = Math.max(1, meanHold);
    if (mean <= 1) return 1;
    const p = 1 / mean;
    const u = Math.min(Math.max(random(), Number.EPSILON), 1 - Number.EPSILON);
    const length = 1 + Math.floor(Math.log(u) / Math.log(1 - p));
    const cap = Math.ceil(mean * 4);
    return Math.min(Math.max(1, length), cap);
}

/**
 * Sample one lag in `1…level` with geometric 2× weights: weight(k) = 2^(k-1).
 * Ceiling is twice as likely as the next-lower lag, and so on (at L=2: 1/3 + 2/3).
 */
export function sampleVariableN(level: number, random: () => number): number {
    const ceiling = Math.max(1, Math.floor(level));
    if (ceiling <= 1) return 1;
    const total = 2 ** ceiling - 1;
    const pick = random() * total;
    let acc = 0;
    for (let k = 1; k <= ceiling; k++) {
        acc += 2 ** (k - 1);
        if (pick < acc) return k;
    }
    return ceiling;
}

/**
 * Variable N list: length `trials - level`, 2×-weighted lags held for random stretches.
 * Each drawn lag is held for a stretch whose mean is `holdTrials` (1 = every trial).
 */
export function makeVariableNList(
    trials: number,
    level: number,
    random: () => number,
    holdTrials: number = 1
): number[] {
    const length = Math.max(0, trials - level);
    const hold = Math.max(1, Math.floor(holdTrials));
    const list: number[] = [];
    while (list.length < length) {
        const n = sampleVariableN(level, random);
        const stretch = sampleHoldLength(hold, random);
        for (let i = 0; i < stretch && list.length < length; i++) {
            list.push(n);
        }
    }
    return list;
}
