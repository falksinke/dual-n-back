import { describe, expect, it } from 'vitest';
import {
    clampVariableNHoldTrials,
    makeVariableNList,
    sampleHoldLength,
    sampleVariableN,
    VARIABLE_N_HOLD_OPTIONS,
} from './variableN';

describe('variableN', () => {
    it('clamps hold options to the allowed ladder', () => {
        expect(clampVariableNHoldTrials(1)).toBe(1);
        expect(clampVariableNHoldTrials(3)).toBe(3);
        expect(clampVariableNHoldTrials(4)).toBe(3);
        expect(clampVariableNHoldTrials(9)).toBe(10);
        expect(VARIABLE_N_HOLD_OPTIONS).toEqual([1, 2, 3, 5, 10]);
    });

    it('samples stretch length 1 when mean hold is 1', () => {
        expect(sampleHoldLength(1, () => 0.99)).toBe(1);
        expect(sampleHoldLength(1, () => 0.01)).toBe(1);
    });

    it('samples variable stretch lengths around the mean', () => {
        // mean=3, p=1/3; u→0 yields long stretch, u→1 yields short
        expect(sampleHoldLength(3, () => 0.99)).toBe(1);
        expect(sampleHoldLength(3, () => 0.01)).toBeGreaterThan(1);
    });

    it('uses geometric 2× weights at level 2 (1/3 + 2/3)', () => {
        // total=3; pick = u*3 → 1 when pick < 1 i.e. u < 1/3
        expect(sampleVariableN(2, () => 0.1)).toBe(1);
        expect(sampleVariableN(2, () => 1 / 3)).toBe(2);
        expect(sampleVariableN(2, () => 0.9)).toBe(2);

        let ones = 0;
        let twos = 0;
        const n = 4000;
        for (let i = 0; i < n; i++) {
            const u = (i + 0.5) / n;
            if (sampleVariableN(2, () => u) === 1) ones++;
            else twos++;
        }
        expect(ones / n).toBeCloseTo(1 / 3, 2);
        expect(twos / n).toBeCloseTo(2 / 3, 2);
    });

    it('uses geometric 2× weights at level 3 (1:2:4)', () => {
        let counts = [0, 0, 0];
        const n = 7000;
        for (let i = 0; i < n; i++) {
            const u = (i + 0.5) / n;
            counts[sampleVariableN(3, () => u) - 1]! += 1;
        }
        expect(counts[0]! / n).toBeCloseTo(1 / 7, 2);
        expect(counts[1]! / n).toBeCloseTo(2 / 7, 2);
        expect(counts[2]! / n).toBeCloseTo(4 / 7, 2);
    });

    it('samples a new N every trial when hold is 1', () => {
        let calls = 0;
        const list = makeVariableNList(
            8,
            2,
            () => {
                calls += 1;
                return 0.5;
            },
            1
        );
        expect(list).toHaveLength(6);
        // hold=1 skips stretch RNG — one lag draw per trial
        expect(calls).toBe(6);
    });

    it('holds N for a random stretch when hold > 1', () => {
        const values = [0.1, 0.5, 0.9, 0.2, 0.8, 0.3, 0.7, 0.4, 0.6];
        let i = 0;
        const list = makeVariableNList(
            12,
            2,
            () => values[i++ % values.length]!,
            3
        );
        expect(list).toHaveLength(10);
        // Fewer unique segments than trials — some consecutive equals
        let runs = 1;
        for (let t = 1; t < list.length; t++) {
            if (list[t] !== list[t - 1]) runs += 1;
        }
        expect(runs).toBeLessThan(list.length);
        expect(runs).toBeGreaterThan(1);
    });
});
