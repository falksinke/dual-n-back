import { shuffle } from './random';
import type {
    BlockScore,
    DialId,
    Difficulty,
    DifficultyChange,
    Rng,
    Role,
    TrackId,
    Trial,
    TrialResponse,
} from './types';

export const TARGET_RATE = 0.3;
export const BASE_TRIALS = 20;
export const RAISE_AT = 0.85;
export const LOWER_BELOW = 0.65;
export const STIMULUS_MS = 500;

interface DialSpec {
    start: number;
    /** Signed step that makes the task harder. */
    step: number;
    /** Hardest allowed value. */
    limit: number;
}

const N_LIMIT = 9;
const LURE: DialSpec = { start: 0.1, step: 0.05, limit: 0.3 };
const ISI: DialSpec = { start: 2500, step: -250, limit: 1000 };

/** Per-track dials. `extra` is absent where a game has no fourth dial. */
export const TRACK_DIALS: Record<TrackId, { nStart: number; extra: DialSpec | null }> = {
    // Match tolerance as a fraction of the canvas diagonal: shrinks as skill grows.
    drift: { nStart: 1, extra: { start: 0.1, step: -0.01, limit: 0.05 } },
    // n = 1 would mean a zero move, so dead reckoning starts at 2.
    wayfinder: { nStart: 2, extra: null },
    // Dots per constellation.
    'pattern-shape': { nStart: 1, extra: { start: 3, step: 1, limit: 5 } },
    'pattern-relation': { nStart: 1, extra: null },
    // Probability the active rule switches on a given trial.
    shift: { nStart: 1, extra: { start: 0.15, step: 0.05, limit: 0.4 } },
    // Moving objects on screen. Five, not four: with four the flashes rarely revisit a spot.
    relay: { nStart: 1, extra: { start: 5, step: 1, limit: 8 } },
};

/** Raise order: n first, then lures, then pace, then the game's own dial. */
export const DIAL_ORDER: DialId[] = ['n', 'lure', 'isi', 'extra'];

export function initialDifficulty(track: TrackId): Difficulty {
    const dials = TRACK_DIALS[track];
    return {
        n: dials.nStart,
        lureRate: LURE.start,
        isiMs: ISI.start,
        stimulusMs: STIMULUS_MS,
        extra: dials.extra?.start ?? 0,
        raised: [],
    };
}

export const blockLength = (n: number): number => BASE_TRIALS + n;

export const levelOf = (difficulty: Difficulty): number => 1 + difficulty.raised.length;

/** Evenly paced onsets; Relay jitters its own. */
export function fixedOnsets(length: number, difficulty: Difficulty): number[] {
    const period = difficulty.stimulusMs + difficulty.isiMs;
    return Array.from({ length }, (_, i) => i * period);
}

/**
 * Roles for each trial. The first n trials have nothing to compare with, so they
 * are always fillers; the rest get ~30% targets and the current lure share.
 */
export function planRoles(length: number, n: number, lureRate: number, rng: Rng): Role[] {
    const scored = Math.max(0, length - n);
    const targets = Math.round(scored * TARGET_RATE);
    const lures = Math.min(scored - targets, Math.round(scored * lureRate));
    const pool: Role[] = [
        ...Array<Role>(targets).fill('target'),
        ...Array<Role>(lures).fill('lure'),
        ...Array<Role>(scored - targets - lures).fill('filler'),
    ];
    return [...Array<Role>(Math.min(n, length)).fill('filler'), ...shuffle(rng, pool)];
}

