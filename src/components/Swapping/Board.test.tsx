import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { SwappingConfig, SwappingToken } from '../../model/swapping/types';
import Board from './Board';

afterEach(cleanup);

const sequenceConfig: SwappingConfig = {
    content: 'letters',
    layout: 'sequence',
    length: 3,
    pattern: 'unique',
    tier: 'basic',
    operationCount: 1,
};

const tokens: readonly SwappingToken[] = [
    { id: 'letter:A:0', kind: 'letter', value: 'A', label: 'A' },
    { id: 'letter:B:0', kind: 'letter', value: 'B', label: 'B' },
    { id: 'letter:C:0', kind: 'letter', value: 'C', label: 'C' },
];

describe('Swapping Board', () => {
    it('renders tokens with fixed, one-based sequence labels', () => {
        render(<Board config={sequenceConfig} tokens={tokens} />);

        const board = screen.getByRole('list', { name: 'Swapping board' });
        expect(within(board).getByLabelText('position 1: A')).toBeTruthy();
        expect(within(board).getByLabelText('position 2: B')).toBeTruthy();
        expect(within(board).getByLabelText('position 3: C')).toBeTruthy();
    });

    it('renders an empty grid without exposing remembered token text or names', () => {
        const gridConfig: SwappingConfig = {
            ...sequenceConfig,
            layout: '2x2',
            length: 4,
        };
        render(
            <Board
                config={gridConfig}
                tokens={[]}
                highlights={[0, 2]}
                ariaLabel="Hidden arrangement"
            />
        );

        const board = screen.getByRole('list', { name: 'Hidden arrangement' });
        expect(within(board).getByLabelText('row 1, column 1, empty')).toBeTruthy();
        expect(within(board).getByLabelText('row 2, column 2, empty')).toBeTruthy();
        expect(within(board).queryByText('A')).toBeNull();
        expect(within(board).queryByLabelText(/: A$/)).toBeNull();
        expect(board.querySelectorAll('.is-highlighted')).toHaveLength(2);
        expect(board.getAttribute('style')).toContain('--swapping-columns: 2');
    });

    it('uses the slot label as the accessible name for an icon', () => {
        const icon: SwappingToken = {
            id: 'icon:poly-0:0',
            kind: 'icon',
            value: 'poly-0',
            label: 'Shape 1',
        };
        render(<Board config={{ ...sequenceConfig, content: 'icons' }} tokens={[icon]} />);

        const slot = screen.getByLabelText('position 1: Shape 1');
        expect(slot.querySelector('img')?.getAttribute('alt')).toBe('');
    });
    it('renders identical covers without accepting any cargo data', () => {
        const { container } = render(<Board config={sequenceConfig} concealed ariaLabel="Sealed cargo" />);
        const board = screen.getByRole('list', { name: 'Sealed cargo' });
        expect(within(board).getAllByLabelText(/covered/)).toHaveLength(3);
        const covers = Array.from(board.querySelectorAll('.swapping-cargo__cover'));
        expect(covers).toHaveLength(3);
        expect(new Set(covers.map((cover) => cover.outerHTML)).size).toBe(1);
        expect(container.querySelectorAll('img, .swapping-cargo__mark')).toHaveLength(0);
        expect(board.outerHTML).not.toContain('letter:');
    });

    it('keeps twelve sequence positions in one explicit track instead of a mobile grid', () => {
        render(<Board config={{ ...sequenceConfig, length: 12, pattern: 'repeated' }} concealed />);
        const board = screen.getByRole('list', { name: 'Swapping board' });
        expect(board.getAttribute('style')).toContain('--swapping-columns: 12');
        expect(board.getAttribute('style')).not.toContain('--swapping-mobile-columns');
        expect(within(board).getAllByRole('listitem').map((slot) => slot.getAttribute('aria-label')))
            .toEqual(Array.from({ length: 12 }, (_, index) => `position ${index + 1}, covered`));
        expect(screen.getByRole('region', { name: 'Continuous track; scroll to see all positions' })).toHaveProperty('tabIndex', 0);
        expect(screen.getByRole('button', { name: 'Scroll to later positions' })).toBeTruthy();
    });

});
