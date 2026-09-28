import { describe, expect, it } from 'vitest';
import { countModalityTargets } from './blockQuotas';
import { scaleJaeggiTargets } from './jaeggiQuotas';
import { getModalitiesForMode } from './modalities';
import { makeVariableNList } from './variableN';
import {
    buildEffectiveNs,
    isScorableTrial,
    planVariableNStimuli,
} from './variableNQuotas';

function mulberry32(seed: number): () => number {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

describe('variableNQuotas', () => {
    it('builds effective Ns with session-N warmup then list values', () => {
        const ns = buildEffectiveNs(6, 2, [1, 2, 1, 2]);
        expect(ns).toEqual([2, 2, 1, 2, 1, 2]);
    });

    it('marks trials scorable only when history can support effective N', () => {
        expect(isScorableTrial(0, 2)).toBe(false);
        expect(isScorableTrial(1, 2)).toBe(false);
        expect(isScorableTrial(2, 2)).toBe(true);
        expect(isScorableTrial(1, 1)).toBe(true);
    });

    it('places Jaeggi-scale targets only on scorable trials', () => {
        const modalities = getModalitiesForMode('dual');
        const gameLength = 20;
        const sessionN = 2;
        const random = mulberry32(42);
        const list = makeVariableNList(gameLength, sessionN, random, 1);
        const effectiveNs = buildEffectiveNs(gameLength, sessionN, list);
        const result = planVariableNStimuli({
            gameLength,
            sessionN,
            effectiveNs,
            modalities,
            interferenceChance: 0,
            random: mulberry32(7),
        });

        const scorable = effectiveNs
            .map((n, t) => (isScorableTrial(t, n) ? t : -1))
            .filter((t) => t >= 0);
        const expected = scaleJaeggiTargets(scorable.length);
        const counts = countModalityTargets(result.trials, scorable, modalities);
        expect(counts.position).toBe(expected.perModality);
        expect(counts.audio).toBe(expected.perModality);
        expect(result.counts).toEqual(expected);

        for (const m of modalities) {
            for (let t = 0; t < gameLength; t++) {
                if (result.trials[t].byModality[m]?.role === 'target') {
                    expect(isScorableTrial(t, effectiveNs[t]!)).toBe(true);
                }
            }
        }
        expect(result.ok).toBe(true);
    });

    it('places interference lures without overlapping targets', () => {
        const modalities = getModalitiesForMode('dual');
        const gameLength = 30;
        const sessionN = 2;
        const random = mulberry32(11);
        const list = makeVariableNList(gameLength, sessionN, random, 3);
        const effectiveNs = buildEffectiveNs(gameLength, sessionN, list);
        const result = planVariableNStimuli({
            gameLength,
            sessionN,
            effectiveNs,
            modalities,
            interferenceChance: 0.125,
            random: mulberry32(99),
        });

        const scorable = effectiveNs
            .map((n, t) => (isScorableTrial(t, n) ? t : -1))
            .filter((t) => t >= 0);
        const expectedTargets = scaleJaeggiTargets(scorable.length).perModality;

        for (const m of modalities) {
            let targets = 0;
            let lures = 0;
            for (let t = 0; t < gameLength; t++) {
                const role = result.trials[t].byModality[m]?.role;
                if (role === 'target') targets++;
                if (role === 'lure') {
                    lures++;
                    expect(result.trials[t].byModality[m]?.lureOffset).toBeDefined();
                }
            }
            expect(targets).toBe(expectedTargets);
            expect(lures).toBeGreaterThan(0);
            expect(result.lureCounts[m]).toBe(lures);
        }
    });

    it('scales lure density with interferenceChance', () => {
        const modalities = getModalitiesForMode('dual');
        const gameLength = 40;
        const sessionN = 2;
        const list = makeVariableNList(gameLength, sessionN, () => 0.5, 1);
        const effectiveNs = buildEffectiveNs(gameLength, sessionN, list);

        const low = planVariableNStimuli({
            gameLength,
            sessionN,
            effectiveNs,
            modalities,
            interferenceChance: 0,
            random: mulberry32(1),
        });
        const high = planVariableNStimuli({
            gameLength,
            sessionN,
            effectiveNs,
            modalities,
            interferenceChance: 0.5,
            random: mulberry32(1),
        });

        const countLures = (trials: typeof low.trials) => {
            let n = 0;
            for (const trial of trials) {
                for (const m of modalities) {
                    if (trial.byModality[m]?.role === 'lure') n++;
                }
            }
            return n;
        };

        expect(countLures(low.trials)).toBe(0);
        expect(countLures(high.trials)).toBeGreaterThan(0);
    });
});
