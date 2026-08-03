import { describe, expect, it } from 'vitest';
import {
    adaptiveBlockProgress,
    adaptiveConditionCode,
    adaptivePhaseLabel,
    blockRoleLabel,
    controllerActionHint,
    progressLevelFlavor,
    progressLevelSummary,
} from './adaptiveDisplay';
import { createDefaultCurriculumLadder } from '../model/adaptiveCurriculum';

describe('adaptiveDisplay', () => {
    it('labels adaptive block roles', () => {
        expect(blockRoleLabel('assessed')).toBe('Adaptive block');
        expect(blockRoleLabel('guided')).toBe('Guided block');
        expect(blockRoleLabel('free')).toBeNull();
    });

    it('formats promote/demote hints', () => {
        const ladder = createDefaultCurriculumLadder();
        expect(
            controllerActionHint({
                action: 'promote',
                ladder: { ...ladder, stage: 'fixed_lure_near' },
                reason: 'Clean/lure gates met — promote stage',
            })
        ).toBe('Advance: Clean/lure gates met — promote stage');
    });

    it('labels phases and condition codes', () => {
        const ladder = createDefaultCurriculumLadder();
        expect(adaptivePhaseLabel('playing')).toBe('Adaptive');
        expect(adaptiveConditionCode(ladder)).toBe('C2');
        expect(progressLevelFlavor(ladder)).toContain('n=2');
        expect(progressLevelSummary(ladder)).toContain('Fixed cyclic');
    });

    it('reports block progress while playing', () => {
        expect(
            adaptiveBlockProgress({
                blocksDone: 2,
                phase: 'playing',
            })
        ).toEqual({
            done: 2,
            failHint: expect.stringContaining('Lure-sensitive'),
        });
        expect(
            adaptiveBlockProgress({
                blocksDone: 2,
                phase: 'idle',
            })
        ).toBeNull();
    });
});
