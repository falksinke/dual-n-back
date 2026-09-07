import { getArrangementSize, validateConfig } from './difficulty';
import { isGroupOperation, listCompatibleOperations } from './operationCatalog';
import { applyNovelOperation } from './operations';
import { createToken, getContentPool, tokenIdentityKey } from './tokens';
import type {
    AtomicOperation,
    OperationCard,
    RandomSource,
    SwappingConfig,
    SwappingResult,
    SwappingRound,
    SwappingToken,
    TokenIdentity,
} from './types';

export const MAX_GENERATION_ATTEMPTS = 200;

export interface GenerateRoundOptions {
    random?: RandomSource;
    attemptLimit?: number;
}

function pickIndex(length: number, random: RandomSource): number {
    return Math.min(length - 1, Math.max(0, Math.floor(random() * length)));
}

function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index--) {
        const other = pickIndex(index + 1, random);
        [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
    }
    return shuffled;
}

function pickIdentities(
    config: SwappingConfig,
    count: number,
    random: RandomSource
): TokenIdentity[] {
    const selected = shuffle(getContentPool(config.content), random).slice(0, count);
    if (config.content !== 'mixed' || new Set(selected.map((token) => token.kind)).size >= 2) {
        return selected;
    }

    const replacement = getContentPool('mixed').find(
        (candidate) =>
            candidate.kind !== selected[0].kind &&
            !selected.some((token) => tokenIdentityKey(token) === tokenIdentityKey(candidate))
    );
    if (replacement != null) selected[selected.length - 1] = replacement;
    return selected;
}

function addOccurrenceIds(identities: readonly TokenIdentity[]): SwappingToken[] {
    const occurrences = new Map<string, number>();
    return identities.map((identity) => {
        const key = tokenIdentityKey(identity);
        const occurrence = occurrences.get(key) ?? 0;
        occurrences.set(key, occurrence + 1);
        return createToken(identity, occurrence);
    });
}

function createInitialArrangement(
    config: SwappingConfig,
    random: RandomSource
): SwappingToken[] {
    const size = getArrangementSize(config);
    if (config.pattern === 'unique') {
        return addOccurrenceIds(shuffle(pickIdentities(config, size, random), random));
    }

    const distinctCount = Math.min(getContentPool(config.content).length, size - 1);
    const selected = pickIdentities(config, distinctCount, random);
    const identities = [...selected];
    const counts = new Map(selected.map((identity) => [tokenIdentityKey(identity), 1]));
    const maximumCopies = Math.ceil(size / 2);

    while (identities.length < size) {
        const available = selected.filter(
            (identity) => (counts.get(tokenIdentityKey(identity)) ?? 0) < maximumCopies
        );
        const identity = available[pickIndex(available.length, random)];
        const key = tokenIdentityKey(identity);
        identities.push(identity);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return addOccurrenceIds(shuffle(identities, random));
}

export function countDistinctPermutations(arrangement: readonly SwappingToken[]): number {
    let numerator = 1;
    for (let value = 2; value <= arrangement.length; value++) numerator *= value;

    const counts = new Map<string, number>();
    for (const token of arrangement) {
        const key = tokenIdentityKey(token);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const count of counts.values()) {
        for (let divisor = 2; divisor <= count; divisor++) numerator /= divisor;
    }
    return numerator;
}

function chooseOperations(
    config: SwappingConfig,
    initial: readonly SwappingToken[],
    random: RandomSource
): { operations: AtomicOperation[]; states: (readonly SwappingToken[])[] } | null {
    const states: (readonly SwappingToken[])[] = [[...initial]];
    const operations: AtomicOperation[] = [];
    let current = states[0];
    const includeGroups = config.tier !== 'basic';
    const catalog = listCompatibleOperations(config.layout, initial.length, includeGroups);

    for (let step = 0; step < config.operationCount; step++) {
        const eligible =
            config.tier === 'group' && step === 0
                ? catalog.filter(isGroupOperation)
                : catalog;
        const viable = eligible.flatMap((operation) => {
            const applied = applyNovelOperation(current, operation, config.layout, states);
            return applied.ok ? [{ operation, state: applied.value }] : [];
        });
        if (viable.length === 0) return null;

        const chosen = viable[pickIndex(viable.length, random)];
        operations.push(chosen.operation);
        current = chosen.state;
        states.push(current);
    }

    return { operations, states };
}

function createCards(config: SwappingConfig, operations: readonly AtomicOperation[]): OperationCard[] {
    if (config.tier !== 'compound') {
        return operations.map((operation) => ({ operations: [operation] }));
    }
    return [
        { operations: operations.slice(0, 2) },
        ...operations.slice(2).map((operation) => ({ operations: [operation] })),
    ];
}

export function generateRound(
    config: SwappingConfig,
    options: GenerateRoundOptions = {}
): SwappingResult<SwappingRound> {
    const validation = validateConfig(config);
    if (!validation.ok) return validation;

    const random = options.random ?? Math.random;
    const requestedLimit = options.attemptLimit ?? MAX_GENERATION_ATTEMPTS;
    const attemptLimit = Math.min(
        MAX_GENERATION_ATTEMPTS,
        Math.max(0, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 0)
    );

    for (let attempt = 0; attempt < attemptLimit; attempt++) {
        const initial = createInitialArrangement(config, random);
        if (countDistinctPermutations(initial) - 1 < config.operationCount) continue;

        const chosen = chooseOperations(config, initial, random);
        if (chosen == null) continue;
        const cards = createCards(config, chosen.operations);
        return {
            ok: true,
            value: {
                config: { ...config },
                initial,
                cards,
                states: chosen.states,
                final: chosen.states[chosen.states.length - 1],
            },
        };
    }

    return {
        ok: false,
        error: {
            code: 'generation-exhausted',
            message: `Could not create a valid round after ${attemptLimit} attempts. Try fewer operations, more items, or a different pattern.`,
        },
    };
}
