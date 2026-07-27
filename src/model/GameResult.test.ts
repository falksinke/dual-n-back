import { describe, expect, it } from 'vitest';
import { GameResult } from './GameResult';

describe('GameResult', () => {
    it('computes match percentages for dual modalities', () => {
        const result = new GameResult(
            {
                audio: { success: 7, failed: 3 },
                position: { success: 5, failed: 5 },
            },
            ['position', 'audio']
        );

        expect(result.audioMatchPercentage).toBe(70);
        expect(result.positionMatchPercentage).toBe(50);
        expect(result.generalMatchPercentage).toBe(60);
    });

    it('returns zero percentages when there are no scored events', () => {
        const result = new GameResult(
            {
                audio: { success: 0, failed: 0 },
                position: { success: 0, failed: 0 },
            },
            ['position', 'audio']
        );

        expect(result.audioMatchPercentage).toBe(0);
        expect(result.positionMatchPercentage).toBe(0);
        expect(result.generalMatchPercentage).toBe(0);
    });

    it('reports per-modality scores for triple mode including zero-attempt modality', () => {
        const result = new GameResult(
            {
                position: { success: 4, failed: 1 },
                color: { success: 0, failed: 0 },
                audio: { success: 3, failed: 2 },
            },
            ['position', 'color', 'audio']
        );

        expect(result.getMatchPercentage('color')).toBe(0);
        expect(result.getMatchPercentage('position')).toBe(80);
        expect(result.generalMatchPercentage).toBe(70);
    });

    it('keeps audioRecap and positionRecap getters for compatibility', () => {
        const result = new GameResult(
            {
                audio: { success: 2, failed: 1 },
                position: { success: 1, failed: 0 },
            },
            ['position', 'audio']
        );

        expect(result.audioRecap.success).toBe(2);
        expect(result.positionRecap.success).toBe(1);
    });

    it('exposes optional SDT report without changing match percentages', () => {
        const sdt = {
            modalities: ['position', 'audio'] as const,
            byModality: {},
            medianCorrectRtMs: null,
        };
        const result = new GameResult(
            {
                audio: { success: 7, failed: 3 },
                position: { success: 5, failed: 5 },
            },
            ['position', 'audio'],
            sdt
        );

        expect(result.sdt).toBe(sdt);
        expect(result.generalMatchPercentage).toBe(60);
    });
});
