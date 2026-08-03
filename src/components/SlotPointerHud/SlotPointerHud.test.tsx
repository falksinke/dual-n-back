import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SlotPointerHud from './index';

describe('SlotPointerHud', () => {
    it('renders active slot for guided mode and nothing when off', () => {
        const { rerender } = render(
            <SlotPointerHud n={3} trialIndex={1} pointerMode="full" stimulusEpoch={1} />
        );
        expect(screen.getByLabelText('Active slot 2 of 3')).toBeTruthy();

        rerender(<SlotPointerHud n={3} trialIndex={1} pointerMode="off" stimulusEpoch={1} />);
        expect(screen.queryByLabelText(/Active slot/)).toBeNull();
    });
});
