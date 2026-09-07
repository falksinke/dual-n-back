import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
    PaletteEntry,
    SwappingConfig,
    SwappingToken,
} from '../../model/swapping/types';
import Answer from './Answer';

afterEach(cleanup);

const config: SwappingConfig = {
    content: 'letters',
    layout: 'sequence',
    length: 3,
    pattern: 'repeated',
    tier: 'basic',
    operationCount: 1,
};

const a0: SwappingToken = { id: 'letter:A:0', kind: 'letter', value: 'A', label: 'A' };
const a1: SwappingToken = { id: 'letter:A:1', kind: 'letter', value: 'A', label: 'A' };
const b0: SwappingToken = { id: 'letter:B:0', kind: 'letter', value: 'B', label: 'B' };

const palette: readonly PaletteEntry[] = [
    { key: 'letter:A', kind: 'letter', value: 'A', label: 'A', total: 2, remaining: 1 },
    { key: 'letter:B', kind: 'letter', value: 'B', label: 'B', total: 1, remaining: 1 },
];

function renderAnswer(overrides: Partial<ComponentProps<typeof Answer>> = {}) {
    const props: ComponentProps<typeof Answer> = {
        config,
        slots: [a0, undefined, undefined],
        activeIndex: 1,
        palette,
        onSelect: vi.fn(),
        onPlace: vi.fn(),
        onClear: vi.fn(),
        onSubmit: vi.fn(),
        onPause: vi.fn(),
        ...overrides,
    };
    return { props, ...render(<Answer {...props} />) };
}

describe('Swapping Answer', () => {
    it('starts on the active slot and exposes the canonical palette with remaining counts', () => {
        renderAnswer();

        expect(document.activeElement).toBe(screen.getByRole('button', { name: /position 2, empty, selected/i }));
        const paletteButtons = screen.getAllByRole('button', { name: /remaining/i });
        expect(paletteButtons.map((button) => button.getAttribute('aria-label'))).toEqual([
            'A, 1 remaining',
            'B, 1 remaining',
        ]);
    });

    it('selects slots, places available identities and disables exhausted identities', () => {
        const onSelect = vi.fn();
        const onPlace = vi.fn();
        renderAnswer({
            onSelect,
            onPlace,
            palette: [palette[0], { ...palette[1], remaining: 0 }],
        });

        fireEvent.click(screen.getByRole('button', { name: /position 3, empty/i }));
        expect(onSelect).toHaveBeenCalledWith(2);

        fireEvent.click(screen.getByRole('button', { name: 'A, 1 remaining' }));
        expect(onPlace).toHaveBeenCalledWith(palette[0]);
        expect(screen.getByRole('button', { name: 'B, 0 remaining' })).toHaveProperty('disabled', true);
    });

    it('moves through slots with arrows and clears the active slot with Delete', () => {
        const onClear = vi.fn();
        renderAnswer({ onClear });

        const second = screen.getByRole('button', { name: /position 2, empty, selected/i });
        const third = screen.getByRole('button', { name: /position 3, empty/i });
        fireEvent.keyDown(second, { key: 'ArrowRight' });
        expect(document.activeElement).toBe(third);

        fireEvent.keyDown(third, { key: 'Delete' });
        expect(onClear).toHaveBeenCalledWith(1);
    });

    it('returns the selected token through Clear and enables Submit only when full', () => {
        const onClear = vi.fn();
        const onSubmit = vi.fn();
        const { rerender } = renderAnswer({ onClear, onSubmit });

        expect(screen.getByRole('button', { name: 'Submit answer' })).toHaveProperty('disabled', true);
        rerender(
            <Answer
                config={config}
                slots={[a0, a1, b0]}
                activeIndex={1}
                palette={[
                    { ...palette[0], remaining: 0 },
                    { ...palette[1], remaining: 0 },
                ]}
                onSelect={vi.fn()}
                onPlace={vi.fn()}
                onClear={onClear}
                onSubmit={onSubmit}
                onPause={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Clear selected' }));
        expect(onClear).toHaveBeenCalledWith(1);
        fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
        expect(onSubmit).toHaveBeenCalledOnce();
    });

    it('retains grid reading order in a fixed geometry', () => {
        const gridConfig: SwappingConfig = { ...config, layout: '2x2', length: 4 };
        const { container } = renderAnswer({
            config: gridConfig,
            slots: [undefined, undefined, undefined, undefined],
            activeIndex: 0,
        });

        const slots = container.querySelector('.swapping-answer__slots');
        expect(slots?.classList.contains('is-grid')).toBe(true);
        expect(slots?.getAttribute('style')).toContain('--swapping-columns: 2');
        expect(screen.getByRole('button', { name: /row 2, column 2, empty/i })).toBeTruthy();
    });
});
