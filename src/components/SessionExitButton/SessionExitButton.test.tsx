import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import SessionExitButton from './index';
import { createDefaultFreePlaySettings, useGameStore } from '../../store/gameStore';

describe('SessionExitButton', () => {
    beforeEach(() => {
        useGameStore.setState({
            game: null,
            countdown: null,
            adaptiveSession: null,
            settings: createDefaultFreePlaySettings(),
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('is hidden when idle', () => {
        render(<SessionExitButton />);
        expect(screen.queryByRole('button', { name: 'Exit session' })).toBeNull();
    });

    it('calls cancelGame when clicked during a session', () => {
        const cancelGame = vi.fn();
        useGameStore.setState({
            game: {} as never,
            cancelGame,
        });
        render(<SessionExitButton />);
        fireEvent.click(screen.getByRole('button', { name: 'Exit session' }));
        expect(cancelGame).toHaveBeenCalledTimes(1);
    });

    it('shows during countdown', () => {
        useGameStore.setState({ countdown: 2 });
        render(<SessionExitButton />);
        expect(screen.getByRole('button', { name: 'Exit session' })).toBeTruthy();
    });
});
