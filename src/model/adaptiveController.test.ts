import { describe, expect, it } from 'vitest';
import {
    decideCurriculumProgression,
    FAILS_TO_DEMOTE_STAGE,
} from './adaptiveController';
import {
    createDefaultCurriculumLadder,
    type CurriculumLadderState,
} from './adaptiveCurriculum';
import type { BlockSdtReport, ModalitySdtReport, SdtSensitivity } from './sdtMetrics';
import { emptySdtCounts } from './sdtMetrics';

function sens(dPrime: number, faRate = 0.05, criterion = 0): SdtSensitivity {
    return {
        counts: emptySdtCounts(),
        hitRate: 0.9,
        falseAlarmRate: faRate,
        dPrime,
        criterion,
    };
}

function modality(
    id: 'position' | 'audio',
    opts: {
        cleanD?: number;
        lureD?: number;
        allD?: number;
        lureFaRate?: number;
        lureSampleOk?: boolean;
        targetCount?: number;
        lureNonTargetCount?: number;
        criterion?: number;
    } = {}
): ModalitySdtReport {
    const cleanD = opts.cleanD ?? 2.2;
    const lureD = opts.lureD ?? 1.8;
    const allD = opts.allD ?? 2.0;
    const lureFa = opts.lureFaRate ?? 0.1;
    return {
        modality: id,
        all: sens(allD, 0.08, opts.criterion ?? 0),
        clean: sens(cleanD, 0.05, opts.criterion ?? 0),
        lure: sens(lureD, lureFa, opts.criterion ?? 0),
        lureSampleOk: opts.lureSampleOk ?? true,
        targetCount: opts.targetCount ?? 8,
        lureNonTargetCount: opts.lureNonTargetCount ?? 6,
        lureCost: lureFa - 0.05,
        medianCorrectRtMs: 400,
    };
}

function report(
    mods: ModalitySdtReport[],
    extras: Partial<BlockSdtReport> = {}
): BlockSdtReport {
    const byModality: BlockSdtReport['byModality'] = {};
    for (const m of mods) {
        byModality[m.modality] = m;
    }
    return {
        modalities: mods.map((m) => m.modality),
        byModality,
        medianCorrectRtMs: 400,
        ...extras,
    };
}

const assessedFixed = (): CurriculumLadderState => ({
    ...createDefaultCurriculumLadder(),
    stage: 'fixed_clean',
    lureStage: 'A',
});

describe('decideCurriculumProgression', () => {
    it('advances acquisition on guided blocks without SDT promote of assessed stage', () => {
        const ladder: CurriculumLadderState = {
            ...createDefaultCurriculumLadder(),
            stage: 'guided',
        };
        const decision = decideCurriculumProgression({
            ladder,
            blockRole: 'guided',
            sdt: report([modality('position'), modality('audio')]),
            matchPct: 95,
        });
        expect(decision.action).toBe('advance_acquisition');
        expect(decision.ladder.stage).toBe('fade');
        expect(decision.ladder.n).toBe(ladder.n);
    });

    it('holds when samples are sparse', () => {
        const decision = decideCurriculumProgression({
            ladder: assessedFixed(),
            blockRole: 'assessed',
            sdt: report([
                modality('position', { targetCount: 1, lureNonTargetCount: 0, lureSampleOk: false }),
                modality('audio', { targetCount: 1, lureNonTargetCount: 0, lureSampleOk: false }),
            ]),
            matchPct: 100,
        });
        expect(decision.action).toBe('hold');
        expect(decision.ladder.stage).toBe('fixed_clean');
    });

    it('does not promote when Match % is high but lure FA is high (AE2)', () => {
        const decision = decideCurriculumProgression({
            ladder: { ...assessedFixed(), stage: 'fixed_lure_both', lureStage: 'E' },
            blockRole: 'assessed',
            sdt: report([
                modality('position', { cleanD: 2.5, lureD: 0.4, lureFaRate: 0.55 }),
                modality('audio', { cleanD: 2.4, lureD: 0.5, lureFaRate: 0.5 }),
            ]),
            matchPct: 92,
        });
        expect(decision.action).not.toBe('promote');
        expect(['hold', 'demote']).toContain(decision.action);
    });

    it('promotes when clean and lure gates pass', () => {
        const decision = decideCurriculumProgression({
            ladder: assessedFixed(),
            blockRole: 'assessed',
            sdt: report([
                modality('position', { cleanD: 2.3, lureD: 1.8, lureFaRate: 0.08 }),
                modality('audio', { cleanD: 2.1, lureD: 1.7, lureFaRate: 0.1 }),
            ]),
            matchPct: 70,
        });
        expect(decision.action).toBe('promote');
        expect(decision.ladder.stage).toBe('fixed_lure_near');
    });

    it('holds (no promote) on modality collapse', () => {
        const decision = decideCurriculumProgression({
            ladder: assessedFixed(),
            blockRole: 'assessed',
            sdt: report([
                modality('position', { cleanD: 2.5, lureD: 2.0 }),
                modality('audio', { cleanD: 0.6, lureD: 0.4 }),
            ]),
            matchPct: 80,
        });
        expect(decision.action).not.toBe('promote');
    });

    it(`demotes after ${FAILS_TO_DEMOTE_STAGE} consecutive assessed fails`, () => {
        let ladder: CurriculumLadderState = {
            ...assessedFixed(),
            stage: 'fixed_fast',
            lureStage: 'E',
            failStreak: FAILS_TO_DEMOTE_STAGE - 1,
        };
        const decision = decideCurriculumProgression({
            ladder,
            blockRole: 'assessed',
            sdt: report([
                modality('position', { cleanD: 0.8, lureD: 0.5 }),
                modality('audio', { cleanD: 0.7, lureD: 0.4 }),
            ]),
            matchPct: 40,
        });
        expect(decision.action).toBe('demote');
        expect(decision.ladder.stage).toBe('fixed_lure_both');
        expect(decision.ladder.failStreak).toBe(0);
    });
});
