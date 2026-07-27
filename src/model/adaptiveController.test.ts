import { describe, expect, it } from 'vitest';
import { ModalityId } from './modalities';
import {
    BlockSdtReport,
    ModalitySdtReport,
    SdtSensitivity,
} from './sdtMetrics';
import {
    ADAPTIVE_THRESHOLDS,
    decideAdaptive,
    LadderState,
} from './adaptiveController';

const DUAL: ModalityId[] = ['position', 'audio'];

function fakeSensitivity(dPrime: number, criterion = 0): SdtSensitivity {
    return {
        counts: { hits: 10, misses: 0, falseAlarms: 0, correctRejections: 10 },
        hitRate: 0.5,
        falseAlarmRate: 0.5,
        dPrime,
        criterion,
    };
}

function makeModalityReport(
    modality: ModalityId,
    clean: number,
    lure: number,
    all = clean,
    criterion = 0
): ModalitySdtReport {
    return {
        modality,
        all: fakeSensitivity(all, criterion),
        clean: fakeSensitivity(clean, criterion),
        lure: fakeSensitivity(lure, criterion),
        lureCost: 0,
        medianCorrectRtMs: null,
    };
}

function makeBlock(
    modalities: ModalityId[],
    byMod: Partial<
        Record<ModalityId, { clean: number; lure: number; all?: number; c?: number }>
    >,
    medianCorrectRtMs: number | null = null
): BlockSdtReport {
    const byModality: Partial<Record<ModalityId, ModalitySdtReport>> = {};
    for (const modality of modalities) {
        const spec = byMod[modality] ?? { clean: 2.5, lure: 2.0, all: 2.5 };
        byModality[modality] = makeModalityReport(
            modality,
            spec.clean,
            spec.lure,
            spec.all ?? spec.clean,
            spec.c ?? 0
        );
    }
    return { modalities, byModality, medianCorrectRtMs };
}

function repeatBlock(block: BlockSdtReport, count: number): BlockSdtReport[] {
    return Array.from({ length: count }, () => block);
}

const baseLadder: LadderState = { n: 2, lureStage: 'C', isiTier: 0 };

