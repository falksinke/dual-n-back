import { describe, expect, it } from 'vitest';
import { countModalityTargets } from './blockQuotas';
import {
    jaeggiPrimaryPair,
    planJaeggiStimuli,
    scaleJaeggiTargets,
} from './jaeggiQuotas';
import { getModalitiesForMode } from './modalities';

function mulberry32(seed: number): () => number {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

describe('jaeggiQuotas', () => {
    it('scales classic 6+6+2 from a 20-scorable-trial baseline', () => {
        expect(scaleJaeggiTargets(20)).toEqual({ perModality: 6, both: 2 });
        expect(scaleJaeggiTargets(30)).toEqual({ perModality: 9, both: 3 });
        expect(scaleJaeggiTargets(10)).toEqual({ perModality: 3, both: 1 });
    });

    it('prefers position+audio as the simultaneous pair', () => {
        expect(jaeggiPrimaryPair(getModalitiesForMode('dual'))).toEqual(['position', 'audio']);
        expect(jaeggiPrimaryPair(getModalitiesForMode('triple'))).toEqual(['position', 'audio']);
        expect(jaeggiPrimaryPair(getModalitiesForMode('quad'))).toEqual(['position', 'audio']);
    });

    it('plans exact dual quotas for a classic 20+n block (n=2 → 22 total)', () => {
        const modalities = getModalitiesForMode('dual');
        const sessionN = 2;
        const gameLength = 22; // 20 scorable + n warm-up
        const result = planJaeggiStimuli({
            gameLength,
            sessionN,
            modalities,
            random: mulberry32(42),
        });

        const scorable = Array.from({ length: gameLength - sessionN }, (_, i) => sessionN + i);
        expect(scorable).toHaveLength(20);
        const counts = countModalityTargets(result.trials, scorable, modalities);
        expect(counts.position).toBe(6);
        expect(counts.audio).toBe(6);

        let both = 0;
        for (const t of scorable) {
            if (
                result.trials[t].byModality.position?.role === 'target' &&
                result.trials[t].byModality.audio?.role === 'target'
            ) {
                both++;
            }
        }
        expect(both).toBe(2);
        expect(result.ok).toBe(true);
    });

    it('plans exact dual quotas for 4-back at classic 20+n length', () => {
        const modalities = getModalitiesForMode('dual');
        const sessionN = 4;
        const gameLength = 24; // 20 scorable + n warm-up
        const result = planJaeggiStimuli({
            gameLength,
            sessionN,
            modalities,
            random: mulberry32(42),
        });

        const scorable = Array.from({ length: gameLength - sessionN }, (_, i) => sessionN + i);
        const counts = countModalityTargets(result.trials, scorable, modalities);
        expect(counts.position).toBe(6);
        expect(counts.audio).toBe(6);

        let both = 0;
        for (const t of scorable) {
            if (
                result.trials[t].byModality.position?.role === 'target' &&
                result.trials[t].byModality.audio?.role === 'target'
            ) {
                both++;
            }
        }
        expect(both).toBe(2);
        expect(result.ok).toBe(true);
    });

    it('scales dual quotas for a 30-trial free-play default off scorable count', () => {
        const modalities = getModalitiesForMode('dual');
        const sessionN = 2;
        const gameLength = 30;
        const result = planJaeggiStimuli({
            gameLength,
            sessionN,
            modalities,
            random: mulberry32(99),
        });

        const scorable = Array.from({ length: gameLength - sessionN }, (_, i) => sessionN + i);
        // 28 scorable → round(6*28/20)=8, round(2*28/20)=3
        const counts = countModalityTargets(result.trials, scorable, modalities);
        expect(counts.position).toBe(8);
        expect(counts.audio).toBe(8);

        let both = 0;
        for (const t of scorable) {
            if (
                result.trials[t].byModality.position?.role === 'target' &&
                result.trials[t].byModality.audio?.role === 'target'
            ) {
                both++;
            }
        }
        expect(both).toBe(3);
        expect(result.ok).toBe(true);
    });

    it('fills remaining modalities with clean roles', () => {
        const modalities = getModalitiesForMode('dual');
        const result = planJaeggiStimuli({
            gameLength: 22,
            sessionN: 2,
            modalities,
            random: mulberry32(1),
        });

        for (let t = 2; t < 22; t++) {
            for (const m of modalities) {
                const role = result.trials[t].byModality[m]?.role;
                expect(role === 'target' || role === 'clean').toBe(true);
            }
        }
    });
});
