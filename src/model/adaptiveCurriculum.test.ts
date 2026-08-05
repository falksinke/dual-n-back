import { describe, expect, it } from 'vitest';
import {
    CURRICULUM_MAX_N,
    CURRICULUM_MIN_N,
    advanceAcquisition,
    createDefaultCurriculumLadder,
    demoteCurriculumStage,
    enterTeachRamp,
    isAssessedStage,
    migrateCurriculumStage,
    promoteCurriculumStage,
    settingsFromCurriculum,
} from './adaptiveCurriculum';

function advanceTowardAssessed(state: ReturnType<typeof createDefaultCurriculumLadder>) {
    if (state.stage === 'teach_decide') {
        return enterTeachRamp(state);
    }
    if (isAssessedStage(state.stage)) {
        return promoteCurriculumStage(state);
    }
    return advanceAcquisition(state);
}

describe('adaptiveCurriculum', () => {
    it('starts a new N at teach_walkthrough, not assessed lure or speed', () => {
        const ladder = createDefaultCurriculumLadder();
        expect(ladder.track).toBe('fixed');
        expect(ladder.n).toBe(CURRICULUM_MIN_N);
        expect(ladder.stage).toBe('teach_walkthrough');
        expect(isAssessedStage(ladder.stage)).toBe(false);

        const decide = advanceAcquisition(ladder);
        expect(decide.stage).toBe('teach_decide');
        const decideSettings = settingsFromCurriculum(decide);
        expect(decideSettings.assessed).toBe(false);
        expect(decideSettings.pointerMode).toBe('full');
        expect(decideSettings.variableN).toBe(false);
        expect(decideSettings.lureStage).toBe('A');
        expect(decideSettings.teachReveals).toBe(true);
        expect(decideSettings.teachPacedOps).toBe(true);
    });

    it('maps legacy guided/fade/instruction stages', () => {
        expect(migrateCurriculumStage('instruction')).toBe('teach_walkthrough');
        expect(migrateCurriculumStage('guided')).toBe('teach_decide');
        expect(migrateCurriculumStage('fade')).toBe('teach_ramp');
    });

    it('never sets variableN on any fixed-track stage', () => {
        let state = createDefaultCurriculumLadder();
        const seen = new Set<string>();
        for (let i = 0; i < 20; i++) {
            seen.add(`${state.track}:${state.stage}`);
            const settings = settingsFromCurriculum(state);
            if (state.track === 'fixed') {
                expect(settings.variableN, state.stage).toBe(false);
            }
            state = advanceTowardAssessed(state);
            if (state.track === 'flexible') break;
        }
        expect(seen.has('fixed:fixed_mastery')).toBe(true);
    });

    it('places lure stages before fast / jitter in fixed ordering', () => {
        let state = createDefaultCurriculumLadder();
        const order: string[] = [];
        while (state.track === 'fixed') {
            order.push(state.stage);
            if (state.stage === 'fixed_mastery') break;
            state = advanceTowardAssessed(state);
        }
        const near = order.indexOf('fixed_lure_near');
        const both = order.indexOf('fixed_lure_both');
        const fast = order.indexOf('fixed_fast');
        const jitter = order.indexOf('fixed_jitter');
        expect(near).toBeGreaterThan(-1);
        expect(both).toBeGreaterThan(near);
        expect(fast).toBeGreaterThan(both);
        expect(jitter).toBeGreaterThan(fast);
    });

    it('unlocks flexible lag at the same N after fixed mastery', () => {
        let state = createDefaultCurriculumLadder();
        while (!(state.track === 'fixed' && state.stage === 'fixed_mastery')) {
            state = advanceTowardAssessed(state);
        }
        const n = state.n;
        const unlocked = promoteCurriculumStage(state);
        expect(unlocked.track).toBe('flexible');
        expect(unlocked.n).toBe(n);
        expect(unlocked.stage).toBe('flex_base');
        expect(settingsFromCurriculum(unlocked).variableN).toBe(true);
    });

    it('increments N and returns to acquisition after flexible mastery', () => {
        let state = createDefaultCurriculumLadder();
        while (!(state.track === 'flexible' && state.stage === 'flex_mastery')) {
            state = advanceTowardAssessed(state);
        }
        const n = state.n;
        const next = promoteCurriculumStage(state);
        expect(next.track).toBe('fixed');
        expect(next.n).toBe(Math.min(CURRICULUM_MAX_N, n + 1));
        expect(next.stage).toBe('teach_walkthrough');
        expect(isAssessedStage(next.stage)).toBe(false);
    });

    it('demotes within assessed fixed stages without enabling variable N', () => {
        const state = {
            ...createDefaultCurriculumLadder(),
            stage: 'fixed_fast' as const,
            lureStage: 'E' as const,
        };
        const demoted = demoteCurriculumStage(state);
        expect(demoted.track).toBe('fixed');
        expect(demoted.stage).toBe('fixed_lure_both');
        expect(settingsFromCurriculum(demoted).variableN).toBe(false);
    });

    it('enterTeachRamp hides reveals and leaves assesseds off', () => {
        const decide = {
            ...createDefaultCurriculumLadder(),
            stage: 'teach_decide' as const,
        };
        const ramp = enterTeachRamp(decide);
        expect(ramp.stage).toBe('teach_ramp');
        const settings = settingsFromCurriculum(ramp);
        expect(settings.teachReveals).toBe(false);
        expect(settings.pointerMode).toBe('fade');
        expect(settings.isiMin).toBeGreaterThan(0);
        const clean = advanceAcquisition(ramp);
        expect(clean.stage).toBe('fixed_clean');
        expect(settingsFromCurriculum(clean).assessed).toBe(true);
    });
});
