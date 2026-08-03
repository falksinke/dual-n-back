import { describe, expect, it } from 'vitest';
import {
    CURRICULUM_MAX_N,
    CURRICULUM_MIN_N,
    advanceAcquisition,
    createDefaultCurriculumLadder,
    demoteCurriculumStage,
    isAssessedStage,
    promoteCurriculumStage,
    settingsFromCurriculum,
} from './adaptiveCurriculum';

describe('adaptiveCurriculum', () => {
    it('starts a new N at instruction / guided acquisition, not assessed lure or speed', () => {
        const ladder = createDefaultCurriculumLadder();
        expect(ladder.track).toBe('fixed');
        expect(ladder.n).toBe(CURRICULUM_MIN_N);
        expect(ladder.stage).toBe('instruction');
        expect(isAssessedStage(ladder.stage)).toBe(false);

        const guided = advanceAcquisition(ladder);
        expect(guided.stage).toBe('guided');
        const guidedSettings = settingsFromCurriculum(guided);
        expect(guidedSettings.assessed).toBe(false);
        expect(guidedSettings.pointerMode).toBe('full');
        expect(guidedSettings.variableN).toBe(false);
        expect(guidedSettings.lureStage).toBe('A');
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
            if (isAssessedStage(state.stage)) {
                state = promoteCurriculumStage(state);
            } else {
                state = advanceAcquisition(state);
            }
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
            state = isAssessedStage(state.stage)
                ? promoteCurriculumStage(state)
                : advanceAcquisition(state);
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
            state = isAssessedStage(state.stage)
                ? promoteCurriculumStage(state)
                : advanceAcquisition(state);
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
            state = isAssessedStage(state.stage)
                ? promoteCurriculumStage(state)
                : advanceAcquisition(state);
        }
        const n = state.n;
        const next = promoteCurriculumStage(state);
        expect(next.track).toBe('fixed');
        expect(next.n).toBe(Math.min(CURRICULUM_MAX_N, n + 1));
        expect(next.stage).toBe('instruction');
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
});
