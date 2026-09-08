import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGridSize, scoreRound } from '../../model/swapping';
import type { AtomicOperation, GridLayout, SwappingConfig, SwappingRound, SwappingToken } from '../../model/swapping/types';
import { initialState, swappingReducer } from './controller';
import { projectState } from './projection';
import Board from './Board';
import Instruction from './Instruction';
import Result from './Result';
import RailwayScene from './RailwayScene';
import Setup from './Setup';

afterEach(cleanup);

const config: SwappingConfig = {
    content: 'letters', layout: 'sequence', length: 4,
    pattern: 'unique', tier: 'basic', operationCount: 1,
};

function letter(value: string, index: number): SwappingToken {
    return { kind: 'letter', value, label: value, id: `private-copy-${value}-${index}` };
}
function makeRound(values: readonly string[]): SwappingRound {
    const initial = values.map(letter);
    const final = [initial[2], initial[1], initial[0], initial[3]];
    return { config, initial, final, states: [initial, final], cards: [{ operations: [{ type: 'swap', first: 0, second: 2 }] }] };
}

/** Written for the parent repository; intentionally not executed for this handoff. */
describe('Midnight Shunting presentation boundary', () => {
    it('produces the same covered board for different private arrangements with the same public instruction', () => {
        const coveredMarkup: string[] = [];
        for (const values of [['C', 'H', 'K', 'L'], ['Q', 'R', 'S', 'T']]) {
            const round = makeRound(values);
            const started = swappingReducer(initialState(config), { type: 'start', round });
            const view = projectState(swappingReducer(started, { type: 'ready' }));
            expect(view).not.toHaveProperty('tokens');
            expect(view).not.toHaveProperty('round');
            if (view.phase !== 'manipulate') throw new Error('Expected manipulation projection');
            const { container, unmount } = render(<Instruction config={view.config} card={view.card}
                cardIndex={view.cardIndex} cardCount={view.cardCount} onDone={vi.fn()} onPause={vi.fn()} />);
            coveredMarkup.push(screen.getByRole('list', { name: 'Covered bays with affected positions highlighted' }).outerHTML);
            expect(container.querySelectorAll('img, .swapping-cargo__mark, details')).toHaveLength(0);
            expect(container.innerHTML).not.toContain('private-copy-');
            expect(container.querySelector('.swapping-scene.is-sealed')).toBeTruthy();
            expect(container.querySelector('.swapping-scene.is-success')).toBeNull();
            unmount();
        }
        expect(coveredMarkup[0]).toBe(coveredMarkup[1]);
    });

    it('makes duplicate copies visually identical rather than exposing their instance IDs', () => {
        const first = letter('C', 0);
        const copy = letter('C', 1);
        const { container } = render(<Board config={{ ...config, length: 3, pattern: 'repeated' }} tokens={[first, copy, letter('H', 2)]} />);
        const marks = container.querySelectorAll('.swapping-cargo');
        expect(marks[0].outerHTML).toBe(marks[1].outerHTML);
        expect(container.innerHTML).not.toContain('private-copy-');
    });

    it('keeps the pause scenery entirely separate from task material', () => {
        const { container } = render(<RailwayScene mood="paused" message="The yard can wait." />);
        expect(container.querySelectorAll('ol, button, img, .swapping-track, .swapping-cargo, .swapping-scenic-train')).toHaveLength(0);
        expect(screen.getByText('The yard can wait.')).toBeTruthy();
    });

    it('checks duplicate result placements by identity, not copy ID, and leaves controls available', () => {
        const first = letter('C', 0);
        const copy = letter('C', 1);
        const h = letter('H', 2);
        const initial = [first, copy, h];
        const correct = [h, copy, first];
        const submitted = [h, first, copy];
        const round: SwappingRound = { config: { ...config, length: 3, pattern: 'repeated' },
            initial, final: correct, states: [initial, correct], cards: [{ operations: [{ type: 'swap', first: 0, second: 2 }] }] };
        const onNewRound = vi.fn();
        const { container } = render(<Result round={round} score={scoreRound(correct, submitted)} onNewRound={onNewRound} onSetup={vi.fn()} />);
        expect(screen.getByText('3 of 3 positions correct')).toBeTruthy();
        const answer = screen.getByRole('list', { name: 'Your submitted arrangement' });
        expect(answer.querySelectorAll('.is-correct')).toHaveLength(3);
        expect(answer.querySelectorAll('.is-incorrect')).toHaveLength(0);
        expect(container.querySelector('.swapping-scene.is-success .swapping-scenic-train')).toBeTruthy();
        // No animationend event or timeout is needed before either action.
        fireEvent.click(screen.getByRole('button', { name: 'New round' }));
        expect(onNewRound).toHaveBeenCalledOnce();
    });

    it('does not trigger a departure for a partially correct arrangement', () => {
        const round = makeRound(['C', 'H', 'K', 'L']);
        const { container } = render(<Result round={round} score={scoreRound(round.final, round.initial)} onNewRound={vi.fn()} onSetup={vi.fn()} />);
        expect(container.querySelector('.swapping-scene.is-review')).toBeTruthy();
        expect(container.querySelector('.swapping-scene.is-success')).toBeNull();
        expect(screen.getByText('2 of 4 positions correct')).toBeTruthy();
    });

    it('keeps all content and geometry choices, length bounds, operation bounds and tier choices', () => {
        render(<Setup config={config} onChange={vi.fn()} onStart={vi.fn()} onSample={vi.fn()} />);
        const values = (label: string) => within(screen.getByLabelText(label)).getAllByRole('option')
            .map((option) => (option as HTMLOptionElement).value);
        expect(values('Content')).toEqual(['numbers', 'letters', 'icons', 'mixed', 'audio']);
        expect(values('Arrangement')).toEqual(['sequence', '2x2', '2x3', '3x3']);
        expect(values('Starting items')).toEqual(Array.from({ length: 10 }, (_, i) => String(i + 3)));
        expect(values('Starting pattern')).toEqual(['unique', 'repeated']);
        expect(values('Operation tier')).toEqual(['basic', 'group', 'compound']);
        expect(values('Atomic operations')).toEqual(Array.from({ length: 8 }, (_, i) => String(i + 1)));
    });
});

