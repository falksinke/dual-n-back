import { ColorId } from '../model/colorSet';
import { ImageId } from '../model/imageSet';
import { BoardState } from '../model/types';
import { STIMULUS_DURATION_MS, STIMULUS_RETRIGGER_GAP_MS } from '../model/isi';

type StoreBoard = {
    positionIndex: number;
    audioToken: string | null;
    colorId: ColorId | null;
    imageId: ImageId | null;
    currentTrials: number;
    nForTrial: number;
    stimulusEpoch: number;
};

type StoreSlice = {
    boardState: StoreBoard;
    speech: { play: (token: string) => void };
};

type StoreGetter = () => StoreSlice;
type StoreSetter = (
    partial: Partial<StoreSlice> | ((state: StoreSlice) => Partial<StoreSlice>)
) => void;

let highlightTimeout: ReturnType<typeof setTimeout> | null = null;
let retriggerTimeout: ReturnType<typeof setTimeout> | null = null;

export const clearStimulusTimers = (): void => {
    if (highlightTimeout !== null) {
        clearTimeout(highlightTimeout);
        highlightTimeout = null;
    }
    if (retriggerTimeout !== null) {
        clearTimeout(retriggerTimeout);
        retriggerTimeout = null;
    }
};

const clearStimulusVisual = (setStore: StoreSetter): void => {
    setStore((state) => ({
        boardState: {
            ...state.boardState,
            positionIndex: -1,
            colorId: null,
            imageId: null,
        },
    }));
};

const showStimulus = (
    getStore: StoreGetter,
    setStore: StoreSetter,
    boardState: BoardState,
    playAudio: boolean
): void => {
    setStore((state) => ({
        boardState: {
            ...state.boardState,
            positionIndex: boardState.positionIndex,
            audioToken: boardState.audioToken,
            colorId: boardState.colorId ?? null,
            imageId: boardState.imageId ?? null,
            currentTrials: boardState.currentTrials,
            nForTrial: boardState.nForTrial,
            stimulusEpoch: state.boardState.stimulusEpoch + 1,
        },
    }));
    if (playAudio) {
        getStore().speech.play(boardState.audioToken);
    }
    highlightTimeout = setTimeout(() => {
        clearStimulusVisual(setStore);
        highlightTimeout = null;
    }, STIMULUS_DURATION_MS);
};

/**
 * Present a trial on the board. When the next onset lands on the same cell
 * before the previous highlight has cleared (common with low ISI), force a
 * brief off-frame so the square visibly reappears.
 */
export const presentBoardStimulus = (
    getStore: StoreGetter,
    setStore: StoreSetter,
    boardState: BoardState
): void => {
    clearStimulusTimers();

    const prev = getStore().boardState;
    const sameCellStillLit =
        prev.positionIndex !== -1 && prev.positionIndex === boardState.positionIndex;

    if (!sameCellStillLit) {
        showStimulus(getStore, setStore, boardState, true);
        return;
    }

    // Blank first so React/CSS register an off → on edge for the same square.
    setStore((state) => ({
        boardState: {
            ...state.boardState,
            positionIndex: -1,
            colorId: null,
            imageId: null,
            currentTrials: boardState.currentTrials,
            nForTrial: boardState.nForTrial,
            audioToken: boardState.audioToken,
        },
    }));
    getStore().speech.play(boardState.audioToken);

    retriggerTimeout = setTimeout(() => {
        retriggerTimeout = null;
        showStimulus(getStore, setStore, boardState, false);
    }, STIMULUS_RETRIGGER_GAP_MS);
};
