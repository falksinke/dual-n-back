import { describe, expect, it } from 'vitest';
import {
    countMismatchedMirrorPairs,
    createSymmetryPattern,
    generateRound,
    isVerticallySymmetric,
    validateConfig,
} from './generator';
import type { RememberDecideConfig, SymmetryDifficulty } from './types';

function config(overrides: Partial<RememberDecideConfig> = {}): RememberDecideConfig {
    return { sequenceLength: 3, symmetryDifficulty: 'more', judgementDeadlineMs: 5000, ...overrides };
}

describe('Remember & Decide generation', () => {
    it('validates all supported boundaries and rejects invalid or nonfinite settings', () => {
        for (const sequenceLength of [2, 8]) {
            for (const symmetryDifficulty of ['more', 'some', 'fewer'] as const) {
                for (const judgementDeadlineMs of [3000, 5000, 8000] as const) {
                    expect(validateConfig(config({ sequenceLength, symmetryDifficulty, judgementDeadlineMs })).ok).toBe(true);
                }
            }
        }
        expect(validateConfig(config({ sequenceLength: 1 })).ok).toBe(false);
        expect(validateConfig(config({ sequenceLength: Number.NaN })).ok).toBe(false);
        expect(validateConfig({ ...config(), symmetryDifficulty: 'hard' as SymmetryDifficulty }).ok).toBe(false);
        expect(validateConfig({ ...config(), judgementDeadlineMs: 4000 as 5000 }).ok).toBe(false);
    });

    it('constructs 18 filled cells with exact mismatch counts', () => {
        const expected = { more: 6, some: 4, fewer: 2 } as const;
        for (const difficulty of ['more', 'some', 'fewer'] as const) {
            const symmetric = createSymmetryPattern(true, difficulty, () => 0);
            const asymmetric = createSymmetryPattern(false, difficulty, () => 0);
            expect(symmetric.cells.filter(Boolean)).toHaveLength(18);
            expect(asymmetric.cells.filter(Boolean)).toHaveLength(18);
            expect(isVerticallySymmetric(symmetric)).toBe(true);
            expect(isVerticallySymmetric(asymmetric)).toBe(false);
            expect(countMismatchedMirrorPairs(asymmetric)).toBe(expected[difficulty]);
        }
    });

    it('generates both truth classes deterministically and constant streams terminate', () => {
        const symmetric = generateRound(config({ sequenceLength: 8 }), () => 0);
        const asymmetric = generateRound(config({ sequenceLength: 8 }), () => 0.999);
        expect(symmetric.ok).toBe(true);
        expect(asymmetric.ok).toBe(true);
        if (symmetric.ok) expect(symmetric.value.items.every((item) => item.isSymmetric)).toBe(true);
        if (asymmetric.ok) expect(asymmetric.value.items.every((item) => !item.isSymmetric)).toBe(true);
    });

    it('keeps locations in bounds, excludes immediate repeats, and permits later repeats', () => {
        const result = generateRound(config({ sequenceLength: 8 }), () => 0);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        for (const item of result.value.items) {
            expect(item.location.row).toBeGreaterThanOrEqual(0);
            expect(item.location.row).toBeLessThan(4);
            expect(item.location.column).toBeGreaterThanOrEqual(0);
            expect(item.location.column).toBeLessThan(4);
        }
        for (let index = 1; index < result.value.items.length; index++) {
            expect(result.value.items[index].location).not.toEqual(result.value.items[index - 1].location);
        }
        expect(result.value.items[0].location).toEqual(result.value.items[2].location);
    });
});
