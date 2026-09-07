import {
    compareTokenIdentity,
    sameTokenIdentity,
    tokenIdentityKey,
} from './tokens';
import type { PaletteEntry, SwappingScore, SwappingToken } from './types';

export function buildPalette(
    initial: readonly SwappingToken[],
    slots: readonly (SwappingToken | null)[] = []
): PaletteEntry[] {
    const entries = new Map<string, PaletteEntry>();
    for (const token of initial) {
        const key = tokenIdentityKey(token);
        const entry = entries.get(key);
        if (entry == null) {
            entries.set(key, {
                key,
                kind: token.kind,
                value: token.value,
                label: token.label,
                total: 1,
                remaining: 1,
            });
        } else {
            entry.total++;
            entry.remaining++;
        }
    }

    for (const token of slots) {
        if (token == null) continue;
        const entry = entries.get(tokenIdentityKey(token));
        if (entry != null) entry.remaining = Math.max(0, entry.remaining - 1);
    }

    return [...entries.values()].sort(compareTokenIdentity);
}

export function getAvailableToken(
    initial: readonly SwappingToken[],
    slots: readonly (SwappingToken | null)[],
    identityKey: string
): SwappingToken | null {
    const placedIds = new Set(
        slots.flatMap((token) => (token == null ? [] : [token.id]))
    );
    return (
        initial.find(
            (token) => tokenIdentityKey(token) === identityKey && !placedIds.has(token.id)
        ) ?? null
    );
}

function identityCounts(tokens: readonly SwappingToken[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const token of tokens) {
        const key = tokenIdentityKey(token);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
}

export function hasSameMultiset(
    expected: readonly SwappingToken[],
    candidate: readonly SwappingToken[]
): boolean {
    if (expected.length !== candidate.length) return false;
    const expectedCounts = identityCounts(expected);
    const candidateCounts = identityCounts(candidate);
    if (expectedCounts.size !== candidateCounts.size) return false;
    return [...expectedCounts].every(([key, count]) => candidateCounts.get(key) === count);
}

export function scoreRound(
    correct: readonly SwappingToken[],
    submitted: readonly SwappingToken[]
): SwappingScore {
    let correctlyPlaced = 0;
    for (let index = 0; index < correct.length; index++) {
        const submittedToken = submitted[index];
        if (submittedToken != null && sameTokenIdentity(correct[index], submittedToken)) {
            correctlyPlaced++;
        }
    }

    return {
        exact: submitted.length === correct.length && correctlyPlaced === correct.length,
        correctlyPlaced,
        total: correct.length,
        submitted: [...submitted],
        correct: [...correct],
    };
}
