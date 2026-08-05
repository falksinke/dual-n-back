import { describe, expect, it } from 'vitest';
import {
    adaptiveBlockProgress,
    adaptiveConditionCode,
    adaptivePhaseLabel,
    blockRoleLabel,
    controllerActionHint,
    matchConditionCode,
    matchProgressSummary,
    progressLevelFlavor,
    progressLevelSummary,
} from './adaptiveDisplay';
import { createDefaultCurriculumLadder } from '../model/adaptiveCurriculum';

describe('adaptiveDisplay', () => {
    it('labels adaptive block roles', () => {
        expect(blockRoleLabel('assessed')).toBe('Cyclic block');
        expect(blockRoleLabel('teach_decide')).toBe('Teach decide');
        expect(blockRoleLabel('match')).toBe('Adaptive block');
        expect(blockRoleLabel('free')).toBeNull();
    });

    it('formats promote/demote hints for cyclic and Match%', () => {
        const ladder = createDefaultCurriculumLadder();
        expect(
            controllerActionHint({
                action: 'promote',
                ladder: { ...ladder, stage: 'fixed_lure_near' },
                reason: 'Clean/lure gates met — promote stage',
            })
        ).toBe('Advance: Clean/lure gates met — promote stage');
        expect(
            controllerActionHint({
                action: 'promote',
                levelIndex: 3,
                failStreak: 0,
                reason: 'Match 90% ≥ 80% — promote one level',
            })
        ).toBe('Advance: Match 90% ≥ 80% — promote one level');
    });

    it('labels phases and condition codes', () => {
        const ladder = createDefaultCurriculumLadder();
        expect(adaptivePhaseLabel('playing', 'cyclic')).toBe('Cyclic');
        expect(adaptivePhaseLabel('playing', 'adaptive')).toBe('Adaptive');
        expect(adaptiveConditionCode(ladder)).toBe('C2');
        expect(matchConditionCode({ levelIndex: 12, failStreak: 0 })).toBe('L12');
        expect(progressLevelFlavor(ladder)).toContain('n=2');
        expect(progressLevelSummary(ladder)).toContain('Fixed cyclic');
        expect(matchProgressSummary({ levelIndex: 0, failStreak: 0 })).toContain('Match%');
    });

    it('reports block progress while playing', () => {
        expect(
            adaptiveBlockProgress(
                {
                    blocksDone: 2,
                    phase: 'playing',
                },
                'cyclic'
            )
        ).toEqual({
            done: 2,
            failHint: expect.stringContaining('Lure-sensitive'),
        });
        expect(
            adaptiveBlockProgress(
                {
                    blocksDone: 2,
                    phase: 'playing',
                },
                'adaptive'
            )
        ).toEqual({
            done: 2,
            failHint: expect.stringContaining('Promote'),
        });
        expect(
            adaptiveBlockProgress({
                blocksDone: 2,
                phase: 'idle',
            })
        ).toBeNull();
    });
});