/** Acklam's rational approximation of the inverse standard normal CDF. */
export function inverseNormal(p: number): number {
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const low = 0.02425;
    if (p < low) {
        const q = Math.sqrt(-2 * Math.log(p));
        return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p > 1 - low) {
        const q = Math.sqrt(-2 * Math.log(1 - p));
        return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** d′ with the log-linear correction so perfect blocks stay finite. */
export function dPrime(hits: number, targets: number, falseAlarms: number, nonTargets: number): number {
    const hitRate = (hits + 0.5) / (targets + 1);
    const faRate = (falseAlarms + 0.5) / (nonTargets + 1);
    return inverseNormal(hitRate) - inverseNormal(faRate);
}

export function scoreBlock(trials: Trial<unknown>[], responses: TrialResponse[]): BlockScore {
    let hits = 0;
    let misses = 0;
    let falseAlarms = 0;
    let correctRejections = 0;
    trials.forEach((trial, i) => {
        const responded = responses[i]?.responded ?? false;
        if (trial.isTarget) {
            if (responded) hits++;
            else misses++;
        } else if (responded) falseAlarms++;
        else correctRejections++;
    });
    const denominator = hits + misses + falseAlarms;
    return {
        hits,
        misses,
        falseAlarms,
        correctRejections,
        accuracy: denominator === 0 ? 1 : hits / denominator,
        dPrime: dPrime(hits, hits + misses, falseAlarms, falseAlarms + correctRejections),
    };
}

function readDial(difficulty: Difficulty, dial: DialId): number {
    switch (dial) {
        case 'n': return difficulty.n;
        case 'lure': return difficulty.lureRate;
        case 'isi': return difficulty.isiMs;
        case 'extra': return difficulty.extra;
    }
}

function writeDial(difficulty: Difficulty, dial: DialId, value: number): Difficulty {
    switch (dial) {
        case 'n': return { ...difficulty, n: value };
        case 'lure': return { ...difficulty, lureRate: value };
        case 'isi': return { ...difficulty, isiMs: value };
        case 'extra': return { ...difficulty, extra: value };
    }
}

function dialSpec(track: TrackId, dial: DialId): DialSpec | null {
    switch (dial) {
        case 'n': return { start: TRACK_DIALS[track].nStart, step: 1, limit: N_LIMIT };
        case 'lure': return LURE;
        case 'isi': return ISI;
        case 'extra': return TRACK_DIALS[track].extra;
    }
}

const round = (value: number): number => Math.round(value * 1000) / 1000;

function canRaise(track: TrackId, difficulty: Difficulty, dial: DialId): boolean {
    const spec = dialSpec(track, dial);
    if (!spec) return false;
    const next = readDial(difficulty, dial) + spec.step;
    return spec.step > 0 ? next <= spec.limit + 1e-9 : next >= spec.limit - 1e-9;
}

/**
 * One staircase step. Raises move one dial at a time, rotating n → lures → pace →
 * game dial so no single routine settles in. Lowering undoes the latest raise.
 */
export function stepDifficulty(
    track: TrackId,
    difficulty: Difficulty,
    accuracy: number
): { difficulty: Difficulty; change: DifficultyChange } {
    const hold = { difficulty, change: { direction: 'hold' as const, dial: null, from: null, to: null } };
    if (accuracy >= RAISE_AT) {
        const last = difficulty.raised[difficulty.raised.length - 1];
        const startAt = last === undefined ? 0 : (DIAL_ORDER.indexOf(last) + 1) % DIAL_ORDER.length;
        for (let offset = 0; offset < DIAL_ORDER.length; offset++) {
            const dial = DIAL_ORDER[(startAt + offset) % DIAL_ORDER.length];
            if (!canRaise(track, difficulty, dial)) continue;
            const from = readDial(difficulty, dial);
            const to = round(from + dialSpec(track, dial)!.step);
            return {
                difficulty: { ...writeDial(difficulty, dial, to), raised: [...difficulty.raised, dial] },
                change: { direction: 'up', dial, from, to },
            };
        }
        return hold;
    }
    if (accuracy < LOWER_BELOW) {
        const dial = difficulty.raised[difficulty.raised.length - 1];
        if (dial === undefined) return hold;
        const from = readDial(difficulty, dial);
        const to = round(from - dialSpec(track, dial)!.step);
        return {
            difficulty: { ...writeDial(difficulty, dial, to), raised: difficulty.raised.slice(0, -1) },
            change: { direction: 'down', dial, from, to },
        };
    }
    return hold;
}
