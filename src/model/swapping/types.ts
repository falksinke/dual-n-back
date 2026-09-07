export type SwappingContent = 'numbers' | 'letters' | 'icons' | 'mixed' | 'audio';

export type GridLayout = '2x2' | '2x3' | '3x3';
export type SwappingLayout = 'sequence' | GridLayout;
export type StartingPattern = 'unique' | 'repeated';
export type OperationTier = 'basic' | 'group' | 'compound';
export type TokenKind = 'number' | 'letter' | 'icon';

export interface SwappingConfig {
    content: SwappingContent;
    layout: SwappingLayout;
    length: number;
    pattern: StartingPattern;
    tier: OperationTier;
    operationCount: number;
}

export interface TokenIdentity {
    kind: TokenKind;
    value: string;
    label: string;
}

/** `id` distinguishes copies for UI bookkeeping; kind + value define answer identity. */
export interface SwappingToken extends TokenIdentity {
    id: string;
}

export type SwapOperation = {
    type: 'swap';
    first: number;
    second: number;
};

export type ReverseSpanOperation = {
    type: 'reverse-span';
    start: number;
    end: number;
};

export type ShiftSpanOperation = {
    type: 'shift-span';
    start: number;
    end: number;
    direction: 'left' | 'right';
};

export type SwapRowsOperation = {
    type: 'swap-rows';
    first: number;
    second: number;
};

export type SwapColumnsOperation = {
    type: 'swap-columns';
    first: number;
    second: number;
};

export type MirrorLeftRightOperation = {
    type: 'mirror-left-right';
};

export type MirrorTopBottomOperation = {
    type: 'mirror-top-bottom';
};

export type RotateClockwiseOperation = {
    type: 'rotate-clockwise';
};

export type AtomicOperation =
    | SwapOperation
    | ReverseSpanOperation
    | ShiftSpanOperation
    | SwapRowsOperation
    | SwapColumnsOperation
    | MirrorLeftRightOperation
    | MirrorTopBottomOperation
    | RotateClockwiseOperation;

export interface OperationCard {
    operations: readonly AtomicOperation[];
}

export interface SwappingRound {
    config: SwappingConfig;
    initial: readonly SwappingToken[];
    cards: readonly OperationCard[];
    /** Initial arrangement followed by one state for every atomic operation. */
    states: readonly (readonly SwappingToken[])[];
    final: readonly SwappingToken[];
}

export type SwappingErrorCode =
    | 'sequence-length'
    | 'grid-length'
    | 'audio-layout'
    | 'operation-count'
    | 'compound-operation-count'
    | 'unique-pool-too-small'
    | 'permutation-capacity'
    | 'invalid-operation'
    | 'no-observable-change'
    | 'repeated-state'
    | 'generation-exhausted';

export interface SwappingError {
    code: SwappingErrorCode;
    message: string;
}

export type SwappingResult<T> =
    | { ok: true; value: T }
    | { ok: false; error: SwappingError };

export interface SwappingScore {
    exact: boolean;
    correctlyPlaced: number;
    total: number;
    submitted: readonly SwappingToken[];
    correct: readonly SwappingToken[];
}

export interface PaletteEntry extends TokenIdentity {
    key: string;
    total: number;
    remaining: number;
}

export type RandomSource = () => number;

