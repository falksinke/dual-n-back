import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useGameStore } from '../../store/gameStore';
import { useKeyboardControls } from '../../hooks/useKeyboardControls';
import CountdownFlash from './index';

const originalSkipCountdown = useGameStore.getState().skipCountdown;

const CountdownWithKeyboardControls = () => {
    useKeyboardControls();
    return <CountdownFlash />;
};

describe('CountdownFlash', () => {
    afterEach(() => {
        cleanup();
        useGameStore.setState({
            countdown: null,
            skipCountdown: originalSkipCountdown,
        });
    });

    it('starts immediately from primary pointer activation and keeps the announcement', () => {
        const skipCountdown = vi.fn();
        useGameStore.setState({ countdown: 3, skipCountdown });
        render(<CountdownFlash />);

        fireEvent.pointerDown(
            screen.getByRole('button', { name: 'Start session immediately' }),
            { button: 0 }
        );

        expect(skipCountdown).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('status').textContent).toBe('Countdown 3');
    });

    it('keeps native Space activation available with the app shortcuts installed', () => {
        const skipCountdown = vi.fn();
        useGameStore.setState({ countdown: 3, game: null, skipCountdown });
        render(<CountdownWithKeyboardControls />);

        const button = screen.getByRole('button', { name: 'Start session immediately' });
        button.focus();
        const event = new KeyboardEvent('keydown', {
            key: ' ',
            bubbles: true,
            cancelable: true,
        });
        fireEvent(button, event);

        expect(event.defaultPrevented).toBe(false);
        fireEvent.click(button);
        expect(skipCountdown).toHaveBeenCalledTimes(1);
    });
});
