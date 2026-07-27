import { create } from 'zustand';
import { ButtonState } from '../model/enums/buttonState';
import { Speech } from '../model/Speech';
import { GameResult } from '../model/GameResult';
import { clampIsiMs, DEFAULT_ISI_MAX_MS, DEFAULT_ISI_MIN_MS } from '../model/isi';
import { ModalityId, ModeId, getModalitiesForMode } from '../model/modalities';
import { AudioPackId } from '../model/audioPacks';
import { ColorId } from '../model/colorSet';
import { ImageId } from '../model/imageSet';
import { GameSession } from './GameSession';

/** BW-style interference fractions: 0, 1/8 … 1, default 1/8. */
export const INTERFERENCE_OPTIONS = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1] as const;

export type InterferenceChance = (typeof INTERFERENCE_OPTIONS)[number];

export interface GameStoreState {
    results: {
        all: GameResult[];
        last: GameResult | null;
    };
    speech: Speech;
    btns: Partial<Record<ModalityId, `${ButtonState}`>>;
    activeModalities: ModalityId[];
    game: GameSession | null;
    boardState: {
        positionIndex: number;
        audioToken: string | null;
        colorId: ColorId | null;
        imageId: ImageId | null;
        currentTrials: number;
        nForTrial: number;
    };
    settings: {
        level: number;
        trials: number;
        isiMin: number;
        isiMax: number;
        activeFeedback: boolean;
        displayTrials: boolean;
        displayTarget: boolean;
        allowCenterStimulus: boolean;
        useFullScreen: boolean;
        mode: ModeId;
        audioPack: AudioPackId;
        interferenceChance: InterferenceChance;
        variableN: boolean;
    };
}

export interface GameStoreActions {
    startGame: () => void;
    cancelGame: () => void;
    selectModality: (modality: ModalityId) => void;
    setBoardPosition: (positionIndex: number) => void;
    setBoardTrials: (currentTrials: number) => void;
    setButtonState: (type: ModalityId, state: `${ButtonState}`) => void;
    resetButtons: () => void;
    pushGameResult: (result: GameResult) => void;
    clearLastResult: () => void;
    resetBoard: () => void;
    clearGame: () => void;
    decreaseLevel: () => void;
    increaseLevel: () => void;
    decreaseTrials: () => void;
    increaseTrials: () => void;
    setIsiMin: (ms: number) => void;
    setIsiMax: (ms: number) => void;
    setAllowCenterStimulus: (allow: boolean) => void;
    setMode: (mode: ModeId) => void;
    setAudioPack: (pack: AudioPackId) => void;
    cycleInterferenceChance: () => void;
    setVariableN: (enabled: boolean) => void;
}

export type GameStore = GameStoreState & GameStoreActions;

const defaultBoardState = {
    positionIndex: -1,
    audioToken: null as string | null,
    colorId: null as ColorId | null,
    imageId: null as ImageId | null,
    currentTrials: -1,
    nForTrial: -1,
};

function createEmptyButtons(modalities: ModalityId[]): Partial<Record<ModalityId, `${ButtonState}`>> {
    const btns: Partial<Record<ModalityId, `${ButtonState}`>> = {};
    for (const modality of modalities) {
        btns[modality] = ButtonState.None;
    }
    return btns;
}

