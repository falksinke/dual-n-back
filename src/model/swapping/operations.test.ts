import { describe, expect, it } from 'vitest';
import { getAccessiblePositionLabel, getPositionLabel } from './instructions';
import {
    applyAtomicOperation,
    applyNovelOperation,
    countAtomicOperations,
    evaluateCards,
    observableArrangementsEqual,
} from './operations';
import type { OperationCard, SwappingToken, TokenKind } from './types';

function tokens(values: readonly string[], kind: TokenKind = 'number'): SwappingToken[] {
    return values.map((value, index) => ({
        id: `${kind}:${value}:${index}`,
        kind,
        value,
        label: value,
    }));
}

function values(result: { ok: true; value: readonly SwappingToken[] }): string[] {
    return result.value.map((token) => token.value);
}

describe('Swapping operations', () => {
    it('applies the hand-calculated sequence example', () => {
        const cards: OperationCard[] = [
            { operations: [{ type: 'swap', first: 0, second: 2 }] },
            { operations: [{ type: 'reverse-span', start: 1, end: 3 }] },
        ];
        const result = evaluateCards(tokens(['7', '2', '9', '4']), cards, 'sequence');

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.map((state) => state.map((token) => token.value))).toEqual([
            ['7', '2', '9', '4'],
            ['9', '2', '7', '4'],
            ['9', '4', '7', '2'],
        ]);
        expect(countAtomicOperations(cards)).toBe(2);
    });

    it('applies the hand-calculated grid example in fixed coordinates', () => {
        const start = tokens(['A', 'B', 'C', 'D'], 'letter');
        const columns = applyAtomicOperation(
            start,
            { type: 'swap-columns', first: 0, second: 1 },
            '2x2'
        );
        expect(columns.ok).toBe(true);
        if (!columns.ok) return;
        expect(values(columns)).toEqual(['B', 'A', 'D', 'C']);

        const rotated = applyAtomicOperation(columns.value, { type: 'rotate-clockwise' }, '2x2');
        expect(rotated.ok).toBe(true);
        if (!rotated.ok) return;
        expect(values(rotated)).toEqual(['D', 'B', 'C', 'A']);
    });

    it('rejects observable no-ops caused by interchangeable duplicates', () => {
        const start = tokens(['A', 'A', 'B'], 'letter');
        const result = applyNovelOperation(
            start,
            { type: 'swap', first: 0, second: 1 },
            'sequence',
            [start]
        );

        expect(result).toEqual({
            ok: false,
            error: {
                code: 'no-observable-change',
                message: 'The operation does not visibly change this arrangement.',
            },
        });
    });

    it('rejects an immediate inverse and any return to an earlier visible state', () => {
        const start = tokens(['A', 'B', 'C'], 'letter');
        const first = applyNovelOperation(
            start,
            { type: 'swap', first: 0, second: 1 },
            'sequence',
            [start]
        );
        expect(first.ok).toBe(true);
        if (!first.ok) return;

        const inverse = applyNovelOperation(
            first.value,
            { type: 'swap', first: 0, second: 1 },
            'sequence',
            [start, first.value]
        );
        expect(inverse.ok).toBe(false);
        if (inverse.ok) return;
        expect(inverse.error.code).toBe('repeated-state');
    });

    it('rejects a compound card that swaps the same positions twice', () => {
        const operation = { type: 'swap', first: 0, second: 2 } as const;
        const result = evaluateCards(
            tokens(['A', 'B', 'C'], 'letter'),
            [{ operations: [operation, operation] }],
            'sequence'
        );

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error.code).toBe('repeated-state');
    });

    it('evaluates both operations inside a compound card in order', () => {
        const start = tokens(['A', 'B', 'C', 'D'], 'letter');
        const result = evaluateCards(
            start,
            [
                {
                    operations: [
                        { type: 'swap', first: 0, second: 2 },
                        { type: 'reverse-span', start: 1, end: 3 },
                    ],
                },
            ],
            'sequence'
        );

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value).toHaveLength(3);
        expect(result.value[2].map((token) => token.value)).toEqual(['C', 'D', 'A', 'B']);
    });

    it('disallows clockwise rotation for a rectangular grid', () => {
        const result = applyAtomicOperation(
            tokens(['A', 'B', 'C', 'D', 'E', 'F'], 'letter'),
            { type: 'rotate-clockwise' },
            '2x3'
        );

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error.code).toBe('invalid-operation');
    });

    it('provides compact and accessible fixed grid labels', () => {
        expect(getPositionLabel(4, '2x3')).toBe('R2C2');
        expect(getAccessiblePositionLabel(4, '2x3')).toBe('row 2, column 2');
    });

    it('preserves the token multiset across row, column, mirror and shift operations', () => {
        const grid = tokens(['A', 'B', 'C', 'D', 'E', 'F'], 'letter');
        const operations = [
            { type: 'swap-rows', first: 0, second: 1 } as const,
            { type: 'swap-columns', first: 0, second: 2 } as const,
            { type: 'mirror-left-right' } as const,
            { type: 'mirror-top-bottom' } as const,
        ];
        for (const operation of operations) {
            const result = applyAtomicOperation(grid, operation, '2x3');
            expect(result.ok).toBe(true);
            if (!result.ok) continue;
            expect(result.value.map((token) => token.id).sort()).toEqual(
                grid.map((token) => token.id).sort()
            );
        }

        const sequence = tokens(['A', 'B', 'C', 'D'], 'letter');
        const shifted = applyAtomicOperation(
            sequence,
            { type: 'shift-span', start: 0, end: 3, direction: 'right' },
            'sequence'
        );
        expect(shifted.ok).toBe(true);
        if (!shifted.ok) return;
        expect(observableArrangementsEqual(sequence, shifted.value)).toBe(false);
        expect(shifted.value.map((token) => token.value)).toEqual(['D', 'A', 'B', 'C']);
    });
});
