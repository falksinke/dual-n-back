import { describe, expect, it } from 'vitest';
import { buildPalette, getAvailableToken, hasSameMultiset, scoreRound } from './scoring';
import type { SwappingToken, TokenKind } from './types';

function token(value: string, occurrence: number, kind: TokenKind = 'letter'): SwappingToken {
    return {
        id: `${kind}:${value}:${occurrence}`,
        kind,
        value,
        label: value,
    };
}

describe('Swapping scoring and palette', () => {
    it('scores duplicate identities independently of occurrence IDs', () => {
        const firstA = token('A', 0);
        const secondA = token('A', 1);
        const b = token('B', 0);
        const result = scoreRound(
            [firstA, b, secondA],
            [secondA, b, firstA]
        );

        expect(result.exact).toBe(true);
        expect(result.correctlyPlaced).toBe(3);
        expect(result.total).toBe(3);
    });

    it('reports exact-round and per-position correctness', () => {
        const a = token('A', 0);
        const b = token('B', 0);
        const c = token('C', 0);
        const result = scoreRound([a, b, c], [a, c, b]);

        expect(result.exact).toBe(false);
        expect(result.correctlyPlaced).toBe(1);
        expect(result.total).toBe(3);
    });

    it('groups the canonical palette and subtracts placed copies', () => {
        const initial = [token('B', 0), token('A', 0), token('A', 1)];
        const palette = buildPalette(initial, [token('A', 1), null, null]);

        expect(palette.map(({ key, total, remaining }) => ({ key, total, remaining }))).toEqual([
            { key: 'letter:A', total: 2, remaining: 1 },
            { key: 'letter:B', total: 1, remaining: 1 },
        ]);
        expect(getAvailableToken(initial, [initial[1], null, null], 'letter:A')?.id).toBe(
            initial[2].id
        );
    });

    it('detects submissions that exceed or change the starting multiset', () => {
        const initial = [token('A', 0), token('A', 1), token('B', 0)];
        const tooManyAs = [token('A', 0), token('A', 1), token('A', 2)];

        expect(hasSameMultiset(initial, [initial[2], initial[1], initial[0]])).toBe(true);
        expect(hasSameMultiset(initial, tooManyAs)).toBe(false);
        expect(
            buildPalette(initial, tooManyAs).find((entry) => entry.key === 'letter:A')?.remaining
        ).toBe(0);
    });
});
