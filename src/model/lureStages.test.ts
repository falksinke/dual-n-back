import { describe, expect, it } from 'vitest';
import {
    getLureStagePolicy,
    lureOffsetsForStage,
    nextLureStage,
    prevLureStage,
    reduceLureStageAfterNUp,
} from './lureStages';

describe('lureStages', () => {
    it('maps stage A to zero lure rate', () => {
        expect(getLureStagePolicy('A').lureRate).toBe(0);
        expect(lureOffsetsForStage('A', 3)).toEqual([]);
    });

    it('uses distant offset for stage B', () => {
        expect(lureOffsetsForStage('B', 3)).toEqual([3]);
        expect(getLureStagePolicy('B').lureRate).toBeCloseTo(0.1);
    });

    it('omits n−1 lure offset when session n is 2', () => {
        expect(lureOffsetsForStage('C', 2)).toEqual([1]);
        expect(lureOffsetsForStage('C', 3)).toEqual([-1, 1]);
    });

    it('raises lure density through D and E', () => {
        expect(getLureStagePolicy('D').lureRate).toBeCloseTo(0.2);
        expect(getLureStagePolicy('E').lureRate).toBeCloseTo(0.3);
        expect(lureOffsetsForStage('E', 3)).toContain(-1);
        expect(lureOffsetsForStage('E', 3)).toContain(1);
    });

    it('walks stages and reduces after n-up', () => {
        expect(nextLureStage('A')).toBe('B');
        expect(nextLureStage('E')).toBeNull();
        expect(prevLureStage('A')).toBeNull();
        expect(reduceLureStageAfterNUp('E', 2)).toBe('C');
        expect(reduceLureStageAfterNUp('B', 2)).toBe('A');
    });
});
