import { describe, expect, it } from 'vitest';
import { countAtomicOperations, observableArrangementsEqual } from './operations';
import {
    countDistinctPermutations,
    generateRound,
    MAX_GENERATION_ATTEMPTS,
} from './generator';
import { tokenIdentityKey } from './tokens';
import type { SwappingConfig } from './types';

function config(overrides: Partial<SwappingConfig> = {}): SwappingConfig {
    return {
        content: 'letters',
        layout: 'sequence',
        length: 5,
        pattern: 'unique',
        tier: 'basic',
        operationCount: 3,
        ...overrides,
    };
}

function mulberry32(seed: number): () => number {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

describe('Swapping round generation', () => {
    it('is deterministic for the same configuration and random stream', () => {
        const first = generateRound(config(), { random: mulberry32(42) });
        const second = generateRound(config(), { random: mulberry32(42) });

        expect(first).toEqual(second);
        expect(first.ok).toBe(true);
        if (!first.ok) return;
        expect(new Set(first.value.initial.map(tokenIdentityKey)).size).toBe(
            first.value.initial.length
        );
    });

    it('creates exactly the requested atomic count with no repeated visible state', () => {
        const result = generateRound(
            config({ layout: '3x3', length: 9, pattern: 'repeated', tier: 'compound', operationCount: 6 }),
            { random: mulberry32(7) }
        );

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(countAtomicOperations(result.value.cards)).toBe(6);
        expect(result.value.cards[0].operations).toHaveLength(2);
        expect(result.value.states).toHaveLength(7);
        expect(result.value.final).toEqual(result.value.states[6]);

        for (let index = 1; index < result.value.states.length; index++) {
            expect(
                observableArrangementsEqual(
                    result.value.states[index - 1],
                    result.value.states[index]
                )
            ).toBe(false);
            for (let earlier = 0; earlier < index; earlier++) {
                expect(
                    observableArrangementsEqual(
                        result.value.states[earlier],
                        result.value.states[index]
                    )
                ).toBe(false);
            }
        }
    });

    it('makes repeated starts with duplicates, two identities and a bounded maximum count', () => {
        const result = generateRound(
            config({ content: 'audio', length: 12, pattern: 'repeated', tier: 'group', operationCount: 4 }),
            { random: mulberry32(99) }
        );

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const counts = new Map<string, number>();
        for (const token of result.value.initial) {
            const key = tokenIdentityKey(token);
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        expect(counts.size).toBeGreaterThanOrEqual(2);
        expect([...counts.values()].some((count) => count > 1)).toBe(true);
        expect(Math.max(...counts.values())).toBeLessThanOrEqual(Math.ceil(12 / 2));
        expect(
            result.value.cards.some((card) =>
                card.operations.some((operation) => operation.type !== 'swap')
            )
        ).toBe(true);
    });

    it('ensures a mixed start contains multiple token categories', () => {
        const result = generateRound(
            config({ content: 'mixed', length: 12, pattern: 'unique' }),
            { random: () => 0 }
        );

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(new Set(result.value.initial.map((token) => token.kind)).size).toBeGreaterThanOrEqual(2);
    });

    it('counts distinct multiset permutations independently of occurrence IDs', () => {
        const repeated = [
            { id: 'a-0', kind: 'letter', value: 'A', label: 'A' },
            { id: 'a-1', kind: 'letter', value: 'A', label: 'A' },
            { id: 'b-0', kind: 'letter', value: 'B', label: 'B' },
        ] as const;

        expect(countDistinctPermutations(repeated)).toBe(3);
    });

    it('returns typed configuration errors before generation', () => {
        const result = generateRound(config({ content: 'icons', length: 9 }));

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error.code).toBe('unique-pool-too-small');
    });

    it('returns an actionable typed error when the bounded attempt limit is exhausted', () => {
        const result = generateRound(config(), { random: mulberry32(1), attemptLimit: 0 });

        expect(MAX_GENERATION_ATTEMPTS).toBe(200);
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error.code).toBe('generation-exhausted');
        expect(result.error.message).toContain('fewer operations');
    });
});
