import { create } from 'zustand';
import { ButtonState } from '../model/enums/buttonState';
import { Speech } from '../model/Speech';
import { GameResult } from '../model/GameResult';
import { clampIsiMs, DEFAULT_ISI_MAX_MS, DEFAULT_ISI_MIN_MS } from '../model/isi';
import { ModalityId, ModeId, getModalitiesForMode } from '../model/modalities';
import { AudioPackId } from '../model/audioPacks';
import { ColorId } from '../model/colorSet';
import { ImageId } from '../model/imageSet';
import {
    isiMsFromTier,
    loadLadder,
    ModeLadderSnapshot,
    saveLadder as persistLadder,
    type LadderStorageV1,
} from '../model/ladderPersistence';
import { LureStageId } from '../model/lureStages';
import { ControllerAction } from '../model/adaptiveController';
import {
    AdaptiveSessionState,
    BlockConfig,
    BlockRole,
    blockRoleFromPhase,
    createInitialAdaptiveSession,
    nextBlockConfig,
    playingPhaseForBlockRole,
    processAdaptiveBlockEnd,
} from './adaptiveSession';
import { GameSession } from './GameSession';

export type PlayMode = 'free' | 'adaptive';

/** BW-style interference fractions: 0, 1/8 … 1, default 1/8. */
export const INTERFERENCE_OPTIONS = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1] as const;

export type InterferenceChance = (typeof INTERFERENCE_OPTIONS)[number];

/** Pre-round flash countdown (3 → 2 → 1). */
export const COUNTDOWN_START = 3;
export const COUNTDOWN_TICK_MS = 1000;

export interface GameStoreState {
    results: {
        all: GameResult[];
        last: GameResult | null;
    };
    speech: Speech;
    btns: Partial<Record<ModalityId, `${ButtonState}`>>;
    activeModalities: ModalityId[];
    /** Seconds remaining in start countdown; null when idle or in-session. */
    countdown: number | null;
    game: GameSession | null;
    /** Adaptive ladder snapshot per mode (persisted separately from free-play settings). */
    ladder: Record<ModeId, ModeLadderSnapshot>;
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
        playMode: PlayMode;
        /** When set (Adaptive), Game uses lure-stage generation instead of interferenceChance. */
        lureStage?: LureStageId;
        /** Cross-modal match/lure quotas (Adaptive only; default off). */
        useBlockQuotas: boolean;
    };
    /** Multi-block Adaptive session FSM; null in free-play or when idle. */
    adaptiveSession: AdaptiveSessionState | null;
    lastBlockRole: BlockRole | null;
    lastControllerAction: ControllerAction | null;
    /** Subset modalities for remediation blocks; null uses full mode preset. */
    blockModalities: ModalityId[] | null;
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
    setPlayMode: (playMode: PlayMode) => void;
    setUseBlockQuotas: (enabled: boolean) => void;
    saveLadder: () => void;
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

let countdownTimer: ReturnType<typeof setTimeout> | null = null;

const clearCountdownTimer = () => {
    if (countdownTimer !== null) {
        clearTimeout(countdownTimer);
        countdownTimer = null;
    }
};

type StoreGet = () => GameStore;
type StoreSet = (
    partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)
) => void;

const launchSession = (get: StoreGet, set: StoreSet) => {
    const state = get();
    const settings = state.settings;
    const modalities = state.blockModalities ?? getModalitiesForMode(settings.mode);
    const session = new GameSession(get, set);
    set({
        game: session,
        countdown: null,
        activeModalities: modalities,
        btns: createEmptyButtons(modalities),
        boardState: {
            ...defaultBoardState,
            currentTrials: settings.trials,
            nForTrial: settings.level,
        },
    });
    session.begin();
};

function applyBlockConfigToStore(
    settings: GameStoreState['settings'],
    block: BlockConfig
): {
    settings: GameStoreState['settings'];
    blockModalities: ModalityId[] | null;
} {
    return {
        settings: applyBlockConfigToSettings(settings, block),
        blockModalities: block.modalities ?? null,
    };
}

function applyAdaptiveLadderToSettings<
    T extends GameStoreState['settings'],
>(settings: T, modeLadder: ModeLadderSnapshot): T {
    const { isiMin, isiMax } = isiMsFromTier(modeLadder.isiTier);
    return {
        ...settings,
        level: modeLadder.n,
        lureStage: modeLadder.lureStage,
        variableN: false,
        isiMin,
        isiMax,
    };
}

function applyBlockConfigToSettings<
    T extends GameStoreState['settings'],
>(settings: T, block: BlockConfig): T {
    const { isiMin, isiMax } = isiMsFromTier(block.isiTier);
    return {
        ...settings,
        level: block.n,
        lureStage: block.lureStage,
        trials: block.trials,
        variableN: false,
        isiMin,
        isiMax,
    };
}

function beginCountdown(get: StoreGet, set: StoreSet, clearLastResult: boolean) {
    clearCountdownTimer();
    set((state) => ({
        countdown: COUNTDOWN_START,
        results: clearLastResult
            ? { ...state.results, last: null }
            : state.results,
    }));
    scheduleCountdownTick(COUNTDOWN_START, get, set);
}

