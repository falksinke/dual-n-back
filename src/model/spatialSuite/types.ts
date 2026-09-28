/** Games in the spatial suite. Each owns one or more difficulty tracks. */
export type GameId = 'drift' | 'wayfinder' | 'pattern' | 'shift' | 'relay';

/** Pattern runs two task variants with separate difficulty so neither drags the other. */
export type TrackId = 'drift' | 'wayfinder' | 'pattern-shape' | 'pattern-relation' | 'shift' | 'relay';

export type Rng = () => number;

/** Positions live in the unit square; renderers scale to their own viewBox. */
export interface Point {
    x: number;
    y: number;
}

export type Role = 'target' | 'lure' | 'filler';

export type LureType =
    | 'near-miss'
    | 'n-minus-1'
    | 'n-plus-1'
    | 'off-by-one'
    | 'mirror'
    | 'displaced'
    | 'inverse'
    | 'other-rule';

export type DialId = 'n' | 'lure' | 'isi' | 'extra';

export interface Difficulty {
    n: number;
    lureRate: number;
    isiMs: number;
    stimulusMs: number;
    /** Game-specific dial: Drift tolerance, Pattern dot count, Shift switch rate, Relay objects. */
    extra: number;
    /** Dials raised so far, most recent last. Lowering undoes the latest raise. */
    raised: DialId[];
}

export interface Trial<S> {
    index: number;
    stimulus: S;
    isTarget: boolean;
    isLure: boolean;
    lureType: LureType | null;
    /** Active rule for this trial (Shift, Pattern variant). */
    rule: string | null;
}

export interface BlockPlan<S> {
    game: GameId;
    track: TrackId;
    difficulty: Difficulty;
    trials: Trial<S>[];
    /** Stimulus onsets in ms from block start. */
    onsets: number[];
    /** Rules in play for this block (Shift deck, Pattern variant). */
    rules: string[];
    holdout: boolean;
}

export interface TrialResponse {
    responded: boolean;
    rtMs: number | null;
}

export interface BlockScore {
    hits: number;
    misses: number;
    falseAlarms: number;
    correctRejections: number;
    /** hits / (hits + misses + false alarms): ignores the easy "never press" rejections. */
    accuracy: number;
    dPrime: number;
}

export type StaircaseDirection = 'up' | 'down' | 'hold';

export interface DifficultyChange {
    direction: StaircaseDirection;
    dial: DialId | null;
    from: number | null;
    to: number | null;
}

export interface BlockLog extends BlockScore {
    id: string;
    at: string;
    game: GameId;
    track: TrackId;
    rules: string[];
    n: number;
    lureRate: number;
    isiMs: number;
    extra: number;
    /** Composite level after the staircase step: 1 + number of raised dials. */
    level: number;
    change: DifficultyChange;
    holdout: boolean;
    trackedCorrect?: number;
    trackedTotal?: number;
}

export interface TrialLog {
    blockId: string;
    timestamp: string;
    game: GameId;
    rule: string | null;
    n: number;
    stimulus: unknown;
    isTarget: boolean;
    isLure: boolean;
    lureType: LureType | null;
    response: boolean;
    rtMs: number | null;
    correct: boolean;
}
