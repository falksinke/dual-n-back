import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import SessionPrimaryButton from './index';
import { createDefaultFreePlaySettings, useGameStore } from '../../store/gameStore';

describe('SessionPrimaryButton', () => {
    beforeEach(() => {
        useGameStore.setState({
            game: null,
            countdown: null,
            settings: createDefaultFreePlaySettings(),
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('exposes the label as the accessible name for Start', () => {
        render(<SessionPrimaryButton label="Start" />);
        expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Startor/i })).toBeNull();
    });

    it('exposes the label as the accessible name for Continue', () => {
        render(<SessionPrimaryButton label="Continue" />);
        expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Continueor/i })).toBeNull();
    });

    it('hides the Space hint from assistive technology', () => {
        render(<SessionPrimaryButton label="Start" />);
        const hint = screen.getByRole('button', { name: 'Start' }).querySelector(
            '.session-primary-btn-hint'
        );
        expect(hint?.getAttribute('aria-hidden')).toBe('true');
    });

    it('starts the game when clicked while idle', () => {
        const startGame = vi.fn();
        useGameStore.setState({ startGame });
        render(<SessionPrimaryButton label="Start" />);
        fireEvent.click(screen.getByRole('button', { name: 'Start' }));
        expect(startGame).toHaveBeenCalledTimes(1);
    });

    it('is disabled during an active session', () => {
        useGameStore.setState({ game: {} as never });
        render(<SessionPrimaryButton label="Start" />);
        expect(screen.getByRole('button', { name: 'Start' })).toHaveProperty('disabled', true);
    });

    it('can be disabled by a post-round rest timer', () => {
        render(<SessionPrimaryButton label="Continue" disabled />);
        expect(screen.getByRole('button', { name: 'Continue' })).toHaveProperty(
            'disabled',
            true
        );
    });
});
