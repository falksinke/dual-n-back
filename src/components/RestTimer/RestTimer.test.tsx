import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import RestTimer from './index';
import { idleRestTimer, startRestTimer } from '../../model/restTimer';
import { useGameStore } from '../../store/gameStore';

describe('RestTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(10_000);
        useGameStore.setState({ restTimer: idleRestTimer(0) });
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('offers Continue, 1 minute, and 2 minute choices', () => {
        render(<RestTimer nowMs={Date.now()} />);
        expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
        expect(screen.getByRole('button', { name: '1 min' })).toBeTruthy();
        expect(screen.getByRole('button', { name: '2 min' })).toBeTruthy();
    });

    it('shows the running wall-clock countdown', () => {
        useGameStore.setState({ restTimer: startRestTimer(1, Date.now()) });
        const { rerender } = render(<RestTimer nowMs={Date.now()} />);
        expect(screen.getByText('1:00')).toBeTruthy();

        vi.advanceTimersByTime(1_000);
        rerender(<RestTimer nowMs={Date.now()} />);
        expect(screen.getByText('0:59')).toBeTruthy();
    });

    it('starts the selected duration through the store action', () => {
        const setRestMinutes = vi.fn();
        useGameStore.setState({ setRestMinutes });
        render(<RestTimer nowMs={Date.now()} />);
        fireEvent.click(screen.getByRole('button', { name: '2 min' }));
        expect(setRestMinutes).toHaveBeenCalledWith(2);
    });
});
