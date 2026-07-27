import { describe, expect, it } from 'vitest';
import {
    buildBlockSdtReport,
    classifySdtCell,
    normsInv,
    sensitivityFromCounts,
    SdtTrialEvent,
} from './sdtMetrics';

describe('sdtMetrics', () => {
    it('classifies the four SDT cells', () => {
        expect(classifySdtCell(true, true)).toBe('hit');
        expect(classifySdtCell(true, false)).toBe('miss');
        expect(classifySdtCell(false, true)).toBe('fa');
        expect(classifySdtCell(false, false)).toBe('cr');
    });

    it('keeps d′ finite for perfect hits and zero false alarms (loglinear)', () => {
        const s = sensitivityFromCounts(10, 0, 0, 10);
        expect(Number.isFinite(s.dPrime)).toBe(true);
        expect(s.dPrime).toBeGreaterThan(2);
        expect(s.hitRate).toBeCloseTo(10.5 / 11, 5);
        expect(s.falseAlarmRate).toBeCloseTo(0.5 / 11, 5);
    });

    it('keeps d′ finite when there are zero targets', () => {
        const s = sensitivityFromCounts(0, 0, 2, 8);
        expect(Number.isFinite(s.dPrime)).toBe(true);
    });

    it('yields near-zero d′ at chance with balanced rates', () => {
        const s = sensitivityFromCounts(5, 5, 5, 5);
        expect(s.dPrime).toBeCloseTo(0, 5);
        expect(s.criterion).toBeCloseTo(0, 5);
    });

    it('reports negative criterion for liberal responders (high FA)', () => {
        const s = sensitivityFromCounts(8, 2, 8, 2);
        expect(s.criterion).toBeLessThan(0);
    });

    it('normsInv is antisymmetric around 0.5', () => {
        expect(normsInv(0.5)).toBeCloseTo(0, 8);
        expect(normsInv(0.9)).toBeCloseTo(-normsInv(0.1), 6);
    });

    it('builds stratified clean vs lure reports sharing hit rate', () => {
        const events: SdtTrialEvent[] = [
            { modality: 'position', cell: 'hit', stratum: 'clean' },
            { modality: 'position', cell: 'hit', stratum: 'clean' },
            { modality: 'position', cell: 'miss', stratum: 'clean' },
            { modality: 'position', cell: 'cr', stratum: 'clean' },
            { modality: 'position', cell: 'cr', stratum: 'clean' },
            { modality: 'position', cell: 'fa', stratum: 'lure' },
            { modality: 'position', cell: 'cr', stratum: 'lure' },
        ];

        const report = buildBlockSdtReport(events, ['position']);
        const pos = report.byModality.position!;

        expect(pos.all.counts.hits).toBe(2);
        expect(pos.all.counts.misses).toBe(1);
        expect(pos.clean.counts.falseAlarms).toBe(0);
        expect(pos.lure.counts.falseAlarms).toBe(1);
        expect(pos.clean.hitRate).toBe(pos.lure.hitRate);
        expect(pos.lure.dPrime).toBeLessThan(pos.clean.dPrime);
        expect(pos.lureCost).toBeCloseTo(0.5 - 0, 5);
    });

    it('reports median correct RT when present', () => {
        const events: SdtTrialEvent[] = [
            { modality: 'audio', cell: 'hit', stratum: 'clean', responseTimeMs: 100 },
            { modality: 'audio', cell: 'hit', stratum: 'clean', responseTimeMs: 300 },
            { modality: 'audio', cell: 'hit', stratum: 'clean', responseTimeMs: 200 },
            { modality: 'audio', cell: 'cr', stratum: 'clean' },
        ];
        const report = buildBlockSdtReport(events, ['audio']);
        expect(report.byModality.audio!.medianCorrectRtMs).toBe(200);
        expect(report.medianCorrectRtMs).toBe(200);
    });
});
