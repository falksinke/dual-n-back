import { describe, expect, it } from 'vitest';
import type { RememberDecideRound } from '../../model/rememberDecide';
import {
    BLANK_TRANSITION_MS,
    LOCATION_EXPOSURE_MS,
    initialState,
    rememberDecideReducer,
} from './controller';
import type { RememberDecideAction, RememberDecideState, TimedPhase } from './controller';
import { projectState } from './projection';

function round(truths: readonly boolean[] = [true, false, true]): RememberDecideRound {
    return {
        config: { sequenceLength: truths.length, symmetryDifficulty: 'more', judgementDeadlineMs: 5000 },
        items: truths.map((isSymmetric, index) => ({
            index,
            location: { row: index % 4, column: (index + 1) % 4 },
            pattern: { cells: Array(36).fill(index % 2 === 0) },
            isSymmetric,
        })),
    };
}

function reduce(state: RememberDecideState, ...actions: RememberDecideAction[]): RememberDecideState {
    return actions.reduce(rememberDecideReducer, state);
}

function mounted(state: RememberDecideState, phase: TimedPhase, now: number): RememberDecideState {
    return rememberDecideReducer(state, {
        type: 'mount-phase', generation: state.generation, phase, itemIndex: state.itemIndex, now,
    });
}

function elapsed(state: RememberDecideState, phase: TimedPhase, now: number): RememberDecideState {
    return rememberDecideReducer(state, {
        type: 'phase-elapsed', generation: state.generation, phase, itemIndex: state.itemIndex, now,
    });
}

function reachDecision(state: RememberDecideState, startAt = 0): RememberDecideState {
    const location = mounted(state, 'location', startAt);
    const locationBlank = elapsed(location, 'location', startAt + LOCATION_EXPOSURE_MS);
    const blank = mounted(locationBlank, 'location-blank', startAt + LOCATION_EXPOSURE_MS);
    return elapsed(blank, 'location-blank', startAt + LOCATION_EXPOSURE_MS + BLANK_TRANSITION_MS);
}

describe('Remember & Decide controller', () => {
    it('alternates location and decision after every item, including the last, before recall', () => {
        let state = rememberDecideReducer(initialState(), { type: 'start', round: round() });
        for (let itemIndex = 0; itemIndex < 3; itemIndex++) {
            state = reachDecision(state, itemIndex * 2000);
            expect(projectState(state)).toMatchObject({ phase: 'decision', itemIndex });
            state = mounted(state, 'decision', itemIndex * 2000 + 1250);
            state = rememberDecideReducer(state, {
                type: 'answer', generation: state.generation, itemIndex, answer: itemIndex === 1 ? 'no' : 'yes', now: itemIndex * 2000 + 1300,
            });
            state = mounted(state, 'decision-blank', itemIndex * 2000 + 1300);
            state = elapsed(state, 'decision-blank', itemIndex * 2000 + 1550);
        }
        expect(state.phase).toBe('recall');
        expect(state.decisions).toHaveLength(3);
    });

    it('accepts before the deadline, times out at or after it, and never overwrites a settled answer', () => {
        const decision = mounted(reachDecision(rememberDecideReducer(initialState(), { type: 'start', round: round() })), 'decision', 1000);
        const onTime = rememberDecideReducer(decision, {
            type: 'answer', generation: decision.generation, itemIndex: 0, answer: 'yes', now: 5999.99,
        });
        expect(onTime.decisions).toEqual([{ itemIndex: 0, answer: 'yes', timedOut: false }]);
        expect(rememberDecideReducer(onTime, {
            type: 'phase-elapsed', generation: decision.generation, phase: 'decision', itemIndex: 0, now: 6000,
        })).toBe(onTime);

        for (const now of [6000, 6001]) {
            const timedOut = rememberDecideReducer(decision, {
                type: 'answer', generation: decision.generation, itemIndex: 0, answer: 'yes', now,
            });
            expect(timedOut.decisions).toEqual([{ itemIndex: 0, answer: null, timedOut: true }]);
        }
    });

    it('rejects callbacks from an earlier item or round', () => {
        let state = mounted(reachDecision(rememberDecideReducer(initialState(), { type: 'start', round: round() })), 'decision', 0);
        const staleAnswer: RememberDecideAction = {
            type: 'answer', generation: state.generation, itemIndex: 0, answer: 'yes', now: 1,
        };
        state = reduce(state, staleAnswer);
        state = mounted(state, 'decision-blank', 1);
        state = elapsed(state, 'decision-blank', 251);
        state = reachDecision(state, 300);
        expect(rememberDecideReducer(state, staleAnswer)).toBe(state);
        const nextRound = rememberDecideReducer(state, { type: 'start', round: round() });
        expect(rememberDecideReducer(nextRound, staleAnswer)).toBe(nextRound);
    });

    it('discards task material when every active phase is interrupted', () => {
        const started = rememberDecideReducer(initialState(), { type: 'start', round: round() });
        const phases: RememberDecideState[] = [
            started,
            elapsed(mounted(started, 'location', 0), 'location', 1000),
            reachDecision(started),
            rememberDecideReducer(mounted(reachDecision(started), 'decision', 0), {
                type: 'answer', generation: started.generation, itemIndex: 0, answer: 'yes', now: 1,
            }),
            { ...started, phase: 'recall' },
        ];
        for (const active of phases) {
            const interrupted = rememberDecideReducer(active, { type: 'interrupt', generation: active.generation });
            expect(interrupted).toMatchObject({ phase: 'interrupted', round: null, decisions: [], recalled: [], score: null });
            expect(projectState(interrupted)).toEqual(expect.objectContaining({ phase: 'interrupted' }));
        }
    });

    it('supports repeated recall, Undo, Clear, and complete-only Submit without exposing answers', () => {
        const target = round();
        let state: RememberDecideState = { ...rememberDecideReducer(initialState(), { type: 'start', round: target }), phase: 'recall' };
        const generation = state.generation;
        expect(rememberDecideReducer(state, { type: 'submit', generation })).toBe(state);
        state = reduce(
            state,
            { type: 'remember', generation, location: target.items[0].location },
            { type: 'remember', generation, location: target.items[0].location },
        );
        expect(state.recalled[0]).toEqual(state.recalled[1]);
        state = rememberDecideReducer(state, { type: 'undo', generation });
        expect(state.recalled).toHaveLength(1);
        state = rememberDecideReducer(state, { type: 'clear', generation });
        expect(state.recalled).toEqual([]);
        for (const item of target.items) state = rememberDecideReducer(state, { type: 'remember', generation, location: item.location });
        state = rememberDecideReducer(state, { type: 'submit', generation });
        expect(state.phase).toBe('result');
        expect(state.score?.exactSequence).toBe(true);
    });
});
