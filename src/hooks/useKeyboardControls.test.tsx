import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useKeyboardControls } from './useKeyboardControls';
import { COUNTDOWN_START, COUNTDOWN_TICK_MS, useGameStore } from '../store/gameStore';
import { createInitialAdaptiveSession } from '../store/adaptiveSession';
import { ButtonState } from '../model/enums/buttonState';

async function finishCountdown() {
    await vi.advanceTimersByTimeAsync(COUNTDOWN_START * COUNTDOWN_TICK_MS);
}

describe('useKeyboardControls', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(useGameStore.getState().speech, 'play').mockImplementation(() => undefined);
        useGameStore.setState({
            game: null,
            countdown: null,
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
                positionGrid: '3x3',
                displayVariableNCenter: false,
                answerGraceMs: 250,
                useFullScreen: false,
                mode: 'dual',
                audioPack: 'letters',
                interferenceChance: 0.125,
                variableN: false,
                variableNHoldTrials: 1,
                playMode: 'free',
                useBlockQuotas: false,
                useJaeggiQuotas: true,
            },
            btns: { audio: ButtonState.None, position: ButtonState.None },
        });
    });

    afterEach(() => {
        cleanup();
        useGameStore.getState().cancelGame();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('starts a countdown on space when idle', () => {
        const { unmount } = renderHook(() => useKeyboardControls());
        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        expect(useGameStore.getState().countdown).toBe(3);
        expect(useGameStore.getState().game).toBeNull();
        useGameStore.getState().cancelGame();
        unmount();
    });

    it('ignores space while settings dialog is open', () => {
        const shell = document.createElement('div');
        shell.className = 'settings-shell is-open';
        document.body.appendChild(shell);

        const { unmount } = renderHook(() => useKeyboardControls());
        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

        expect(useGameStore.getState().countdown).toBeNull();
        expect(useGameStore.getState().game).toBeNull();

        shell.remove();
        unmount();
    });

    it('does not cancel countdown on space key-repeat', () => {
        const { unmount } = renderHook(() => useKeyboardControls());
        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        expect(useGameStore.getState().countdown).toBe(3);

        document.dispatchEvent(
            new KeyboardEvent('keydown', { key: ' ', bubbles: true, repeat: true })
        );
        expect(useGameStore.getState().countdown).toBe(3);

        useGameStore.getState().cancelGame();
        unmount();
    });

    it('does not cancel countdown on a second space tap', () => {
        const { unmount } = renderHook(() => useKeyboardControls());
        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        expect(useGameStore.getState().countdown).toBe(3);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        expect(useGameStore.getState().countdown).toBe(3);

        useGameStore.getState().cancelGame();
        unmount();
    });

    it('increases level on arrow up', () => {
        const { unmount } = renderHook(() => useKeyboardControls());
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        expect(useGameStore.getState().settings.level).toBe(6);
        unmount();
    });

    it('cancels an active game on Escape', async () => {
        const { unmount } = renderHook(() => useKeyboardControls());
        useGameStore.getState().startGame();
        await finishCountdown();
        expect(useGameStore.getState().game).not.toBeNull();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(useGameStore.getState().game).toBeNull();
        unmount();
    });

    it('cancels countdown on Escape before the session starts', () => {
        const { unmount } = renderHook(() => useKeyboardControls());
        useGameStore.getState().startGame();
        expect(useGameStore.getState().countdown).toBe(3);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(useGameStore.getState().countdown).toBeNull();
        expect(useGameStore.getState().game).toBeNull();
        unmount();
    });

    it('continues adaptive interstitial on space', () => {
        useGameStore.setState({
            adaptiveSession: {
                ...createInitialAdaptiveSession(),
                phase: 'interstitial',
                pendingContinue: true,
            },
            settings: {
                ...useGameStore.getState().settings,
                playMode: 'adaptive',
            },
        });

        const { unmount } = renderHook(() => useKeyboardControls());
        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

        expect(useGameStore.getState().countdown).toBe(3);
        expect(useGameStore.getState().adaptiveSession?.pendingContinue).toBe(false);
        useGameStore.getState().cancelGame();
        unmount();
    });

    it('ends adaptive interstitial on Escape', () => {
        useGameStore.setState({
            adaptiveSession: {
                ...createInitialAdaptiveSession(),
                phase: 'interstitial',
                pendingContinue: true,
            },
            settings: {
                ...useGameStore.getState().settings,
                playMode: 'adaptive',
            },
        });

        const { unmount } = renderHook(() => useKeyboardControls());
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect(useGameStore.getState().adaptiveSession).toBeNull();
        expect(useGameStore.getState().countdown).toBeNull();
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

    it('invokes color and image claims in quad mode', async () => {
        useGameStore.setState({
            activeModalities: ['position', 'color', 'image', 'audio'],
            settings: {
                ...useGameStore.getState().settings,
                mode: 'quad',
            },
        });
        useGameStore.getState().startGame();
        await finishCountdown();
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

    it('ignores F and J in dual mode', async () => {
        useGameStore.getState().startGame();
        await finishCountdown();
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