function finalizeGameEnd(
    get: StoreGet,
    set: StoreSet,
    result: GameResult
) {
    const state = get();
    const modalities = getModalitiesForMode(state.settings.mode);

    if (state.settings.playMode !== 'adaptive' || state.adaptiveSession == null) {
        set({
            results: {
                all: [...state.results.all, result],
                last: result,
            },
            game: null,
            activeModalities: modalities,
            btns: createEmptyButtons(modalities),
            boardState: { ...defaultBoardState },
            lastBlockRole: state.settings.playMode === 'free' ? 'free' : null,
            lastControllerAction: null,
        });
        return;
    }

    const blockRole = blockRoleFromPhase(state.adaptiveSession.phase);
    if (blockRole == null) {
        throw new Error('Adaptive block ended outside a playing phase');
    }

    const mode = state.settings.mode;
    const modeLadder = state.ladder[mode];
    const endResult = processAdaptiveBlockEnd(
        state.adaptiveSession,
        modeLadder,
        mode,
        blockRole,
        result.sdt
    );

    const nextLadderByMode = {
        ...state.ladder,
        [mode]: endResult.ladder,
    };

    set({
        results: {
            all: [...state.results.all, result],
            last: result,
        },
        game: null,
        activeModalities: modalities,
        btns: createEmptyButtons(modalities),
        boardState: { ...defaultBoardState },
        ladder: nextLadderByMode,
        adaptiveSession: endResult.session,
        lastBlockRole: endResult.blockRole,
        lastControllerAction: endResult.action,
        settings: applyAdaptiveLadderToSettings(state.settings, endResult.ladder),
    });
    get().saveLadder();
}

function ladderStorageFromState(ladder: Record<ModeId, ModeLadderSnapshot>): LadderStorageV1 {
    return {
        version: 1,
        byMode: {
            dual: { ...ladder.dual },
            triple: { ...ladder.triple },
            quad: { ...ladder.quad },
        },
    };
}

const initialLadderStorage = loadLadder();

const scheduleCountdownTick = (current: number, get: StoreGet, set: StoreSet) => {
    countdownTimer = setTimeout(() => {
        countdownTimer = null;
        if (get().countdown === null) return;

        if (current <= 1) {
            launchSession(get, set);
            return;
        }

        const next = current - 1;
        set({ countdown: next });
        scheduleCountdownTick(next, get, set);
    }, COUNTDOWN_TICK_MS);
};

export const useGameStore = create<GameStore>((set, get) => ({
    results: {
        all: [],
        last: null,
    },
    speech: new Speech('letters'),
    btns: createEmptyButtons(getModalitiesForMode('dual')),
    activeModalities: getModalitiesForMode('dual'),
    countdown: null,
    game: null,
    ladder: initialLadderStorage.byMode,
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
        playMode: 'free',
        useBlockQuotas: false,
    },
    adaptiveSession: null,
    lastBlockRole: null,
    lastControllerAction: null,
    blockModalities: null,
    startGame: () => {
        if (get().game !== null) {
            throw new Error('Game is already defined');
        }
        if (get().countdown !== null) {
            throw new Error('Countdown is already in progress');
        }

        const state = get();
        const { playMode, mode } = state.settings;

        if (state.adaptiveSession?.pendingContinue) {
            const session = {
                ...state.adaptiveSession,
                pendingContinue: false,
            };
            const block = nextBlockConfig(
                session,
                state.ladder[mode],
                mode,
                state.settings.trials
            );
            const applied = applyBlockConfigToStore(state.settings, block);
            set({
                adaptiveSession: {
                    ...session,
                    phase: playingPhaseForBlockRole(block.blockRole),
                },
                settings: applied.settings,
                blockModalities: applied.blockModalities,
            });
            beginCountdown(get, set, true);
            return;
        }

        if (playMode === 'adaptive') {
            const needsNewSession =
                state.adaptiveSession == null ||
                state.adaptiveSession.phase === 'summary';
            if (needsNewSession) {
                const session = createInitialAdaptiveSession();
                const block = nextBlockConfig(
                    session,
                    state.ladder[mode],
                    mode,
                    state.settings.trials
                );
                const applied = applyBlockConfigToStore(
                    applyAdaptiveLadderToSettings(state.settings, state.ladder[mode]),
                    block
                );
                set({
                    adaptiveSession: {
                        ...session,
                        phase: playingPhaseForBlockRole(block.blockRole),
                    },
                    lastBlockRole: null,
                    lastControllerAction: null,
                    settings: applied.settings,
                    blockModalities: applied.blockModalities,
                });
            }
        } else {
            set({
                adaptiveSession: null,
                lastBlockRole: null,
                lastControllerAction: null,
                blockModalities: null,
            });
        }

        beginCountdown(get, set, true);
    },
    cancelGame: () => {
        clearCountdownTimer();
        get().game?.cancel();
        const state = get();
        const modalities = getModalitiesForMode(state.settings.mode);
        const clearAdaptive =
            state.settings.playMode === 'adaptive' && state.adaptiveSession != null;
        set({
            countdown: null,
            adaptiveSession: clearAdaptive ? null : state.adaptiveSession,
            blockModalities: null,
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
    pushGameResult: (result) => {
        finalizeGameEnd(get, set, result);
    },
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
            let settings = { ...state.settings, mode };
            if (
                settings.playMode === 'adaptive' &&
                state.countdown === null
            ) {
                settings = applyAdaptiveLadderToSettings(settings, state.ladder[mode]);
            }
            return {
                settings,
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
    setUseBlockQuotas: (enabled) =>
        set((state) => ({
            settings: { ...state.settings, useBlockQuotas: enabled },
        })),
    setPlayMode: (playMode) => {
        const state = get();
        if (state.game !== null || state.countdown !== null) {
            return;
        }
        set((current) => {
            if (playMode === 'adaptive') {
                const modeLadder = current.ladder[current.settings.mode];
                return {
                    settings: applyAdaptiveLadderToSettings(
                        { ...current.settings, playMode },
                        modeLadder
                    ),
                };
            }
            const { lureStage: _removed, ...rest } = current.settings;
            return {
                settings: { ...rest, playMode },
            };
        });
    },
    saveLadder: () => {
        persistLadder(ladderStorageFromState(get().ladder));
    },
}));
