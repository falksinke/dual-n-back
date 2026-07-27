import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useKeyboardControls } from './useKeyboardControls';
import { useGameStore } from '../store/gameStore';
import { ButtonState } from '../model/enums/buttonState';

describe('useKeyboardControls', () => {
    beforeEach(() => {
        useGameStore.setState({
            game: null,
            activeModalities: ['position', 'audio'],
            settings: {
                level: 5,
                trials: 30,
                isiMin: 500,
                isiMax: 3000,
                activeFeedback: false,
                displayTrials: true,
                displayTarget: true,
                allowCenterStimulus: true,
                useFullScreen: false,
                mode: 'dual',
                audioPack: 'letters',
                interferenceChance: 0.125,
                variableN: false,
            },
            btns: { audio: ButtonState.None, position: ButtonState.None },
        });
    });

    afterEach(() => {
        cleanup();
        useGameStore.getState().game?.cancel();
        vi.restoreAllMocks();
    });

    it('starts a game on space when idle', () => {
        const { unmount } = renderHook(() => useKeyboardControls());
        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        expect(useGameStore.getState().game).not.toBeNull();
        useGameStore.getState().cancelGame();
        unmount();
    });

    it('increases level on arrow up', () => {
        const { unmount } = renderHook(() => useKeyboardControls());
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        expect(useGameStore.getState().settings.level).toBe(6);
        unmount();
    });

    it('cancels an active game on Escape', () => {
        const { unmount } = renderHook(() => useKeyboardControls());
        useGameStore.getState().startGame();
        expect(useGameStore.getState().game).not.toBeNull();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(useGameStore.getState().game).toBeNull();
        unmount();
    });

    it('removes listener on unmount', () => {
        const addSpy = vi.spyOn(document, 'addEventListener');
        const removeSpy = vi.spyOn(document, 'removeEventListener');
        const { unmount } = renderHook(() => useKeyboardControls());
        const handler = addSpy.mock.calls.find(([event]) => event === 'keydown')?.[1];
        unmount();
        expect(removeSpy).toHaveBeenCalledWith('keydown', handler);
    });

    it('invokes color and image claims in quad mode', () => {
        useGameStore.setState({
            activeModalities: ['position', 'color', 'image', 'audio'],
            settings: {
                ...useGameStore.getState().settings,
                mode: 'quad',
            },
        });
        useGameStore.getState().startGame();
        const session = useGameStore.getState().game!;
        const addChoiceSpy = vi.spyOn(session, 'addChoice');

        const { unmount } = renderHook(() => useKeyboardControls());
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'J', bubbles: true }));

        expect(addChoiceSpy).toHaveBeenCalledWith('color');
        expect(addChoiceSpy).toHaveBeenCalledWith('image');

        useGameStore.getState().cancelGame();
        unmount();
    });

    it('ignores F and J in dual mode', () => {
        useGameStore.getState().startGame();
        const session = useGameStore.getState().game!;
        const addChoiceSpy = vi.spyOn(session, 'addChoice');

        const { unmount } = renderHook(() => useKeyboardControls());
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));

        expect(addChoiceSpy).not.toHaveBeenCalled();

        useGameStore.getState().cancelGame();
        unmount();
    });
});