export const useGameStore = create<GameStore>((set, get) => ({
    results: {
        all: [],
        last: null,
    },
    speech: new Speech('letters'),
    btns: createEmptyButtons(getModalitiesForMode('dual')),
    activeModalities: getModalitiesForMode('dual'),
    game: null,
    boardState: { ...defaultBoardState },
    settings: {
        level: 5,
        trials: 30,
        isiMin: DEFAULT_ISI_MIN_MS,
        isiMax: DEFAULT_ISI_MAX_MS,
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
    startGame: () => {
        if (get().game !== null) {
            throw new Error('Game is already defined');
        }
        const settings = get().settings;
        const modalities = getModalitiesForMode(settings.mode);
        const session = new GameSession(get, set);
        set({
            game: session,
            activeModalities: modalities,
            btns: createEmptyButtons(modalities),
            results: { ...get().results, last: null },
            boardState: {
                ...defaultBoardState,
                currentTrials: settings.trials,
                nForTrial: settings.level,
            },
        });
        session.begin();
    },
    cancelGame: () => {
        get().game?.cancel();
        const modalities = getModalitiesForMode(get().settings.mode);
        set({
            activeModalities: modalities,
            btns: createEmptyButtons(modalities),
            boardState: { ...defaultBoardState },
        });
    },
    selectModality: (modality) => {
        get().game?.selectModality(modality);
    },
    setBoardPosition: (positionIndex) =>
        set((state) => ({
            boardState: { ...state.boardState, positionIndex },
        })),
    setBoardTrials: (currentTrials) =>
        set((state) => ({
            boardState: { ...state.boardState, currentTrials },
        })),
    setButtonState: (type, buttonState) =>
        set((state) => ({
            btns: { ...state.btns, [type]: buttonState },
        })),
    resetButtons: () =>
        set((state) => ({
            btns: createEmptyButtons(state.activeModalities),
        })),
    pushGameResult: (result) =>
        set((state) => {
            const modalities = getModalitiesForMode(state.settings.mode);
            return {
                results: {
                    all: [...state.results.all, result],
                    last: result,
                },
                game: null,
                activeModalities: modalities,
                btns: createEmptyButtons(modalities),
                boardState: { ...defaultBoardState },
            };
        }),
    clearLastResult: () =>
        set((state) => ({
            results: { ...state.results, last: null },
        })),
    resetBoard: () => set({ boardState: { ...defaultBoardState } }),
    clearGame: () => set({ game: null }),
    decreaseLevel: () =>
        set((state) => ({
            settings: {
                ...state.settings,
                level: state.settings.level > 2 ? state.settings.level - 1 : state.settings.level,
            },
        })),
    increaseLevel: () =>
        set((state) => {
            const nextLevel = state.settings.level + 1;
            return {
                settings: {
                    ...state.settings,
                    level: nextLevel,
                    trials: Math.max(nextLevel * 2, state.settings.trials),
                },
            };
        }),
    decreaseTrials: () =>
        set((state) => ({
            settings: {
                ...state.settings,
                trials:
                    state.settings.trials > state.settings.level * 2
                        ? state.settings.trials - 1
                        : state.settings.trials,
            },
        })),
    increaseTrials: () =>
        set((state) => ({
            settings: {
                ...state.settings,
                trials: state.settings.trials + 1,
            },
        })),
    setIsiMin: (ms) =>
        set((state) => {
            const isiMin = clampIsiMs(ms);
            return {
                settings: {
                    ...state.settings,
                    isiMin,
                    isiMax: Math.max(isiMin, state.settings.isiMax),
                },
            };
        }),
    setIsiMax: (ms) =>
        set((state) => {
            const isiMax = clampIsiMs(ms);
            return {
                settings: {
                    ...state.settings,
                    isiMax,
                    isiMin: Math.min(isiMax, state.settings.isiMin),
                },
            };
        }),
    setAllowCenterStimulus: (allow) =>
        set((state) => ({
            settings: {
                ...state.settings,
                allowCenterStimulus: allow,
            },
        })),
    setMode: (mode) =>
        set((state) => {
            // Don't reshape live session chrome mid-run; snapshot applies on next start.
            if (state.game !== null) {
                return { settings: { ...state.settings, mode } };
            }
            const modalities = getModalitiesForMode(mode);
            return {
                settings: { ...state.settings, mode },
                activeModalities: modalities,
                btns: createEmptyButtons(modalities),
            };
        }),
    setAudioPack: (pack) =>
        set((state) => ({
            settings: { ...state.settings, audioPack: pack },
            speech: new Speech(pack),
        })),
    cycleInterferenceChance: () =>
        set((state) => {
            const current = state.settings.interferenceChance;
            const idx = INTERFERENCE_OPTIONS.indexOf(current);
            const next = INTERFERENCE_OPTIONS[(idx + 1) % INTERFERENCE_OPTIONS.length];
            return {
                settings: { ...state.settings, interferenceChance: next },
            };
        }),
    setVariableN: (enabled) =>
        set((state) => ({
            settings: { ...state.settings, variableN: enabled },
        })),
}));
