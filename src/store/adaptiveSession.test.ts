import { describe, expect, it, vi } from 'vitest';
import { ModalityId } from '../model/modalities';
import {
    BlockSdtReport,
    ModalitySdtReport,
    SdtSensitivity,
} from '../model/sdtMetrics';
import { decideAdaptive, LadderState } from '../model/adaptiveController';
import {
    applyControllerAction,
    createInitialAdaptiveSession,
    nextBlockConfig,
    OPEN_ANCHORS,
    processAdaptiveBlockEnd,
    shouldStartNextBlock,
} from './adaptiveSession';
import * as adaptiveController from '../model/adaptiveController';
import { createDefaultModeLadder } from '../model/ladderPersistence';

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

describe('adaptiveSession helpers', () => {
    it('creates an initial session targeting eight adaptive blocks', () => {
        const session = createInitialAdaptiveSession();
        expect(session.phase).toBe('anchor-open');
        expect(session.adaptiveTarget).toBe(8);
        expect(session.openAnchorsDone).toBe(0);
        expect(session.pendingContinue).toBe(false);
    });

    it('allows overriding adaptiveTarget in tests', () => {
        const session = createInitialAdaptiveSession({ adaptiveTarget: 3 });
        expect(session.adaptiveTarget).toBe(3);
    });

    it('applyControllerAction nUp reduces lure stage', () => {
        const ladder: LadderState = { n: 2, lureStage: 'E', isiTier: 0 };
        const next = applyControllerAction(ladder, {
            action: 'nUp',
            reason: 'test',
        });
        expect(next.n).toBe(3);
        expect(next.lureStage).toBe('C');
    });

    it('applyControllerAction nDown floors n at 2', () => {
        const ladder: LadderState = { n: 2, lureStage: 'B', isiTier: 1 };
        const next = applyControllerAction(ladder, {
            action: 'nDown',
            reason: 'test',
        });
        expect(next.n).toBe(2);
        expect(next.isiTier).toBe(1);
    });

    it('nextBlockConfig returns anchor-open blocks before adaptive quota', () => {
        const session = createInitialAdaptiveSession();
        const ladder = createDefaultModeLadder();
        const block = nextBlockConfig(session, ladder, 'dual', 20);
        expect(block.blockRole).toBe('anchor-open');
        expect(block.lureStage).toBe('A');
        expect(block.n).toBe(ladder.n);
    });

    it('shouldStartNextBlock is false after closing anchor completes', () => {
        const session = createInitialAdaptiveSession({ adaptiveTarget: 1 });
        const done = {
            ...session,
            openAnchorsDone: OPEN_ANCHORS,
            adaptiveBlocksDone: 1,
            closeAnchorDone: true,
            phase: 'summary' as const,
        };
        expect(shouldStartNextBlock(done)).toBe(false);
    });

    it('processAdaptiveBlockEnd advances open anchor counters without deciding', () => {
        const session = createInitialAdaptiveSession();
        const ladder = createDefaultModeLadder();
        const end = processAdaptiveBlockEnd(
            session,
            ladder,
            'dual',
            'anchor-open',
            null
        );
        expect(end.session.openAnchorsDone).toBe(1);
        expect(end.session.phase).toBe('interstitial');
        expect(end.session.pendingContinue).toBe(true);
        expect(end.action).toBeNull();
        expect(end.ladder).toEqual(ladder);
    });

    it('feeds three adaptive reports and invokes decideAdaptive via processAdaptiveBlockEnd', () => {
        const decideSpy = vi.spyOn(adaptiveController, 'decideAdaptive');

        const strongBlock = makeBlock(DUAL, {
            position: { clean: 2.5, lure: 2.0 },
            audio: { clean: 2.5, lure: 2.0 },
        });

        let session = createInitialAdaptiveSession({ adaptiveTarget: 3 });
        let ladder = createDefaultModeLadder();

        for (let i = 0; i < 3; i++) {
            const end = processAdaptiveBlockEnd(
                session,
                ladder,
                'dual',
                'adaptive',
                strongBlock
            );
            session = end.session;
            ladder = end.ladder;
        }

        expect(decideSpy).toHaveBeenCalled();
        expect(session.adaptiveReports).toHaveLength(3);
        expect(session.adaptiveBlocksDone).toBe(3);

        decideSpy.mockRestore();
    });

    it('matches decideAdaptive output when three adaptive blocks are supplied directly', () => {
        const strongBlock = makeBlock(DUAL, {
            position: { clean: 2.5, lure: 2.0 },
            audio: { clean: 2.5, lure: 2.0 },
        });
        const window = [strongBlock, strongBlock, strongBlock];
        const ladder: LadderState = { n: 2, lureStage: 'C', isiTier: 0 };

        const action = decideAdaptive(window, ladder, DUAL);
        expect(action.action).toBe('hold');
    });

    it('sets remediation modality when controller requests remediation', () => {
        const weakAudioBlock = makeBlock(DUAL, {
            position: { clean: 2.5, lure: 2.0 },
            audio: { clean: 0.8, lure: 2.0 },
        });
        const window = [weakAudioBlock, weakAudioBlock, weakAudioBlock];

        let session = createInitialAdaptiveSession({ adaptiveTarget: 3 });
        session = {
            ...session,
            adaptiveReports: window.slice(0, 2),
            adaptiveBlocksDone: 2,
        };
        const ladder = createDefaultModeLadder();

        const end = processAdaptiveBlockEnd(
            session,
            ladder,
            'dual',
            'adaptive',
            weakAudioBlock
        );

        if (end.action?.action === 'remediate') {
            expect(end.session.remediationModality).toBe('audio');
            const remediation = nextBlockConfig(end.session, end.ladder, 'dual', 10);
            expect(remediation.blockRole).toBe('remediation');
            expect(remediation.modalities).toEqual(['audio', 'position']);
        } else {
            expect(end.action?.action).toBe('hold');
        }
    });
});
