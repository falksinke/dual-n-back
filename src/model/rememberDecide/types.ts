export type SymmetryDifficulty = 'more' | 'some' | 'fewer';
export type DecisionAnswer = 'yes' | 'no';
export type RandomSource = () => number;

export interface RememberDecideConfig {
    readonly sequenceLength: number;
    readonly symmetryDifficulty: SymmetryDifficulty;
    readonly judgementDeadlineMs: 3000 | 5000 | 8000;
}

export interface MemoryLocation {
    readonly row: number;
    readonly column: number;
}

/** Row-major 6x6 pattern. `true` means filled. */
export interface SymmetryPattern {
    readonly cells: readonly boolean[];
}

export interface RememberDecideItem {
    readonly index: number;
    readonly location: MemoryLocation;
    readonly pattern: SymmetryPattern;
    /** Derived from `pattern`; retained in the round authority, never projected during play. */
    readonly isSymmetric: boolean;
}

export interface RememberDecideRound {
    readonly config: Readonly<RememberDecideConfig>;
    readonly items: readonly RememberDecideItem[];
}

export interface DecisionResponse {
    readonly itemIndex: number;
    readonly answer: DecisionAnswer | null;
    readonly timedOut: boolean;
}

export type RememberDecideErrorCode =
    | 'sequence-length'
    | 'symmetry-difficulty'
    | 'judgement-deadline';

export interface RememberDecideError {
    readonly code: RememberDecideErrorCode;
    readonly message: string;
}

export type RememberDecideResult<T> =
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: RememberDecideError };

export type RecommendationReason =
    | 'increase'
    | 'maximum-length'
    | 'recall-inexact'
    | 'judgement-threshold'
    | 'both-truth-classes-required';

export interface RememberDecideScore {
    readonly correctlyRecalled: number;
    readonly recallTotal: number;
    readonly exactSequence: boolean;
    readonly correctJudgements: number;
    readonly judgementTotal: number;
    readonly timeoutCount: number;
    readonly requiredCorrectJudgements: number;
    readonly correctSymmetricJudgements: number;
    readonly correctAsymmetricJudgements: number;
    readonly recommendation: {
        readonly canIncrease: boolean;
        readonly nextLength: number | null;
        readonly reason: RecommendationReason;
    };
    readonly recalled: readonly MemoryLocation[];
    readonly decisions: readonly DecisionResponse[];
}
