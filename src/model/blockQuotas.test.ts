import { describe, expect, it } from 'vitest';
import {
    buildDefaultQuotaTable,
    countModalityTargets,
    countSimultaneousTargets,
    planBlockStimuli,
} from './blockQuotas';
import { getModalitiesForMode } from './modalities';

describe('blockQuotas', () => {
    it('builds balanced per-modality target quotas within ±1', () => {
        const modalities = getModalitiesForMode('triple');
        const quota = buildDefaultQuotaTable({
            gameLength: 30,
            sessionN: 5,
            modalities,
            lureStage: 'C',
        });

        const scorable = 25;
        for (const m of modalities) {
            expect(quota.targetsPerModality[m]).toBeGreaterThanOrEqual(Math.floor(scorable * 0.125));
            expect(quota.targetsPerModality[m]).toBeLessThanOrEqual(Math.ceil(scorable * 0.125) + 1);
        }
    });

    it('planBlockStimuli yields per-modality targets within tolerance for seeded dual', () => {
        const modalities = getModalitiesForMode('dual');
        const sessionN = 3;
        const gameLength = 24;
        let seed = 42;
        const random = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 0x100000000;
        };

        const result = planBlockStimuli({
            gameLength,
            sessionN,
            modalities,
            lureStage: 'D',
            random,
        });

        const scorable = Array.from({ length: gameLength - sessionN }, (_, i) => sessionN + i);
        const counts = countModalityTargets(result.trials, scorable, modalities);
        const values = modalities.map((m) => counts[m]);
        expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
        expect(result.trials.length).toBe(gameLength);
        expect(result.ok).toBe(true);
    });

    it('assigns quad simultaneous-target buckets on seeded plan', () => {
        const modalities = getModalitiesForMode('quad');
        const sessionN = 4;
        const gameLength = 40;
        let seed = 7;
        const random = () => {
            seed = (seed * 1103515245 + 12345) >>> 0;
            return seed / 0x100000000;
        };

        const result = planBlockStimuli({
            gameLength,
            sessionN,
            modalities,
            lureStage: 'E',
            random,
        });

        const scorable = Array.from({ length: gameLength - sessionN }, (_, i) => sessionN + i);
        const sim = countSimultaneousTargets(result.trials, scorable, modalities);
        expect(sim[0] ?? 0).toBeGreaterThan(0);
        expect(Object.values(sim).reduce((a, b) => a + b, 0)).toBe(scorable.length);
    });

    it('soft-fails with best-effort plan when quota override is impossible', () => {
        const modalities = getModalitiesForMode('dual');
        const sessionN = 2;
        const gameLength = 10;
        const scorable = gameLength - sessionN;

        const result = planBlockStimuli({
            gameLength,
            sessionN,
            modalities,
            lureStage: 'A',
            random: () => 0.5,
            quotaOverride: {
                targetsPerModality: { position: scorable + 5, audio: 0 },
                luresPerModality: { position: 0, audio: 0 },
            },
        });

        expect(result.ok).toBe(false);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.trials.length).toBe(gameLength);
        for (let t = 0; t < gameLength; t++) {
            expect(result.trials[t]).toBeDefined();
        }
    });

    it('marks warmup trials as random roles', () => {
        const modalities = getModalitiesForMode('dual');
        const result = planBlockStimuli({
            gameLength: 12,
            sessionN: 3,
            modalities,
            lureStage: 'B',
            random: () => 0.3,
        });

        for (let t = 0; t < 3; t++) {
            for (const m of modalities) {
                expect(result.trials[t].byModality[m]?.role).toBe('random');
            }
        }
    });
});