const gridCases: { layout: GridLayout; operation: AtomicOperation; highlights: number[] }[] = [
    { layout: '2x2', operation: { type: 'rotate-clockwise' }, highlights: [0, 1, 2, 3] },
    { layout: '2x3', operation: { type: 'swap-rows', first: 0, second: 1 }, highlights: [0, 1, 2, 3, 4, 5] },
    { layout: '2x3', operation: { type: 'swap-columns', first: 0, second: 2 }, highlights: [0, 2, 3, 5] },
    { layout: '3x3', operation: { type: 'mirror-top-bottom' }, highlights: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    { layout: '3x3', operation: { type: 'mirror-left-right' }, highlights: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    { layout: '3x3', operation: { type: 'swap', first: 0, second: 8 }, highlights: [0, 8] },
];

describe('Top-down loading-yard presentation', () => {
    it.each(gridCases)('keeps $layout fixed for $operation.type and marks only the referenced coordinates', ({ layout, operation, highlights }) => {
        render(<Instruction config={{ ...config, content: 'numbers', tier: 'group', layout, length: getGridSize(layout) }}
            card={{ operations: [operation] }} cardIndex={0} cardCount={1} onDone={vi.fn()} onPause={vi.fn()} />);
        const board = screen.getByRole('list', { name: 'Covered bays with affected positions highlighted' });
        const slots = within(board).getAllByRole('listitem');
        expect(slots).toHaveLength(getGridSize(layout));
        expect(slots.flatMap((slot, index) => slot.classList.contains('is-highlighted') ? [index] : [])).toEqual(highlights);
        expect(board.classList.contains('is-grid')).toBe(true);
        expect(board.getAttribute('style')).toContain(`--swapping-columns: ${layout === '2x2' ? 2 : 3}`);
        expect(board.querySelectorAll('img, .swapping-cargo__mark')).toHaveLength(0);
        expect(screen.getByText('Rows ↓ · columns →')).toBeTruthy();
    });
});
