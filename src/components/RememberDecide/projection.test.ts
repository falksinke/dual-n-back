import { describe, expect, it } from 'vitest';
import { createSymmetryPattern } from '../../model/rememberDecide';
import type { RememberDecideRound } from '../../model/rememberDecide';
import { initialState, rememberDecideReducer } from './controller';
import type { RememberDecideState } from './controller';
import { projectState } from './projection';

const round: RememberDecideRound = {
    config: { sequenceLength: 3, symmetryDifficulty: 'fewer', judgementDeadlineMs: 5000 },
    items: [true, false, true].map((isSymmetric, index) => ({
        index,
        location: { row: index % 2, column: index % 2 },
        pattern: createSymmetryPattern(isSymmetric, 'fewer', () => 0.23),
        isSymmetric,
    })),
};
const started = rememberDecideReducer(initialState(), { type: 'start', round });

// Presentation must never reach around this allowlist to animate the true route.
describe('The Moth Keeper projection boundary', () => {
    it.each(['location-blank', 'decision-blank'] as const)('projects only neutral identity/status in %s', (phase) => {
        const view = projectState({ ...started, phase });
        expect(Object.keys(view).sort()).toEqual(['generation', 'itemCount', 'itemIndex', 'phase', 'status']);
    });

    it('gives the garden only its current landing and the lamp only its current cells', () => {
        const location = projectState(started);
        expect(Object.keys(location).sort()).toEqual(['generation', 'itemCount', 'itemIndex', 'location', 'phase', 'status']);
        const decision = projectState({ ...started, phase: 'decision' });
        expect(Object.keys(decision).sort()).toEqual(['deadlineMs', 'generation', 'itemCount', 'itemIndex', 'pattern', 'phase', 'status']);
        expect(JSON.stringify(decision)).not.toMatch(/isSymmetric|location|recalled|decisions/);
    });

    it('gives recall only the player selections, not the true sequence or decision results', () => {
        const recalled = [{ row: 3, column: 2 }, { row: 3, column: 2 }];
        const view = projectState({ ...started, phase: 'recall', recalled });
        expect(Object.keys(view).sort()).toEqual(['generation', 'phase', 'recalled', 'sequenceLength', 'status']);
        expect(view).toMatchObject({ recalled });
        expect(JSON.stringify(view)).not.toMatch(/pattern|isSymmetric|decisions|score/);
    });

    it.each(['location', 'location-blank', 'decision', 'decision-blank', 'recall'] as const)('discards every task field on interruption from %s', (phase) => {
        const state: RememberDecideState = { ...started, phase };
        const interrupted = rememberDecideReducer(state, { type: 'interrupt', generation: state.generation });
        expect(Object.keys(projectState(interrupted)).sort()).toEqual(['generation', 'phase', 'status']);
        expect(interrupted.round).toBeNull();
        expect(interrupted.score).toBeNull();
    });
});