describe('decideAdaptive', () => {
    it('holds when the evidence window has fewer than three blocks', () => {
        const block = makeBlock(DUAL, {
            position: { clean: 2.5, lure: 2.0 },
            audio: { clean: 2.5, lure: 2.0 },
        });

        const action = decideAdaptive([block, block], baseLadder, DUAL);

        expect(action).toEqual({
            action: 'hold',
            reason: 'insufficient evidence window (need 3 adaptive blocks)',
        });
    });

    it('promotes lure stage after two consecutive promotion windows', () => {
        const strong = makeBlock(DUAL, {
            position: { clean: 2.5, lure: 1.8 },
            audio: { clean: 2.5, lure: 1.8 },
        });
        const window = repeatBlock(strong, ADAPTIVE_THRESHOLDS.windowSize);

        const withoutPrior = decideAdaptive(window, baseLadder, DUAL, {
            previousWindowPromoted: false,
        });
        expect(withoutPrior.action).toBe('hold');

        const withPrior = decideAdaptive(window, baseLadder, DUAL, {
            previousWindowPromoted: true,
        });
        expect(withPrior).toEqual({
            action: 'lureUp',
            reason: 'clean mastery with stable lure discrimination across two windows',
        });
    });

    it('demotes lure stage when clean is adequate but lure collapses', () => {
        const block = makeBlock(DUAL, {
            position: { clean: 2.5, lure: 0.8 },
            audio: { clean: 2.5, lure: 0.9 },
        });
        const window = repeatBlock(block, ADAPTIVE_THRESHOLDS.windowSize);

        const action = decideAdaptive(window, baseLadder, DUAL);

        expect(action).toEqual({
            action: 'lureDown',
            reason: 'clean discrimination adequate but lure d′ below threshold',
        });
    });

    it('inserts remediation when exactly one modality is below the clean floor', () => {
        const block = makeBlock(DUAL, {
            position: { clean: 1.0, lure: 1.8 },
            audio: { clean: 2.5, lure: 2.0 },
        });
        const window = repeatBlock(block, ADAPTIVE_THRESHOLDS.windowSize);

        const action = decideAdaptive(window, baseLadder, DUAL);

        expect(action).toEqual({
            action: 'remediate',
            modality: 'position',
            reason: 'single modality below clean d′ floor while aggregate remains adequate',
        });
    });

    it('holds on extreme criterion bias instead of promoting', () => {
        const biased = makeBlock(DUAL, {
            position: { clean: 2.5, lure: 1.8, c: -1.8 },
            audio: { clean: 2.5, lure: 1.8, c: 0.2 },
        });
        const window = repeatBlock(biased, ADAPTIVE_THRESHOLDS.windowSize);

        const action = decideAdaptive(window, baseLadder, DUAL, {
            previousWindowPromoted: true,
        });

        expect(action).toEqual({
            action: 'hold',
            reason: 'extreme response criterion; adjust strategy before changing difficulty',
        });
    });

    it('raises n at top lure stage E after two promotion windows', () => {
        const strong = makeBlock(DUAL, {
            position: { clean: 2.5, lure: 2.0, all: 2.5 },
            audio: { clean: 2.5, lure: 2.0, all: 2.5 },
        });
        const window = repeatBlock(strong, ADAPTIVE_THRESHOLDS.windowSize);
        const ladder: LadderState = { n: 3, lureStage: 'E', isiTier: 0 };

        const action = decideAdaptive(window, ladder, DUAL, {
            previousWindowPromoted: true,
        });

        expect(action).toEqual({
            action: 'nUp',
            reason: 'top lure stage mastered with stable all-modality discrimination across two windows',
        });
    });

    it('tightens ISI when discrimination is mastered and responses are fast enough', () => {
        const fast = makeBlock(
            DUAL,
            {
                position: { clean: 2.5, lure: 1.8, all: 2.5 },
                audio: { clean: 2.5, lure: 1.8, all: 2.5 },
            },
            1800
        );
        const window = repeatBlock(fast, ADAPTIVE_THRESHOLDS.windowSize);
        const ladder: LadderState = { n: 3, lureStage: 'E', isiTier: 0 };

        const action = decideAdaptive(window, ladder, DUAL);

        expect(action).toEqual({
            action: 'isiTighten',
            reason: 'discrimination mastered with fast correct responses; tighten timing one tier',
        });
    });

    it('reverts ISI after post-tighten collapse', () => {
        const collapsed = makeBlock(DUAL, {
            position: { clean: 1.8, lure: 1.0, all: 1.2 },
            audio: { clean: 1.8, lure: 1.0, all: 1.2 },
        });
        const window = repeatBlock(collapsed, ADAPTIVE_THRESHOLDS.windowSize);
        const ladder: LadderState = { n: 3, lureStage: 'D', isiTier: 1 };

        const action = decideAdaptive(window, ladder, DUAL, { postIsiTighten: true });

        expect(action).toEqual({
            action: 'isiRevert',
            reason: 'median d′_all fell below promote floor after ISI tighten',
        });
    });

    it('demotes n on core clean load failure and holds at floor n=2', () => {
        const weak = makeBlock(DUAL, {
            position: { clean: 1.0, lure: 0.8 },
            audio: { clean: 1.0, lure: 0.8 },
        });
        const window = repeatBlock(weak, ADAPTIVE_THRESHOLDS.windowSize);

        const demote = decideAdaptive(window, { n: 3, lureStage: 'C', isiTier: 0 }, DUAL);
        expect(demote.action).toBe('nDown');

        const atFloor = decideAdaptive(window, { n: 2, lureStage: 'C', isiTier: 0 }, DUAL);
        expect(atFloor).toEqual({
            action: 'hold',
            reason: 'clean load failure at minimum n; hold and practice current level',
        });
    });
});
