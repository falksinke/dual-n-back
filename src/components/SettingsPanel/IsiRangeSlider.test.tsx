import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import IsiRangeSlider from './IsiRangeSlider';

afterEach(() => {
    cleanup();
});

describe('IsiRangeSlider', () => {
    it('double-click while aligned links thumbs so drag moves both', () => {
        const onMinChange = vi.fn();
        const onMaxChange = vi.fn();
        const onBothChange = vi.fn();
        const { container } = render(
            <IsiRangeSlider
                minMs={2000}
                maxMs={2000}
                onMinChange={onMinChange}
                onMaxChange={onMaxChange}
                onBothChange={onBothChange}
            />
        );

        const maxThumb = container.querySelector(
            '.isi-slider-thumb--max'
        ) as HTMLInputElement;
        fireEvent.doubleClick(maxThumb);
        expect(screen.getByText(/Linked — drag moves both/)).toBeTruthy();

        fireEvent.change(maxThumb, { target: { value: '2500' } });
        expect(onBothChange).toHaveBeenCalledWith(2500);
        expect(onMaxChange).not.toHaveBeenCalled();
        expect(onMinChange).not.toHaveBeenCalled();
    });

    it('does not link when thumbs are apart', () => {
        const onBothChange = vi.fn();
        const onMaxChange = vi.fn();
        const { container } = render(
            <IsiRangeSlider
                minMs={1000}
                maxMs={2000}
                onMinChange={vi.fn()}
                onMaxChange={onMaxChange}
                onBothChange={onBothChange}
            />
        );

        const maxThumb = container.querySelector(
            '.isi-slider-thumb--max'
        ) as HTMLInputElement;
        fireEvent.doubleClick(maxThumb);
        expect(screen.queryByText(/Linked — drag moves both/)).toBeNull();
        fireEvent.change(maxThumb, { target: { value: '2500' } });
        expect(onBothChange).not.toHaveBeenCalled();
        expect(onMaxChange).toHaveBeenCalledWith(2500);
    });
});
