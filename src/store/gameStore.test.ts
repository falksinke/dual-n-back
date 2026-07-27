import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useGameStore } from './gameStore';
import { ButtonState } from '../model/enums/buttonState';

describe('gameStore', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(useGameStore.getState().speech, 'play').mockImplementation(() => undefined);
        useGameStore.setState({
            game: null,
            activeModalities: ['position', 'audio'],
            results: { all: [], last: null },
            boardState: {
                positionIndex: -1,
                audioToken: null,
                colorId: null,
                imageId: null,
                currentTrials: -1,
                nForTrial: -1,
            },
            btns: { audio: ButtonState.None, position: ButtonState.None },
            settings: {
                level: 2,
                trials: 1,
                isiMin: 5000,
                isiMax: 5000,
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
        });
    });

    afterEach(() => {
        useGameStore.getState().game?.cancel();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('starts a game and updates board state from callbacks', async () => {
        useGameStore.getState().startGame();
        expect(useGameStore.getState().game).not.toBeNull();
        expect(useGameStore.getState().boardState.positionIndex).toBeGreaterThanOrEqual(0);
    });

    it('clears highlight after stimulus duration', async () => {
        useGameStore.getState().startGame();
        expect(useGameStore.getState().boardState.positionIndex).toBeGreaterThanOrEqual(0);

        await vi.advanceTimersByTimeAsync(1000);
        expect(useGameStore.getState().boardState.positionIndex).toBe(-1);
    });

    it('cancel clears game without pushing results', async () => {
        useGameStore.getState().startGame();
        useGameStore.getState().cancelGame();

        expect(useGameStore.getState().game).toBeNull();
        expect(useGameStore.getState().results.last).toBeNull();
    });

    it('throws when starting while a game is active', () => {
        useGameStore.getState().startGame();
        expect(() => useGameStore.getState().startGame()).toThrow('Game is already defined');
    });

    it('starts triple mode with piano without throw and carries color id', async () => {
        useGameStore.setState((state) => ({
            settings: {
                ...state.settings,
                mode: 'triple',
                audioPack: 'piano',
                trials: 1,
                isiMin: 5000,
                isiMax: 5000,
            },
            speech: useGameStore.getState().speech,
        }));
        useGameStore.getState().setAudioPack('piano');

        expect(() => useGameStore.getState().startGame()).not.toThrow();
        expect(useGameStore.getState().activeModalities).toEqual(['position', 'color', 'audio']);
        expect(useGameStore.getState().boardState.colorId).not.toBeNull();

        useGameStore.getState().cancelGame();
    });

    it('snapshots mode and interference at session start', async () => {
        useGameStore.getState().startGame();
        const session = useGameStore.getState().game!;

        useGameStore.getState().setMode('quad');
        useGameStore.getState().cycleInterferenceChance();

        expect((session as unknown as { modalities: string[] }).modalities).toEqual([
            'position',
            'audio',
        ]);

        useGameStore.getState().cancelGame();
    });
});
