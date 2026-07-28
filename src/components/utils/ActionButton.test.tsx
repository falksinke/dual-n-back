import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ActionButton from './ActionButton';
import { useGameStore } from '../../store/gameStore';
import { ButtonState } from '../../model/enums/buttonState';

describe('ActionButton', () => {
    beforeEach(() => {
        useGameStore.setState({
            game: { selectModality: vi.fn() } as unknown as NonNullable<
                ReturnType<typeof useGameStore.getState>['game']
            >,
            btns: { position: ButtonState.None, audio: ButtonState.None },
        });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        useGameStore.setState({ game: null });
    });

    it('calls selectModality when clicked during a session', () => {
        const selectModality = vi.fn();
        useGameStore.setState({ selectModality });

        render(<ActionButton modality="position" />);
        fireEvent.click(screen.getByRole('button', { name: /match position/i }));

        expect(selectModality).toHaveBeenCalledWith('position');
    });

    it('is disabled when there is no active game', () => {
        useGameStore.setState({ game: null, selectModality: vi.fn() });
        render(<ActionButton modality="audio" />);
        expect(screen.getByRole('button', { name: /match audio/i })).toHaveProperty('disabled', true);
    });
});
