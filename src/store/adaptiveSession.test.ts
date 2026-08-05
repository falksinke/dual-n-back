import { describe, expect, it } from 'vitest';
import { createDefaultCurriculumLadder } from '../model/adaptiveCurriculum';
import { createDefaultModeLadder } from '../model/ladderPersistence';
import { emptySdtCounts, type BlockSdtReport, type ModalitySdtReport } from '../model/sdtMetrics';
import {
    createInitialAdaptiveSession,
    nextBlockConfig,
    processAdaptiveBlockEnd,
    shouldStartNextBlock,
} from './adaptiveSession';

function sens(dPrime: number, faRate = 0.05) {
    return {
        counts: emptySdtCounts(),
        hitRate: 0.9,
        falseAlarmRate: faRate,
        dPrime,
        criterion: 0,
    };
}

function goodReport(): BlockSdtReport {
    const mod = (id: 'position' | 'audio'): ModalitySdtReport => ({
        modality: id,
        all: sens(2.0),
        clean: sens(2.2),
        lure: sens(1.8, 0.1),
        lureSampleOk: true,
        targetCount: 8,
        lureNonTargetCount: 6,
        lureCost: 0.05,
        medianCorrectRtMs: 400,
    });
    return {
        modalities: ['position', 'audio'],
        byModality: { position: mod('position'), audio: mod('audio') },
        medianCorrectRtMs: 400,
    };
}

describe('adaptiveSession helpers', () => {
    it('creates an initial playing session', () => {
        const session = createInitialAdaptiveSession();
        expect(session.phase).toBe('playing');
        expect(session.blocksDone).toBe(0);
        expect(session.pendingContinue).toBe(false);
    });

    it('nextBlockConfig maps teach_walkthrough to reveal-first block knobs', () => {
        const session = createInitialAdaptiveSession();
        const ladder = createDefaultModeLadder();
        const block = nextBlockConfig(session, ladder, 'dual', 20);
        expect(block.blockRole).toBe('teach_walkthrough');
        expect(block.n).toBe(2);
        expect(block.isiMin).toBe(2500);
        expect(block.isiMax).toBe(2500);
        expect(block.variableN).toBe(false);
        expect(block.lureStage).toBe('A');
        expect(block.pointerMode).toBe('full');
        expect(block.teachReveals).toBe(true);
        expect(block.teachPacedOps).toBe(true);
        expect(block.trials).toBe(20);
    });

    it('shouldStartNextBlock is true only on interstitial continue', () => {
        const session = createInitialAdaptiveSession();
        expect(shouldStartNextBlock(session)).toBe(false);
        expect(
            shouldStartNextBlock({
                ...session,
                phase: 'interstitial',
                pendingContinue: true,
            })
        ).toBe(true);
    });

    it('processAdaptiveBlockEnd advances walkthrough to decide, ignoring Match %', () => {
        const session = createInitialAdaptiveSession();
        const ladder = createDefaultModeLadder();
        const end = processAdaptiveBlockEnd(session, ladder, goodReport(), 10);
        expect(end.action.action).toBe('advance_acquisition');
        expect(end.ladder.stage).toBe('teach_decide');
        expect(end.session.pendingContinue).toBe(true);
        expect(end.session.phase).toBe('interstitial');
        expect(end.session.blocksDone).toBe(1);
    });

    it('processAdaptiveBlockEnd promotes assessed stage when SDT gates pass', () => {
        const session = createInitialAdaptiveSession();
        const ladder = {
            ...createDefaultCurriculumLadder(),
            stage: 'fixed_clean' as const,
            lureStage: 'A' as const,
        };
        const end = processAdaptiveBlockEnd(session, ladder, goodReport(), 40);
        expect(end.action.action).toBe('promote');
        expect(end.ladder.stage).toBe('fixed_lure_near');
    });
});
