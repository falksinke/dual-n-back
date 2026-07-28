import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { STIMULUS_DURATION_MS, STIMULUS_RETRIGGER_GAP_MS } from '../model/isi';
import { clearStimulusTimers, presentBoardStimulus } from './stimulusPresentation';

type TestStore = {
    boardState: {
        positionIndex: number;
        audioToken: string | null;
        colorId: null;
        imageId: null;
        currentTrials: number;
        nForTrial: number;
        stimulusEpoch: number;
    };
    speech: { play: ReturnType<typeof vi.fn> };
};

describe('presentBoardStimulus', () => {
    let store: TestStore;

    const getStore = () => store;
    const setStore = (
        partial: Partial<TestStore> | ((state: TestStore) => Partial<TestStore>)
    ) => {
        const next = typeof partial === 'function' ? partial(store) : partial;
        store = { ...store, ...next, boardState: { ...store.boardState, ...next.boardState } };
    };

    beforeEach(() => {
        vi.useFakeTimers();
        store = {
            boardState: {
                positionIndex: -1,
                audioToken: null,
                colorId: null,
                imageId: null,
                currentTrials: -1,
                nForTrial: -1,
                stimulusEpoch: 0,
            },
            speech: { play: vi.fn() },
        };
    });

    afterEach(() => {
        clearStimulusTimers();
        vi.useRealTimers();
    });

    it('lights the cell and clears after stimulus duration', () => {
        presentBoardStimulus(getStore, setStore, {
            positionIndex: 2,
            audioToken: 'c4',
            currentTrials: 10,
            nForTrial: 2,
        });

        expect(store.boardState.positionIndex).toBe(2);
        expect(store.boardState.stimulusEpoch).toBe(1);
        expect(store.speech.play).toHaveBeenCalledWith('c4');

        vi.advanceTimersByTime(STIMULUS_DURATION_MS);
        expect(store.boardState.positionIndex).toBe(-1);
    });

    it('blanks then re-lights when the same cell fires again while still lit', () => {
        presentBoardStimulus(getStore, setStore, {
            positionIndex: 4,
            audioToken: 'a',
            currentTrials: 10,
            nForTrial: 2,
        });
        expect(store.boardState.positionIndex).toBe(4);
        expect(store.boardState.stimulusEpoch).toBe(1);

        presentBoardStimulus(getStore, setStore, {
            positionIndex: 4,
            audioToken: 'b',
            currentTrials: 9,
            nForTrial: 2,
        });

        expect(store.boardState.positionIndex).toBe(-1);
        expect(store.boardState.currentTrials).toBe(9);
        expect(store.speech.play).toHaveBeenLastCalledWith('b');

        vi.advanceTimersByTime(STIMULUS_RETRIGGER_GAP_MS);
        expect(store.boardState.positionIndex).toBe(4);
        expect(store.boardState.stimulusEpoch).toBe(2);
        expect(store.speech.play).toHaveBeenCalledTimes(2);
    });

    it('does not blank when a different cell lights while the previous is still on', () => {
        presentBoardStimulus(getStore, setStore, {
            positionIndex: 0,
            audioToken: 'a',
            currentTrials: 10,
            nForTrial: 2,
        });
        presentBoardStimulus(getStore, setStore, {
            positionIndex: 1,
            audioToken: 'b',
            currentTrials: 9,
            nForTrial: 2,
        });

        expect(store.boardState.positionIndex).toBe(1);
        expect(store.boardState.stimulusEpoch).toBe(2);
    });
});
